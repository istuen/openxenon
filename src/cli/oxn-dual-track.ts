/**
 * Task 1.8 — OXN 双轨路由
 *
 * 根据文件后缀路由编译管线：
 *   .yaml / .json → 老管线 (BlueprintCompiler)
 *   .oxn          → 新管线 (Langium + OxnKernelAdapter)
 *
 * 两者最终输出统一的 FrozenBlueprint，保证 Core 执行引擎零感知。
 */

import { existsSync, readFileSync, writeFileSync } from '../infra/filesystem'
import type { LangiumDocument } from 'langium'
import { DocumentState, URI } from 'langium'
import { dirname, join } from 'path'
import { parse as parseYaml } from 'yaml'
import { ensureDirectory } from '../infra/filesystem'
import { preloadCompileDependencies } from '../infra/loader'
import { compileBlueprint, compileFrozen } from '../oxl/compiler/blueprint-compiler'
import { ASSEMBLY_JSON, BOUNDARY_DIR, FROZEN_BLUEPRINT_JSON } from '../kernel/index'
import type { Blueprint } from '../kernel/index'
import { type DagNode, validateDagTopology } from '../oxl/validators/blueprint-dag'
import type { FrozenBlueprint } from '../kernel/index'
import {
  type OxnAssemblyIR,
  type OxnAssemblyPart,
  type OxnAssemblySlotBinding,
  validateOxnAssemblyIR,
} from '../oxl/schemas/oxn-assembly.schema'
import { adaptOxnToFrozen } from '../oxl/compiler/oxn-adapter'
import type { OXNDocument } from '../oxl/langium-driver/generated/ast.js'
import { generateOxnAssembly } from '../oxl/generator/oxn-generator.js'
import { createOxnServices, resetOxnServices } from '../oxl/langium-driver/oxn-services.js'

function extractBlueprintAssembly(doc: LangiumDocument): OxnAssemblyIR | undefined {
  if (!doc.parseResult?.value) return undefined
  const bundle = generateOxnAssembly(doc.parseResult.value as OXNDocument)
  const blueprint = bundle.entities.find((e: { type: string }) => e.type === 'blueprint')
  if (!blueprint) return undefined
  const assem = validateOxnAssemblyIR((blueprint as { data: unknown }).data)

  const partEntities = bundle.entities.filter((e: { type: string }) => e.type === 'part')
  if (partEntities.length > 0 && (!assem.blueprintParts || assem.blueprintParts.length === 0)) {
    assem.concreteParts = partEntities.map((e) => (e as { data: unknown }).data as OxnAssemblyPart)
  }

  return assem
}

// ========================
// 路由函数
// ========================

export type PipelineMode = 'yaml' | 'oxn'

/**
 * 根据文件后缀判断使用哪个编译管线
 */
export function detectPipeline(blueprintPath: string): PipelineMode {
  if (blueprintPath.endsWith('.oxn')) return 'oxn'
  return 'yaml'
}

// ========================
// YAML 老管线 (保持不变)
// ========================

export interface YamlSubmitResult {
  taskId: string
  frozen: FrozenBlueprint
  pipeline: 'yaml'
}

export function submitYamlPipeline(
  blueprintPath: string,
  cwd: string,
  taskId: string,
  _taskName: string,
  params?: Record<string, unknown>,
): YamlSubmitResult {
  const content = readFileSync(blueprintPath, 'utf-8')
  const parsed = parseYaml(content) as Blueprint

  const compileCtx = {
    taskId,
    taskName: parsed.name || parsed.id || taskId,
    params: params || {},
  }

  const bpDir = dirname(blueprintPath)
  const assemblyPath = join(bpDir, 'blueprint.assembly.json')

  let frozenBlueprint: FrozenBlueprint
  if (existsSync(assemblyPath)) {
    const assembly = JSON.parse(readFileSync(assemblyPath, 'utf-8'))
    frozenBlueprint = compileFrozen(assembly, compileCtx)
  } else {
    frozenBlueprint = compileBlueprint(parsed, {
      ...compileCtx,
      dependencies: preloadCompileDependencies(join(cwd, BOUNDARY_DIR), {}, {}),
    })
  }

  return { taskId, frozen: frozenBlueprint, pipeline: 'yaml' }
}

// ========================
// OXN 新管线
// ========================

export interface OxnSubmitResult {
  taskId: string
  frozen: FrozenBlueprint
  pipeline: 'oxn'
  /** Assembly IR（供调试和资产态用） */
  assembly: OxnAssemblyIR
}

/**
 * OXN 管线提交入口
 *
 * 完整流程：
 *   .oxn 文件 → 简单解析（Phase 1 暂用 JSON 表达） → OxnAssemblyIR
 *   → isAbstract 校验 → 参数求值 → OxnKernelAdapter → FrozenBlueprint
 */
