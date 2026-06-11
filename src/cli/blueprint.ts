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
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR } from '../kernel/index'
import { IAPError } from '../core/errors'
import { assertNameFileConsistent } from '../kernel/index'
import { createOxnParser, isBlueprintDeclaration, type BlueprintDeclaration, type OXNDocument } from '../oxn-dsl'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  autoRebuildBlueprintIndex,
  getBlueprintIndexPath,
  loadBlueprintIndex,
  resolveBlueprintIndexPath,
  writeBlueprintIndex,
  type BlueprintIndex,
  type BlueprintIndexEntry,
} from '../oxn-dsl/compiler/blueprint-index-builder'

function getProjectRoot(): string {
  return process.cwd()
}

function getBlueprintsDir(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, 'blueprints')
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

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------
const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: '在 .openxenon/blueprints/ 生成一个新的 blueprint 骨架（用统一 OXN DSL）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Blueprint 名称（kebab-case）' },
    slots: {
      type: 'string',
      description: '逗号分隔的 slot 名称列表（默认 stage-1, stage-2）',
    },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在的文件' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const slotsArg = (ctx.args.slots as string | undefined) ?? ''
    const force = ctx.args.force === true || ctx.args.f === true
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

    const outPath = join(blueprintsDir, `${name}.oxn`)
    const outDir = join(blueprintsDir, name.split('/').slice(0, -1).join('/'))
    if (outDir !== blueprintsDir && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }
    if (existsSync(outPath) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `blueprint file already exists: ${outPath}`, {
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

    const template = `// Blueprint: ${name}
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

${slotBlocks.join('\n\n')}
}
`
    writeFileSync(outPath, template, 'utf-8')

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
          path: outPath,
          slotCount: slotNames.length,
          slots: slotNames,
        },
        human: `Created blueprint ${name} at ${outPath}\nSlots: ${slotNames.join(', ')}\n\nNext: edit ${outPath}, then run \`oxn blueprint validate ${name}\``,
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
    description: '用统一 OXN DSL 解析器验证 .openxenon/blueprints/<name>.oxn',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Blueprint 名称' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
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
    const bpPath = join(getBlueprintsDir(), `${name}.oxn`)
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
    description:
      '列出 .openxenon/blueprints/ 下所有 blueprint（从 .cache/blueprints.json 索引读，缺失时降级 dir 扫描）',
  },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
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
    description: '重建全局 Blueprint slim 索引 → .openxenon/.cache/blueprints.json',
  },
  args: {
    emit: {
      type: 'string',
      description: '自定义输出路径（默认 .openxenon/.cache/blueprints.json）',
    },
    check: {
      type: 'boolean',
      description: '仅校验索引是否新鲜（与 blueprints/ 目录 mtime 比对），不写',
    },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const blueprintsDir = getBlueprintsDir()
    const customEmit = ctx.args.emit as string | undefined
    const checkOnly = ctx.args.check === true
    const outPath = resolveBlueprintIndexPath(projectRoot, customEmit)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: '项目未初始化，请先执行 oxn init' }, format)
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
    description: '管理 OXN DSL blueprint（create/validate/list/index）',
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
