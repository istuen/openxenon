// =============================================================================
// `oxn asset` — Asset 顶级子命令 (v0.6.1-alpha.1 Asset Lifecycle 闭环)
//
// 8 个子命令：
//   list                              列出所有 Asset (按 kind 分组)
//   show <name>                       显示单个 Asset 详情
//   create <name> --kind X            创建 Asset
//   validate <name>                   校验单个 Asset
//   validate --check-dag --all        全项目 DAG 校验
//   archive <name> --reason Y        归档 (move 到 .archived/assets/<kind>s/)
//   delete <name> --force            硬删 (force + 无引用)
//   evolve <name> --new-name Z       演进 (创建新版本，auditTrail 引用旧版)
//
// alias 兼容：
//   oxn work create --asset-kind X  (v0.7+：移除 `--type asset`，--asset-kind 单独触发短路)
//
// =============================================================================

import { defineCommand } from 'citty'
import { join } from 'node:path'
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  validate as validateAsset,
  validateAssetReferences,
  validateAssetPaper4Fields,
  archive,
  deleteAsset,
  evolve,
  list,
  listAll,
  resolveArchivedAssetFile,
} from '@openxenon/engine/Asset'
import { ALL_ASSET_KINDS, type AssetKind } from '@openxenon/engine/infra/paths'

const VALID_ASSET_KINDS = ALL_ASSET_KINDS
type ValidAssetKind = (typeof VALID_ASSET_KINDS)[number]

function getProjectRoot(): string {
  return process.cwd()
}

function iapErrorToOutput(err: unknown, format: 'human' | 'json' | 'yaml' | 'html' | 'md'): unknown {
  if (err && typeof err === 'object' && 'name' in err) {
    const e = err as { name?: string; message?: string; data?: Record<string, unknown> }
    const suggestionText = e.data ? JSON.stringify(e.data) : undefined
    return outputError(
      {
        code: String(e.name ?? 'OXN_ERROR'),
        message: e.message ?? String(err),
        ...(suggestionText ? { suggestion: suggestionText } : {}),
      },
      format,
    )
  }
  return outputError({ code: 'OXN_ERROR', message: String(err) }, format)
}

