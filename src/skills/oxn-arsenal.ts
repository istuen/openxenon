import type { OpenXenonSkill } from './types'
import { arsenalListStandards, arsenalLoadStandardByName } from '../arsenals/loader'
import { getProjectBoundaryPath } from '../kernel'
import { parse as parseYaml } from 'yaml'

function yamlToMd(name: string, type: string, yaml: string): string {
  let parsed: Record<string, unknown>
  try {
    parsed = parseYaml(yaml) as Record<string, unknown>
  } catch {
    return `## ${name}\n\n❌ YAML 解析失败`
  }

  const lines: string[] = []
  lines.push(`# ${name}`)
  lines.push('')
  lines.push(`**类型**: ${type}`)
  lines.push(`**名称**: ${name}`)
  lines.push('')

  if (parsed.description) {
    lines.push(`## 描述`)
    lines.push('')
    lines.push(String(parsed.description))
    lines.push('')
  }

  if (parsed.target) {
    const target = parsed.target as Record<string, unknown>
    lines.push(`## 目标`)
    lines.push('')
    if (target.description) {
      lines.push(String(target.description))
    }
    lines.push('')
  }

  if (parsed.spec) {
    const spec = parsed.spec as Record<string, unknown>
    lines.push(`## 规格`)
    lines.push('')
    if (spec.description) {
      lines.push(String(spec.description))
    }
    lines.push('')
  }

  if (parsed.probes) {
    const probes = parsed.probes as Array<Record<string, unknown>>
    lines.push(`## 探针`)
    lines.push('')
    for (const probe of probes) {
      lines.push(`### ${probe.type || probe.ref || 'unknown'}`)
      lines.push('')
      if (probe.params) {
        lines.push('**参数**:')
        lines.push('```json')
        lines.push(JSON.stringify(probe.params, null, 2))
        lines.push('```')
        lines.push('')
      }
      if (probe.ref) {
        lines.push(`**引用**: ${probe.ref}`)
        lines.push('')
      }
    }
  }

  if (parsed.props) {
    const params = parsed.props as Array<Record<string, unknown>>
    lines.push(`## 参数定义`)
    lines.push('')
    lines.push('| 名称 | 类型 | 必填 | 描述 |')
    lines.push('|------|------|------|------|')
    for (const p of params) {
      const pName = String(p.name || '')
      const pType = String(p.type || 'string')
      const pRequired = p.required ? '是' : '否'
      const pDesc = String(p.description || '-')
      lines.push(`| ${pName} | ${pType} | ${pRequired} | ${pDesc} |`)
    }
    lines.push('')
  }

  if (parsed.action) {
    const action = parsed.action as Record<string, unknown>
    lines.push(`## 执行动作`)
    lines.push('')
    if (action.instruction) {
      lines.push(`**指令**: ${action.instruction}`)
      lines.push('')
    }
    if (action.command) {
      lines.push(`**命令**: ${action.command}`)
      lines.push('')
    }
  }

  return lines.join('\n')
}

function formatStats(): string {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const allAssets = arsenalListStandards('fallback', projectBoundary)

  const stats: Record<string, { total: number; canonical: number; draft: number }> = {}

  for (const asset of allAssets) {
    if (!stats[asset.type]) {
      stats[asset.type] = { total: 0, canonical: 0, draft: 0 }
    }
    stats[asset.type].total++
    if (asset.state === 'canonical') {
      stats[asset.type].canonical++
    } else {
      stats[asset.type].draft++
    }
  }

  const lines: string[] = []
  lines.push(`# Arsenal 资产统计`)
  lines.push('')
  lines.push(`**项目**: ${projectBoundary}`)
  lines.push('')
  lines.push(`总计: ${allAssets.length} 个资产`)
  lines.push('')

  for (const [type, counts] of Object.entries(stats)) {
    lines.push(`## ${type}`)
    lines.push('')
    lines.push(`- 总计: ${counts.total}`)
    lines.push(`- Canonical: ${counts.canonical}`)
    lines.push(`- Draft: ${counts.draft}`)
    lines.push('')
  }

  return lines.join('\n')
}

export const oxnArsenalSkill: OpenXenonSkill = {
  id: 'oxn-arsenal',
  description: '查看和管理 Arsenal 标准资产（查看统计、读取内容）',
  instruction: `# /oxn-arsenal — Arsenal 资产管理

你是 OpenXenon 的资产管理员。当你收到工程师的请求时：

## 统计模式（未提供具体资产）

当工程师只请求"查看资产"时，展示统计信息：

**执行命令**：
\`\`\`bash
oxn arsenal list
\`\`\`

将输出转换为 Markdown 格式的人类可读统计报告。

## 读取模式（提供了 type 和 name）

当工程师请求查看某个具体资产时（如 \`查看 fs_exists probe\`）：

**执行命令**：
\`\`\`bash
oxn arsenal inspect <type>/<name>
\`\`\`

例如：
- \`oxn arsenal inspect probes/fs_exists\` — 读取 fs_exists 探针
- \`oxn arsenal inspect parts/run-build-and-test\` — 读取 run-build-and-test 工序
- \`oxn arsenal inspect blueprints/verify-readme\` — 读取 verify-readme 蓝图

## 输出格式

将 YAML 内容转化为人类可读的 Markdown 格式：

\`\`\`markdown
# 资产名称
**类型**: probes/blueprints/parts
**名称**: xxx

## 描述
资产的功能描述

## 目标（若有）
目标描述

## 探针（若有）
### probe_type
**参数**: JSON 格式的参数
\`\`\`

## 约束

- 必须读取实际文件内容，不能假设
- 探针参数用 JSON 格式展示
- 如果资产不存在，提示工程师检查名称是否正确
`,
  examples: {
    '查看所有资产统计': '/oxn-arsenal 查看所有资产',
    '读取特定探针': '/oxn-arsenal probes/fs_exists',
    '读取特定工序': '/oxn-arsenal parts/run-build-and-test',
    '读取特定蓝图': '/oxn-arsenal blueprints/verify-readme'
  }
}