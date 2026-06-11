/**
 * Exploration Reporter - Markdown 渲染器
 * 将 ExplorationResult 渲染为 Markdown
 * 纯函数，无任何 I/O
 */

import type { ExplorationResult, Finding } from '../../kernel/index'

/**
 * 将 ExplorationResult 渲染为 Markdown
 */
export function renderMarkdown(result: ExplorationResult): string {
  const lines: string[] = []

  lines.push(`# ${result.title}`)
  lines.push('')
  lines.push(`> 生成时间: ${new Date(result.generatedAt).toISOString()}`)
  lines.push(`> ${result.summary}`)
  lines.push('')

  // 按 level 分组
  const errors = result.findings.filter((f) => f.level === 'error')
  const warnings = result.findings.filter((f) => f.level === 'warning')
  const infos = result.findings.filter((f) => f.level === 'info')

  if (errors.length > 0) {
    lines.push('## 🔴 问题')
    lines.push('')
    for (const f of errors) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }

  if (warnings.length > 0) {
    lines.push('## 🟡 警告')
    lines.push('')
    for (const f of warnings) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }

  if (infos.length > 0) {
    lines.push('## 🟢 建议')
    lines.push('')
    for (const f of infos) {
      lines.push(formatFinding(f))
    }
    lines.push('')
  }

  if (result.findings.length === 0) {
    lines.push('✅ 未发现需要改进的地方。')
  }

  return lines.join('\n')
}

/**
 * 格式化单个 Finding
 */
function formatFinding(f: Finding): string {
  let line = `- **${f.message}**`
  if (f.location) {
    line += ` (\`${f.location}\`)`
  }
  if (f.suggestion) {
    line += `\n  - 💡 ${f.suggestion}`
  }
  return line
}
