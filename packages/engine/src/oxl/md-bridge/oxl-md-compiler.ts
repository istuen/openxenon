/**
 * md-bridge/oxl-md-compiler.ts — mdast → .oxn 自动编译器
 *
 * v0.3 阶段 2 T10 任务（路线 C v3.2 + Intent 边界）
 *
 * 角色：
 * - 把 mdast AST 编译为 .oxn 文本
 * - 5 类 Intent 实体（domain/blueprint/work/task/proof）每类有专门 compiler
 * - pre-commit hook 触发（.md 改动自动重编译 .oxn）
 *
 * 关键不变量：
 * - .md = 唯一写入入口（source hash 嵌入 .oxn frontmatter）
 * - 编译结果嵌入 source hash（防漂移）
 * - 不感知 OpenXenon Kernel（纯文本生成）
 *
 * L0–L3 兼容性：
 * - L1-OXL 层
 * - 不依赖 L0-Processor / L1-Infra / L2-Work / L3
 */

import type { DomainParseResult, BlueprintParseResult, WorkParseResult } from './remark-to-mdast.js'
import { computeContentHash } from './oxl-md-source-hash.js'

// ========================
// 类型
// ========================

export type IntentEntityType = 'domain' | 'blueprint' | 'work' | 'task' | 'proof'

export interface CompileOptions {
  /** 资产类型（影响 compiler 选择）*/
  entity: IntentEntityType
  /** .md contentHash（嵌入 .oxn frontmatter 防漂移）*/
  mdContentHash: string
  /** 缩进风格（默认 2 空格）*/
  indent?: string
  /** 是否使用 kebab-case 转换（默认 true）*/
  kebabCase?: boolean
}

export interface CompileResult {
  /** 编译后的 .oxn 文本 */
  oxn: string
  /** 实体名（PascalCase / kebab-case）*/
  name: string
  /** 编译时间 */
  compiledAt: string
}

// ========================
// 主入口
// ========================

/**
 * mdast → .oxn 编译器入口
 *
 * 根据 entity type 路由到专门 compiler：
 * - domain → compileDomain
 * - blueprint → compileBlueprint
 * - work → compileWork
 * - task → compileTask
 * - proof → compileProof
 */
export function compileMdToOxn(
  parseResult:
    | DomainParseResult
    | BlueprintParseResult
    | WorkParseResult
    | { name: string; frontmatter: Record<string, unknown>; content: string; contentHash: string; blockType?: string },
  options: CompileOptions,
): CompileResult {
  const indent = options.indent ?? '  '
  const timestamp = new Date().toISOString()

  switch (options.entity) {
    case 'domain':
      return {
        oxn: compileDomain(parseResult as DomainParseResult, options, indent),
        name: (parseResult as DomainParseResult).name,
        compiledAt: timestamp,
      }
    case 'blueprint':
      return {
        oxn: compileBlueprint(parseResult as BlueprintParseResult, options, indent),
        name: (parseResult as BlueprintParseResult).name,
        compiledAt: timestamp,
      }
    case 'work':
      return {
        oxn: compileWork(parseResult as WorkParseResult, options, indent),
        name: (parseResult as WorkParseResult).name,
        compiledAt: timestamp,
      }
    case 'task':
      return {
        oxn: compileTask(
          parseResult as { name: string; content: string; contentHash: string; blockType?: string },
          options,
          indent,
        ),
        name: String(parseResult.name ?? 'unnamed-task'),
        compiledAt: timestamp,
      }
    case 'proof':
      return {
        oxn: compileProof(
          parseResult as { name: string; content: string; contentHash: string; blockType?: string },
          options,
          indent,
        ),
        name: String(parseResult.name ?? 'unnamed-proof'),
        compiledAt: timestamp,
      }
  }
}

// ========================
// 5 类 Entity Compiler
// ========================

/**
 * Domain → .oxn
 *
 * .oxn 格式（参考 builtin probes/*.oxn）：
 * ```
 * // source_hash: <mdHash>
 *
 * domain "OrderContext" {
 *   term { ... }
 *   ban { ... }
 *   invariant { ... }
 * }
 * ```
 */
