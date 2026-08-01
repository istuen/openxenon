// =============================================================================
// Tool Command Resolver (RFC-0015 D5.1+D5.2+D5.3)
//
// 4 个 tool-binding probe (test-pass / ts-compiles / lint-check / docs-build)
// 通过此 helper 派生最终 shell command:
//   - 优先读 ProbeContext.stackTools 中匹配 tool 的 command
//   - role 容错匹配 (e.g. 'role: runtime + test runner' 含 'test runner' 关键词匹配 test-pass)
//   - 未匹配走 fallback (BWC, 项目未配置 stackTools 时不变)
//
// 边界:
//   - L0 Kernel 严格: 不做 fs/net IO, pure function (从 context 透传 stackTools)
//   - 输入只依赖 context.stackTools (已在 L0-Contract 声明)
//   - 不引入 fs / shell / network, 无副作用
// =============================================================================

import type { ProbeContextBase, StackToolInfo } from '@openxenon/engine/kernel/index'

export interface ResolveToolCommandOpts {
  /**
   * 工具名（精确匹配 context.stackTools[].name）。
   * 若未指定或未匹配, 尝试 role 容错匹配（见 roleKeyword）。
   */
  toolName?: string
  /**
   * role 容错匹配关键词（substring 匹配 tool.role）。
   * 例如 'test' / 'lint' / 'runtime' / 'doc'。
   * 多个关键词: 命中任一即可。
   */
  roleKeyword?: string[]
  /**
   * BWC fallback: 未匹配时返回此字符串。
   */
  fallback: string
}

/**
 * 从 ProbeContext.stackTools 派生 tool command。
 *
 * @returns 最终 shell command (tool.command 优先, fallback 兜底).
 *
 * @example
 *   resolveToolCommand(ctx, { toolName: 'bun-test', fallback: 'bun test' })
 *   // stackTools=[{ name:'bun-test', command:'bun test --bail' }] → 'bun test --bail'
 *   // stackTools=[] 或 undefined → 'bun test' (fallback)
 */
export function resolveToolCommand(context: ProbeContextBase, opts: ResolveToolCommandOpts): string {
  const tools = context.stackTools
  if (!tools || tools.length === 0) {
    return opts.fallback
  }

  // 1. toolName 精确匹配
  if (opts.toolName) {
    const matched = tools.find((t: StackToolInfo) => t.name === opts.toolName)
    if (matched?.command) {
      return matched.command
    }
  }

  // 2. role 容错匹配
  if (opts.roleKeyword && opts.roleKeyword.length > 0) {
    for (const t of tools) {
      if (!t.role || !t.command) continue
      const roleLower = t.role.toLowerCase()
      if (opts.roleKeyword.some((k) => roleLower.includes(k.toLowerCase()))) {
        return t.command
      }
    }
  }

  // 3. fallback (BWC)
  return opts.fallback
}
