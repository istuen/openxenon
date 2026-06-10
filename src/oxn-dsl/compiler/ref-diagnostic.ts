// =============================================================================
// ref-diagnostic.ts — PR-14
//
// 共享诊断条目：work.oxn 引用了不存在的 Domain/Blueprint 时，产出的软警告条目。
//
// 与 IAPError 字典 v1.1 的关系（命名空间物理隔离）：
//   - IAPError = 硬阻断 + action: YIELD_TO_HUMAN（AI 必须 yield）
//   - diagnostics = 软警告 + severity: warn | error（AI 可继续）
//   - 两者用不同的 code 字符串前缀区分：IAP_<AXIS>_<CODE> vs OXN_WORK_REFS_*
//
// 设计目的：
//   - 让 work context / run / migrate 在不硬失败的前提下，告知 AI 和工程师
//     "当前 work 引用了不存在的资产"；
//   - 不在 IAPError 字典 v1.1 中新增 code（保持字典 8+3=11 的纯粹性）；
//   - 与 work validate 已有的 `data.code: OXN_WORK_REFS_UNRESOLVED` 保持一致风格。
//
// 5 个 PR 共享（PR-14a/b/c/d/e）：
//   - PR-14b: context 响应 data.diagnostics
//   - PR-14c: run 响应 data.diagnostics + .run/state.json.diagnostics 持久化
//   - PR-14d: migrate 成功路径 data.diagnostics
// =============================================================================

import { z } from 'zod'

// ───────── Zod schema ─────────

export const RefDiagnosticSeveritySchema = z.enum(['warn', 'error'])
export type RefDiagnosticSeverity = z.infer<typeof RefDiagnosticSeveritySchema>

export const RefDiagnosticTypeSchema = z.enum(['domain', 'blueprint'])
export type RefDiagnosticType = z.infer<typeof RefDiagnosticTypeSchema>

export const RefDiagnosticSchema = z.object({
  code: z.string().min(1),
  severity: RefDiagnosticSeveritySchema,
  ref: z.string().min(1),
  type: RefDiagnosticTypeSchema,
  message: z.string().min(1),
  suggestion: z.string().min(1),
})
export type RefDiagnostic = z.infer<typeof RefDiagnosticSchema>

export const RefDiagnosticListSchema = z.array(RefDiagnosticSchema)

// ───────── 错误码常量（命名空间：OXN_WORK_REFS_*）─────────

/**
 * 域/蓝图 ref 未解析的统一错误码。
 * 业务流 OK 走 data 通道，不入 IAPError 字典。
 */
export const CODE_REFS_UNRESOLVED = 'OXN_WORK_REFS_UNRESOLVED' as const

// ───────── Builder helpers ─────────

/**
 * 构造"域文件缺失"的诊断条目。
 *
 * @param name       声明的 domain 名（PascalCase / kebab-case 任意）
 * @param ref        声明的 ref 字符串（`@prj/domains/X` 或裸名）
 * @param reason     失败原因（`domain file not found` / `@oxn/ scope has no builtin domain registry` / ...）
 */
export function buildDomainDiagnostic(name: string, ref: string | null, reason: string): RefDiagnostic {
  return {
    code: CODE_REFS_UNRESOLVED,
    severity: 'warn',
    ref: ref ?? name,
    type: 'domain',
    message: `Domain '${name}' declared but file not found: ${reason}`,
    suggestion: `Check domain name spelling, or run \`oxn domain create ${name}\``,
  }
}

/**
 * 构造"蓝图文件缺失"的诊断条目。
 */
export function buildBlueprintDiagnostic(name: string, ref: string | null, reason: string): RefDiagnostic {
  return {
    code: CODE_REFS_UNRESOLVED,
    severity: 'warn',
    ref: ref ?? name,
    type: 'blueprint',
    message: `Blueprint '${name}' declared but file not found: ${reason}`,
    suggestion: `Check blueprint name spelling, or run \`oxn blueprint create ${name}\``,
  }
}
