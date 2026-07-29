/**
 * `oxn draft` — Draft 体系 v1 CLI (v0.6.2)
 *
 * 设计来源：.openxenon/drafts/draft-system-design-grilling.md §4.1
 * 4 子命令：create / list / archive / discard
 *
 * 关键决策（Q-S1..Q-S7）：
 *   - --prefix 用于文件名前缀（不是 frontmatter 字段）
 *   - 无 Template、无 frontmatter、无 Probe
 *   - 默认目录 .openxenon/drafts/（.oxnrc draftDir 可配）
 *   - archive → .archived/；discard → 物理删除（需 --force）
 */

import { defineCommand } from 'citty'
import {
  createDraft,
  listDrafts,
  archiveDraft,
  discardDraft,
  DRAFT_PREFIXES,
  type DraftPrefix,
} from '@openxenon/engine/Draft'
import { readProjectConfig } from './project-config-io'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function loadDraftConfig(): { draftDir?: string } {
  try {
    const cfg = readProjectConfig(getProjectRoot())
    if (cfg == null) return {}
    return { draftDir: cfg.draftDir }
  } catch {
    return {}
  }
}

function isDraftPrefix(value: string): value is DraftPrefix {
  return (DRAFT_PREFIXES as readonly string[]).includes(value)
}

export default defineCommand({
  meta: {
    name: 'draft',
    description:
      'Draft 工作稿管理：create / list / archive / discard（设计见 .openxenon/drafts/draft-system-design-grilling.md）',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: '创建空白 Draft（无 Template / frontmatter / Probe）' },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（kebab-case 或 camelCase）' },
        prefix: {
          type: 'string',
          description: `DraftType 前缀（影响文件名：<prefix>-<name>.md）。可选：${DRAFT_PREFIXES.join(' | ')}`,
        },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const prefixRaw = ctx.args.prefix as string | undefined
        const prefix = prefixRaw == null || prefixRaw === '' ? null : prefixRaw
        if (prefix != null && !isDraftPrefix(prefix)) {
          outputUserInputError(
            'OXN_DRAFT_INVALID_PREFIX',
            `Invalid --prefix "${prefix}". Valid: ${DRAFT_PREFIXES.join(', ')}`,
          )
          return
        }
        const config = loadDraftConfig()
        const result = createDraft(
          { projectRoot: getProjectRoot(), name, prefix: prefix as DraftPrefix | null },
          config,
        )
        if (!result.ok) {
          outputError(
            {
              code: result.code,
              message: result.message,
              ...(result.suggestion ? { suggestion: result.suggestion } : {}),
            },
            format,
          )
          return
        }
        const filename = result.prefix ? `${result.prefix}-${result.name}.md` : `${result.name}.md`
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: { name: result.name, prefix: result.prefix, path: result.path, filename },
              human: `✓ Created draft: ${result.path}`,
            },
            format,
          )
        }
        console.log(`✓ Created draft: ${result.path}`)
      },
    }),

    list: defineCommand({
      meta: { name: 'list', description: '列出 .openxenon/drafts/ 下所有 Draft（默认仅 active）' },
      args: {
        'include-archived': { type: 'boolean', description: '同时列出 .archived/ 下的 Draft' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const includeArchived = ctx.args['include-archived'] === true
        const config = loadDraftConfig()
        const result = listDrafts({ projectRoot: getProjectRoot(), includeArchived }, config)
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: { drafts: result.drafts, count: result.drafts.length },
              human: formatHumanList(result.drafts),
            },
            format,
          )
        }
        console.log(formatHumanList(result.drafts))
      },
    }),

    archive: defineCommand({
      meta: { name: 'archive', description: '把 Draft 移到 .archived/（保留历史，标记不再活跃）' },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（可省略 prefix）' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const config = loadDraftConfig()
        const result = archiveDraft({ projectRoot: getProjectRoot(), name }, config)
        if (!result.ok) {
          outputError(
            {
              code: result.code,
              message: result.message,
              ...(result.suggestion ? { suggestion: result.suggestion } : {}),
            },
            format,
          )
          return
        }
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: { archivedPath: result.archivedPath },
              human: `✓ Archived: ${result.archivedPath}`,
            },
            format,
          )
        }
        console.log(`✓ Archived: ${result.archivedPath}`)
      },
    }),

    discard: defineCommand({
      meta: { name: 'discard', description: '物理删除 Draft（需 --force；先 active 后 archive）' },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（可省略 prefix）' },
        force: { type: 'boolean', description: '必填 — 跳过确认（destructive 操作）' },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const force = ctx.args.force === true
        if (!force) {
          outputUserInputError(
            'OXN_DRAFT_DISCARD_FORCE_REQUIRED',
            'discard is destructive; pass --force to confirm. Use `oxn draft archive <name>` if you want to preserve history.',
          )
          return
        }
        const config = loadDraftConfig()
        const result = discardDraft({ projectRoot: getProjectRoot(), name, force: true }, config)
        if (!result.ok) {
          outputError(
            {
              code: result.code,
              message: result.message,
              ...(result.suggestion ? { suggestion: result.suggestion } : {}),
            },
            format,
          )
          return
        }
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: { deletedPath: result.deletedPath },
              human: `✓ Discarded: ${result.deletedPath}`,
            },
            format,
          )
        }
        console.log(`✓ Discarded: ${result.deletedPath}`)
      },
    }),
  },
})

function formatHumanList(
  drafts: Array<{ name: string; prefix: string | null; size: number; mtime: string; archived: boolean }>,
): string {
  if (drafts.length === 0) return '(no drafts)'
  const lines: string[] = []
  lines.push('| name | prefix | size | mtime | archived |')
  lines.push('|---|---|---|---|---|')
  for (const d of drafts) {
    const archived = d.archived ? 'yes' : ''
    const size = `${d.size}B`
    lines.push(`| ${d.name} | ${d.prefix ?? ''} | ${size} | ${d.mtime} | ${archived} |`)
  }
  return lines.join('\n')
}
