// =============================================================================
// CLI Input Error Detector (v1.0 — Phase 3)
//
// 用途：CLI 顶层 catch 块在 4 档分流时，识别"明确的 CLI 参数错"（用户输错东西）。
//
// 重要说明：citty 对 CLI 参数错（缺 positional / 未知子命令 / 缺 required arg）不 throw，
//   而是直接调用 process.exit(1) + 在 stdout 打 USAGE 提示。
//   本函数主要在以下场景触发：
//     - runMain 主动 throw 的 citty 错误（罕见，多数走 process.exit）
//     - 顶层 catch 块捕获了未知 Error 后，尝试判断是不是 CLI 输入错
//
// 设计保守：宁可漏判（落到档 4 兜底 Crash），也不误判（把 IAPError 当成 CLI 输入错）。
// =============================================================================

/**
 * 判断一个 Error 是否是明确的 CLI 输入错。
 *
 * 识别策略（按优先级，宽松 → 严格）：
 *   1. 错误码以 `commander.` / `citty.` / `cli.` 开头
 *   2. 错误码以 `OXN_INVALID_CLI_ARGS` 开头（项目自定义 CLI 输入错）
 *   3. message 包含 citty 典型错误关键词
 *      - "Missing required argument"
 *      - "Missing required option"
 *      - "Unknown argument"
 *      - "Unknown command"
 *      - "Unknown option"
 *      - "Too many arguments"
 *      - "Too few arguments"
 *      - "Invalid argument"
 *      - "Invalid option"
 *
 * 注意：IAPError 与 OXNCrash 不在检测范围内（它们由对应守卫识别）。
 */
export function isCliInputError(err: unknown): boolean {
  if (err === null || err === undefined) return false
  if (typeof err !== 'object') return false

  // 优先 1: 错误码前缀
  if ('code' in err && typeof err.code === 'string') {
    const code = err.code
    if (
      code.startsWith('commander.') ||
      code.startsWith('citty.') ||
      code.startsWith('cli.') ||
      code === 'OXN_INVALID_CLI_ARGS' ||
      code.startsWith('OXN_INVALID_CLI_')
    ) {
      return true
    }
  }

  // 优先 2: citty 典型错误关键词
  if ('message' in err && typeof err.message === 'string') {
    const msg = err.message
    const CLI_KEYWORDS = [
      'Missing required argument',
      'Missing required option',
      'Unknown argument',
      'Unknown command',
      'Unknown option',
      'Too many arguments',
      'Too few arguments',
      'Invalid argument',
      'Invalid option',
    ]
    if (CLI_KEYWORDS.some((kw) => msg.includes(kw))) {
      return true
    }
  }

  return false
}
