// =============================================================================
// domain-index-builder.ts — PR-1
//
// 全局 Domain slim 索引构建器。
//
// 用途：扫 `.openxenon/domains/*.md`（递归子目录）→ 生成
//       `.openxenon/.cache/domains.json`，slim 模式仅含
//       name/file/description/termNames/banCount/invariantCount，
//       供 AI 离线快速检索全局 DDD 词汇。
//
// 设计取舍：
//   - 用正则而非 langium 解析：slim 不需要完整 IR；regex 解析快 10×，
//     且无副作用（langium 解析需要 services 初始化）。
//   - 解析失败的 .md 仍记入索引（status=invalid + errors[]），不静默丢弃；
//     AI 可据此报告工程师修复。
//   - 跳过非 .md 文件 / 子目录里的隐藏文件 (.DS_Store / .git 等)。
// =============================================================================

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from '@openxenon/engine/infra/filesystem'
import { basename, join, relative } from 'path'
import { z } from 'zod'
import { toKebab } from '@openxenon/engine/kernel/index'

// ───────── Zod schema（与落盘 JSON 一一对应）─────────

export const DomainIndexEntrySchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  status: z.enum(['ok', 'invalid']),
  description: z.string().optional(),
  termNames: z.array(z.string()).default([]),
  banCount: z.number().int().min(0).default(0),
  invariantCount: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
})

export const DomainIndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  projectRoot: z.string().min(1),
  domainsDir: z.string().min(1),
  domainCount: z.number().int().min(0),
  domains: z.array(DomainIndexEntrySchema),
})

export type DomainIndexEntry = z.infer<typeof DomainIndexEntrySchema>
export type DomainIndex = z.infer<typeof DomainIndexSchema>

// ───────── 文件扫描（递归子目录，跳过隐藏）─────────

export interface ScanResult {
  files: Array<{ fullPath: string; relPath: string }>
}

export function scanDomainFiles(domainsDir: string): ScanResult {
  const out: ScanResult['files'] = []
  if (!existsSync(domainsDir)) return { files: out }

  function walk(dir: string): void {
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const name of entries) {
      if (name.startsWith('.')) continue
      const full = join(dir, name)
      let isDir = false
      let isFile = false
      try {
        const st = statSync(full)
        isDir = st.isDirectory()
        isFile = st.isFile()
      } catch {
        continue
      }
      if (isDir) {
        walk(full)
        continue
      }
      if (!isFile) continue
      if (!name.endsWith('.md')) continue
      out.push({ fullPath: full, relPath: relative(domainsDir, full) })
    }
  }

  walk(domainsDir)
  out.sort((a, b) => a.relPath.localeCompare(b.relPath))
  return { files: out }
}

// ───────── 单文件 slim 解析（regex-only）─────────

export interface ParseError {
  file: string
  message: string
}

/**
 * 从 .md 文件提取 slim 字段。永远不抛错——错误累积在 result.errors。
 *
 * 字段：
 *   - name:        第一个 `domain "X"` 声明名（PascalCase / kebab 都接受）
 *   - description: 第一个 `description = "..."` 文本
 *   - termNames:   term { ... } 块内所有 "Key" 字符串
 *   - banCount:    ban { ... } 块内字符串条数
 *   - invariantCount: 所有 invariant { ... } 块内字符串条数之和
 *
 * 不展开 term 的 desc、ban / invariant 的具体文本——那是 per-work domains.json 的事。
 */
