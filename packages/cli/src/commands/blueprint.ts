// =============================================================================
// `oxn blueprint` — Blueprint 资产管理（v0.1.3 重写：slim 索引对齐 Domain）
//
// 4 子命令：
//   create         — 在 .openxenon/blueprints/ 生成新 blueprint 骨架
//   validate       — 解析 .oxn + 验签 + 落 .cache/blueprints.json 索引
//   list           — 读 .cache/blueprints.json 索引（AI 全局检索入口）
//                    索引缺失时降级到 dir 扫描（向后兼容老项目）
//   index          — 手动重建全局 slim 索引 → .openxenon/.cache/blueprints.json
//
// 与 oxn domain 对称设计（PR-X）：
//   - 触发点：init / create / validate / index — 四档一致
//   - 静默失败：autoRebuild 失败不阻断主流程（资产本身正确）
//   - list 走索引而非 dir 扫描（性能 + 一致性）
// =============================================================================

import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import { IAPError } from '@openxenon/engine/errors'
import { assertNameFileConsistent } from '@openxenon/engine/kernel'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
  resolveAssetDir,
} from '@openxenon/engine/infra/paths'
import { readProjectConfig } from './project-config-io'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractBlueprintIR } from '@openxenon/engine/oxl/md-pipeline/transformers/blueprint.js'
import { blueprintCreateTemplate } from '@openxenon/engine/Asset/blueprint-manager'
import {
  autoRebuildBlueprintIndex,
  getBlueprintIndexPath,
  loadBlueprintIndex,
  resolveBlueprintIndexPath,
  writeBlueprintIndex,
  type BlueprintIndex,
  type BlueprintIndexEntry,
} from '@openxenon/engine/oxl/compiler/blueprint-index-builder'

function getProjectRoot(): string {
  return process.cwd()
}

