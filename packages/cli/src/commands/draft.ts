/**
 * `oxn draft` — Draft 体系 v2 CLI (v0.6.2-alpha.3)
 *
 * 设计来源：
 *   - .openxenon/drafts/draft-system-design-grilling.md §4.1
 *   - .openxenon/assets/domains/oxn-draft-domain.md
 *   - .openxenon/assets/domains/oxn-draft-promote-domain.md
 *   - .openxenon/assets/blueprints/draft-promote-router.md
 *   - .openxenon/assets/blueprints/promote-target-aware-workflow.md
 *
 * 6 子命令：create / list / archive / discard / promote / retarget
 *   - v0.6.2: create / list / archive / discard (4)
 *   - v0.6.2-alpha.3: promote / retarget (2)
 *
 * 关键决策（v0.6.2 Q-S1..Q-S7 + v0.6.2-alpha.3 新增）：
 *   - --prefix 用于文件名前缀（不是 frontmatter 字段）
 *   - v0.6.2: 无 Template、无 frontmatter、无 Probe
 *   - v0.6.2-alpha.3: --target 模式派 skeleton（带 frontmatter hint）
 *   - 默认目录 .openxenon/drafts/（.oxnrc draftDir 可配）
 *   - archive → .archived/；discard → 物理删除（需 --force）
 *   - promote → 走 draft-promote-router Blueprint（4 阶段）
 *   - retarget → 显式 retarget（不允许直接编辑 frontmatter 改 promote-target）
 */

