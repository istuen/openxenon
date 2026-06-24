/**
 * md-bridge/compilers/proof-compiler.ts — Proof EntityCompiler 实现
 *
 * v0.3 改革 PR-A（feat/v0.3-t18-md-native-grammar）
 *
 * 角色：
 * - 编译：Langium ProofDeclaration → .md（## Verdicts / ## Runtime + ### 实例 + 列表）
 * - 解析：mdast → 业务对象（verdicts / runtime）
 * - 校验：H1 + H2 白名单 + H3 唯一性 + Q2/Q3 canonical 守卫
 *
 * 关键不变量：
 * - H2 分类白名单：Verdicts / Runtime
 * - Verdict 字段：type（pass/fail/inconclusive 三态）/ value
 * - Runtime 字段：observed_at / probes_run / probes_passed / probes_inconclusive
 *
 * Q1 决策（v0.3.0 锁死）：3 态命名分层
 * - canonical .md（人类阅读）：lowercase `pass` / `fail` / `inconclusive`
 * - frozen.json（机器内核）：uppercase `PASSED` / `FAILED` / `INCONCLUSIVE`
 * - Kernel ProbeVerdict：uppercase `PASS` / `FAIL` / `INCONCLUSIVE`（无 -ED）
 * - 映射边界在 src/cli/proof-frozen-writer.ts 与 oxn proof compile/run
 *
 * Q2 决策（v0.3.0 锁死）：`probes_failed` 必须拒绝（数据冗余是万恶之源）
 * - 推导公式：failed = probes_run - probes_passed - probes_inconclusive
 * - 用户若写 `- probes_failed: X`，抛 `E_MD_REDUNDANT_FIELD` 引导纠正
 *
 * Q3 决策（v0.3.0 锁死）：`## Runtime` 下必须**唯一**一个 H3 = `snapshot`
 * - Runtime 描述「这一次验证结束时的聚合状态」，天然单态
 * - 多个 H3（如 initial/final）属于 frozen.json probes[] 数组职责，不入 .md
 * - 其他 H3 名或 0 个 H3 均抛 `E_MD_INVALID_RUNTIME_BLOCK`
 *
 * L0–L3 兼容性：
 * - L1-OXL 层（src/oxl/md-bridge/）
 */

import type {
  EntityCompiler,
  CompileInput,
  CompileOutput,
  ParseInput,
  ValidationInput,
  ValidationError,
} from '../entity-compiler.js'
import { extractHeadingContexts, findH1 } from '../extract-headings.js'
import { extractListFields, getScalar } from '../extract-list-fields.js'
import type { IntentEntityType } from '../pipeline.js'

/** Proof H2 分类白名单 */
const PROOF_CATEGORIES = ['Verdicts', 'Runtime'] as const
type ProofCategory = (typeof PROOF_CATEGORIES)[number]

/** Verdict 三态 */
export type VerdictType = 'pass' | 'fail' | 'inconclusive'

export class ProofCompiler implements EntityCompiler {
  readonly entityType: IntentEntityType = 'proof'

  // ====================
  // compile（PR-B 完整实现；PR-A 仅占位）
  // ====================

