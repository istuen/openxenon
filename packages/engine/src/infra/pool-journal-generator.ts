// =============================================================================
// pool-journal-generator.ts (v0.2 Sprint 4 T8)
//
// 从单个 .openxenon/pools/research/<slug>.md 生成 journal 风格的简短摘要
// 父文档: §T4.2 — 供 oxn pool journal 命令 (v2 PoC) 使用
//
// L1-Infra 层 — 仅依赖 node:crypto / node:path / string 操作
// 不得 import 上层
// =============================================================================

/**
 * 从 markdown 内容生成 journal 风格的简短摘要 (供 `oxn pool journal` 之类命令展示)
 * 算法:
 *   1. 提取首个 ## 章节的标题
 *   2. 提取首段文字 (去除 markdown 标记: **, *, `, #, [link](url))
 *   3. 截断到 maxLength (默认 200 chars)
 */
export function generateJournalSnippet(content: string, maxLength = 200): string {
  // 1. 首个 ## 章节标题
  const headingMatch = content.match(/^##\s+(.+?)$/m)
  const heading = headingMatch?.[1]?.trim() ?? '(untitled)'

  // 2. 首段: 跳过 # 标题行, 取第一个非空段 (到空行)
  const lines = content.split('\n')
  let firstParagraph = ''
  let inFirstParagraph = false
  for (const line of lines) {
    const trimmed = line.trim()
    // 跳过 # 标题行
    if (trimmed.startsWith('#')) continue
    if (trimmed === '') {
      if (inFirstParagraph) break
      continue
    }
    firstParagraph = trimmed
    inFirstParagraph = true
  }

  // 3. 去除 markdown 标记
  const cleaned = firstParagraph
    .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
    .replace(/\*([^*]+)\*/g, '$1') // *italic* → italic
    .replace(/`([^`]+)`/g, '$1') // `code` → code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
    .replace(/^#+\s*/gm, '') // 残留 # 标题

  // 4. 截断
  const truncated = cleaned.length > maxLength ? `${cleaned.slice(0, maxLength - 1)}…` : cleaned

  return `${heading}\n${truncated}`
}
