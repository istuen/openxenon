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
import { URI } from 'langium'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import { IAPError } from '@openxenon/engine/errors'
import { assertNameFileConsistent } from '@openxenon/engine/kernel'
import {
  createOxnParser,
  isBlueprintDeclaration,
  type BlueprintDeclaration,
  type OXNDocument,
} from '@openxenon/engine/oxl'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
  resolveAssetDir,
} from '@openxenon/engine/infra/paths'
import { readProjectConfig } from './project-config-io'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractBlueprintIR } from '@openxenon/engine/oxl/md-pipeline/transformers/blueprint.js'
import { serializeBlueprintToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import {
  computeSha256,
  readSyncMetadata,
  composeSyncContent,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
} from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { validateOxnParseable, verifyBlueprintRoundTrip } from '@openxenon/engine/oxl/md-pipeline/sync-validation.js'
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

async function validateBlueprint(blueprintPath: string): Promise<{
  ok: boolean
  ast?: OXNDocument
  errors: string[]
}> {
  if (!existsSync(blueprintPath)) {
    return { ok: false, errors: [`blueprint file not found: ${blueprintPath}`] }
  }
  // v0.5 Phase 3: .md 走 md-pipeline 路径
  if (blueprintPath.endsWith('.md')) {
    return validateBlueprintFromMd(blueprintPath)
  }
  const content = readFileSync(blueprintPath, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(blueprintPath))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const hasBlueprint = ast.entities.some(isBlueprintDeclaration)
  if (!hasBlueprint) {
    return {
      ok: false,
      ast,
      errors: ['no BlueprintDeclaration found in file'],
    }
  }
  return { ok: true, ast, errors: [] }
}

/**
 * v0.5 Phase 3: 验证 .md blueprint (走 md-pipeline)
 */
async function validateBlueprintFromMd(blueprintPath: string): Promise<{
  ok: boolean
  ast?: OXNDocument
  errors: string[]
}> {
  const content = readFileSync(blueprintPath, 'utf-8')
  let ir: import('@openxenon/engine/oxl/md-pipeline/transformers/blueprint').BlueprintIR
  try {
    const { tree, frontmatter: fm } = parseMarkdown(content)
    ir = extractBlueprintIR(tree, fm)
  } catch (e) {
    return {
      ok: false,
      errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
  // IR → 临时 .oxn → 走 langium 拿到 AST (给 blueprintAstToIr 用)
  const oxnContent = serializeBlueprintToOxn(ir)
  const parser = createOxnParser()
  const r = await parser.parse(oxnContent, URI.file(`${blueprintPath}.oxn`))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const hasBlueprint = ast.entities.some(isBlueprintDeclaration)
  if (!hasBlueprint) {
    return {
      ok: false,
      ast,
      errors: ['no BlueprintDeclaration derived from md'],
    }
  }
  return { ok: true, ast, errors: [] }
}

// ---------------------------------------------------------------------------
// v0.5 Phase 3: format-aware template generator
// ---------------------------------------------------------------------------

import type { AssetFormat as BlueprintFormat } from '@openxenon/engine/infra/paths'

function blueprintCreateTemplate(name: string, slotsBlock: string, slotsArg: string, format: BlueprintFormat): string {
  if (format === 'md') {
    // 提取每个 slot 名 (简易: 解析 `slot "X" {` 行)
    const slotNames: string[] = []
    for (const line of slotsBlock.split('\n')) {
      const m = line.match(/^ {2}slot "([^"]+)" \{/)
      if (m) slotNames.push(m[1]!)
    }
    const mdSlots = slotNames.map((slotName) => `### ${slotName}\n- deps: []`).join('\n\n')
    return `---
entity: blueprint
version: 0.3.0
name: ${name}
---

# Blueprint: ${name}

> TODO: one-line description of what this blueprint does

## Slots

${mdSlots}
`
  }
  // .oxn 模板（v0.4 既有）
  return `// Blueprint: ${name}
// Created by: oxn blueprint create ${name} ${slotsArg ? `--slots ${slotsArg}` : ''}
//
// ──────────────────────────────────────────────────────────────────
// HINTS — read before editing. \`oxn blueprint validate\` will reject
// anything that violates these rules.
// ──────────────────────────────────────────────────────────────────
//  1. slot names: kebab-case (recommended), never PascalCase.
//  2. slot deps: form a DAG. Cycles are rejected by the validator.
//  3. The first slot MUST have deps = [] (entry point).
//  4. prop type: string | number | boolean | any | list<T> | map<T> | enum(...)
//  5. observe: reference builtin probes via @oxn/probes/{shell-exec|fs-exists|...}
//     or describe the physical signal (e.g. ["ShellExec"]).
//  6. Validate:  oxn blueprint validate ${name}
//  7. Trial run: oxn work create --work-id trial-${name} --blueprint verify-pipeline
//  8. Share via Git (this file IS the source of truth):
//        git add .openxenon/blueprints/${name}.oxn && git commit
// ──────────────────────────────────────────────────────────────────
//
// Edit goal/description/props/slots as needed. The mvp-style
// \`context\` and per-part \`skill\` blocks are optional (unified grammar superset).
// After editing, validate with:
//   oxn blueprint validate ${name}
// Then drive it with:
//   oxn work create <work-name> --blueprint ${name} --json

blueprint "${name}" {
  version = 1
  description = "TODO: one-line description of what this blueprint does"

${slotsBlock}
}
`
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
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'blueprint', name, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'blueprint', name, assetFormat)
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

    // v0.5 Phase 3: 自动 sync 到另一种格式
    if (autoSync) {
      void (async () => {
        try {
          if (assetFormat === 'oxn') {
            // .oxn → .md
            const altResult = await compileOxnToMd(template, { entity: 'blueprint', frontmatter: true })
            writeFileSync(altPath, altResult.md, 'utf-8')
          } else {
            // .md → .oxn
            const { tree, frontmatter: fm } = parseMarkdown(template)
            const ir = extractBlueprintIR(tree, fm)
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
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
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
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'blueprint', name, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'blueprint', name, assetFormat)
    const bpPath = existsSync(primaryPath) ? primaryPath : existsSync(altPath) ? altPath : primaryPath
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
    // v0.1: AST → IR 映射（干掉 cyclic JSON）。langium AST 节点带 $container 父引用。
    const blueprint = result.ast?.entities.find(isBlueprintDeclaration)
    const ir = blueprint ? blueprintAstToIr(blueprint) : null

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

/**
 * v0.1: 把 langium AST 节点映射为可 JSON 序列化的纯对象 IR。
 * 消除 `$container` 父引用导致的 cyclic structures 错误。
 */
function blueprintAstToIr(blueprint: BlueprintDeclaration): {
  name: string
  version?: number
  slots: string[]
  props: Array<{ name: string; type: string; required?: boolean; default?: unknown }>
} {
  return {
    name: blueprint.name,
    version: blueprint.version,
    slots: blueprint.partSlots.map((s) => s.name),
    props: blueprint.props.map((p) => ({
      name: p.name,
      type: typeof p.type === 'string' ? p.type : 'complex',
      ...(p.required ? { required: p.required.value } : {}),
      ...(p.default ? { default: p.default.value } : {}),
    })),
  }
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

// ---------------------------------------------------------------------------
// Subcommand: compile (v0.3.0 — 把 .oxn 重编译为 v0.3 canonical 纯 MD .md)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Subcommand: sync (v0.4 Phase 1 — .oxn → .md 自动同步)
// ---------------------------------------------------------------------------
const syncSubcommand = defineCommand({
  meta: {
    name: 'sync',
    description: '[v0.4 Phase 1] Sync .oxn → .md: regenerate .md only when .oxn changed',
  },
  args: {
    name: { type: 'positional', required: false },
    all: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const all = ctx.args.all === true
    const dryRun = ctx.args['dry-run'] === true
    const singleName = ctx.args.name as string | undefined
    const projectRoot = getProjectRoot()

    if (!all && !singleName) {
      return outputError({ code: 'OXN_SYNC_ARGS_MISSING', message: 'either <name> or --all is required' }, format)
    }

    const blueprintsDir = resolveAssetDir(projectRoot, 'blueprint')
    let names: string[]
    if (all) {
      if (!existsSync(blueprintsDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/blueprints/' }, format)
      }
      names = readdirSync(blueprintsDir)
        .filter((f) => f.endsWith('.oxn'))
        .map((f) => f.slice(0, -'.oxn'.length))
    } else {
      names = [singleName as string]
    }

    const results: Array<{
      name: string
      status: 'updated' | 'unchanged' | 'error'
      oxnSha?: string
      mdSha?: string
      error?: string
    }> = []

    for (const name of names) {
      const oxnPath = join(blueprintsDir, `${name}.oxn`)
      const mdPath = join(projectRoot, BOUNDARY_DIR, 'blueprints-md', `${name}.md`)
      const cachePath = getCachePath(projectRoot, 'blueprint', name)

      if (!existsSync(oxnPath)) {
        results.push({ name, status: 'error', error: `.oxn not found: ${oxnPath}` })
        continue
      }

      const oxnContent = readFileSync(oxnPath, 'utf-8')
      const oxnSha = computeSha256(oxnContent)

      const prevMeta = existsSync(mdPath) ? readSyncMetadata(mdPath) : null
      const prevOxnSha = prevMeta?.oxnSourceSha

      if (prevOxnSha === oxnSha && existsSync(mdPath)) {
        results.push({ name, status: 'unchanged', oxnSha, mdSha: prevMeta?.mdSelfSha })
        continue
      }

      if (dryRun) {
        results.push({ name, status: 'updated', oxnSha })
        continue
      }

      let result
      try {
        result = await compileOxnToMd(oxnContent, { entity: 'blueprint', frontmatter: true })
      } catch (err) {
        results.push({ name, status: 'error', error: err instanceof Error ? err.message : String(err) })
        continue
      }

      const mdDir = join(projectRoot, BOUNDARY_DIR, 'blueprints-md')
      if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true })

      const finalContent = composeSyncContent(result.md, {
        oxnSourceSha: oxnSha,
        syncedAt: new Date().toISOString(),
      })
      const mdSha = computeSha256(finalContent)

      writeFileSync(mdPath, finalContent, 'utf-8')
      writeCacheSha(cachePath, mdSha)

      results.push({ name, status: 'updated', oxnSha, mdSha })
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      error: results.filter((r) => r.status === 'error').length,
      dryRun,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `blueprint sync ${all ? '--all' : names.length === 1 ? `<${names[0]}>` : `${names.length} items`}` +
          (dryRun ? ' (dry-run)' : '') +
          `\n  total:     ${summary.total}\n  updated:   ${summary.updated}\n  unchanged: ${summary.unchanged}\n  error:     ${summary.error}` +
          (summary.error > 0
            ? '\n\nFailed:\n' +
              results
                .filter((r) => r.status === 'error')
                .map((r) => `  - ${r.name}: ${r.error}`)
                .join('\n')
            : ''),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: sync-md (v0.4 Phase 2 — .md → .oxn 反向同步)
// ---------------------------------------------------------------------------
const syncMdSubcommand = defineCommand({
  meta: {
    name: 'sync-md',
    description: '[v0.4 Phase 2] Reverse sync .md → .oxn: regenerate .oxn when .md changed',
  },
  args: {
    name: { type: 'positional', required: false },
    all: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'no-chain': { type: 'boolean' },
    'oxn-priority': { type: 'boolean' },
    'no-roundtrip': { type: 'boolean' },
    'no-parse-check': { type: 'boolean' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const all = ctx.args.all === true
    const dryRun = ctx.args['dry-run'] === true
    const noChain = ctx.args.chain === false
    const oxnPriority = ctx.args['oxn-priority'] === true
    const noRoundtrip = ctx.args.roundtrip === false
    const noParseCheck = ctx.args['parse-check'] === false
    const singleName = ctx.args.name as string | undefined
    const projectRoot = getProjectRoot()

    if (!all && !singleName) {
      return outputError({ code: 'OXN_SYNC_ARGS_MISSING', message: 'either <name> or --all is required' }, format)
    }

    const mdDir = join(projectRoot, BOUNDARY_DIR, 'blueprints-md')
    const oxnDir = resolveAssetDir(projectRoot, 'blueprint')
    let names: string[]
    if (all) {
      if (!existsSync(mdDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/blueprints-md/' }, format)
      }
      names = readdirSync(mdDir)
        .filter((f) => f.endsWith('.md'))
        .map((f) => f.slice(0, -'.md'.length))
    } else {
      names = [singleName as string]
    }

    const results: Array<{
      name: string
      status: 'updated' | 'unchanged' | 'error' | 'oxn-wins'
      mdSha?: string
      oxnSha?: string
      error?: string
      errorCode?: string
    }> = []

    for (const name of names) {
      const mdPath = join(mdDir, `${name}.md`)
      const oxnPath = join(oxnDir, `${name}.oxn`)
      const mdCachePath = getCacheMdPath(projectRoot, 'blueprint', name)

      if (!existsSync(mdPath)) {
        results.push({ name, status: 'error', error: `.md not found: ${mdPath}` })
        continue
      }

      const mdContent = readFileSync(mdPath, 'utf-8')
      const shaMdCurrent = computeSha256(mdContent)

      // conflict: .oxn-priority
      const oxnExists = existsSync(oxnPath)
      const oxnSha = oxnExists ? computeSha256(readFileSync(oxnPath, 'utf-8')) : ''
      const oxnPrevSha = oxnExists ? readSyncMetadata(mdPath)?.oxnSourceSha : undefined
      const bothChanged = oxnExists && oxnPrevSha && oxnPrevSha !== oxnSha
      if (bothChanged && oxnPriority) {
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'blueprint', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnSha,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'blueprint', name), mdSha)
          writeFileSync(mdCachePath, `${mdSha}\n`, 'utf-8')
        } catch (err) {
          results.push({ name, status: 'error', error: `oxn-priority sync: ${String(err)}` })
          continue
        }
        results.push({ name, status: 'oxn-wins', mdSha: shaMdCurrent, oxnSha })
        continue
      }

      if (existsSync(mdCachePath)) {
        const shaMdPrev = readFileSync(mdCachePath, 'utf-8').trim()
        if (shaMdCurrent === shaMdPrev) {
          results.push({ name, status: 'unchanged', mdSha: shaMdCurrent })
          continue
        }
      }

      if (dryRun) {
        results.push({ name, status: 'updated', mdSha: shaMdCurrent })
        continue
      }

      let tree, frontmatter
      try {
        const parsed = parseMarkdown(mdContent)
        tree = parsed.tree
        frontmatter = parsed.frontmatter
      } catch (err) {
        results.push({ name, status: 'error', error: `md parse: ${String(err)}` })
        continue
      }

      let ir
      try {
        ir = extractBlueprintIR(tree, frontmatter)
      } catch (err) {
        results.push({ name, status: 'error', error: `IR extract: ${String(err)}` })
        continue
      }

      const oxnContent = serializeBlueprintToOxn(ir)
      const oxnShaNew = computeSha256(oxnContent)

      if (!noParseCheck) {
        const parseResult = await validateOxnParseable(oxnContent)
        if (!parseResult.ok) {
          results.push({
            name,
            status: 'error',
            error: `langium parse failed: ${parseResult.errors[0]}`,
            errorCode: 'E_SYNC_LANGIUM_VALIDATION_FAILED',
          })
          continue
        }
      }

      if (!noRoundtrip) {
        const rtResult = await verifyBlueprintRoundTrip(ir, oxnContent)
        if (!rtResult.ok) {
          results.push({
            name,
            status: 'error',
            error: `round-trip loss: ${rtResult.lostFields.join(', ')}`,
            errorCode: 'E_SYNC_ROUND_TRIP_LOSS',
          })
          continue
        }
      }

      if (!existsSync(oxnDir)) mkdirSync(oxnDir, { recursive: true })
      writeFileSync(oxnPath, oxnContent, 'utf-8')

      if (!noChain && existsSync(oxnPath)) {
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'blueprint', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnShaNew,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'blueprint', name), mdSha)
        } catch {
          // chained sync fails silently
        }
      }

      const cacheDir2 = join(mdDir, '.cache')
      if (!existsSync(cacheDir2)) mkdirSync(cacheDir2, { recursive: true })
      const finalMdSha = existsSync(mdPath) ? computeSha256(readFileSync(mdPath, 'utf-8')) : shaMdCurrent
      writeFileSync(mdCachePath, `${finalMdSha}\n`, 'utf-8')

      results.push({ name, status: 'updated', mdSha: finalMdSha, oxnSha: oxnShaNew })
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      error: results.filter((r) => r.status === 'error').length,
      dryRun,
      noChain,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `blueprint sync-md ${all ? '--all' : `<${names[0]}>`}` +
          (dryRun ? ' (dry-run)' : '') +
          `\n  total:     ${summary.total}\n  updated:   ${summary.updated}\n  unchanged: ${summary.unchanged}\n  error:     ${summary.error}`,
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Subcommand: compile
// ---------------------------------------------------------------------------

const compileSubcommand = defineCommand({
  meta: {
    name: 'compile',
    description: t('blueprint.compile.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('blueprint.compile.name') },
    'file-path': { type: 'string', description: t('blueprint.compile.filePath') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const customPath = ctx.args['file-path'] as string | undefined

    const filePath = customPath
      ? join(getProjectRoot(), customPath)
      : join(resolveAssetDir(getProjectRoot(), 'blueprint'), `${name}.oxn`)

    if (!existsSync(filePath)) {
      return outputUserInputError('OXN_FILE_NOT_FOUND', `blueprint .oxn not found: ${filePath}`, {
        suggestion: `run \`oxn blueprint create ${name}\` first, then edit + compile`,
        format,
      })
    }

    const oxnContent = readFileSync(filePath, 'utf-8')

    let result
    try {
      result = await compileOxnToMd(oxnContent, {
        entity: 'blueprint',
        frontmatter: true,
      })
    } catch (err) {
      return outputError(
        {
          code: 'OXN_BLUEPRINT_COMPILE_FAILED',
          message: err instanceof Error ? err.message : String(err),
          suggestion: 'check `oxn blueprint validate <name>` for structural errors before compile',
        },
        format,
      )
    }

    const mdPath = join(getProjectRoot(), BOUNDARY_DIR, 'blueprints-md', `${result.name}.md`)
    const mdDir = join(getProjectRoot(), BOUNDARY_DIR, 'blueprints-md')
    if (!existsSync(mdDir)) {
      mkdirSync(mdDir, { recursive: true })
    }
    writeFileSync(mdPath, result.md, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name: result.name,
          source: filePath,
          target: mdPath,
          contentHash: result.contentHash,
          warnings: [],
        },
        human: `Compiled ${result.name}
  source: ${filePath}
  target: ${mdPath}
  bytes:  ${result.md.length}
  hash:   ${result.contentHash.slice(0, 16)}...`,
      },
      format,
    )

    // PR-1: compile 成功后静默重建全局索引
    const rebuild = autoRebuildBlueprintIndex(getProjectRoot())
    if (!rebuild.ok) {
      console.error(`Warning: blueprint index rebuild failed: ${rebuild.error}`)
    }
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
    compile: compileSubcommand,
    sync: syncSubcommand,
    'sync-md': syncMdSubcommand,
  },
  run() {
    // No-op（与 oxn domain 对齐）
  },
})

export default blueprintCommand
