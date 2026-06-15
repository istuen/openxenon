// =============================================================================
// work-domains-merger.ts — PR-3
//
// 把 work.oxn 中声明的 domain ref 列表 → 合并成 per-work `domains.json`（slim）。
//
// 与 PR-1 全局索引区别：
//   - 全局索引：扫 .openxenon/domains/ 全部 domain，slim 落 .cache/domains.json
//   - per-work：只扫 work.oxn 声明的 N 个 ref，slim 落 works/<w>/domains.json
//
// slim 内容：name / scope / file / description / termNames / banCount / invariantCount
//   不展开 term.desc 与 ban/invariant 文本（AI 决策只需"哪些 term 存在"）。
//   task 隔离的完整 IR（带 desc / ban[] / invariant[]）由 oxn work context --task 渲染。
//
// ref 解析策略：
//   - `@prj/domains/X`        → .openxenon/domains/X.oxn 或 kebab 形式
//   - `@oxn/domains/X`        → 无 builtin domain registry → 标 invalid（scope-mismatch）
//   - bare name               → 退到 .openxenon/domains/<name>.oxn / kebab
//   - 找不到文件              → 标 invalid + errors[]
// =============================================================================

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from '../infra/filesystem'
import { dirname, join, relative } from 'path'
import { z } from 'zod'
import { URI } from 'langium'
import { parseOxnReference } from '../oxl/scope/oxn-scope'
import { createOxnParser } from '../oxl/langium/oxn-services'
import { isWorkDeclaration, isDomainRefDecl, isOXNDocument } from '../oxl/generated/ast'
import { BOUNDARY_DIR, DOMAINS_DIR, WORK_DOMAINS_JSON } from '../kernel/index'
import { hashText } from './plan-hash'
import { parseDomainSlim, type DomainIndexEntry } from '../oxl/compiler/domain-index-builder'

// ───────── Zod schema ─────────

export const PerWorkDomainEntrySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']),
  file: z.string().min(1),
  status: z.enum(['ok', 'invalid']),
  description: z.string().optional(),
  termNames: z.array(z.string()).default([]),
  banCount: z.number().int().min(0).default(0),
  invariantCount: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
  ref: z.string().min(1),
})

export const PerWorkDomainsIndexSchema = z.object({
  schemaVersion: z.literal(1),
  workName: z.string().min(1),
  generatedAt: z.string().min(1),
  projectRoot: z.string().min(1),
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/, 'sourceHash must be sha256 hex'),
  /** work.oxn 中声明的 ref 列表（去重，按声明顺序） */
  declaredRefs: z.array(z.string()),
  domainCount: z.number().int().min(0),
  invalidCount: z.number().int().min(0),
  domains: z.array(PerWorkDomainEntrySchema),
})

export type PerWorkDomainEntry = z.infer<typeof PerWorkDomainEntrySchema>
export type PerWorkDomainsIndex = z.infer<typeof PerWorkDomainsIndexSchema>

// ───────── ref 提取（Langium AST，v0.2 T3 软缺口 B 修复）─────────

/**
 * 从 work.oxn 内容中提取 `domain "X" [ref "Y"];` 声明。
 * 保留声明顺序；同 name 多次声明 → 多次出现（call 端负责去重）。
 *
 * v0.2 T3 修订：改用 Langium AST 解析，规避旧 regex 实现的边界问题
 * - description 字段字符串中含 `domain "fake"` 不会被误识别（AST 跳过 STRING 节点）
 * - 注释中含 `domain "fake"` 不会被误识别（AST 跳过 COMMENT 节点）
 * - 跨多行 `domain\n  "X"\n  ref\n  "Y";` 能正确识别（AST 节点结构化）
 *
 * 实现说明：v0.2 T3 改为 async（Langium parse 实际是 sync 但 TypeScript
 * 包装为 async Promise；3 个 sync 调用方 buildPerWorkDomainsIndex /
 * cli/work.ts:286 / work-migrator.ts:258 同步改 async）。
 */
export interface DeclaredDomainRef {
  name: string
  ref: string | null
}

export async function extractDomainRefs(workOxnContent: string): Promise<DeclaredDomainRef[]> {
  const parser = createOxnParser()
  const doc = await parser.parse(workOxnContent, URI.file(`/tmp/extract-domain-refs-${Date.now()}.oxn`))
  if (doc.parseErrors.length > 0) return [] as DeclaredDomainRef[]
  const root = doc.ast
  if (!root || !isOXNDocument(root)) return [] as DeclaredDomainRef[]
  // 遍历顶层 entity 找 WorkDeclaration
  const workDecl = root.entities.find(isWorkDeclaration)
  if (!workDecl) return [] as DeclaredDomainRef[]
  return workDecl.domains.filter(isDomainRefDecl).map((n) => ({ name: n.name, ref: n.ref ?? null }))
}

// ───────── ref → file 路径解析 ─────────

/**
 * 把 domain ref 解析为 (scope, filePath) 或 null。
 *
 * 规则：
 *   - `@prj/domains/X`        → .openxenon/domains/X.oxn 或 <kebab>.oxn
 *   - `@prj/X`（无 type）     → 视作 domains（DomainRefDecl 没 typeHint；这里
 *                                参照 prj/domains 习惯）
 *   - `@oxn/...`              → null（无 builtin registry）
 *   - bare name               → .openxenon/domains/<name>.oxn（容错老 work.oxn）
 *
 * 找不到文件 → 返回 null（call 端标 invalid）
 */
