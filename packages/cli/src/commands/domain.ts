import { defineCommand } from 'citty'
import { t } from '@openxenon/engine/infra/i18n'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  chmodSync,
} from '@openxenon/engine/infra/filesystem'
import { join, resolve } from 'path'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'
import { extractDomainIR } from '@openxenon/engine/oxl/md-pipeline/transformers/domain.js'
import {
  resolveAssetPrimaryPath,
  resolveAssetAltPath,
  resolveAssetFormat,
  resolveAutoSync,
  resolveAssetDir,
  resolveAssetCandidates,
} from '@openxenon/engine/infra/paths'
import { readProjectConfig } from './project-config-io'
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
import { clearCacheForEntity } from '@openxenon/engine/oxl/md-pipeline/sync-hash.js'
import { domainCreateTemplate, autoRebuildDomainIndex } from '@openxenon/engine/Asset/domain-manager'

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
  const { primary, fallback } = resolveAssetCandidates(getProjectRoot(), 'domain', readProjectConfig(getProjectRoot()))
  if (existsSync(primary)) return primary
  if (existsSync(fallback)) return fallback
  return primary
}

function projectBoundaryExists(): boolean {
  return existsSync(join(getProjectRoot(), BOUNDARY_DIR))
}

// v0.1: parseDomainFile 暂未使用（OxnParser 是 async，留作 v0.2 演进 sync 包装）
// 保留此注释以便 v0.2 重新实现
// function parseDomainFile(_filePath: string) { ... }

// v0.7.0: Only .md files are supported (Langium removed)

async function validateDomainFile(filePath: string): Promise<{
  ok: boolean
  ir?: import('@openxenon/engine/oxl/md-pipeline/transformers/domain').DomainIR
  errors: string[]
}> {
  if (!existsSync(filePath)) {
    return { ok: false, errors: [`domain file not found: ${filePath}`] }
  }
  const content = readFileSync(filePath, 'utf-8')
  try {
    const { tree, frontmatter: fm } = parseMarkdown(content)
    const ir = extractDomainIR(tree, fm)
    return { ok: true, ir, errors: [] }
  } catch (e) {
    return { ok: false, errors: [`md parse failed: ${e instanceof Error ? e.message : String(e)}`] }
  }
}

// v0.7.0: validateDomainFromMd merged into validateDomainFile (Langium removed)