function getBlueprintsDir(): string {
  const config = readProjectConfig(getProjectRoot())
  return resolveAssetDir(getProjectRoot(), 'blueprint', config as Parameters<typeof resolveAssetDir>[2])
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

// v0.7.0: Only .md files are supported (Langium removed)

async function validateBlueprint(blueprintPath: string): Promise<{
  ok: boolean
  ir?: import('@openxenon/engine/oxl/md-pipeline/transformers/blueprint').BlueprintIR
  errors: string[]
}> {
  if (!existsSync(blueprintPath)) {
    return { ok: false, errors: [`blueprint file not found: ${blueprintPath}`] }
  }
  const content = readFileSync(blueprintPath, 'utf-8')
  try {
    const { tree, frontmatter: fm } = parseMarkdown(content)
    const ir = extractBlueprintIR(tree, fm)
    return { ok: true, ir, errors: [] }
  } catch (e) {
    return { ok: false, errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`] }
  }
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------
const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: t('blueprint.create.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('blueprint.create.name') },
    slots: {
      type: 'string',
      description: t('blueprint.create.slots'),
    },
    force: { type: 'boolean', alias: 'f', description: t('blueprint.create.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const slotsArg = (ctx.args.slots as string | undefined) ?? ''
    const force = ctx.args.force === true || ctx.args.f === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    const autoSync = resolveAutoSync(config)
    const blueprintsDir = getBlueprintsDir()

    if (!/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid blueprint name: ${JSON.stringify(name)}`,
          suggestion:
            'use kebab-case segments joined by / (e.g. "deploy-pipeline" or "infra/deploy-pipeline"); each segment: lowercase letters, digits, dashes; no leading/trailing/consecutive slashes',
        },
        format,
      )
    }

    const slotNames =
      slotsArg.trim() === ''
        ? ['stage-1', 'stage-2']
        : slotsArg
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)

    if (slotNames.length === 0) {
      return outputError(
        {
          code: 'OXN_INVALID_SLOTS',
          message: 'at least one slot name is required',
          suggestion: 'pass --slots stage-1,stage-2 (or omit to use the default)',
        },
        format,
      )
    }

    if (!existsSync(blueprintsDir)) {
      mkdirSync(blueprintsDir, { recursive: true })
    }

    // v0.5 Phase 3: 主路径由 config.assetFormat 决定
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'blueprint', name, assetFormat, config)
    const altPath = resolveAssetAltPath(projectRoot, 'blueprint', name, assetFormat, config)
    const primaryDir = join(primaryPath, '..')
    const altDir = join(altPath, '..')
    if (!existsSync(primaryDir)) mkdirSync(primaryDir, { recursive: true })
    if (!existsSync(altDir)) mkdirSync(altDir, { recursive: true })
    if (existsSync(primaryPath) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `blueprint file already exists: ${primaryPath}`, {
        suggestion: 'use --force / -f to overwrite',
        format,
      })
    }

    const slotBlocks: string[] = []
    for (let i = 0; i < slotNames.length; i++) {
      const slotName = slotNames[i]!
      const deps = i === 0 ? [] : [slotNames[i - 1]!]
      const depsStr = deps.length === 0 ? '[]' : `["${deps.join('", "')}"]`
      slotBlocks.push(`  slot "${slotName}" {\n    deps = ${depsStr}\n  }`)
    }

    // v0.5 Phase 3: format-aware template
    const template = blueprintCreateTemplate(name, slotBlocks.join('\n\n'), slotsArg, assetFormat)
    writeFileSync(primaryPath, template, 'utf-8')

    // v0.7.0: auto-sync to .oxn alt for backward compatibility when primary is .md
    if (autoSync) {
      void (async () => {
        try {
          if (assetFormat === 'md') {
            const { tree, frontmatter: fm } = parseMarkdown(template)
            const ir = extractBlueprintIR(tree, fm)
            const { serializeBlueprintToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
            const altContent = serializeBlueprintToOxn(ir)
            writeFileSync(altPath, altContent, 'utf-8')
          }
        } catch {
          // autoSync 失败不阻断主命令
        }
      })()
    }

    // PR-X: create 后静默重建全局 slim 索引（与 domain create 一致）
    const rebuild = autoRebuildBlueprintIndex(getProjectRoot())
    if (!rebuild.ok) {
      process.stderr.write(`warning: blueprint index rebuild failed: ${rebuild.error}\n`)
    }

    output(
      {
        ok: true,
        data: {
          name,
          path: primaryPath,
          format: assetFormat,
          syncedTo: autoSync ? altPath : null,
          slotCount: slotNames.length,
          slots: slotNames,
        },
        human: `Created blueprint ${name} at ${primaryPath}${autoSync ? ` (synced to ${altPath})` : ''}\nSlots: ${slotNames.join(', ')}\n\nNext: edit ${primaryPath}, then run \`oxn blueprint validate ${name}\``,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: validate
// ---------------------------------------------------------------------------
const validateSubcommand = defineCommand({
  meta: {
    name: 'validate',
    description: t('blueprint.validate.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('blueprint.validate.name') },
    '--no-langium': {
      type: 'boolean',
      description: 'v0.6.1 PR-4 (D-β c): 强制走 mdast 路径；如文件是 .oxn 则报错',
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const noLangium = ctx.args['--no-langium'] === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    if (!/^[a-z][a-z0-9-]*(?:\/[a-z][a-z0-9-]*)*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid blueprint name: ${JSON.stringify(name)}`,
          suggestion:
            'use kebab-case segments joined by / (e.g. "deploy-pipeline" or "infra/deploy-pipeline"); each segment: lowercase letters, digits, dashes; no leading/trailing/consecutive slashes',
        },
        format,
      )
    }
    // v0.5 Phase 3: 主路径由 config 决定,fall back 到 alt
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'blueprint', name, assetFormat, config)
    const altPath = resolveAssetAltPath(projectRoot, 'blueprint', name, assetFormat, config)
    const bpPath = existsSync(primaryPath) ? primaryPath : existsSync(altPath) ? altPath : primaryPath

    // v0.6.1 PR-4 (D-β c): --no-langium 标志强制走 mdast 路径
    if (noLangium && bpPath.endsWith('.oxn')) {
      return outputError(
        {
          code: 'OXN_NO_LANGIUM_REJECTED',
          message: `--no-langium specified but file is .oxn: ${bpPath}. Run \`oxn blueprint sync ${name}\` to convert to .md, then re-validate.`,
          suggestion: 'drop --no-langium flag or migrate .oxn → .md first',
        },
        format,
      )
    }

    const result = await validateBlueprint(bpPath)
    if (!result.ok) {
      return outputError(
        {
          code: 'OXN_DSL_PARSE_FAILED',
          message: `blueprint ${name} failed validation:\n${result.errors.join('\n')}`,
          suggestion: 'edit the file and re-run, or `oxn blueprint create <name> --force` to regenerate',
        },
        format,
      )
    }
    // v0.7.0: IR is extracted directly from .md (Langium removed)
    const ir = result.ir ?? null

    // v0.6.1-alpha.0 #1-13: slot DAG 环检测（硬阻断）
    if (ir) {
      const depsMap = Object.fromEntries(ir.slots.map((s) => [s.name, s.deps]))
      const cycle = findDagCycle(depsMap)
      if (cycle) {
        return outputError(
          {
            code: 'OXN_BLUEPRINT_DAG_CYCLE',
            message: `blueprint ${name} has a cycle in slot deps: ${cycle.join(' → ')}`,
            suggestion:
              'remove the cycle to make the DAG acyclic; use `oxn blueprint compile` to see the resolved order',
          },
          format,
        )
      }
    }

    // v1.1: 字符串级规范化校验（macOS-safe NAME_FILE_MISMATCH）
    // 与 oxn domain validate 对称：parseBlueprintSlim 索引层软检测是兜底,
    // CLI validate 是硬阻断层,两道防御必须都过。
    if (ir) {
      try {
        assertNameFileConsistent(ir.name, bpPath, 'blueprint')
      } catch (err) {
        if (err instanceof IAPError) {
          return outputError(
            {
              code: err.name,
              message: err.message,
              ...(err.context?.suggestion !== undefined ? { suggestion: String(err.context.suggestion) } : {}),
            },
            format,
          )
        }
        throw err
      }
    }

    // PR-X: validate 成功后静默重建全局 slim 索引（与 domain validate 一致）
    const rebuild = autoRebuildBlueprintIndex(getProjectRoot())
    if (!rebuild.ok) {
      process.stderr.write(`warning: blueprint index rebuild failed: ${rebuild.error}\n`)
    }

    output(
      {
        ok: true,
        data: {
          name,
          path: bpPath,
          slotCount: ir?.slots.length ?? 0,
          slots: ir?.slots ?? [],
          props: ir?.props ?? [],
          version: ir?.version ?? 1,
        },
        human: `Blueprint ${name} is valid (${ir?.slots.length ?? 0} slots, ${ir?.props.length ?? 0} props).`,
      },
      format,
    )
  },
})

// v0.7.0: blueprintAstToIr removed (Langium removed; IR used directly from md-pipeline)

/**
 * v0.6.1-alpha.0 #1-13: 检测 slot DAG 是否含循环。
 * DFS + 灰/白/黑标记；返回首个循环路径（含起点），无环返回 null。
 */
function findDagCycle(deps: Record<string, string[]>): string[] | null {
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  for (const k of Object.keys(deps)) color.set(k, WHITE)

  const stack: string[] = []

  function visit(node: string): string[] | null {
    color.set(node, GRAY)
    stack.push(node)
    for (const dep of deps[node] ?? []) {
      const c = color.get(dep) ?? WHITE
      if (c === GRAY) {
        // 找到环：从 dep 在 stack 中首次出现的位置到末尾
        const idx = stack.indexOf(dep)
        return [...stack.slice(idx), dep]
      }
      if (c === WHITE) {
        const found = visit(dep)
        if (found) return found
      }
      // BLACK: 已访问过，无环
    }
    color.set(node, BLACK)
    stack.pop()
    return null
  }

  for (const node of Object.keys(deps)) {
    if (color.get(node) === WHITE) {
      const found = visit(node)
      if (found) return found
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Subcommand: list
//
// PR-X: 优先读 .openxenon/.cache/blueprints.json（与 domain list 行为一致）。
// 索引缺失时降级到 dir 扫描（向后兼容：旧项目没跑过 init / create）。
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: t('blueprint.list.description'),
  },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const dir = getBlueprintsDir()
    const indexPath = getBlueprintIndexPath(projectRoot)

    // PR-X: 优先走索引
    const index = loadBlueprintIndex(indexPath)
    if (index) {
      const blueprints = index.blueprints.map((e) => ({
        name: e.name,
        file: e.file,
        version: e.version,
        slotCount: e.slotNames.length,
        propCount: e.propCount,
        status: e.status,
        description: e.description,
        errors: e.errors,
      }))
      const invalidCount = blueprints.filter((b) => b.status === 'invalid').length
      output(
        {
          ok: true,
          data: { blueprints, indexPath, source: 'index' as const, invalidCount },
          human:
            blueprints.length > 0
              ? `Blueprints (${blueprints.length} from index):\n${blueprints
                  .map((b) => {
                    const flag = b.status === 'invalid' ? ' ⚠' : ''
                    const desc = b.description ? ` — ${b.description}` : ''
                    return `  ${b.name} (v${b.version}, ${b.slotCount} slots, ${b.propCount} props)${flag}${desc}`
                  })
                  .join('\n')}` +
                (invalidCount > 0 ? `\n  ⚠ ${invalidCount} blueprint(s) failed to parse — see data.errors` : '')
              : 'No blueprints yet.',
        },
        format,
      )
      return
    }

    // 降级：dir 扫描（老项目 / 索引未生成）
    if (!existsSync(dir)) {
      output(
        { ok: true, data: { blueprints: [], source: 'dir' as const }, human: 'No blueprints directory yet.' },
        format,
      )
      return
    }
    const blueprints: string[] = []
    function walk(currentDir: string, prefix: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name)
        if (entry.isDirectory()) {
          walk(fullPath, prefix ? `${prefix}/${entry.name}` : entry.name)
        } else if (entry.isFile() && entry.name.endsWith('.oxn')) {
          const stem = entry.name.replace(/\.oxn$/, '')
          blueprints.push(prefix ? `${prefix}/${stem}` : stem)
        }
      }
    }
    walk(dir, '')
    output(
      {
        ok: true,
        data: { blueprints, source: 'dir' as const },
        human:
          blueprints.length > 0
            ? `Blueprints (${blueprints.length} from dir scan; no index found at ${indexPath}):\n${blueprints
                .map((b) => `  ${b}`)
                .join('\n')}\n\nTip: run \`oxn blueprint index\` to build the slim index.`
            : 'No blueprints yet.',
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: index (PR-X)
//
// 扫 `.openxenon/blueprints/*.oxn`（含子目录）→ 落 `.openxenon/.cache/blueprints.json`
// slim 模式：name/file/description/version/slotNames/propCount；不展开 slot DAG 详情
// （那是 per-work blueprints.json 的事，PR-3 引入）。
//
// 与 `oxn domain index` 对称设计：
//   - 不传 --emit：默认落 `.openxenon/.cache/blueprints.json`
//   - --emit <path>：落到自定义路径
//   - --check：仅校验索引是否新鲜（与 mtime 比对，不写）
// ---------------------------------------------------------------------------
const indexSubcommand = defineCommand({
  meta: {
    name: 'index',
    description: t('blueprint.index.description'),
  },
  args: {
    emit: {
      type: 'string',
      description: t('blueprint.index.output'),
    },
    check: {
      type: 'boolean',
      description: t('blueprint.index.freshness'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const blueprintsDir = getBlueprintsDir()
    const customEmit = ctx.args.emit as string | undefined
    const checkOnly = ctx.args.check === true
    const outPath = resolveBlueprintIndexPath(projectRoot, customEmit)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    if (checkOnly) {
      const existing = loadBlueprintIndex(outPath)
      if (!existing) {
        return output(
          {
            ok: true,
            data: { fresh: false, reason: 'index missing' },
            human: `Index missing at ${outPath}\nRun \`oxn blueprint index\` to build.`,
          },
          format,
        )
      }
      return output(
        {
          ok: true,
          data: { fresh: true, generatedAt: existing.generatedAt, blueprintCount: existing.blueprintCount },
          human: `Index fresh: ${existing.blueprintCount} blueprints, generated at ${existing.generatedAt}`,
        },
        format,
      )
    }

    let index: BlueprintIndex
    try {
      index = writeBlueprintIndex({ projectRoot, blueprintsDir, outPath })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return outputError({ code: 'OXN_BLUEPRINT_INDEX_FAILED', message }, format)
    }

    const invalidCount = index.blueprints.filter((b: BlueprintIndexEntry) => b.status === 'invalid').length
    output(
      {
        ok: true,
        data: {
          indexPath: outPath,
          generatedAt: index.generatedAt,
          blueprintCount: index.blueprintCount,
          invalidCount,
          blueprints: index.blueprints,
        },
        human:
          `Blueprint index built: ${index.blueprintCount} blueprint(s) at ${outPath}\n` +
          (invalidCount > 0 ? `  ⚠ ${invalidCount} blueprint(s) failed to parse — see blueprints[].errors\n` : '') +
          index.blueprints
            .map((b) => `  - ${b.name} (v${b.version}, ${b.slotNames.length} slots, ${b.propCount} props, ${b.status})`)
            .join('\n'),
      },
      format,
    )
  },
})

const blueprintCommand = defineCommand({
  meta: {
    name: 'blueprint',
    description: t('blueprint.description'),
  },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
    index: indexSubcommand,
  },
  run() {
    // No-op（与 oxn domain 对齐）
  },
})

export default blueprintCommand
