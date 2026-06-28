import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { join, resolve } from 'path'
import { URI } from 'langium'
import { BOUNDARY_DIR, DOMAINS_DIR } from '@openxenon/engine/kernel'
import { compileOxnToMd } from '@openxenon/engine/oxl/md-bridge/oxl-md-decompiler.js'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractDomainIR } from '@openxenon/engine/oxl/md-pipeline/transformers/domain.js'
import { serializeDomainToOxn } from '@openxenon/engine/oxl/md-pipeline/oxn-serializer.js'
import type { AssetFormat } from '@openxenon/engine/infra/paths'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
} from '@openxenon/engine/infra/paths'
import { readProjectConfig } from './project-config-io'
import {
  createOxnParser,
  isDomainDeclaration,
  type BanBlock,
  type DomainDeclaration,
  type InvariantBlock,
  type OXNDocument,
  type TermBlock,
} from '@openxenon/engine/oxl'
import {
  getDomainIndexPath,
  loadDomainIndex,
  parseDomainSlim,
  writeDomainIndex,
  type DomainIndex,
} from '@openxenon/engine/oxl/compiler/domain-index-builder'
import { IAPError } from '@openxenon/engine/errors'
import { assertNameFileConsistent } from '@openxenon/engine/kernel'
import { getFormatFromArgs, output, outputError, outputUserInputError } from './output'
import {
  computeSha256,
  readSyncMetadata,
  composeSyncContent,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
} from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { validateOxnParseable, verifyDomainRoundTrip } from '@openxenon/engine/oxl/md-pipeline/sync-validation.js'

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
  // v0.5 Phase 3: 根据扩展名选择验证路径
  if (filePath.endsWith('.md')) {
    return validateDomainFromMd(filePath)
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

/**
 * v0.5 Phase 3: 从 .md 验证 domain
 * 用 md-pipeline 的 extractDomainIR, 把它反向序列化成 OXNDocument (langium AST shape),
 * 这样下游的 domainAstToIr 不变.
 */
async function validateDomainFromMd(filePath: string): Promise<{
  ok: boolean
  ast?: OXNDocument
  domain?: DomainDeclaration
  errors: string[]
}> {
  const content = readFileSync(filePath, 'utf-8')
  let ir: import('@openxenon/engine/oxl/md-pipeline/transformers/domain').DomainIR
  try {
    const { parseMarkdown } = await import('@openxenon/engine/oxl/md-pipeline/utils')
    const { extractDomainIR } = await import('@openxenon/engine/oxl/md-pipeline/transformers/domain')
    const parsed = parseMarkdown(content)
    ir = extractDomainIR(parsed.tree, parsed.frontmatter)
  } catch (e) {
    return {
      ok: false,
      errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`],
    }
  }
  // IR → 临时 .oxn → parse 拿到 AST (走 langium 路径拿 DomainDeclaration)
  // 比直接构造 DomainDeclaration AST 更可靠
  const { serializeDomainToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
  const oxnContent: string = serializeDomainToOxn(ir)
  // 第二次 parse 拿到 AST (仅用于 domainAstToIr, 不写盘)
  const parser = createOxnParser()
  const r = await parser.parse(oxnContent, URI.file(`${filePath}.oxn`))
  if (r.parseErrors.length > 0 || r.lexerErrors.length > 0) {
    return {
      ok: false,
      errors: [...r.parseErrors.map((e) => `[Parser] ${e}`), ...r.lexerErrors.map((e) => `[Lexer] ${e}`)],
    }
  }
  const ast = r.ast as OXNDocument
  const domain = ast.entities.find(isDomainDeclaration) ?? null
  if (!domain) {
    return { ok: false, ast, errors: ['no DomainDeclaration derived from md'] }
  }
  return { ok: true, ast, domain, errors: [] }
}

// ---------------------------------------------------------------------------
// v0.5 Phase 3: format-aware template generator
// ---------------------------------------------------------------------------

function domainCreateTemplate(name: string, format: AssetFormat): string {
  if (format === 'md') {
    // v0.5 Phase 3: .md 模板（含 frontmatter, 无 header 注释 — 注释写 .oxn）
    return `---
entity: domain
version: 0.3.0
name: ${name}
---

# Domain: ${name}

> TODO: one-line description of the bounded context's business boundary

## Terms

### TODO_Term
- desc: TODO: domain term definition

## Bans

- items:
  - TODO_BannedTerm1
  - TODO_BannedTerm2

## Invariants

- value: TODO: business invariant rule 1
- value: TODO: business invariant rule 2
`
  }
  // .oxn 模板（v0.4 既有）
  return `// Domain: ${name}
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
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const name = ctx.args.name as string
    const force = ctx.args.force === true || ctx.args.f === true
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
    const autoSync = resolveAutoSync(config)
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

    // v0.5 Phase 3: 主路径由 config.assetFormat 决定
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'domain', name, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'domain', name, assetFormat)
    const primaryDir = join(primaryPath, '..')
    const altDir = join(altPath, '..')
    if (!existsSync(primaryDir)) mkdirSync(primaryDir, { recursive: true })
    if (!existsSync(altDir)) mkdirSync(altDir, { recursive: true })

    if (existsSync(primaryPath) && !force) {
      return outputUserInputError('OXN_OUTPUT_FILE_EXISTS', `domain file already exists: ${primaryPath}`, {
        suggestion: 'use --force / -f to overwrite',
        format,
      })
    }

    // v0.5 Phase 3: 模板内容因格式不同而异
    const template = domainCreateTemplate(name, assetFormat)

    writeFileSync(primaryPath, template, 'utf-8')

    // v0.5 Phase 3: 自动 sync 到另一种格式
    if (autoSync) {
      try {
        if (assetFormat === 'oxn') {
          // .oxn → .md
          const { md: altContent } = await compileOxnToMd(template, { entity: 'domain', frontmatter: true })
          writeFileSync(altPath, altContent, 'utf-8')
        } else {
          // .md → .oxn (use serializer)
          const { tree, frontmatter: fm } = parseMarkdown(template)
          const ir = extractDomainIR(tree, fm)
          const altContent = serializeDomainToOxn(ir)
          writeFileSync(altPath, altContent, 'utf-8')
        }
      } catch {
        // autoSync 失败不阻断主命令
      }
    }

    // v1.1: 写入后回查 AST name 与文件名一致性（macOS-safe NAME_FILE_MISMATCH 硬阻断）。
    // 模板字符串由 name 插值生成,正常情况下两者一致；此处作为防御性检查,
    // 防止未来模板或 path 逻辑漂移导致写入"name=X"的 .oxn 但落盘到 stem=Y。
    assertNameFileConsistent(name, primaryPath, 'domain')

    output(
      {
        ok: true,
        data: {
          name,
          path: primaryPath,
          format: assetFormat,
          syncedTo: autoSync ? altPath : null,
        },
        human: `Created domain ${name} at ${primaryPath}${autoSync ? ` (synced to ${altPath})` : ''}\n\nNext: edit ${primaryPath}, then run \`oxn domain validate ${name}\``,
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
    const projectRoot = getProjectRoot()
    const config = readProjectConfig(projectRoot)
    const assetFormat = resolveAssetFormat(config)
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
    // v0.5 Phase 3: 路径由 config.assetFormat 决定（默认 oxn），但若主格式不存在,
    // 自动 fall back 到 alt 格式 (向后兼容老 .oxn-only 项目)
    const kebab = name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'domain', name, assetFormat)
    const altPath = resolveAssetAltPath(projectRoot, 'domain', name, assetFormat)
    const filePath = customPath
      ? resolve(customPath)
      : existsSync(primaryPath)
        ? primaryPath
        : existsSync(altPath)
          ? altPath
          : existsSync(join(getDomainsDir(), `${kebab}.oxn`))
            ? join(getDomainsDir(), `${kebab}.oxn`)
            : primaryPath // 默认指向主格式,validate 时报 OXN_FILE_NOT_FOUND

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
          format: assetFormat,
          description: ir.description,
          language: ir.language,
        },
        human: `Domain ${ir.name} ✓ valid
  Format:    ${filePath.endsWith('.md') ? 'md' : 'oxn'}
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

// ---------------------------------------------------------------------------
// Subcommand: compile (v0.3.0 — 把 .oxn 重编译为 v0.3 canonical 纯 MD .md)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Subcommand: sync (v0.4 Phase 1 — .oxn → .md 自动同步)
// ---------------------------------------------------------------------------
//
// 提交流程:
//   1. 读 .openxenon/domains/<name>.oxn, 算 SHA-256 → sha_oxn_current
//   2. 读 .openxenon/domains-md/<name>.md frontmatter.oxn-source-sha → sha_oxn_prev
//   3. 编译 .oxn → .md (用 oxl-md-decompiler)
//   4. 比对:
//      - sha_oxn_current == sha_oxn_prev AND sha_md_new == sha_md_prev → no-op
//      - 否则 → 写 .md + 写 .cache/<name>.hash + 更新 frontmatter.oxn-source-sha
//   5. 输出 status (compiled / unchanged / error)
//
// 兼容性:
//   - 旧 .md 无 frontmatter.oxn-source-sha → 当作首次 sync, 必重生成
//   - .oxn 不存在 → OXN_FILE_NOT_FOUND
//   - 编译失败 → OXN_DOMAIN_COMPILE_FAILED
//
// RFC: .openxenon/pools/sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md §2

const syncSubcommand = defineCommand({
  meta: {
    name: 'sync',
    description: '[v0.4 Phase 1] Sync .oxn → .md: regenerate .md only when .oxn changed (idempotent, hash-based).',
  },
  args: {
    name: { type: 'positional', required: false, description: 'Domain name (omit if --all)' },
    all: { type: 'boolean', description: 'Sync all registered domains' },
    'dry-run': { type: 'boolean', description: 'Simulate without writing files' },
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
      return outputError(
        {
          code: 'OXN_SYNC_ARGS_MISSING',
          message: 'either <name> or --all is required',
          suggestion: 'run `oxn domain sync <name>` or `oxn domain sync --all`',
        },
        format,
      )
    }

    // 确定要处理的 names
    const domainsDir = join(projectRoot, BOUNDARY_DIR, DOMAINS_DIR)
    let names: string[]
    if (all) {
      if (!existsSync(domainsDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/domains/' }, format)
      }
      names = readdirSync(domainsDir)
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
      const oxnPath = join(domainsDir, `${name}.oxn`)
      const mdPath = join(projectRoot, BOUNDARY_DIR, 'domains-md', `${name}.md`)
      const cachePath = getCachePath(projectRoot, 'domain', name)

      if (!existsSync(oxnPath)) {
        results.push({ name, status: 'error', error: `.oxn not found: ${oxnPath}` })
        continue
      }

      const oxnContent = readFileSync(oxnPath, 'utf-8')
      const oxnSha = computeSha256(oxnContent)

      // 读 .md frontmatter (如有)
      const prevMeta = existsSync(mdPath) ? readSyncMetadata(mdPath) : null
      const prevOxnSha = prevMeta?.oxnSourceSha

      // 比对: oxn 未变 + .md 已存在 → no-op (idempotent)
      if (prevOxnSha === oxnSha && existsSync(mdPath)) {
        results.push({
          name,
          status: 'unchanged',
          oxnSha,
          mdSha: prevMeta?.mdSelfSha,
        })
        continue
      }

      if (dryRun) {
        results.push({ name, status: 'updated', oxnSha })
        continue
      }

      // 编译 .oxn → .md
      let result
      try {
        result = await compileOxnToMd(oxnContent, { entity: 'domain', frontmatter: true })
      } catch (err) {
        results.push({
          name,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        })
        continue
      }

      // 写 .md
      const mdDir = join(projectRoot, BOUNDARY_DIR, 'domains-md')
      if (!existsSync(mdDir)) mkdirSync(mdDir, { recursive: true })

      // 构造含 sync frontmatter 的 .md, 直接写盘 (无 chicken-egg 问题)
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
          `domain sync ${all ? '--all' : names.length === 1 ? `<${names[0]}>` : `${names.length} items`}` +
          (dryRun ? ' (dry-run)' : '') +
          `\n  total:     ${summary.total}\n` +
          `  updated:   ${summary.updated}\n` +
          `  unchanged: ${summary.unchanged}\n` +
          `  error:     ${summary.error}` +
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
//
// 流程:
//   1. 读 .md → SHA-256 → sha_md_current
//   2. 读 .cache/<name>.md-hash → sha_md_prev
//   3. 如果 sha_md_current == sha_md_prev → no-op
//   4. 否则: parseMarkdown → extractDomainIR → serializeDomainToOxn → 写 .oxn
//   5. 触发 Phase 1 sync (.oxn → .md) 更新 cache
//
// RFC: .openxenon/pools/sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md §3

const syncMdSubcommand = defineCommand({
  meta: {
    name: 'sync-md',
    description: '[v0.4 Phase 2] Reverse sync .md → .oxn: regenerate .oxn when .md changed',
  },
  args: {
    name: { type: 'positional', required: false },
    all: { type: 'boolean' },
    'dry-run': { type: 'boolean' },
    'no-chain': { type: 'boolean', description: 'Skip Phase 1 re-sync (.oxn → .md)' },
    'oxn-priority': { type: 'boolean', description: 'In conflict (both changed), prefer .oxn (run sync not sync-md)' },
    'no-roundtrip': { type: 'boolean', description: 'Skip round-trip-loss validation' },
    'no-parse-check': { type: 'boolean', description: 'Skip langium parse validation' },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const all = ctx.args.all === true
    const dryRun = ctx.args['dry-run'] === true
    // citty 0.1.6 把 `--no-X` 解析为 `X: false` (no- 前缀反转)
    const noChain = ctx.args.chain === false
    const oxnPriority = ctx.args['oxn-priority'] === true
    const noRoundtrip = ctx.args.roundtrip === false
    const noParseCheck = ctx.args['parse-check'] === false
    const singleName = ctx.args.name as string | undefined
    const projectRoot = getProjectRoot()

    if (!all && !singleName) {
      return outputError({ code: 'OXN_SYNC_ARGS_MISSING', message: 'either <name> or --all is required' }, format)
    }

    const mdDir = join(projectRoot, BOUNDARY_DIR, 'domains-md')
    const oxnDir = join(projectRoot, BOUNDARY_DIR, DOMAINS_DIR)
    let names: string[]
    if (all) {
      if (!existsSync(mdDir)) {
        return outputError({ code: 'OXN_NO_PROJECT', message: 'no .openxenon/domains-md/' }, format)
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
      const mdCachePath = getCacheMdPath(projectRoot, 'domain', name)

      if (!existsSync(mdPath)) {
        results.push({ name, status: 'error', error: `.md not found: ${mdPath}` })
        continue
      }

      const mdContent = readFileSync(mdPath, 'utf-8')
      const shaMdCurrent = computeSha256(mdContent)

      // conflict: .oxn 也被改 + .oxn-priority → 跳过 .md 改, 跑 sync
      const oxnExists = existsSync(oxnPath)
      const oxnSha = oxnExists ? computeSha256(readFileSync(oxnPath, 'utf-8')) : ''
      const oxnPrevSha = oxnExists ? readSyncMetadata(mdPath)?.oxnSourceSha : undefined
      const bothChanged = oxnExists && oxnPrevSha && oxnPrevSha !== oxnSha
      if (bothChanged && oxnPriority) {
        // .oxn wins, 触发 Phase 1 sync 重生成 .md
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'domain', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnSha,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'domain', name), mdSha)
          writeFileSync(mdCachePath, `${mdSha}\n`, 'utf-8')
        } catch (err) {
          results.push({ name, status: 'error', error: `oxn-priority sync: ${String(err)}` })
          continue
        }
        results.push({ name, status: 'oxn-wins', mdSha: shaMdCurrent, oxnSha })
        continue
      }

      // idempotent: md 未变
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

      // 解析 .md → IR → 序列化 → .oxn
      let tree
      let frontmatter
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
        ir = extractDomainIR(tree, frontmatter)
      } catch (err) {
        results.push({ name, status: 'error', error: `IR extract: ${String(err)}` })
        continue
      }

      const oxnContent = serializeDomainToOxn(ir)
      const oxnShaNew = computeSha256(oxnContent)

      // Phase 2 守卫 1: langium parse 验证
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

      // Phase 2 守卫 2: round-trip 验证 (serialize → compile → extract → diff)
      if (!noRoundtrip) {
        const rtResult = await verifyDomainRoundTrip(ir, oxnContent)
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

      // 写 .oxn
      if (!existsSync(oxnDir)) mkdirSync(oxnDir, { recursive: true })
      writeFileSync(oxnPath, oxnContent, 'utf-8')

      // 触发 Phase 1 sync (更新 .md frontmatter + .cache/<name>.hash)
      if (!noChain && existsSync(oxnPath)) {
        try {
          const oxnRaw = readFileSync(oxnPath, 'utf-8')
          const mdResult = await compileOxnToMd(oxnRaw, { entity: 'domain', frontmatter: true })
          const finalContent = composeSyncContent(mdResult.md, {
            oxnSourceSha: oxnShaNew,
            syncedAt: new Date().toISOString(),
          })
          const mdSha = computeSha256(finalContent)
          writeFileSync(mdPath, finalContent, 'utf-8')
          writeCacheSha(getCachePath(projectRoot, 'domain', name), mdSha)
        } catch {
          // chained sync fails silently — .oxn 已经写成功了
        }
      }

      // 写 Phase 2 cache
      const cacheDir = join(mdDir, '.cache')
      if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true })
      const finalMdSha = existsSync(mdPath) ? computeSha256(readFileSync(mdPath, 'utf-8')) : shaMdCurrent
      writeFileSync(mdCachePath, `${finalMdSha}\n`, 'utf-8')

      results.push({ name, status: 'updated', mdSha: finalMdSha, oxnSha: oxnShaNew })
    }

    const summary = {
      total: results.length,
      updated: results.filter((r) => r.status === 'updated').length,
      unchanged: results.filter((r) => r.status === 'unchanged').length,
      'oxn-wins': results.filter((r) => r.status === 'oxn-wins').length,
      error: results.filter((r) => r.status === 'error').length,
      dryRun,
      oxnPriority,
    }

    output(
      {
        ok: summary.error === 0,
        data: { ...summary, results },
        human:
          `domain sync-md ${all ? '--all' : names.length === 1 ? `<${names[0]}>` : `${names.length} items`}` +
          (dryRun ? ' (dry-run)' : '') +
          (oxnPriority ? ' (oxn-priority)' : '') +
          `\n  total:     ${summary.total}\n  updated:   ${summary.updated}\n  unchanged: ${summary.unchanged}\n  oxn-wins:  ${summary['oxn-wins']}\n  error:     ${summary.error}` +
          (summary.error > 0
            ? '\n\nFailed:\n' +
              results
                .filter((r) => r.status === 'error')
                .map((r) => `  - ${r.name}: [${r.errorCode ?? 'ERROR'}] ${r.error}`)
                .join('\n')
            : ''),
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
    description: t('domain.compile.description'),
  },
  args: {
    name: { type: 'positional', required: true, description: t('domain.compile.name') },
    'file-path': { type: 'string', description: t('domain.compile.filePath') },
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
            'use PascalCase segments joined by / (e.g. "MemberContext"); each segment: letters, digits, underscores, dashes, starts with a letter',
        },
        format,
      )
    }

    // 文件名兼容：PascalCase / kebab-case
    const kebab = name
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .replace(/_/g, '-')
      .toLowerCase()
    const oxnPath = customPath
      ? resolve(customPath)
      : existsSync(join(getDomainsDir(), `${name}.oxn`))
        ? join(getDomainsDir(), `${name}.oxn`)
        : join(getDomainsDir(), `${kebab}.oxn`)

    if (!existsSync(oxnPath)) {
      return outputUserInputError('OXN_FILE_NOT_FOUND', `domain .oxn not found: ${oxnPath}`, {
        suggestion: `run \`oxn domain create ${name}\` first, then edit + compile`,
        format,
      })
    }

    const oxnContent = readFileSync(oxnPath, 'utf-8')

    let result
    try {
      result = await compileOxnToMd(oxnContent, {
        entity: 'domain',
        frontmatter: true,
      })
    } catch (err) {
      return outputError(
        {
          code: 'OXN_DOMAIN_COMPILE_FAILED',
          message: err instanceof Error ? err.message : String(err),
          suggestion: 'check `oxn domain validate <name>` for structural errors before compile',
        },
        format,
      )
    }

    const mdPath = join(getProjectRoot(), BOUNDARY_DIR, 'domains-md', `${result.name}.md`)
    const mdDir = join(getProjectRoot(), BOUNDARY_DIR, 'domains-md')
    if (!existsSync(mdDir)) {
      mkdirSync(mdDir, { recursive: true })
    }
    writeFileSync(mdPath, result.md, 'utf-8')

    output(
      {
        ok: true,
        data: {
          name: result.name,
          source: oxnPath,
          target: mdPath,
          contentHash: result.contentHash,
          warnings: [],
        },
        human: `Compiled ${result.name}
  source: ${oxnPath}
  target: ${mdPath}
  bytes:  ${result.md.length}
  hash:   ${result.contentHash.slice(0, 16)}...`,
      },
      format,
    )

    // PR-1: compile 成功后静默重建全局索引（让 .md 变更反映到 domains.json）
    const rebuild = autoRebuildDomainIndex(getProjectRoot())
    if (!rebuild.ok) {
      console.error(`Warning: domain index rebuild failed: ${rebuild.error}`)
    }
  },
})

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
    compile: compileSubcommand,
    sync: syncSubcommand,
    'sync-md': syncMdSubcommand,
  },
  run() {
    // No-op
  },
})
