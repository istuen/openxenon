import { defineCommand } from 'citty'
import { t } from '../infra/i18n'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from '../infra/filesystem'
import { join, resolve } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, DOMAINS_DIR } from '../kernel/index'
import {
  createOxnParser,
  isDomainDeclaration,
  type BanBlock,
  type DomainDeclaration,
  type InvariantBlock,
  type OXNDocument,
  type TermBlock,
} from '../oxl'
import {
  getDomainIndexPath,
  loadDomainIndex,
  parseDomainSlim,
  writeDomainIndex,
  type DomainIndex,
} from '../oxl/compiler/domain-index-builder'
import { IAPError } from '../core/errors'
import { assertNameFileConsistent } from '../kernel/index'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'

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

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
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
    description: t('domain.create.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('domain.create.name') },
    force: { type: 'boolean', alias: 'f', description: t('domain.create.force') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const force = ctx.args.force === true || ctx.args.f === true
    const domainsDir = getDomainsDir()

    if (!/^[A-Za-z][A-Za-z0-9_-]*(?:\/[A-Za-z][A-Za-z0-9_-]*)*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid domain name: ${JSON.stringify(name)}`,
          suggestion:
            'use PascalCase segments joined by / (e.g. "MemberContext" or "member/MembershipContext"); each segment: letters, digits, underscores, dashes, starts with a letter; no leading/trailing/consecutive slashes',
        },
        format,
      )
    }

    if (!existsSync(domainsDir)) {
      mkdirSync(domainsDir, { recursive: true })
    }

    const outPath = join(domainsDir, `${name}.oxn`)
    const outDir = join(domainsDir, name.split('/').slice(0, -1).join('/'))
    if (outDir !== domainsDir && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true })
    }
    if (existsSync(outPath) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `domain file already exists: ${outPath}`, {
        suggestion: 'use --force / -f to overwrite',
        format,
      })
    }

    // 生成 domain 骨架模板 (v0.1-final)
    const template = `// Domain: ${name}
// Created by: oxn domain create ${name}
//
// ──────────────────────────────────────────────────────────────────
// HINTS — read before editing. \`oxn domain validate\` will reject
// anything that violates these rules.
// ──────────────────────────────────────────────────────────────────
//  1. Domain name: PascalCase recommended (e.g. MemberContext).
//  2. term: ≥3 core entities, key=word, value=definition. AI MUST use
//     these words when writing code in this context.
//  3. ban: ≥2 forbidden words. AI MUST NOT use these words (prevents
//     cross-context terminology drift like User/Customer/Member mix).
//  4. invariant: ≥1 business hard-rule. v0.1 documents; v0.2 enforces
//     via language-ban-checker Probe. 写法决策见 oxn-cli skill
//     「invariant 写法决策树」章节（1 条→单块单条 / 同主题→单块多条 / 异主题→多块按 // ── <主题> ── 分组，IR 等价）。
//  5. Validate: oxn domain validate ${name}
//  6. Share via Git (this file IS the source of truth):
//        git add .openxenon/domains/${name}.oxn && git commit
// ──────────────────────────────────────────────────────────────────
//
// DDD bounded context skeleton. After filling in term / ban / invariant,
// reference it from work.oxn via:
//   domain "${name}" ref "@prj/domains/${name}";
//
// Validation:
//   oxn domain validate ${name}

domain "${name}" {
  description = "TODO: one-line description of the bounded context's business boundary"

  term {
    "TODO_Term": "TODO: domain term definition"
  }

  ban { "TODO_BannedTerm1", "TODO_BannedTerm2" }

  // invariant 写法决策：1 条→单块单条 / 同主题→单块多条 / 异主题→多块按 // ── <主题> ── 分组
  // 默认示范「单块多条」（IR 等价；详见 oxn-cli skill「invariant 写法决策树」）
  invariant {
    "TODO: business invariant rule 1"
    "TODO: business invariant rule 2"
  }
}
`
    writeFileSync(outPath, template, 'utf-8')

    // v1.1: 写入后回查 AST name 与文件名一致性（macOS-safe NAME_FILE_MISMATCH 硬阻断）。
    // 模板字符串由 name 插值生成,正常情况下两者一致；此处作为防御性检查,
    // 防止未来模板或 path 逻辑漂移导致写入"name=X"的 .oxn 但落盘到 stem=Y。
    assertNameFileConsistent(name, outPath, 'domain')

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

    // PR-1: create 后静默重建全局索引（只把新增的 .oxn 文件纳入；TODO 占位也会被记录）
    const rebuild = autoRebuildDomainIndex(getProjectRoot())
    if (!rebuild.ok) {
      console.error(`Warning: domain index rebuild failed: ${rebuild.error}`)
    }
  },
})

// ---------------------------------------------------------------------------
// Subcommand: validate
// ---------------------------------------------------------------------------
const validateSubcommand = defineCommand({
  meta: {
    name: 'validate',
    description: t('domain.validate.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('domain.validate.name') },
    'file-path': { type: 'string', description: t('domain.validate.filePath') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const customPath = ctx.args['file-path'] as string | undefined
    if (!/^[A-Za-z][A-Za-z0-9_-]*(?:\/[A-Za-z][A-Za-z0-9_-]*)*$/.test(name)) {
      return outputError(
        {
          code: 'OXN_INVALID_NAME',
          message: `invalid domain name: ${JSON.stringify(name)}`,
          suggestion:
            'use PascalCase segments joined by / (e.g. "MemberContext" or "member/MembershipContext"); each segment: letters, digits, underscores, dashes, starts with a letter; no leading/trailing/consecutive slashes',
        },
        format,
      )
    }
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

    // v1.0.2: 字符串级规范化校验（macOS-safe）
    // 防止声明名 'MemberContext' 与文件 'member-context.oxn' 在 case-insensitive
    // 文件系统（macOS APFS / Windows NTFS）上"假匹配"——Linux CI 才会暴露。
    try {
      assertNameFileConsistent(ir.name, filePath, 'domain')
    } catch (err) {
      if (err instanceof IAPError) {
        return outputError(
          {
            code: err.name,
            axis: err.axis,
            action: err.action,
            message: err.message,
            context: err.context,
          },
          format,
        )
      }
      throw err
    }

    output(
      {
        ok: true,
        data: {
          name: ir.name,
          file: filePath,
          description: ir.description,
          language: ir.language,
        },
        human: `Domain ${ir.name} ✓ valid
  Terms:     ${ir.language?.terms.length ?? 0}
  Ban:       ${ir.language?.ban.length ?? 0}
  Invariant: ${ir.language?.invariant.length ?? 0}`,
      },
      format,
    )

    // PR-1: validate 成功后静默重建全局索引
    const rebuild = autoRebuildDomainIndex(getProjectRoot())
    if (!rebuild.ok) {
      console.error(`Warning: domain index rebuild failed: ${rebuild.error}`)
    }
  },
})

/**
 * v0.1.1: 把 langium AST 节点映射为可 JSON 序列化的纯对象 IR。
 * 消除 `$container` 父引用导致的 cyclic structures 错误。
 *
 * 关键：不同 block 的元素类型不同：
 *   - term:    TermDecl[]              → 每个有 { name, desc } 字段
 *   - ban:     string[]                (cross-ref, 裸字符串数组)
 *   - invariant: InvariantBlock[]      → 每块有 invariants: InvariantDecl[]
 *     v0.1.1 起允许多个 invariant 块；这里把所有块里的 decl 展平为单一字符串数组
 */
function domainAstToIr(domain: DomainDeclaration): {
  name: string
  description?: string
  language: { terms: Array<{ name: string; desc: string }>; ban: string[]; invariant: string[] } | null
} {
  // v0.3 follow-up: term / ban / invariant 都在 domain.body[] 内（任意顺序）
  const body = (domain.body ?? []) as Array<{ $type: string }>
  const termBlocks = body.filter((el) => el.$type === 'TermBlock') as TermBlock[]
  const banBlock = body.find((el) => el.$type === 'BanBlock') as BanBlock | undefined
  const invariantBlocks = body.filter((el) => el.$type === 'InvariantBlock') as InvariantBlock[]

  const invariants: string[] = []
  for (const block of invariantBlocks) {
    for (const inv of block.invariants ?? []) {
      if (inv.value) invariants.push(inv.value)
    }
  }
  const hasLanguage = !!(termBlocks.length > 0 || banBlock || invariantBlocks.length > 0)
  return {
    name: domain.name,
    description: domain.descriptions?.[0]?.value,
    language: hasLanguage
      ? {
          terms: termBlocks.flatMap((tb) => tb.terms).map((t) => ({ name: t.name, desc: t.desc })),
          ban: banBlock?.bans ?? [],
          invariant: invariants,
        }
      : null,
  }
}

// ---------------------------------------------------------------------------
// Subcommand: list
// ---------------------------------------------------------------------------
const listSubcommand = defineCommand({
  meta: {
    name: 'list',
    description: t('domain.list.description'),
  },
  args: {
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
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

    // v1.1 PR-1: 优先走 .openxenon/.cache/domains.json（slim 索引），
    // 过滤 status='ok' 的条目 —— parseDomainSlim 软检测会把 NAME_FILE_MISMATCH
    // 标记为 invalid，避免 list 静默显示坏数据。
    const indexPath = getDomainIndexPath(projectRoot)
    const cached = loadDomainIndex(indexPath)
    if (cached) {
      const okDomains = cached.domains
        .filter((d) => d.status === 'ok')
        .map((d) => ({
          name: d.name,
          file: d.file,
          ...(d.description !== undefined ? { description: d.description } : {}),
        }))
      const invalidCount = cached.domains.length - okDomains.length
      return output(
        {
          ok: true,
          data: {
            domains: okDomains,
            ...(invalidCount > 0 ? { invalidCount, hint: 'run `oxn domain validate <name>` to inspect' } : {}),
          },
          human:
            okDomains.length > 0
              ? `Registered domains:\n${okDomains.map((d) => `  - ${d.name} (${d.file})${d.description ? `\n      ${d.description}` : ''}`).join('\n')}` +
                (invalidCount > 0
                  ? `\n\n${invalidCount} domain(s) skipped due to invalid status (NAME_FILE_MISMATCH or parse errors)`
                  : '')
              : 'No valid domains registered.',
        },
        format,
      )
    }

    // 索引不存在时降级：目录扫描 + parseDomainSlim（不走 langium 重解析）。
    const domains: Array<{ name: string; file: string; description?: string }> = []
    const fileEntries: Array<{ fullPath: string; relPath: string }> = []

    function walk(currentDir: string, prefix: string): void {
      const entries = readdirSync(currentDir, { withFileTypes: true })
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name)
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.isDirectory()) {
          walk(fullPath, relPath)
        } else if (entry.isFile() && entry.name.endsWith('.oxn')) {
          fileEntries.push({ fullPath, relPath })
        }
      }
    }
    walk(domainsDir, '')

    for (const { fullPath, relPath } of fileEntries) {
      const slim = parseDomainSlim(fullPath, projectRoot)
      if (slim.status === 'ok') {
        domains.push({
          name: slim.name,
          file: relPath,
          ...(slim.description !== undefined ? { description: slim.description } : {}),
        })
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

// ---------------------------------------------------------------------------
// Subcommand: index (PR-1)
// ---------------------------------------------------------------------------
//
// 扫 `.openxenon/domains/*.oxn`（含子目录）→ 落 `.openxenon/.cache/domains.json`
// slim 模式：name/file/desc/termNames + 计数；不展开 term 的 desc 与 ban/invariant 文本
// （slim 是 AI 全局检索入口；展开版由 per-work domains.json 提供，PR-2/3 引入）。
//
// 设计语义：
//   - 不传 --emit：默认落 `.openxenon/.cache/domains.json`（项目内 cache）
//   --emit <path>：落到自定义路径（不常用，调试用）
//   --check：仅校验索引是否新鲜（generatedAt + 与文件系统 mtime 比对），不写
const indexSubcommand = defineCommand({
  meta: {
    name: 'index',
    description: t('domain.index.description'),
  },
  args: {
    emit: {
      type: 'string',
      description: t('domain.index.output'),
    },
    check: {
      type: 'boolean',
      description: t('domain.index.freshness'),
    },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const projectRoot = getProjectRoot()
    const domainsDir = getDomainsDir()
    const customEmit = ctx.args.emit as string | undefined
    const checkOnly = ctx.args.check === true
    const outPath = customEmit ? resolve(customEmit) : getDomainIndexPath(projectRoot)

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    if (checkOnly) {
      const existing = loadDomainIndex(outPath)
      if (!existing) {
        return output(
          {
            ok: true,
            data: { fresh: false, reason: 'index missing' },
            human: `Index missing at ${outPath}\nRun \`oxn domain index\` to build.`,
          },
          format,
        )
      }
      return output(
        {
          ok: true,
          data: { fresh: true, generatedAt: existing.generatedAt, domainCount: existing.domainCount },
          human: `Index fresh: ${existing.domainCount} domains, generated at ${existing.generatedAt}`,
        },
        format,
      )
    }

    let index: DomainIndex
    try {
      index = writeDomainIndex({ projectRoot, domainsDir, outPath })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return outputError({ code: 'OXN_DOMAIN_INDEX_FAILED', message }, format)
    }

    const invalidCount = index.domains.filter((d) => d.status === 'invalid').length
    output(
      {
        ok: true,
        data: {
          indexPath: outPath,
          generatedAt: index.generatedAt,
          domainCount: index.domainCount,
          invalidCount,
          domains: index.domains,
        },
        human:
          `Domain index built: ${index.domainCount} domain(s) at ${outPath}\n` +
          (invalidCount > 0 ? `  ⚠ ${invalidCount} domain(s) failed to parse — see domains[].errors\n` : '') +
          index.domains
            .map((d) => `  - ${d.name} (${d.status}, ${d.termNames.length} terms, ${d.invariantCount} invariants)`)
            .join('\n'),
      },
      format,
    )
  },
})

// ---------------------------------------------------------------------------
// Helper: 自动重建索引（被 create / validate 调）
// ---------------------------------------------------------------------------
//
// 静默失败：索引写不出不应阻断主流程（domain 资产本身已正确）；
// 失败时返回 { ok: false, error }，由调用方决定 stderr 打 warning。
export function autoRebuildDomainIndex(projectRoot: string): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    const domainsDir = join(projectRoot, BOUNDARY_DIR, DOMAINS_DIR)
    if (!existsSync(domainsDir)) return { ok: true }
    const outPath = getDomainIndexPath(projectRoot)
    writeDomainIndex({ projectRoot, domainsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}

export default defineCommand({
  meta: {
    name: 'domain',
    description: t('domain.description'),
  },
  subCommands: {
    create: createSubcommand,
    validate: validateSubcommand,
    list: listSubcommand,
    index: indexSubcommand,
  },
  run() {
    // No-op
  },
})
