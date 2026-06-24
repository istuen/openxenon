/**
 * md-bridge/mdast-to-kernel.ts — 5 类 mdast → Kernel Schema（**核心**）
 *
 * v0.3 阶段 1 T5 任务（路线 C v3 + Intent 边界）
 *
 * 角色：
 * - 把 mdast AST 转换为 OpenXenon Kernel Schema（CompiledBlueprint）
 * - 平行于 `src/oxl/compiler/oxn-adapter.ts`（.oxn AST → CompiledBlueprint）
 * - 5 类 Intent 实体（domain/blueprint/work/task/proof）每类有专门 adapter
 *
 * 关键不变量：
 * - Kernel 不知 OXL/mdast 存在（adapter 模式）
 * - 5 类 adapter 共用同一入口 + 各自特殊逻辑
 * - 失败抛 MdastToKernelError（带 entity type + line/column）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层
 * - 依赖 L0-Schema（CompiledBlueprint / XenonMeta）
 * - 不依赖 L0-Processor / L1-Infra
 */

import { createHash } from 'node:crypto'
import type { CompiledBlueprint, CompiledPart, CompiledProbe, XenonMeta } from '../../kernel/index.js'
import { runMdPipeline, type PipelineOutput } from './pipeline.js'
import { parseDomainMd, parseBlueprintMd, parseWorkMd } from './remark-to-mdast.js'
import { validateMdast } from './mdast-validator.js'
import { extractHeadingContexts } from './extract-headings.js'
import { extractListFields } from './extract-list-fields.js'

// ========================
// 类型
// ========================

export type IntentEntityType = 'domain' | 'blueprint' | 'work' | 'task' | 'proof'

export interface MdastToKernelContext {
  /** 资产类型 */
  entity: IntentEntityType
  /** 文件路径（用于 createXenonMeta）*/
  filePath: string
  /** 原始 .md 内容 */
  content: string
  /** 已知的内部 Intent 资产（用于 reference 校验）*/
  knownInternalAssets?: Set<string>
  /** Hash port（v0.3 阶段 1 简化：使用内置 createHash）*/
  hashPort?: { computeHash: (content: string) => string }
}

export interface MdastToKernelResult {
  /** Kernel Schema（CompiledBlueprint = FrozenBlueprint）*/
  frozen: CompiledBlueprint
  /** 第一个 part 的 XenonMeta（方便外部读取）*/
  meta: XenonMeta
  /** 解析耗时（ms）*/
  convertTime: number
}

// ========================
// 错误类型
// ========================

export class MdastToKernelError extends Error {
  constructor(
    message: string,
    public entity: IntentEntityType,
    public line?: number,
    public column?: number,
    public code?: string,
  ) {
    super(`[${entity}] ${message}`)
    this.name = 'MdastToKernelError'
  }
}

// ========================
// 入口
// ========================

/**
 * mdast → Kernel Schema 主入口
 */
export function mdastToKernel(ctx: MdastToKernelContext): MdastToKernelResult {
  const startTime = Date.now()

  // 1. 校验（5 类 E_MD_xxx）
  const validation = validateMdast(ctx.content, {
    entity: ctx.entity,
    filePath: ctx.filePath,
    knownInternalAssets: ctx.knownInternalAssets,
  })

  if (!validation.valid) {
    const firstError = validation.errors[0]
    throw new MdastToKernelError(
      firstError?.message ?? 'Validation failed',
      ctx.entity,
      firstError?.line,
      firstError?.column,
      firstError?.code,
    )
  }

  // 2. 解析为对应实体的 mdast
  const pipelineResult = runMdPipeline({
    content: ctx.content,
    entity: ctx.entity,
    filePath: ctx.filePath,
  })

  // 3. 根据 entity type 路由到具体 adapter
  let compiled: CompiledBlueprint
  switch (ctx.entity) {
    case 'domain':
      compiled = convertDomainToCompiled(pipelineResult, ctx)
      break
    case 'blueprint':
      compiled = convertBlueprintToCompiled(pipelineResult, ctx)
      break
    case 'work':
      compiled = convertWorkToCompiled(pipelineResult, ctx)
      break
    case 'task':
      compiled = convertTaskToCompiled(pipelineResult, ctx)
      break
    case 'proof':
      compiled = convertProofToCompiled(pipelineResult, ctx)
      break
  }

  return {
    frozen: compiled,
    meta:
      compiled.parts[0]?._xenon_meta ??
      makeXenonMeta(`@prj/${ctx.entity}/unknown`, 'project', ctx.filePath, computeHash(ctx.content)),
    convertTime: Date.now() - startTime,
  }
}