function compileDomain(result: DomainParseResult, options: CompileOptions, indent: string): string {
  const lines: string[] = []

  // Source hash header（防漂移）
  lines.push(`// source_hash: ${options.mdContentHash}`)
  lines.push(`// compiled_at: ${new Date().toISOString()}`)
  lines.push('')

  // Domain 头
  lines.push(`domain "${result.name}" {`)

  // term 块
  for (const term of result.blocks.terms) {
    lines.push(`${indent}term {`)
    lines.push(...term.content.map((line) => `${indent}${indent}${line}`))
    lines.push(`${indent}}`)
  }

  // ban 块
  for (const ban of result.blocks.bans) {
    lines.push(`${indent}ban {`)
    lines.push(...ban.content.map((line) => `${indent}${indent}${line}`))
    lines.push(`${indent}}`)
  }

  // invariant 块
  for (const inv of result.blocks.invariants) {
    lines.push(`${indent}invariant {`)
    lines.push(...inv.content.map((line) => `${indent}${indent}${line}`))
    lines.push(`${indent}}`)
  }

  lines.push('}')

  return lines.join('\n')
}

/**
 * Blueprint → .oxn
 *
 * .oxn 格式（参考 builtin blueprints/*.oxn）：
 * ```
 * blueprint "dev-workflow" {
 *   slot "develop" { ... }
 *   slot "test" { ... }
 * }
 * ```
 */
function compileBlueprint(result: BlueprintParseResult, options: CompileOptions, indent: string): string {
  const lines: string[] = []

  lines.push(`// source_hash: ${options.mdContentHash}`)
  lines.push(`// compiled_at: ${new Date().toISOString()}`)
  lines.push('')

  lines.push(`blueprint "${result.name}" {`)

  // slot 块
  for (const slot of result.slots) {
    const slotName = slot.attributes.id ?? slot.attributes.name ?? 'unnamed-slot'
    lines.push(`${indent}slot "${slotName}" {`)
    lines.push(...slot.content.map((line) => `${indent}${indent}${line}`))
    lines.push(`${indent}}`)
  }

  // probe 块
  for (const probe of result.probes) {
    const probeName = probe.attributes.id ?? 'unnamed-probe'
    // 优先从 probe content 解析 type: shell-exec（覆盖 attributes.type）
    const contentType = extractProbeType(probe.content)
    const probeType = contentType ?? probe.attributes.type ?? 'shell-exec'
    lines.push(`${indent}probe "${probeName}" scheme "${probeType}" {`)
    lines.push(...probe.content.map((line) => `${indent}${indent}${line}`))
    lines.push(`${indent}}`)
  }

  lines.push('}')

  return lines.join('\n')
}

/**
 * Work → .oxn
 *
 * .oxn 格式（参考 examples/works/develop-member/work.oxn）：
 * ```
 * work "feature-x" {
 *   context {
 *     goal = "...";
 *     constraints = ["..."];
 *     loop_policy { max_iterations = 3; }
 *   }
 *   domain "X" ref "@prj/domains/X";
 *   blueprint "Y" ref "@prj/blueprints/Y";
 *
 *   task "step1" {
 *     domain "X";
 *     blueprint "Y";
 *     deps = [];
 *     part "develop" {
 *       skill_context = "...";
 *     }
 *   }
 * }
 * ```
 */
function compileWork(result: WorkParseResult, options: CompileOptions, indent: string): string {
  const lines: string[] = []

  lines.push(`// source_hash: ${options.mdContentHash}`)
  lines.push(`// compiled_at: ${new Date().toISOString()}`)
  lines.push('')

  // Work 头
  lines.push(`work "${result.name}" {`)

  // context 块
  for (const ctx of result.contexts) {
    lines.push(`${indent}context {`)
    if (ctx.attributes.goal) {
      lines.push(`${indent}${indent}goal = "${ctx.attributes.goal}";`)
    }
    if (ctx.attributes.max_iterations) {
      lines.push(`${indent}${indent}loop_policy {`)
      lines.push(`${indent}${indent}${indent}max_iterations = ${ctx.attributes.max_iterations};`)
      lines.push(`${indent}${indent}}`)
    }
    if (ctx.content.length > 0) {
      lines.push(`${indent}${indent}constraints = [`)
      for (const c of ctx.content) {
        lines.push(`${indent}${indent}${indent}"${c}",`)
      }
      lines.push(`${indent}${indent}];`)
    }
    lines.push(`${indent}}`)
  }

  // tasks 块
  for (const task of result.tasks) {
    const taskId = task.attributes.id ?? task.attributes.name ?? 'unnamed-task'
    lines.push('')
    lines.push(`${indent}task "${taskId}" {`)

    if (task.attributes.domain) {
      lines.push(`${indent}${indent}domain "${task.attributes.domain}";`)
    }
    if (task.attributes.blueprint) {
      lines.push(`${indent}${indent}blueprint "${task.attributes.blueprint}";`)
    }
    if (task.attributes.deps) {
      lines.push(`${indent}${indent}deps = ${task.attributes.deps};`)
    }

    // parts（从 content 推断）
    for (const line of task.content) {
      lines.push(`${indent}${indent}// ${line}`)
    }
    lines.push(`${indent}}`)
  }

  lines.push('}')

  return lines.join('\n')
}