// ---------------------------------------------------------------------------
// v0.5 Phase 3: format-aware template generator
// ---------------------------------------------------------------------------

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
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'domain', name, assetFormat, config)
    const altPath = resolveAssetAltPath(projectRoot, 'domain', name, assetFormat, config)
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
    // v0.6.1-alpha.0 #1-4: 立即锁 0o444（planLock 守卫前提）— 工程师无法绕过 .oxn 文件
    chmodSync(primaryPath, 0o444)

    // v0.7.0: auto-sync removed (Langium removed; .md is canonical)
    if (autoSync) {
      try {
        // Generate backward-compatible .oxn copy if primary is .md
        if (assetFormat === 'md') {
          const { tree, frontmatter: fm } = parseMarkdown(template)
          const ir = extractDomainIR(tree, fm)
          // Serialize to .oxn for backward compatibility
          const { serializeDomainToOxn } = await import('@openxenon/engine/oxl/md-pipeline/oxn-serializer')
          const altContent = serializeDomainToOxn(ir)
          writeFileSync(altPath, altContent, 'utf-8')
          chmodSync(altPath, 0o444)
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
    const primaryPath = resolveAssetPrimaryPath(projectRoot, 'domain', name, assetFormat, config)
    const altPath = resolveAssetAltPath(projectRoot, 'domain', name, assetFormat, config)
    const filePath = customPath
      ? resolve(customPath)
      : existsSync(primaryPath)
        ? primaryPath
        : existsSync(altPath)
          ? altPath
          : existsSync(join(getDomainsDir(), `${kebab}.oxn`))
            ? join(getDomainsDir(), `${kebab}.oxn`)
            : primaryPath // 默认指向主格式,validate 时报 OXN_FILE_NOT_FOUND

    // v0.7.0: .oxn files no longer supported (Langium removed)
    if (filePath.endsWith('.oxn')) {
      return outputError(
        {
          code: 'OXN_FORMAT_DEPRECATED',
          message: `.oxn files are no longer supported: ${filePath}. Migrate to .md format.`,
          suggestion: 'use `oxn domain create <name>` to generate a .md skeleton, then migrate content',
        },
        format,
      )
    }

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

    // v0.7.0: Use IR directly from md-pipeline (no Langium AST → IR conversion needed)
    const ir = result.ir!
    const domainName = ir.name

    // v1.0.2: 字符串级规范化校验（macOS-safe）
    // 防止声明名 'MemberContext' 与文件 'member-context.oxn' 在 case-insensitive
    // 文件系统（macOS APFS / Windows NTFS）上"假匹配"——Linux CI 才会暴露。
    try {
      assertNameFileConsistent(domainName, filePath, 'domain')
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
          name: domainName,
          file: filePath,
          format: assetFormat,
          description: ir.description,
          terms: ir.terms.length,
          bans: ir.bans.length,
          invariants: ir.invariants.length,
        },
        human: `Domain ${domainName} ✓ valid
  Format:    md
  Terms:     ${ir.terms.length}
  Ban:       ${ir.bans.length}
  Invariant: ${ir.invariants.length}`,
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

// v0.7.0: domainAstToIr removed (Langium removed; IR used directly from md-pipeline)

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
    // v0.6.1-alpha.0 #1-18: 额外校验文件实际存在（缓存可能陈旧，文件已删）
    const indexPath = getDomainIndexPath(projectRoot)
    const cached = loadDomainIndex(indexPath)
    if (cached) {
      const okDomains = cached.domains
        .filter((d) => d.status === 'ok' && existsSync(join(projectRoot, BOUNDARY_DIR, d.file)))
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

// v0.7.0: sync subcommand removed (Langium removed; .md is canonical)

// v0.7.0: sync-md subcommand removed (Langium removed; .md is canonical)

// ---------------------------------------------------------------------------
// Subcommand: cache (v0.6.1-alpha.0 #1-16 — 清理 .cache/*.hash)
// ---------------------------------------------------------------------------

const domainCacheCleanSubcommand = defineCommand({
  meta: {
    name: 'clean',
    description: t('domain.cache.clean.description'),
  },
  args: {
    '--dry-run': { type: 'boolean', description: t('domain.cache.clean.dryRun') },
    '--json': { type: 'boolean', description: t('format.json') },
    '--yaml': { type: 'boolean', description: t('format.yaml') },
  },
  async run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const dryRun = ctx.args['dry-run'] === true
    const projectRoot = getProjectRoot()

    if (!projectBoundaryExists()) {
      return outputError({ code: 'OXN_NO_PROJECT', message: t('errors.projectNotInit') }, format)
    }

    const result = dryRun ? { removed: 0, cacheDir: null, paths: [] } : clearCacheForEntity(projectRoot, 'domain')

    if (dryRun) {
      // dry-run: 用 readdirSync 列举但不删
      const config = readProjectConfig(projectRoot)
      const domainsDir = resolveAssetDir(projectRoot, 'domain', config)
      const cacheDir = join(domainsDir, '.cache')
      const paths: string[] = []
      if (existsSync(cacheDir)) {
        for (const f of readdirSync(cacheDir)) {
          if (f.endsWith('.hash') || f.endsWith('.md-hash')) paths.push(join(cacheDir, f))
        }
      }
      return output(
        {
          ok: true,
          data: { dryRun: true, cacheDir, wouldRemove: paths.length, paths },
          human:
            paths.length === 0
              ? `Domain cache empty: ${cacheDir}`
              : `Would remove ${paths.length} file(s) from ${cacheDir}:\n${paths.map((p) => `  - ${p}`).join('\n')}`,
        },
        format,
      )
    }

    return output(
      {
        ok: true,
        data: {
          removed: result.removed,
          cacheDir: result.cacheDir,
          paths: result.paths,
        },
        human:
          result.removed === 0
            ? result.cacheDir === null
              ? 'No domain cache to clean (no .cache/ directory).'
              : `Domain cache empty: ${result.cacheDir}`
            : `Removed ${result.removed} cache file(s) from ${result.cacheDir}\n${result.paths.map((p) => `  - ${p}`).join('\n')}\n\nNext: run \`oxn domain sync --all\` to rebuild cache.`,
      },
      format,
    )
  },
})

const domainCacheSubcommand = defineCommand({
  meta: {
    name: 'cache',
    description: t('domain.cache.description'),
  },
  subCommands: {
    clean: domainCacheCleanSubcommand,
  },
  run() {
    // No-op
  },
})

// ---------------------------------------------------------------------------
// v0.7.0: compile subcommand removed (Langium removed; .md is canonical)

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
    cache: domainCacheSubcommand,
  },
  run() {
    // No-op
  },
})