// ========================
// 5 类 Entity 适配器
// ========================

/**
 * Domain → CompiledBlueprint
 *
 * Domain 在 Kernel 层是"只读约束"。这里转为一个最简 Blueprint。
 */
function convertDomainToCompiled(_pipelineResult: PipelineOutput, ctx: MdastToKernelContext): CompiledBlueprint {
  const parseResult = parseDomainMd(ctx.content, ctx.filePath)
  const hash = computeHash(ctx.content)
  const ref = `@prj/domain/${parseResult.name}`

  return {
    id: `domain-${slugify(parseResult.name)}`,
    name: parseResult.name,
    frozen_at: new Date().toISOString(),
    parts: [
      {
        _xenon_meta: makeXenonMeta(ref, 'project', ctx.filePath, hash),
        id: `domain-${slugify(parseResult.name)}-ref`,
        name: parseResult.name,
        deps: [],
        params: { intent_type: 'domain', blocks_count: countBlocks(parseResult) },
        probes: [],
      },
    ],
  }
}

/**
 * Blueprint → CompiledBlueprint
 *
 * Blueprint 包含 slot 拓扑，每个 slot 转为 CompiledPart
 * props 转为 inputs，probes 转为 CompiledProbe
 */
function convertBlueprintToCompiled(_pipelineResult: PipelineOutput, ctx: MdastToKernelContext): CompiledBlueprint {
  const parseResult = parseBlueprintMd(ctx.content, ctx.filePath)
  const hash = computeHash(ctx.content)
  const ref = `@prj/blueprint/${parseResult.name}`

  // parts: slots
  const parts: CompiledPart[] = parseResult.slots.map((slot, idx) => {
    const slotId = slot.attributes.id ?? `slot-${idx + 1}`
    const partRef = `${ref}#${slotId}`
    return {
      _xenon_meta: makeXenonMeta(partRef, 'project', ctx.filePath, hash),
      id: slugify(slotId),
      name: slotId,
      deps: parseDeps(slot.attributes.deps),
      params: {
        skill_context: slot.content.join('\n'),
      },
      probes: parseResult.probes
        .filter((p) => p.attributes.slot === slotId)
        .map((probe) => convertProbe(probe, ctx, hash)),
    }
  })

  return {
    id: `blueprint-${slugify(parseResult.name)}`,
    name: parseResult.name,
    frozen_at: new Date().toISOString(),
    parts,
  }
}

/**
 * Work → CompiledBlueprint
 *
 * Work 是编排器。tasks 转为 CompiledPart，DAG 关系由 deps 表达。
 */
function convertWorkToCompiled(_pipelineResult: PipelineOutput, ctx: MdastToKernelContext): CompiledBlueprint {
  const parseResult = parseWorkMd(ctx.content, ctx.filePath)
  const hash = computeHash(ctx.content)
  const ref = `@prj/work/${parseResult.name}`

  // parts: tasks
  const parts: CompiledPart[] = parseResult.tasks.map((task, idx) => {
    const taskId = task.attributes.id ?? task.attributes.name ?? `task-${idx + 1}`
    const partRef = `${ref}#${taskId}`
    return {
      _xenon_meta: makeXenonMeta(partRef, 'project', ctx.filePath, hash),
      id: slugify(taskId),
      name: taskId,
      deps: parseDeps(task.attributes.deps),
      params: {
        domain: task.attributes.domain ?? '',
        blueprint: task.attributes.blueprint ?? '',
        skill_context: task.content.join('\n'),
      },
      probes: [],
    }
  })

  return {
    id: `work-${slugify(parseResult.name)}`,
    name: parseResult.name,
    frozen_at: new Date().toISOString(),
    parts,
  }
}

/**
 * Task → CompiledBlueprint
 *
 * Task 是单个执行单元。align blueprint + domain；parts 转为 CompiledPart。
 */
