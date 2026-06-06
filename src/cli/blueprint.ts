import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR } from '../kernel/constants'
import { createOxnParser, isBlueprintDeclaration, type BlueprintDeclaration, type OXNDocument } from '../oxn-dsl'
import { getFormatFromArgs, output, outputError } from './output'

function getProjectRoot(): string {
  return process.cwd()
}

function getBlueprintsDir(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, 'blueprints')
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
      return outputError(
        {
          code: 'OXN_OUTPUT_FILE_EXISTS',
          message: `blueprint file already exists: ${outPath}`,
          suggestion: 'use --force / -f to overwrite',
        },
        format,
      )
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
  version?: number
  slots: string[]
  props: Array<{ name: string; type: string; required?: boolean; default?: unknown }>
} {
  return {
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
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: '列出 .openxenon/blueprints/ 下所有 blueprint',
  },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const dir = getBlueprintsDir()
    if (!existsSync(dir)) {
      return output({ ok: true, data: { blueprints: [] }, human: 'No blueprints directory yet.' }, format)
    }
    const fs = require('fs') as typeof import('fs')
    const { join } = require('path') as typeof import('path')

    const blueprints: string[] = []
    function walk(currentDir: string, prefix: string): void {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true })
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
        data: { blueprints },
        human:
          blueprints.length > 0 ? `Blueprints:\n${blueprints.map((b) => `  ${b}`).join('\n')}` : 'No blueprints yet.',
      },
      format,
    )
  },
})

const blueprintCommand = defineCommand({
  meta: {
    name: 'blueprint',
    description: '管理 OXN DSL blueprint（create/validate/list）',
  },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
  },
  run() {
    console.log('Use `oxn blueprint <create|validate|list>`.')
  },
})

export default blueprintCommand