// =============================================================================
// Subcommand: list
// =============================================================================
const listSubcommand = defineCommand({
  meta: { name: 'list', description: 'List all Assets (by kind)' },
  args: {
    kind: {
      type: 'string',
      description: `Filter by kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const kindFilter = ctx.args.kind as string | undefined
    if (kindFilter && !VALID_ASSET_KINDS.includes(kindFilter as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kindFilter}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }
    const projectRoot = getProjectRoot()
    const result = kindFilter ? list({ kind: kindFilter as AssetKind, projectRoot }) : listAll(projectRoot)
    const groups = new Map<string, typeof result.assets>()
    for (const a of result.assets) {
      if (!groups.has(a.kind)) groups.set(a.kind, [])
      groups.get(a.kind)!.push(a)
    }
    const data = Array.from(groups.entries()).map(([kind, assets]) => ({ kind, assets }))
    return output(
      {
        data: { groups: data, total: result.assets.length },
        human:
          result.assets.length === 0
            ? 'No assets registered.'
            : `Registered assets (${result.assets.length} total):\n${data
                .map(
                  (g) =>
                    `  ${g.kind} (${g.assets.length}):\n${g.assets.map((a) => `    - ${a.name} (${a.path})`).join('\n')}`,
                )
                .join('\n')}`,
      },
      format,
    )
  },
})

// =============================================================================
// Subcommand: show
// =============================================================================
const showSubcommand = defineCommand({
  meta: { name: 'show', description: 'Show single Asset details' },
  args: {
    name: { type: 'positional', required: true },
    kind: {
      type: 'string',
      required: true,
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const kind = ctx.args.kind as string
    if (!VALID_ASSET_KINDS.includes(kind as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kind}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }
    const projectRoot = getProjectRoot()
    const result = list({ kind: kind as AssetKind, projectRoot })
    const asset = result.assets.find((a) => a.name === name)
    if (!asset) {
      // 检查归档
      const archivedPath = resolveArchivedAssetFile(projectRoot, kind, name, 'md')
      if (existsSync(archivedPath)) {
        return output(
          {
            data: { kind, name, archived: true, archivedPath },
            human: `Asset '${name}' (${kind}) is archived at ${archivedPath}`,
          },
          format,
        )
      }
      return outputError({ code: 'OXN_ASSET_NOT_FOUND', message: `Asset '${name}' (${kind}) not found` }, format)
    }
    return output(
      {
        data: asset,
        human: `Asset '${asset.name}' (${asset.kind}) at ${asset.path}`,
      },
      format,
    )
  },
})

// =============================================================================
// Subcommand: create
// =============================================================================
const createSubcommand = defineCommand({
  meta: { name: 'create', description: 'Create a new Asset (alias for oxn work create --asset-kind)' },
  args: {
    name: { type: 'positional', required: true },
    kind: {
      type: 'string',
      required: true,
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    force: { type: 'boolean', description: 'Overwrite existing Asset' },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const kind = ctx.args.kind as string
    const force = ctx.args.force === true

    // 🆕 v0.6.1 Phase C: oxn asset create = oxn work create --asset-kind 的 alias
    // 委托给 work create 子命令走标准 Work 流程（完整 IAP 闭环）
    const args = ['work', 'create', name, '--asset-kind', kind]
    if (force) args.push('--force')
    if (ctx.args.json) args.push('--json')
    if (ctx.args.yaml) args.push('--yaml')

    const proc = Bun.spawn(['bun', join(import.meta.dirname, '..', 'index.ts'), ...args], {
      cwd: process.cwd(),
      env: { ...process.env, NO_COLOR: '1' },
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const stdout = await new Response(proc.stdout).text()
    const exitCode = await proc.exited
    // 透传 work create 的输出
    if (exitCode !== 0) {
      const stderr = await new Response(proc.stderr).text()
      return outputError(
        { code: 'OXN_ASSET_CREATE_FAILED', message: stderr || stdout || `exit code ${exitCode}` },
        format,
      )
    }
    return stdout
  },
})

// =============================================================================
// Subcommand: validate (PR-2: --strict + --check-dag --all)
// =============================================================================
const validateSubcommand = defineCommand({
  meta: { name: 'validate', description: 'Validate Asset(s)' },
  args: {
    name: { type: 'positional', required: false },
    kind: {
      type: 'string',
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    'check-dag': { type: 'boolean', description: 'Run DAG validation on all assets' },
    all: { type: 'boolean', description: 'Validate all assets (used with --check-dag)' },
    strict: { type: 'boolean', description: 'Strict mode (4 Asset Paper fields required)' },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const checkDag = ctx.args['check-dag'] === true
    const all = ctx.args.all === true
    const strict = ctx.args.strict === true

    // DAG check across all assets
    if (checkDag || all) {
      const result = validateAssetReferences(projectRoot)
      return output(
        {
          data: {
            ok: result.ok,
            cycles: result.cycles,
            selfRefs: result.selfRefs,
            orphans: result.orphans,
          },
          human: result.ok
            ? '✓ All Asset references DAG is valid (no cycles, no self-refs, no orphans).'
            : `✗ Asset references DAG validation failed:\n` +
              `  cycles: ${result.cycles.length}\n` +
              `  self-refs: ${result.selfRefs.length}\n` +
              `  orphans: ${result.orphans.length}`,
        },
        format,
      )
    }

    // Single asset validation
    const name = ctx.args.name as string | undefined
    const kind = ctx.args.kind as string | undefined
    if (!name || !kind) {
      return outputUserInputError('OXN_CLI_INPUT_ERROR', 'Either <name> --kind or --check-dag --all required', {
        format,
      })
    }
    if (!VALID_ASSET_KINDS.includes(kind as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kind}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }

    try {
      const result = await validateAsset({
        kind: kind as AssetKind,
        name,
        projectRoot,
      })

      // PR-2: --strict mode adds AssetPaper 4 字段校验
      let paperResult: { ok: boolean; warnings: string[] } | null = null
      if (strict && result.ok) {
        try {
          paperResult = await validateAssetPaper4Fields(projectRoot, kind as AssetKind, name, true)
        } catch (err) {
          return iapErrorToOutput(err, format)
        }
      } else if (result.ok) {
        // fail-open: warn only
        paperResult = await validateAssetPaper4Fields(projectRoot, kind as AssetKind, name, false)
      }

      return output(
        {
          data: {
            ok: result.ok && (paperResult?.ok ?? true),
            errors: result.errors,
            strict,
            paperWarnings: paperResult?.warnings ?? [],
          },
          human:
            result.ok && (paperResult?.ok ?? true)
              ? `✓ Asset '${name}' (${kind}) valid${strict ? ' (strict mode: 4 fields enforced)' : ''}`
              : `✗ Asset '${name}' (${kind}) invalid:\n${[
                  ...result.errors.map((e) => `  - ${e}`),
                  ...(paperResult?.warnings ?? []).map((w) => `  - ${w}`),
                ].join('\n')}`,
        },
        format,
      )
    } catch (err) {
      return iapErrorToOutput(err, format)
    }
  },
})

// =============================================================================
// Subcommand: archive
// =============================================================================
const archiveSubcommand = defineCommand({
  meta: { name: 'archive', description: 'Archive Asset (move to .archived/assets/<kind>s/)' },
  args: {
    name: { type: 'positional', required: true },
    kind: {
      type: 'string',
      required: true,
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    reason: { type: 'string', required: true, description: 'Reason for archiving (audit trail)' },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const kind = ctx.args.kind as string
    const reason = ctx.args.reason as string
    if (!VALID_ASSET_KINDS.includes(kind as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kind}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }
    const projectRoot = getProjectRoot()
    try {
      const result = await archive({ kind: kind as AssetKind, name, reason, projectRoot })
      return output(
        {
          data: {
            ok: result.ok,
            idempotent: result.idempotent,
            archivedPath: result.archivedPath,
          },
          human: `✓ ${result.message}`,
        },
        format,
      )
    } catch (err) {
      return iapErrorToOutput(err, format)
    }
  },
})

// =============================================================================
// Subcommand: delete
// =============================================================================
const deleteSubcommand = defineCommand({
  meta: { name: 'delete', description: 'Delete Asset (force required)' },
  args: {
    name: { type: 'positional', required: true },
    kind: {
      type: 'string',
      required: true,
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    force: { type: 'boolean', description: 'Force delete (required)' },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const kind = ctx.args.kind as string
    const force = ctx.args.force === true
    if (!VALID_ASSET_KINDS.includes(kind as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kind}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }
    const projectRoot = getProjectRoot()
    try {
      const result = await deleteAsset({ kind: kind as AssetKind, name, force, projectRoot })
      return output(
        {
          data: {
            ok: result.ok,
            idempotent: result.idempotent,
            deletedPath: result.deletedPath,
          },
          human: `✓ ${result.message}`,
        },
        format,
      )
    } catch (err) {
      return iapErrorToOutput(err, format)
    }
  },
})

// =============================================================================
// Subcommand: evolve
// =============================================================================
const evolveSubcommand = defineCommand({
  meta: { name: 'evolve', description: 'Evolve Asset to new version' },
  args: {
    name: { type: 'positional', required: true, description: 'Current Asset name' },
    'new-name': { type: 'string', required: true, description: 'New Asset name' },
    kind: {
      type: 'string',
      required: true,
      description: `Asset kind (${VALID_ASSET_KINDS.join('|')})`,
    },
    '--json': { type: 'boolean' },
    '--yaml': { type: 'boolean' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const newName = ctx.args['new-name'] as string
    const kind = ctx.args.kind as string
    if (!VALID_ASSET_KINDS.includes(kind as ValidAssetKind)) {
      return outputError(
        {
          code: 'OXN_INVALID_ASSET_KIND',
          message: `Invalid --kind: '${kind}'`,
          suggestion: `Valid: ${VALID_ASSET_KINDS.join(', ')}`,
        },
        format,
      )
    }
    const projectRoot = getProjectRoot()
    try {
      const result = await evolve({ kind: kind as AssetKind, name, newName, projectRoot })
      return output(
        {
          data: {
            ok: result.ok,
            oldName: result.oldName,
            newName: result.newName,
            oldPath: result.oldPath,
            newPath: result.newPath,
          },
          human: `✓ ${result.message}`,
        },
        format,
      )
    } catch (err) {
      return iapErrorToOutput(err, format)
    }
  },
})

// =============================================================================
// Default export: oxn asset 命令
// =============================================================================
export default defineCommand({
  meta: {
    name: 'asset',
    description: 'Asset lifecycle management (v0.6.1-alpha.1: 8 subcommands)',
  },
  subCommands: {
    list: () => Promise.resolve({ default: listSubcommand }).then((m) => m.default),
    show: () => Promise.resolve({ default: showSubcommand }).then((m) => m.default),
    create: () => Promise.resolve({ default: createSubcommand }).then((m) => m.default),
    validate: () => Promise.resolve({ default: validateSubcommand }).then((m) => m.default),
    archive: () => Promise.resolve({ default: archiveSubcommand }).then((m) => m.default),
    delete: () => Promise.resolve({ default: deleteSubcommand }).then((m) => m.default),
    evolve: () => Promise.resolve({ default: evolveSubcommand }).then((m) => m.default),
  },
})