function convertTaskToCompiled(pipelineResult: PipelineOutput, ctx: MdastToKernelContext): CompiledBlueprint {
  const hash = computeHash(ctx.content)
  const taskName = String(pipelineResult.frontmatter.name ?? pipelineResult.entityType ?? 'unnamed-task')
  const blueprintRef = String(pipelineResult.frontmatter.blueprint ?? 'dev-workflow')
  const domainRef = String(pipelineResult.frontmatter.domain ?? 'WorkContext')
  const ref = `@prj/task/${taskName}`

  // part 块 → CompiledPart[]
  // v0.3.0 canonical: 从 ## Parts 下 ### 实例的 - skill_context 字段读取
  const partContexts = extractHeadingContexts(pipelineResult.mdast).filter(
    (c) => c.h2 === 'Parts' && c.h3 && c.h3List && !c.h3List.ordered,
  )
  const partIntents = partContexts.map((c) => {
    const fields = c.h3List ? extractListFields(c.h3List) : []
    const skillContext = fields.find((f) => f.key === 'skill_context')
    return {
      attributes: {
        id: c.h3 ?? '',
        name: c.h3 ?? '',
        type: 'part',
        deps: '',
      },
      content: typeof skillContext?.value === 'string' ? [skillContext.value] : [],
    }
  })

  let parts: CompiledPart[]
  if (partIntents.length > 0) {
    parts = partIntents.map((part, idx) => {
      const partId = part.attributes.id ?? part.attributes.name ?? `part-${idx + 1}`
      return {
        _xenon_meta: makeXenonMeta(`${ref}#${partId}`, 'project', ctx.filePath, hash),
        id: slugify(partId),
        name: partId,
        deps: parseDeps(part.attributes.deps),
        params: {
          skill_context: part.content.join('\n'),
          domain: domainRef,
          blueprint: blueprintRef,
        },
        probes: [],
      }
    })
  } else {
    // 默认 1 个 part
    parts = [
      {
        _xenon_meta: makeXenonMeta(`${ref}#default`, 'project', ctx.filePath, hash),
        id: 'default',
        name: 'default',
        deps: [],
        params: { domain: domainRef, blueprint: blueprintRef },
        probes: [],
      },
    ]
  }

  return {
    id: `task-${slugify(taskName)}`,
    name: taskName,
    frozen_at: new Date().toISOString(),
    parts,
  }
}

/**
 * Proof → CompiledBlueprint
 *
 * Proof 是验证产物（frozen）。转为一个只读的"已验证"Blueprint。
 */
function convertProofToCompiled(pipelineResult: PipelineOutput, ctx: MdastToKernelContext): CompiledBlueprint {
  const hash = computeHash(ctx.content)
  const proofName = String(pipelineResult.frontmatter.name ?? 'unnamed-proof')
  const ref = `@prj/proof/${proofName}`
  const verdict = String(pipelineResult.frontmatter.verdict ?? 'INCONCLUSIVE')

  return {
    id: `proof-${slugify(proofName)}`,
    name: proofName,
    frozen_at: new Date().toISOString(),
    parts: [
      {
        _xenon_meta: makeXenonMeta(ref, 'project', ctx.filePath, hash),
        id: 'proof-result',
        name: 'proof-result',
        deps: [],
        params: { verdict },
        probes: [],
      },
    ],
  }
}

// ========================
// 辅助函数
// ========================

/** IntentBlock (probe) → CompiledProbe */
function convertProbe(
  probe: { attributes: Record<string, string>; content: string[] },
  ctx: MdastToKernelContext,
  hash: string,
): CompiledProbe {
  const ref = `@prj/probe/${probe.attributes.id ?? 'unnamed'}`
  const params = parseProbeContent(probe.content)

  return {
    _xenon_meta: makeXenonMeta(ref, 'project', ctx.filePath, hash),
    type: probe.attributes.type ?? 'shell-exec',
    ref: probe.attributes.ref,
    params,
  }
}

/** Probe 内容解析为 params */
function parseProbeContent(content: string[]): Record<string, unknown> {
  const params: Record<string, unknown> = {}
  for (const line of content) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      params[key] = value
    }
  }
  return params
}

/** 解析 deps 字符串（逗号分隔）→ string[] */
function parseDeps(depsStr: string | undefined): string[] {
  if (!depsStr) return []
  return depsStr
    .split(',')
    .map((d) => d.trim())
    .filter((d) => d.length > 0)
}

/** Domain blocks 计数 */
function countBlocks(parseResult: { blocks: { terms: unknown[]; bans: unknown[]; invariants: unknown[] } }): number {
  return parseResult.blocks.terms.length + parseResult.blocks.bans.length + parseResult.blocks.invariants.length
}

/** 创建 XenonMeta */
function makeXenonMeta(
  ref: string,
  resolvedFrom: 'kernel' | 'global' | 'project',
  originalPath: string,
  contentHash: string,
): XenonMeta {
  return {
    ref,
    resolved_from: resolvedFrom,
    original_path: originalPath,
    frozen_at: new Date().toISOString(),
    content_hash: contentHash,
  }
}

/** 计算 content SHA-256 */
function computeHash(content: string): string {
  return createHash('sha256').update(content).digest('hex')
}

/** kebab-case slug */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