/**
 * Task → .oxn
 *
 * .oxn 格式（参考 examples/works/develop-member/tasks/<name>/task.oxn）：
 * ```
 * task "step1" {
 *   domain "X";
 *   blueprint "Y";
 *   part "develop" {
 *     skill_context = "...";
 *   }
 *   deps = [];
 * }
 * ```
 */
function compileTask(
  result: { name: string; content: string; contentHash: string; blockType?: string },
  options: CompileOptions,
  indent: string,
): string {
  const lines: string[] = []

  lines.push(`// source_hash: ${options.mdContentHash}`)
  lines.push(`// compiled_at: ${new Date().toISOString()}`)
  lines.push('')

  lines.push(`task "${result.name}" {`)
  lines.push(`${indent}// Auto-generated from .md`)
  lines.push(`${indent}// Edit .md instead of .oxn to prevent drift`)
  lines.push('}')

  return lines.join('\n')
}

/**
 * Proof → .oxn
 *
 * .oxn 格式：
 * ```
 * proof "feature-x" {
 *   verdict = "PASSED";
 * }
 * ```
 */
function compileProof(
  result: { name: string; content: string; contentHash: string; blockType?: string },
  options: CompileOptions,
  indent: string,
): string {
  const lines: string[] = []

  lines.push(`// source_hash: ${options.mdContentHash}`)
  lines.push(`// compiled_at: ${new Date().toISOString()}`)
  lines.push('')

  lines.push(`proof "${result.name}" {`)
  lines.push(`${indent}// Auto-generated from verdict.md`)
  lines.push('}')

  return lines.join('\n')
}

// ========================
// 辅助函数
// ========================

/**
 * 从 probe content 提取 type: shell-exec
 */
function extractProbeType(content: string[]): string | null {
  for (const line of content) {
    const colonIdx = line.indexOf(':')
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim()
      const value = line.slice(colonIdx + 1).trim()
      if (key === 'type' && value) {
        return value
      }
    }
  }
  return null
}

// ========================
// 编译 + 写盘
// ========================

/**
 * 编译并写盘
 *
 * 完整流程：
 * 1. 编译 .oxn 文本
 * 2. 计算 .oxn contentHash
 * 3. 写 .oxn 文件（chmod 0o444）
 * 4. 更新 source hash 映射
 */
export interface CompileAndWriteOptions extends CompileOptions {
  /** .oxn 输出路径 */
  oxnPath: string
  /** .md 路径（用于映射表）*/
  mdPath: string
  /** .md 内容（用于重新计算 hash）*/
  mdContent: string
  /** 项目根目录（用于映射表存储）*/
  projectRoot?: string
}

export interface CompileAndWriteResult {
  oxnPath: string
  oxnContent: string
  oxnHash: string
  mdHash: string
  mapping: import('./oxl-md-source-hash.js').SourceHashMapping
}

export function compileAndWriteMdToOxn(
  parseResult: DomainParseResult | BlueprintParseResult | WorkParseResult,
  options: CompileAndWriteOptions,
): CompileAndWriteResult {
  // 1. 编译
  const compiled = compileMdToOxn(parseResult, options)

  // 2. 计算 .oxn hash
  const oxnHash = computeContentHash(compiled.oxn)
  const mdHash = computeContentHash(options.mdContent)

  // 3. 写 .oxn 文件
  // 写文件（chmod 0o444 防手工编辑）
  // 由调用方处理（compileAndWrite 是纯函数）

  // 4. 更新映射
  const mapping: import('./oxl-md-source-hash.js').SourceHashMapping = {
    mdPath: options.mdPath,
    oxnPath: options.oxnPath,
    mdContentHash: mdHash,
    oxnSourceHash: mdHash, // 一致
    lastSyncedAt: Date.now(),
    syncCount: 1,
  }

  return {
    oxnPath: options.oxnPath,
    oxnContent: compiled.oxn,
    oxnHash,
    mdHash,
    mapping,
  }
}
