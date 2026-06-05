import { defineCommand } from 'citty'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, DOMAINS_DIR } from '../kernel/constants'
import { createOxnParser, isDomainDeclaration, type DomainDeclaration, type OXNDocument } from '../oxn-dsl'
import { getFormatFromArgs, output, outputError } from './output'

// =============================================================================
// `oxn domain` — DDD 限界上下文管理
//
// v0.1: 全部子命令用 positional <name> 签名（与 work / blueprint 对齐）
//   create   — 在 .openxenon/domains/ 生成一个新的 domain 骨架
//   validate — 解析并校验 domain 文件（用 AST → IR 映射，规避 cyclic JSON）
//   list     — 列出已注册的 domain
//
// Intent 资产（Domain / Blueprint）的设计原则：
//   - CLI 只提供脚手架 (create) + 校验 (validate) + 列表 (list)
//   - 不补 append-term / add-prop 等"累积式"命令 —— 那是设计选择
//     （图纸需全局视野，CLI 累加易破坏 term/ban/invariant 的内部一致性）
//   - 内容创作请用 $EDITOR 直填 .oxn
// =============================================================================

function getProjectRoot(): string {
  return process.cwd()
}

function getDomainsDir(): string {
  return join(getProjectRoot(), BOUNDARY_DIR, DOMAINS_DIR)
}

// v0.1: parseDomainFile 暂未使用（OxnParser 是 async，留作 v0.2 演进 sync 包装）
// 保留此注释以便 v0.2 重新实现
// function parseDomainFile(_filePath: string) { ... }
void 0 as unknown as DomainDeclaration | null

async function validateDomainFile(filePath: string): Promise<{
  ok: boolean
  ast?: OXNDocument
  domain?: DomainDeclaration
  errors: string[]
}> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`domain file not found: ${filePath}`] }
  }
  const content = readFileSync(filePath, 'utf-8')
  const parser = createOxnParser()
  const r = await parser.parse(content, URI.file(filePath))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const domain = ast.entities.find(isDomainDeclaration) ?? null
  if (!domain) {
    return { ok: false, ast, errors: ['no DomainDeclaration found in file'] }
  }
  return { ok: true, ast, domain, errors: [] }
}

