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
// 子命令：
//   new      — 在 .openxenon/domains/ 生成一个新的 domain 骨架
//   validate — 解析并校验 domain 文件
//   list     — 列出已注册的 domain
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
// Subcommand: new
// ---------------------------------------------------------------------------
const newSubcommand = defineCommand({
  meta: {
    name: 'new',
    description: '在 .openxenon/domains/ 生成一个新的 domain 骨架（DDD 限界上下文）',
  },
  args: {
    name: { type: 'string', required: true, description: 'Domain 名称（PascalCase 推荐，如 MemberContext）' },
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

    // 生成 domain 骨架模板
    const kebabName = name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    const template = `// Domain: ${name}
// Created by: oxn domain new --name ${name}
//
// DDD 限界上下文骨架。填写 language / domain_rules / context_map 后
// 在 work.oxn 通过 use_domain "${name}" 引用，task.oxn 通过 inject 注入。
//
// 校验：
//   oxn domain validate ${name}

domain "${name}" {
  description = "TODO: 一句话描述这个限界上下文的业务边界"

  language {
    noun "TODO_Noun" desc "TODO: 领域名词，AI 必须使用的术语"
    verb "TODO_Verb" desc "TODO: 领域动作，AI 必须使用的操作"
    ban = ["TODO_BannedTerm1", "TODO_BannedTerm2"]
  }

  domain_rules {
    rule "TODO_RuleName" desc "TODO: 业务不变量（v0.1 仅文档化，v0.2 接 Probe）"
  }

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
          kebabName,
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
    name: { type: 'string', required: true, description: 'Domain 名称' },
    'file-path': { type: 'string', description: '直接指定 .oxn 文件路径（可选）' },
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
          suggestion: 'run `oxn domain new --name <name>` to generate a skeleton',
        },
        format,
      )
    }

    const domain = result.domain!
    const language = domain.language
    const domainRules = domain.domainRules
    const contextMap = domain.contextMap

    output(
      {
        ok: true,
        data: {
          name: domain.name,
          file: filePath,
          description: domain.descriptions?.[0]?.value,
          language: language
            ? {
                nouns: (language.nouns ?? []).map((n) => ({ name: n.name, desc: n.desc })),
                verbs: (language.verbs ?? []).map((v) => ({ name: v.name, desc: v.desc })),
                ban: language.bans ?? [],
              }
            : null,
          domainRules: domainRules ? (domainRules.rules ?? []).map((r) => ({ name: r.name, desc: r.desc })) : [],
          contextMap: contextMap ? (contextMap.imports ?? []).map((i) => ({ target: i.target, alias: i.alias })) : [],
        },
        human: `Domain ${domain.name} ✓ valid
  Language: ${language ? `${(language.nouns ?? []).length} nouns, ${(language.verbs ?? []).length} verbs, ${(language.bans ?? []).length} banned` : '(none)'}
  Rules: ${domainRules ? (domainRules.rules ?? []).length : 0}
  Context Map: ${contextMap ? (contextMap.imports ?? []).length + ' imports' : '(none)'}`,
      },
      format,
    )
  },
})

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
          human: 'No domains registered. Run `oxn domain new --name <name>` to create one.',
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
    description: 'Domain 模块 — DDD 限界上下文管理 (new/validate/list)',
  },
  subCommands: {
    new: newSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
  },
  run() {
    // No-op
  },
})