export function submitOxnPipeline(
  blueprintPath: string,
  cwd: string,
  taskId: string,
  _taskName: string,
  taskBinding?: OxnAssemblySlotBinding[],
): OxnSubmitResult {
  const content = readFileSync(blueprintPath, 'utf-8')

  let assembly: OxnAssemblyIR | undefined

  if (blueprintPath.endsWith('.oxn')) {
    try {
      const services = createOxnServices()
      const shared = services.shared
      shared.ServiceRegistry.register(services)

      const factory = shared.workspace.LangiumDocumentFactory
      const uri = URI.file(blueprintPath.startsWith('/') ? blueprintPath : join(cwd, blueprintPath))

      const doc = factory.fromString(content, uri, undefined)

      if (doc.state >= DocumentState.Parsed) {
        assembly = extractBlueprintAssembly(doc)
      } else {
        const parser = services.parser.LangiumParser
        const parseResult = parser.parse(content)
        if (parseResult.value && parseResult.parserErrors.length === 0 && parseResult.lexerErrors.length === 0) {
          const bundle = generateOxnAssembly(parseResult.value as OXNDocument)
          const blueprint = bundle.entities.find((e: { type: string }) => e.type === 'blueprint')
          if (blueprint) {
            assembly = validateOxnAssemblyIR((blueprint as { data: unknown }).data)
          }
        }
      }
    } catch {
      resetOxnServices()
    }
  }

  if (!assembly) {
    try {
      assembly = validateOxnAssemblyIR(JSON.parse(content) as OxnAssemblyIR)
    } catch {
      throw new Error('OXN 文件解析失败：无法解析为合法的 Assembly IR。请运行 oxn compile 检查语法。')
    }
  }

  // DAG 校验：仅当 blueprintParts 为内联声明时需要
  // 带 ref 的 blueprintParts 是引用声明，不需要在校验中参与 DAG 拓扑
  const dagNodesMap = new Map<string, DagNode>()
  for (const s of assembly.slots) {
    dagNodesMap.set(s.name, { id: s.name, deps: (s as any).deps || [] })
  }
  for (const p of assembly.concreteParts) {
    if (!dagNodesMap.has(p.name)) {
      dagNodesMap.set(p.name, { id: p.name, deps: (p as any).deps || [] })
    }
  }
  // Only add blueprintParts without ref (inline declarations) to DAG
  for (const p of (assembly as any).blueprintParts || []) {
    if (!dagNodesMap.has(p.name) && !p.ref) {
      dagNodesMap.set(p.name, { id: p.name, deps: (p as any).deps || [] })
    }
  }
  const dagNodes: DagNode[] = Array.from(dagNodesMap.values())
  if (dagNodes.length > 0) {
    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`OXN DAG 验证失败: ${dagResult.errors.join('; ')}`)
    }
  }

  // 适配器转换
  const binding: OxnAssemblySlotBinding[] = taskBinding || []
  const result = adaptOxnToFrozen(assembly, binding)
  if (!result.warnings.every(() => false)) {
    // 有 warnings 但不阻止提交
  }

  return { taskId, frozen: result.frozen, pipeline: 'oxn', assembly }
}

// ========================
// 统一提交入口
// ========================

export interface UnifiedSubmitResult {
  taskId: string
  frozen: FrozenBlueprint
  pipeline: PipelineMode
  /** 仅 OXN 管线有此字段 */
  assembly?: OxnAssemblyIR
}

/**
 * 统一的 Task 提交入口：根据文件后缀自动路由到对应管线
 */
export function unifiedTaskSubmit(
  blueprintPath: string,
  cwd: string,
  taskId: string,
  taskName: string,
  options?: {
    params?: Record<string, unknown>
    /** OXN 专用：Task binding */
    taskBinding?: OxnAssemblySlotBinding[]
  },
): UnifiedSubmitResult {
  const pipeline = detectPipeline(blueprintPath)

  if (pipeline === 'yaml') {
    const result = submitYamlPipeline(blueprintPath, cwd, taskId, taskName, options?.params)
    return { ...result, pipeline }
  }

  const result = submitOxnPipeline(blueprintPath, cwd, taskId, taskName, options?.taskBinding || [])
  return result
}

/**
 * 双轨写入：将 FrozenBlueprint 写入任务目录
 */
export function writeFrozenToTaskDir(
  cwd: string,
  taskId: string,
  frozen: FrozenBlueprint,
  assembly?: OxnAssemblyIR,
  sourceFormat?: string,
): { frozenPath: string; assemblyPath?: string } {
  const taskDir = join(cwd, BOUNDARY_DIR, 'tasks', taskId)
  ensureDirectory(taskDir)

  // Inject source_format metadata
  if (sourceFormat && !('_source_format' in (frozen as Record<string, unknown>))) {
    ;(frozen as Record<string, unknown>)._source_format = sourceFormat
  }

  const frozenPath = join(taskDir, FROZEN_BLUEPRINT_JSON)
  writeFileSync(frozenPath, JSON.stringify(frozen, null, 2), 'utf-8')

  let assemblyPath: string | undefined
  if (assembly) {
    assemblyPath = join(taskDir, ASSEMBLY_JSON)
    writeFileSync(assemblyPath, JSON.stringify(assembly, null, 2), 'utf-8')
  }

  return { frozenPath, assemblyPath }
}