// ---------------------------------------------------------------------------
// Subcommand: create
// ---------------------------------------------------------------------------
const createSubcommand = defineCommand({
  meta: {
    name: 'create',
    description: '在 .openxenon/domains/ 生成一个新的 domain 骨架（DDD 限界上下文）',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Domain 名称（PascalCase 推荐，如 MemberContext）' },
    force: { type: 'boolean', alias: 'f', description: '覆盖已存在的文件' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const force = ctx.args.force === true || ctx.args.f === true
    const domainsDir = getDomainsDir()

    if (!/^[A-Za-z][A-Za-z0-9_-]*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid domain name: ${JSON.stringify(name)}`,
          suggestion: 'use letters/digits/dashes/underscores, start with a letter (e.g. MemberContext)',
        },
        format,
      )
    }

    if (!existsSync(domainsDir)) {
      mkdirSync(domainsDir, { recursive: true })
    }

    const outPath = join(domainsDir, `${name}.oxn`)
    if (existsSync(outPath) && !force) {
      return outputError(
        {
          code: 'OXN_OUTPUT_FILE_EXISTS',
          message: `domain file already exists: ${outPath}`,
          suggestion: 'use --force / -f to overwrite',
        },
        format,
      )
    }

    // 生成 domain 骨架模板 (v0.1-final)
    const template = `// Domain: ${name}
// Created by: oxn domain create ${name}
//
// DDD 限界上下文骨架。填写 term / ban / invariant 后
// 在 work.oxn 通过 domain "${name}" ref "..." 引用。
//
// 校验：
//   oxn domain validate ${name}

domain "${name}" {
  description = "TODO: 一句话描述这个限界上下文的业务边界"

  term {
    "TODO_Term": "TODO: 领域术语定义"
  }

  ban { "TODO_BannedTerm1", "TODO_BannedTerm2" }

  invariant { "TODO: 业务不变量规则" }

  context_map {
    imports "TODO_OtherDomain" as "TODOAlias"
  }
}
`
    writeFileSync(outPath, template, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name,
          path: outPath,
        },
        human: `Created domain ${name} at ${outPath}\n\nNext: edit ${outPath}, then run \`oxn domain validate ${name}\``,
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
    description: '解析并校验 domain 文件',
  },
  args: {
    name: { type: 'positional', required: true, description: 'Domain 名称' },
    'file-path': { type: 'string', description: '直接指定 .oxn 文件路径（可选逃生舱）' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const customPath = ctx.args['file-path'] as string | undefined
    // 文件名兼容：Domain 名是 PascalCase，但 .oxn 文件可能是 kebab-case
    // 处理 PascalCase 转 kebab-case：先在小写-大写边界插入 dash，再转小写
    const kebab = name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    const filePath = customPath
      ? resolve(customPath)
      : existsSync(join(getDomainsDir(), `${name}.oxn`))
        ? join(getDomainsDir(), `${name}.oxn`)
        : join(getDomainsDir(), `${kebab}.oxn`)

    const result = await validateDomainFile(filePath)
    if (!result.ok) {
      return outputError(
        {
          code: 'OXN_DOMAIN_INVALID',
          message: result.errors.join('; '),
          suggestion: 'run `oxn domain create <name>` to generate a skeleton',
        },
        format,
      )
    }

    // v0.1: AST → IR 映射（干掉 cyclic JSON）。langium AST 节点带 $container 父引用，
    // 直接 JSON.stringify 会撞 cycle。映射为纯对象（只有 string/array）。
    const ir = domainAstToIr(result.domain!)

    output(
      {
        ok: true,
        data: {
          name: ir.name,
          file: filePath,
          description: ir.description,
          language: ir.language,
          contextMap: ir.contextMap,
        },
        human: `Domain ${ir.name} ✓ valid
  Terms:     ${ir.language?.terms.length ?? 0}
  Ban:       ${ir.language?.ban.length ?? 0}
  Invariant: ${ir.language?.invariant.length ?? 0}
  Context Map: ${ir.contextMap.length} imports`,
      },
      format,
    )
  },
})

/**
 * v0.1: 把 langium AST 节点映射为可 JSON 序列化的纯对象 IR。
 * 消除 `$container` 父引用导致的 cyclic structures 错误。
 *
 * 关键：不同 block 的元素类型不同：
 *   - term:    TermDecl[]        → 每个有 { name, desc } 字段
 *   - ban:     string[]          (cross-ref, 裸字符串数组)
 *   - invariant: InvariantDecl[] → 每个有 .value 字段
 *   - context_map.imports: ContextMapImport[] → 每个有 { target, alias } 字段
 */
function domainAstToIr(domain: DomainDeclaration): {
  name: string
  description?: string
  language: { terms: Array<{ name: string; desc: string }>; ban: string[]; invariant: string[] } | null
  contextMap: Array<{ target: string; alias: string }>
} {
  return {
    name: domain.name,
    description: domain.descriptions?.[0]?.value,
    language:
      domain.terms || domain.ban || domain.invariant
        ? {
            terms: (domain.terms?.terms ?? []).map((t) => ({ name: t.name, desc: t.desc })),
            ban: domain.ban?.bans ?? [],
            invariant: (domain.invariant?.invariants ?? []).map((inv) => inv.value),
          }
        : null,
    contextMap: (domain.contextMap?.imports ?? []).map((i) => ({ target: i.target, alias: i.alias })),
  }
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: '列出 .openxenon/domains/ 下所有已注册的 domain',
  },
  args: {
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const domainsDir = getDomainsDir()
    if (!existsSync(domainsDir)) {
      return output(
        {
          ok: true,
          data: { domains: [] },
          human: 'No domains registered. Run `oxn domain create <name>` to create one.',
        },
        format,
      )
    }
    const files = readdirSync(domainsDir).filter((f) => f.endsWith('.oxn'))
    const domains: Array<{ name: string; file: string; description?: string }> = []
    for (const f of files) {
      const result = await validateDomainFile(join(domainsDir, f))
      if (result.ok && result.domain) {
        domains.push({
          name: result.domain.name,
          file: f,
          description: result.domain.descriptions?.[0]?.value,
        })
      } else {
        domains.push({ name: f.replace('.oxn', ''), file: f })
      }
    }
    output(
      {
        ok: true,
        data: { domains },
        human:
          domains.length > 0
            ? `Registered domains:\n${domains.map((d) => `  - ${d.name} (${d.file})${d.description ? `\n      ${d.description}` : ''}`).join('\n')}`
            : 'No domains registered.',
      },
      format,
    )
  },
})

export default defineCommand({
  meta: {
    name: 'domain',
    description: 'Domain 模块 — DDD 限界上下文管理 (create/validate/list)',
  },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
  },
  run() {
    // No-op
  },
})
