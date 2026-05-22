/**
 * Task 1.8 — OXN 双轨路由
 *
 * 根据文件后缀路由编译管线：
 *   .yaml / .json → 老管线 (BlueprintCompiler)
 *   .oxn          → 新管线 (Langium + OxnKernelAdapter)
 *
 * 两者最终输出统一的 FrozenBlueprint，保证 Core 执行引擎零感知。
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'

import { BOUNDARY_DIR, FROZEN_BLUEPRINT_JSON, ASSEMBLY_JSON } from '../kernel/constants'
import { compileBlueprint, compileFrozen } from '../kernel/compiler/blueprint-compiler'
import { preloadCompileDependencies } from '../infra/loader'
import { adaptOxnToFrozen } from '../kernel/compiler/oxn-adapter'
import {
  createOxnAssemblyIR,
  type OxnAssemblyIR,
  type OxnAssemblyTaskBinding,
  validateOxnAssemblyIR,
} from '../kernel/schemas/oxn-assembly.schema'
import { validateDagTopology, type DagNode } from '../kernel/schemas/dag-validator'
import type { FrozenBlueprint } from '../kernel/schemas/frozen-schema'
import type { Blueprint } from '../kernel/schemas/blueprint.schema'
import { ensureDirectory } from '../infra/fs'

import { createOxnSharedServices, createOxnServices, resetOxnServices } from '../oxn-dsl/langium/oxn-services.js'
import { generateOxnAssembly } from '../oxn-dsl/generator/oxn-generator.js'
import { URI } from 'langium'

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
  params?: Record<string, unknown>
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
      dependencies: preloadCompileDependencies(join(cwd, BOUNDARY_DIR)),
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
  taskBinding?: OxnAssemblyTaskBinding
): OxnSubmitResult {
  const content = readFileSync(blueprintPath, 'utf-8')

  let assembly: OxnAssemblyIR | undefined

  if (blueprintPath.endsWith('.oxn')) {
    try {
      const services = createOxnServices()
      const shared = services.shared
      shared.ServiceRegistry.register(services)

      const uri = URI.file(blueprintPath.startsWith('/') ? blueprintPath : join(cwd, blueprintPath))
      const doc = shared.workspace.LangiumDocuments.createDocument(uri, content)

      if (!doc.parseResult || !doc.parseResult.value) {
        const parser = services.parser.LangiumParser
        const parseResult = parser.parse(content)
        if (parseResult.value) {
          doc.parseResult = parseResult
        }
      }

      if (doc.parseResult && doc.parseResult.value) {
        const bundle = generateOxnAssembly(doc.parseResult.value as never)
        const blueprint = bundle.entities.find(
          (e: { type: string }) => e.type === 'blueprint'
        )
        if (blueprint) {
          assembly = validateOxnAssemblyIR((blueprint as { data: unknown }).data)
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

  // DAG 校验
  const dagNodes: DagNode[] = (assembly.concreteParts.length > 0 ? assembly.concreteParts : assembly.stages).map(p => ({
    id: p.name,
    deps: (p as any).deps || [],
  }))
  const dagResult = validateDagTopology(dagNodes)
  if (!dagResult.valid) {
    throw new Error(`OXN DAG 验证失败: ${dagResult.errors.join('; ')}`)
  }

  // 适配器转换
  const binding: OxnAssemblyTaskBinding = taskBinding || {
    partBindings: {},
    propBindings: {},
  }

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
    taskBinding?: OxnAssemblyTaskBinding
  }
): UnifiedSubmitResult {
  const pipeline = detectPipeline(blueprintPath)

  if (pipeline === 'yaml') {
    const result = submitYamlPipeline(blueprintPath, cwd, taskId, taskName, options?.params)
    return { ...result, pipeline }
  }

  const result = submitOxnPipeline(blueprintPath, cwd, taskId, taskName, options?.taskBinding)
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
  sourceFormat?: string
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