  compile(input: CompileInput): CompileOutput {
    const decl = input.decl as {
      $type?: string
      name?: string
      verdicts?: Array<{ name: string; type: VerdictType; value?: string }>
      runtime?: { observedAt?: string; probesRun?: number; probesPassed?: number; probesInconclusive?: number }
    }

    if (!decl || decl.$type !== 'ProofDeclaration') {
      throw new Error(`ProofCompiler.compile: expected ProofDeclaration, got ${decl?.$type}`)
    }

    const name = decl.name ?? 'unnamed'
    const version = input.options?.version ?? '0.3.0'
    const includeFrontmatter = input.options?.frontmatter ?? true
    const warnings: string[] = []

    const sections: string[] = []

    if (includeFrontmatter) {
      sections.push('---')
      sections.push('entity: proof')
      sections.push(`version: ${version}`)
      sections.push(`name: ${name}`)
      sections.push('---')
      sections.push('')
    }

    sections.push(`# Proof: ${name}`)
    sections.push('')

    if (decl.verdicts && decl.verdicts.length > 0) {
      sections.push('## Verdicts')
      sections.push('')
      for (const v of decl.verdicts) {
        sections.push(`### ${v.name}`)
        sections.push(`- type: ${v.type}`)
        if (v.value) sections.push(`- value: ${v.value}`)
        sections.push('')
      }
    }

    if (decl.runtime) {
      sections.push('## Runtime')
      sections.push('')
      sections.push('### snapshot')
      if (decl.runtime.observedAt) sections.push(`- observed_at: ${decl.runtime.observedAt}`)
      if (decl.runtime.probesRun !== undefined) sections.push(`- probes_run: ${decl.runtime.probesRun}`)
      if (decl.runtime.probesPassed !== undefined) sections.push(`- probes_passed: ${decl.runtime.probesPassed}`)
      if (decl.runtime.probesInconclusive !== undefined)
        sections.push(`- probes_inconclusive: ${decl.runtime.probesInconclusive}`)
      sections.push('')
    }

    const md =
      sections
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n'

    return { md, name, warnings }
  }

  // ====================
  // parse（实路径）
  // ====================

  parse(input: ParseInput): Record<string, unknown> {
    const { mdast, frontmatter, options, filePath: _filePath } = input

    if (options?.allowLegacyDirective !== true) {
      const legacy = findLegacyIntentBlocks(mdast)
      if (legacy.length > 0) {
        throw new Error(
          `E_MD_DEPRECATED_SYNTAX: ${legacy.length} legacy :::intent block(s) found. ` +
            `Syntax deprecated in v0.3.0. Please use \`oxn proof compile\` to generate fresh .md.`,
        )
      }
    }

    const contexts = extractHeadingContexts(mdast)

    const verdicts: Array<{ name: string; type: VerdictType; value: string }> = []
    let runtime: {
      observed_at: string
      probes_run: number
      probes_passed: number
      probes_inconclusive: number
    } | null = null

    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      if (!isProofCategory(ctx.h2)) continue

      const fields = ctx.h3List ? extractListFields(ctx.h3List) : []

      switch (ctx.h2 as ProofCategory) {
        case 'Verdicts': {
          const type = (getScalar(fields, 'type') ?? 'inconclusive') as VerdictType
          verdicts.push({
            name: ctx.h3,
            type: isValidVerdictType(type) ? type : 'inconclusive',
            value: getScalar(fields, 'value') ?? '',
          })
          break
        }
        case 'Runtime':
          runtime = {
            observed_at: getScalar(fields, 'observed_at') ?? '',
            probes_run: Number(getScalar(fields, 'probes_run') ?? '0') || 0,
            probes_passed: Number(getScalar(fields, 'probes_passed') ?? '0') || 0,
            probes_inconclusive: Number(getScalar(fields, 'probes_inconclusive') ?? '0') || 0,
          }
          break
      }
    }