export function parseDomainSlim(filePath: string, projectRoot: string): DomainIndexEntry {
  const relFile = relative(projectRoot, filePath)
  const errors: string[] = []

  if (!existsSync(filePath)) {
    return {
      name: basename(filePath).replace(/\.md$/i, ''),
      file: relFile,
      status: 'invalid',
      errors: [`file not found: ${filePath}`],
      termNames: [],
      banCount: 0,
      invariantCount: 0,
    }
  }

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch (err) {
    return {
      name: basename(filePath).replace(/\.md$/i, ''),
      file: relFile,
      status: 'invalid',
      errors: [`read failed: ${err instanceof Error ? err.message : String(err)}`],
      termNames: [],
      banCount: 0,
      invariantCount: 0,
    }
  }

  const nameMatch = content.match(/^\s*domain\s+"([^"]+)"\s*\{/m)
  if (!nameMatch) {
    errors.push('no `domain "X" { ... }` declaration found')
    return {
      name: basename(filePath).replace(/\.md$/i, ''),
      file: relFile,
      status: 'invalid',
      errors,
      termNames: [],
      banCount: 0,
      invariantCount: 0,
    }
  }

  // v1.1 NAME_FILE_MISMATCH 防御（macOS-safe 字符串比对）
  // 与 src/oxl/compiler/blueprint-index-builder.ts:194-199 模式一致：软检测
  // 累积到 errors[],status='invalid',不阻断索引构建。
  const fileStem = basename(filePath).replace(/\.md$/i, '')
  if (toKebab(nameMatch[1]!) !== toKebab(fileStem)) {
    errors.push(
      `NAME_FILE_MISMATCH: declared '${nameMatch[1]!}' (normalized: '${toKebab(nameMatch[1]!)}') ` +
        `does not match file '${fileStem}' (normalized: '${toKebab(fileStem)}')`,
    )
  }

  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const description = descMatch?.[1]?.replace(/\\"/g, '"')

  // term { "Key" : "desc"; ... } —— 只取 key
  const termNames: string[] = []
  const termBlock = content.match(/term\s*\{([\s\S]*?)\}/m)
  if (termBlock) {
    const termMatches = termBlock[1]!.matchAll(/"([^"\\]+)"\s*:/g)
    for (const m of termMatches) {
      const k = m[1]!.trim()
      if (k) termNames.push(k)
    }
  }

  // ban { "A", "B", ... }
  let banCount = 0
  const banBlock = content.match(/ban\s*\{([\s\S]*?)\}\s*;?/m)
  if (banBlock) {
    const banMatches = banBlock[1]!.matchAll(/"([^"]+)"/g)
    for (const _ of banMatches) banCount++
  }

  // v0.1.1: 允许多个 invariant { ... } 块 —— 累加
  let invariantCount = 0
  for (const invBlock of content.matchAll(/invariant\s*\{([\s\S]*?)\}\s*;?/gm)) {
    for (const _ of invBlock[1]!.matchAll(/"([^"]+)"/g)) invariantCount++
  }

  // 卫生检查：description 含换行 / 解析失败的标记
  if (description?.includes('\n')) {
    errors.push('description spans multiple lines (likely parse issue)')
  }

  return {
    name: nameMatch[1]!,
    file: relFile,
    status: errors.length > 0 ? 'invalid' : 'ok',
    ...(description !== undefined ? { description } : {}),
    termNames,
    banCount,
    invariantCount,
    errors,
  }
}

// ───────── 索引构建（顶层入口）─────────

export interface BuildIndexOptions {
  projectRoot: string
  domainsDir: string
  /** 覆盖 generatedAt（测试用） */
  generatedAt?: string
}

export function buildDomainIndex(options: BuildIndexOptions): DomainIndex {
  const { projectRoot, domainsDir } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const { files } = scanDomainFiles(domainsDir)

  const entries: DomainIndexEntry[] = []
  for (const f of files) {
    entries.push(parseDomainSlim(f.fullPath, projectRoot))
  }

  return {
    schemaVersion: 1,
    generatedAt,
    projectRoot,
    domainsDir: relative(projectRoot, domainsDir),
    domainCount: entries.length,
    domains: entries,
  }
}

// ───────── 落盘（原子写）─────────

export interface WriteIndexOptions extends BuildIndexOptions {
  outPath: string
}

export function writeDomainIndex(options: WriteIndexOptions): DomainIndex {
  const index = buildDomainIndex(options)
  const { outPath } = options

  // 原子写：先写 .tmp 再 rename（防 partial write）
  const tmpPath = `${outPath}.tmp`
  const dir = outPath.substring(0, outPath.lastIndexOf('/'))
  if (dir && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  writeFileSync(tmpPath, JSON.stringify(index, null, 2), 'utf-8')
  renameSync(tmpPath, outPath)
  return index
}

// ───────── 读回（校验）─────────

export function loadDomainIndex(indexPath: string): DomainIndex | null {
  if (!existsSync(indexPath)) return null
  try {
    const content = readFileSync(indexPath, 'utf-8')
    const parsed = JSON.parse(content)
    const result = DomainIndexSchema.safeParse(parsed)
    if (!result.success) {
      // 落盘格式漂移：返回 null 让调用方决定降级策略
      return null
    }
    return result.data
  } catch {
    return null
  }
}

// ───────── 路径工具 ─────────

export function getCacheDir(projectRoot: string): string {
  return join(projectRoot, '.openxenon', '.cache')
}

export function getDomainIndexPath(projectRoot: string): string {
  return join(getCacheDir(projectRoot), 'domains.json')
}