export function resolveDomainFile(
  ref: string | null,
  name: string,
  projectRoot: string,
): { scope: '@oxn' | '@prj'; filePath: string } | null {
  const domainsDir = join(projectRoot, BOUNDARY_DIR, DOMAINS_DIR)
  const candidates = (n: string): string[] => {
    const kebab = toKebab(n)
    return [join(domainsDir, `${n}.oxn`), join(domainsDir, `${kebab}.oxn`)]
  }

  if (ref) {
    const parsed = parseOxnReference(ref)
    if (parsed) {
      if (parsed.scope === 'oxn') {
        return null // builtin domain registry doesn't exist (V1)
      }
      // @prj：先按 parsed.name 找
      for (const fp of candidates(parsed.name)) {
        if (existsSync(fp)) return { scope: '@prj', filePath: fp }
      }
      // 找不到 → 退到用 name 兜底（容错老 work.oxn）
      for (const fp of candidates(name)) {
        if (existsSync(fp)) return { scope: '@prj', filePath: fp }
      }
      return null
    }
    // ref 解析失败（格式错）→ 退到用 name
  }

  for (const fp of candidates(name)) {
    if (existsSync(fp)) return { scope: '@prj', filePath: fp }
  }
  return null
}

/** PascalCase / snake_case → kebab-case（与 PR-1 toKebab 保持一致） */
function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

// ───────── 顶层：构建 per-work index ─────────

export interface BuildPerWorkDomainsOptions {
  projectRoot: string
  workName: string
  workOxnPath: string
  /** 覆盖 generatedAt（测试用） */
  generatedAt?: string
}

export async function buildPerWorkDomainsIndex(options: BuildPerWorkDomainsOptions): Promise<PerWorkDomainsIndex> {
  const { projectRoot, workName, workOxnPath } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  if (!existsSync(workOxnPath)) {
    throw new Error(`work.oxn not found at ${workOxnPath}`)
  }
  const content = readFileSync(workOxnPath, 'utf-8')
  const sourceHash = hashText(content)
  const declared = await extractDomainRefs(content)

  // 去重：按 name 保留首次出现的 ref（call 端对此负责报告 duplicate）
  const seen = new Set<string>()
  const uniqueRefs: string[] = []
  const uniqueDeclared: DeclaredDomainRef[] = []
  for (const d of declared) {
    if (seen.has(d.name)) continue
    seen.add(d.name)
    uniqueRefs.push(d.ref ?? `@prj/domains/${d.name}`)
    uniqueDeclared.push(d)
  }

  const domains: PerWorkDomainEntry[] = []
  for (const decl of uniqueDeclared) {
    const resolved = resolveDomainFile(decl.ref, decl.name, projectRoot)
    const refStr = decl.ref ?? `@prj/domains/${decl.name}`

    if (!resolved) {
      // 文件失踪或 @oxn 不可解析
      const errors: string[] = []
      if (decl.ref?.startsWith('@oxn/')) {
        errors.push('@oxn/ scope has no builtin domain registry (V1)')
      } else {
        errors.push(`domain file not found for ref "${refStr}"`)
      }
      domains.push({
        name: decl.name,
        scope: decl.ref?.startsWith('@oxn/') ? '@oxn' : '@prj',
        file: '(unresolved)',
        status: 'invalid',
        termNames: [],
        banCount: 0,
        invariantCount: 0,
        errors,
        ref: refStr,
      })
      continue
    }

    // 复用 PR-1 parseDomainSlim
    const slim: DomainIndexEntry = parseDomainSlim(resolved.filePath, projectRoot)
    domains.push({
      name: decl.name, // 用声明名（PascalCase / kebab 都按 work.oxn 写）
      scope: resolved.scope,
      file: relative(projectRoot, resolved.filePath),
      status: slim.status,
      ...(slim.description !== undefined ? { description: slim.description } : {}),
      termNames: slim.termNames,
      banCount: slim.banCount,
      invariantCount: slim.invariantCount,
      errors: slim.errors,
      ref: refStr,
    })
  }

  const invalidCount = domains.filter((d) => d.status === 'invalid').length
  return {
    schemaVersion: 1,
    workName,
    generatedAt,
    projectRoot,
    sourceHash,
    declaredRefs: uniqueRefs,
    domainCount: domains.length,
    invalidCount,
    domains,
  }
}

// ───────── 落盘（原子写）─────────

export interface WritePerWorkDomainsOptions extends BuildPerWorkDomainsOptions {
  outPath: string
}

export async function writePerWorkDomainsIndex(options: WritePerWorkDomainsOptions): Promise<PerWorkDomainsIndex> {
  const idx = await buildPerWorkDomainsIndex(options)
  const { outPath } = options
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmpPath = `${outPath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(idx, null, 2), 'utf-8')
  renameSync(tmpPath, outPath)
  return idx
}

// ───────── 读回（用于 verify）─────────

export function loadPerWorkDomainsIndex(filePath: string): PerWorkDomainsIndex | null {
  if (!existsSync(filePath)) return null
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
    const result = PerWorkDomainsIndexSchema.safeParse(parsed)
    if (!result.success) return null
    return result.data
  } catch {
    return null
  }
}

// ───────── 路径工具 ─────────

export function getPerWorkDomainsJsonPath(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName, WORK_DOMAINS_JSON)
}