    return {
      entity: 'proof',
      name: typeof frontmatter.name === 'string' ? frontmatter.name : '',
      version: typeof frontmatter.version === 'string' ? frontmatter.version : '0.3.0',
      verdicts,
      runtime,
    }
  }

  // ====================
  // validate（实路径）
  // ====================

  validate(input: ValidationInput): ValidationError[] {
    const errors: ValidationError[] = []
    const { mdast, frontmatter, filePath: _filePath } = input

    const h1 = findH1(mdast)
    if (!h1) {
      errors.push({
        code: 'E_MD_H1_MISSING',
        message: 'Missing H1 heading (e.g., `# Proof: name`)',
        severity: 'error',
      })
      return errors
    }

    const fmName = typeof frontmatter.name === 'string' ? frontmatter.name : ''
    if (h1.entity === 'Proof' && h1.name !== fmName) {
      errors.push({
        code: 'E_MD_H1_MISMATCH',
        message: `H1 '${h1.text}' does not match frontmatter.name '${fmName}'`,
        severity: 'error',
        line: h1.position?.line,
        column: h1.position?.column,
      })
    }

    const contexts = extractHeadingContexts(mdast)
    for (const ctx of contexts) {
      if (ctx.h2 && !isProofCategory(ctx.h2)) {
        errors.push({
          code: 'E_MD_CATEGORY_UNKNOWN',
          message:
            `Unknown H2 category '${ctx.h2}' for entity type 'proof'. ` + `Allowed: ${PROOF_CATEGORIES.join(', ')}`,
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      }
    }

    const h3Seen = new Map<string, { name: string; line: number }>()
    for (const ctx of contexts) {
      if (!ctx.h2 || !ctx.h3) continue
      const key = `${ctx.h2}::${ctx.h3}`
      if (h3Seen.has(key)) {
        const first = h3Seen.get(key)!
        errors.push({
          code: 'E_MD_DUPLICATE_H3',
          message: `Duplicate H3 '${ctx.h3}' in '## ${ctx.h2}' (first seen at line ${first.line})`,
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      } else {
        h3Seen.set(key, { name: ctx.h3, line: ctx.h3Position?.line ?? 0 })
      }
    }

    // v0.3.0 Q3 决策：## Runtime 必须唯一一个 H3 = `snapshot`
    const runtimeContexts = contexts.filter((c) => c.h2 === 'Runtime' && c.h3)
    if (runtimeContexts.length === 0) {
      errors.push({
        code: 'E_MD_INVALID_RUNTIME_BLOCK',
        message:
          "## Runtime must contain exactly one H3 named 'snapshot'. " +
          'Found: 0 H3 blocks. Rename or restructure to add `### snapshot`.',
        severity: 'error',
      })
    } else if (runtimeContexts.length > 1) {
      const names = runtimeContexts.map((c) => `### ${c.h3}`).join(', ')
      errors.push({
        code: 'E_MD_INVALID_RUNTIME_BLOCK',
        message:
          "## Runtime must contain exactly one H3 named 'snapshot'. " +
          `Found ${runtimeContexts.length} H3 blocks: ${names}. ` +
          'Merge into a single `### snapshot` block.',
        severity: 'error',
        line: runtimeContexts[1]?.h3Position?.line,
      })
    } else if (runtimeContexts[0]?.h3 !== 'snapshot') {
      const found = runtimeContexts[0]?.h3 ?? 'unknown'
      errors.push({
        code: 'E_MD_INVALID_RUNTIME_BLOCK',
        message:
          "## Runtime H3 must be named 'snapshot'. " +
          `Found: '### ${found}' at line ${runtimeContexts[0]?.h3Position?.line ?? '?'}. ` +
          "Rename to '### snapshot' or restructure.",
        severity: 'error',
        line: runtimeContexts[0]?.h3Position?.line,
      })
    }

    // v0.3.0 Q2 决策：probes_failed 必须拒绝（推导字段）
    // 推导公式：probes_failed = probes_run - probes_passed - probes_inconclusive
    for (const ctx of runtimeContexts) {
      if (!ctx.h3List) continue
      const fields = extractListFields(ctx.h3List)
      const redundantField = fields.find((f) => f.key === 'probes_failed')
      if (redundantField) {
        errors.push({
          code: 'E_MD_REDUNDANT_FIELD',
          message:
            "Field 'probes_failed' is derived " +
            '(probes_run - probes_passed - probes_inconclusive). ' +
            'Do not write it explicitly in ## Runtime / ### snapshot. ' +
            'Remove this line and the verifier will compute it automatically.',
          severity: 'error',
          line: ctx.h3Position?.line,
        })
      }
    }

    return errors
  }
}

// ========================
// 辅助
// ========================

function isProofCategory(cat: string): cat is ProofCategory {
  return (PROOF_CATEGORIES as readonly string[]).includes(cat)
}

function isValidVerdictType(t: string): t is VerdictType {
  return t === 'pass' || t === 'fail' || t === 'inconclusive'
}

/**
 * 查找遗留 :::intent 容器指令（v0.3 改革前的旧语法）
 * v0.3 PR-B：统一在 pipeline.ts 检测
 */
import { findLegacyIntentBlocks } from './_legacy-detect.js'
export { findLegacyIntentBlocks }