import { defineCommand } from 'citty'
import {
  createDraft,
  listDrafts,
  archiveDraft,
  discardDraft,
  promoteDraft,
  retargetDraft,
  DRAFT_PREFIXES,
  DRAFT_TARGETS,
  ASSET_KINDS,
  type DraftPrefix,
  type DraftTarget,
  type DraftAssetKind,
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

function isDraftTarget(value: string): value is DraftTarget {
  return (DRAFT_TARGETS as readonly string[]).includes(value)
}

function isAssetKind(value: string): value is DraftAssetKind {
  return (ASSET_KINDS as readonly string[]).includes(value)
}

export default defineCommand({
  meta: {
    name: 'draft',
    description: 'Draft 工作稿管理：create / list / archive / discard / promote / retarget（v0.6.2-alpha.3+）',
  },
  subCommands: {
    create: defineCommand({
      meta: {
        name: 'create',
        description: '创建 Draft（默认空白；--target/<rfc|asset|work> 模式从 skeleton 派生带 frontmatter）',
      },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（kebab-case 或 camelCase）' },
        prefix: {
          type: 'string',
          description: `DraftType 前缀（影响文件名：<prefix>-<name>.md）。可选：${DRAFT_PREFIXES.join(' | ')}`,
        },
        target: {
          type: 'string',
          description: `Promote target（v0.6.2-alpha.3+）。指定后从 skeleton 派生。可选：${DRAFT_TARGETS.join(' | ')}`,
        },
        kind: {
          type: 'string',
          description: `Asset kind（仅 target=asset 时）。可选：${ASSET_KINDS.join(' | ')}`,
        },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const prefixRaw = ctx.args.prefix as string | undefined
        const prefix = prefixRaw == null || prefixRaw === '' ? null : prefixRaw
        const targetRaw = ctx.args.target as string | undefined
        const target = targetRaw == null || targetRaw === '' ? null : targetRaw
        const kindRaw = ctx.args.kind as string | undefined
        const kind = kindRaw == null || kindRaw === '' ? null : kindRaw

        if (prefix != null && !isDraftPrefix(prefix)) {
          outputUserInputError(
            'OXN_DRAFT_INVALID_PREFIX',
            `Invalid --prefix "${prefix}". Valid: ${DRAFT_PREFIXES.join(', ')}`,
          )
          return
        }
        if (target != null && !isDraftTarget(target)) {
          outputUserInputError(
            'OXN_DRAFT_TARGET_INVALID',
            `Invalid --target "${target}". Valid: ${DRAFT_TARGETS.join(', ')}`,
          )
          return
        }
        if (kind != null && !isAssetKind(kind)) {
          outputUserInputError('OXN_DRAFT_KIND_INVALID', `Invalid --kind "${kind}". Valid: ${ASSET_KINDS.join(', ')}`)
          return
        }
        if (target === 'asset' && kind == null) {
          outputUserInputError(
            'OXN_DRAFT_KIND_REQUIRED',
            `--target=asset requires --kind. Valid: ${ASSET_KINDS.join(', ')}`,
          )
          return
        }

        const config = loadDraftConfig()
        const result = createDraft(
          {
            projectRoot: getProjectRoot(),
            name,
            prefix: prefix as DraftPrefix | null,
            target: target as DraftTarget | null,
            kind: kind as DraftAssetKind | null,
          },
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

    promote: defineCommand({
      meta: {
        name: 'promote',
        description:
          'Promote Draft → 3 类 Target（rfc / asset / work）。v0.6.2-alpha.3+ 走 draft-promote-router Blueprint。v0.6.3 NG6 起支持 --commit 实际写文件。',
      },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（可省略 prefix）' },
        target: {
          type: 'string',
          description: `显式覆盖 frontmatter promote-target。可选：auto | ${DRAFT_TARGETS.join(' | ')}。默认 auto（读 frontmatter）`,
        },
        'archive-after': { type: 'boolean', description: 'Promote 完成后自动 archive 原 Draft' },
        commit: {
          type: 'boolean',
          description: 'v0.6.3 NG6: 实际写目标文件（默认 false=仅返回 dispatch info）',
        },
        force: {
          type: 'boolean',
          description: 'v0.6.3 NG6: 覆盖已存在的目标文件（仅 --commit 时有效）',
        },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const targetOverrideRaw = ctx.args.target as string | undefined
        const archiveAfter = ctx.args['archive-after'] === true
        const commit = ctx.args.commit === true
        const force = ctx.args.force === true

        const targetOverride: DraftTarget | 'auto' | undefined =
          !targetOverrideRaw || targetOverrideRaw === ''
            ? 'auto'
            : targetOverrideRaw === 'auto'
              ? 'auto'
              : isDraftTarget(targetOverrideRaw)
                ? targetOverrideRaw
                : (() => {
                    outputUserInputError(
                      'OXN_DRAFT_TARGET_INVALID',
                      `Invalid --target "${targetOverrideRaw}". Valid: auto | ${DRAFT_TARGETS.join(', ')}`,
                    )
                    return undefined
                  })()
        if (targetOverride === undefined) return

        const config = loadDraftConfig()
        const result = promoteDraft(
          {
            projectRoot: getProjectRoot(),
            name,
            targetOverride,
            archiveAfter,
            commit,
            force,
          },
          config,
        )
        if (!result.ok) {
          outputError(
            {
              code: result.code,
              message: result.message,
              ...(result.suggestion ? { suggestion: result.suggestion } : {}),
              ...((result as { detail?: Record<string, unknown> }).detail
                ? { detail: (result as { detail: Record<string, unknown> }).detail }
                : {}),
            },
            format,
          )
          return
        }
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: {
                name: result.name,
                target: result.target,
                kind: result.kind,
                subTarget: result.subTarget,
                targetPath: result.targetPath,
                rfcNumber: result.rfcNumber,
                phases: result.phases,
                archived: result.archived,
              },
              human:
                result.phases.commit != null
                  ? `✓ Promoted: ${result.subTarget} → ${result.phases.commit.filePath} (${result.phases.commit.bytesWritten}B)`
                  : `✓ Promote dispatch: ${result.subTarget} → ${result.targetPath} (--commit required to write)`,
            },
            format,
          )
        }
        if (result.phases.commit != null) {
          // v0.6.3 NG6: 已实际写文件
          console.log(`✓ Promoted: ${result.subTarget} → ${result.phases.commit.filePath}`)
          console.log(`  Bytes: ${result.phases.commit.bytesWritten}`)
          console.log(`  Mode: ${result.phases.commit.created ? 'created' : 'overwritten'}`)
          if (result.rfcNumber) console.log(`  RFC: ${result.rfcNumber}`)
          console.log(`  Source Draft unchanged at: .openxenon/drafts/${result.name}.md`)
        } else {
          // v0.6.2-alpha.3: 仅 dispatch（不写）
          console.log(`✓ Promote dispatch: ${result.subTarget} → ${result.targetPath}`)
          console.log(`  Target: ${result.target}${result.kind ? ` (${result.kind})` : ''}`)
          console.log(`  Note: Pass --commit to actually write the target file.`)
        }
      },
    }),

    retarget: defineCommand({
      meta: {
        name: 'retarget',
        description: '重新派生 Draft skeleton with new target（v0.6.2-alpha.3+）。保留工程师已填内容。',
      },
      args: {
        name: { type: 'positional', required: true, description: 'Draft name（可省略 prefix）' },
        'new-target': {
          type: 'string',
          required: true,
          description: `New promote-target。必填：${DRAFT_TARGETS.join(' | ')}`,
        },
        'new-kind': {
          type: 'string',
          description: `New kind（仅 new-target=asset 时）。可选：${ASSET_KINDS.join(' | ')}`,
        },
      },
      async run(ctx) {
        const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
        const name = ctx.args.name as string
        const newTargetRaw = ctx.args['new-target'] as string
        const newKindRaw = ctx.args['new-kind'] as string | undefined

        if (!isDraftTarget(newTargetRaw)) {
          outputUserInputError(
            'OXN_DRAFT_TARGET_INVALID',
            `Invalid --new-target "${newTargetRaw}". Valid: ${DRAFT_TARGETS.join(', ')}`,
          )
          return
        }
        const newKind = newKindRaw == null || newKindRaw === '' ? null : newKindRaw
        if (newKind != null && !isAssetKind(newKind)) {
          outputUserInputError(
            'OXN_DRAFT_KIND_INVALID',
            `Invalid --new-kind "${newKind}". Valid: ${ASSET_KINDS.join(', ')}`,
          )
          return
        }
        if (newTargetRaw === 'asset' && newKind == null) {
          outputUserInputError(
            'OXN_DRAFT_KIND_REQUIRED',
            `--new-target=asset requires --new-kind. Valid: ${ASSET_KINDS.join(', ')}`,
          )
          return
        }

        const config = loadDraftConfig()
        const result = retargetDraft(
          {
            projectRoot: getProjectRoot(),
            name,
            newTarget: newTargetRaw as DraftTarget,
            newKind: newKind as DraftAssetKind | null,
          },
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
        if (format === 'json') {
          return output(
            {
              ok: true,
              data: {
                name: result.name,
                oldTarget: result.oldTarget,
                oldKind: result.oldKind,
                newTarget: result.newTarget,
                newKind: result.newKind,
                draftPath: result.draftPath,
                preservedContentChars: result.preservedContentChars,
              },
              human: `✓ Retargeted: ${result.oldTarget ?? '(none)'} → ${result.newTarget}${result.newKind ? ` (${result.newKind})` : ''}`,
            },
            format,
          )
        }
        console.log(
          `✓ Retargeted: ${result.oldTarget ?? '(none)'} → ${result.newTarget}${result.newKind ? ` (${result.newKind})` : ''}`,
        )
        console.log(`  Draft: ${result.draftPath}`)
        console.log(`  Preserved ${result.preservedContentChars} chars of engineer content`)
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
