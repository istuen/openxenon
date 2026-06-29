// =============================================================================
// blueprint-index-builder.ts — PR-X（对齐 domain-index-builder）
//
// 全局 Blueprint slim 索引构建器。
//
// 用途：扫 `.openxenon/blueprints/*.oxn`（递归子目录）→ 生成
//       `.openxenon/.cache/blueprints.json`，slim 模式仅含
//       name/file/description/version/slotNames/propCount，
//       供 AI 离线快速检索全局 blueprint 元数据。
//
// 与 domain-index-builder 对称设计：
//   - 同 Zod schema 结构（schemaVersion/generatedAt/projectRoot + entity 数组）
//   - 同 scanXxxFiles（递归子目录 + 跳隐藏）
//   - 同 parseXxxSlim（regex-only，无 langium 副作用）
//   - 同 writeXxxIndex（原子写：.tmp + renameSync）
//   - 同 loadXxxIndex（zod 校验失败返回 null）
//
// slim 字段差异（blueprint 无 term/ban/invariant）：
//   - name          `blueprint "X" {` 第一个声明
//   - description   第一个 `description = "..."` 文本
//   - version       第一个 `version = N`（默认 1）
//   - slotNames     所有 `slot "X" {` 的 X（blueprint 核心是 slot DAG）
//   - propCount     `prop "X"` 出现次数
//   - errors        解析失败累积（NAME_FILE_MISMATCH / 缺少 blueprint 声明等）
//
// NAME_FILE_MISMATCH 防御（macOS-safe）：
//   declared name `toKebab()` 必须等于 file stem `toKebab()`，
//   不一致 → status='invalid' + errors[] 标注（与 domain 一致）。
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
import { resolveAssetDir } from '@openxenon/engine/infra/paths'
import type { ProjectConfig } from '@openxenon/engine/infra/paths'

// L1-OXL 不可依赖 L0-Processor（含 src/kernel/constants.ts，被分类器归到 L0-Processor）；
// 此处与 domain-index-builder 保持一致：硬编码路径字符串常量。
// AGENTS.md 标注 kernel/constants.ts 为 L0-Schema，但 scripts/validate-dependencies.ts
// 的 getLayerFromPath 将整个 src/kernel/ 归为 L0-Processor（pre-existing 分层不一致）。
// 后续若分层规范化后可改成从 kernel/constants 导入。
const BOUNDARY_DIR = '.openxenon'
const CACHE_DIR = '.cache'
const BLUEPRINT_INDEX_JSON = 'blueprints.json'

// ───────── Zod schema（与落盘 JSON 一一对应）─────────

export const BlueprintIndexEntrySchema = z.object({
  name: z.string().min(1),
  file: z.string().min(1),
  status: z.enum(['ok', 'invalid']),
  description: z.string().optional(),
  version: z.number().int().min(1).default(1),
  slotNames: z.array(z.string()).default([]),
  propCount: z.number().int().min(0).default(0),
  errors: z.array(z.string()).default([]),
})
export type BlueprintIndexEntry = z.infer<typeof BlueprintIndexEntrySchema>

export const BlueprintIndexSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  projectRoot: z.string().min(1),
  blueprintsDir: z.string().min(1),
  blueprintCount: z.number().int().min(0),
  blueprints: z.array(BlueprintIndexEntrySchema),
})
export type BlueprintIndex = z.infer<typeof BlueprintIndexSchema>

// ───────── kebab-case 规范化（与 domain 防御对齐）─────────

/**
 * 把任意 string 归一为 kebab-case（lowercase + 驼峰转 - + _ 转 -）。
 * 例: "DevWorkflow" → "dev-workflow"; "fix_issue" → "fix-issue"
 *
 * 与 src/cli/domain.ts:toKebab 同源：声明 vs 文件的 NAME_FILE_MISMATCH 防御
 * 必须在解析器层做纯字符串比对，不依赖 OS 文件系统（macOS APFS case-insensitive
 * 会假命中）。
 */
export function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

// ───────── 文件扫描（递归子目录，跳隐藏）─────────

export interface ScanResult {
  files: Array<{ fullPath: string; relPath: string }>
}

export function scanBlueprintFiles(blueprintsDir: string): ScanResult {
  const out: ScanResult['files'] = []
  if (!existsSync(blueprintsDir)) return { files: out }

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
      if (!name.endsWith('.oxn')) continue
      out.push({ fullPath: full, relPath: relative(blueprintsDir, full) })
    }
  }
  walk(blueprintsDir)
  out.sort((a, b) => a.relPath.localeCompare(b.relPath))
  return { files: out }
}

// ───────── 单文件 slim 解析（regex-only）─────────

/**
 * 从 .oxn 文件提取 slim 字段。永远不抛错——错误累积在 result.errors。
 *
 * 字段：
 *   - name:        第一个 `blueprint "X"` 声明名（PascalCase / kebab 都接受）
 *   - description: 第一个 `description = "..."` 文本
 *   - version:     第一个 `version = N`（默认 1）
 *   - slotNames:   所有 `slot "X" {` 的 X
 *   - propCount:   `prop "X"` 出现次数
 *
 * 错误：
 *   - 文件不存在 / 读失败
 *   - 缺 `blueprint "X" {` 声明
 *   - description 含换行（解析异常标记）
 *   - NAME_FILE_MISMATCH（declared vs file stem 规范化后不一致）
 */
export function parseBlueprintSlim(filePath: string, projectRoot: string): BlueprintIndexEntry {
  const relFile = relative(projectRoot, filePath)
  const errors: string[] = []
  const fileStem = basename(filePath).replace(/\.oxn$/i, '')

  if (!existsSync(filePath)) {
    return {
      name: fileStem,
      file: relFile,
      status: 'invalid',
      errors: [`file not found: ${filePath}`],
      version: 1,
      slotNames: [],
      propCount: 0,
    }
  }

  let content: string
  try {
    content = readFileSync(filePath, 'utf-8')
  } catch (err) {
    return {
      name: fileStem,
      file: relFile,
      status: 'invalid',
      errors: [`read failed: ${err instanceof Error ? err.message : String(err)}`],
      version: 1,
      slotNames: [],
      propCount: 0,
    }
  }

  // name + NAME_FILE_MISMATCH 防御
  const nameMatch = content.match(/^\s*blueprint\s+"([^"]+)"\s*\{/m)
  if (!nameMatch) {
    errors.push('no `blueprint "X" { ... }` declaration found')
    return {
      name: fileStem,
      file: relFile,
      status: 'invalid',
      errors,
      version: 1,
      slotNames: [],
      propCount: 0,
    }
  }
  const declared = nameMatch[1]!
  if (toKebab(declared) !== toKebab(fileStem)) {
    errors.push(
      `NAME_FILE_MISMATCH: declared '${declared}' (normalized: '${toKebab(declared)}') ` +
        `does not match file '${fileStem}' (normalized: '${toKebab(fileStem)}')`,
    )
  }

  // description
  const descMatch = content.match(/description\s*=\s*"((?:[^"\\]|\\.)*)"/)
  const description = descMatch?.[1]?.replace(/\\"/g, '"')

  // version（默认 1）
  // 不锚定 ^ —— blueprint body 内可能 `description = "..."; version = 1;` 内联
  // 先尝试匹配数字版本；若有 `version = <非数字>`（如 "abc"）也算"写了但格式错"，要报错
  let version = 1
  const verDigitMatch = content.match(/\bversion\s*=\s*(\d+)\s*;?/)
  const verAnyMatch = content.match(/\bversion\s*=\s*("([^"]*)"|([^\s;}]+))/)
  if (verDigitMatch) {
    const n = Number.parseInt(verDigitMatch[1]!, 10)
    if (Number.isFinite(n) && n >= 1) version = n
    else errors.push(`invalid version: ${verDigitMatch[1]}`)
  } else if (verAnyMatch) {
    // 去掉引号后再回显
    const raw = verAnyMatch[2] ?? verAnyMatch[3] ?? verAnyMatch[1]!
    errors.push(`invalid version: ${raw}`)
  }

  // slotNames
  // 不锚定 ^ —— slot 可能内联：`blueprint "x" { slot "s1" { deps = [] } }`
  const slotNames: string[] = []
  for (const m of content.matchAll(/\bslot\s+"([^"]+)"\s*\{/g)) {
    slotNames.push(m[1]!)
  }

  // propCount
  const propMatches = content.matchAll(/\bprop\s+"[^"]+"\s*\{/g)
  const propCount = Array.from(propMatches).length

  // 卫生检查：description 含换行 / 解析失败的标记
  if (description?.includes('\n')) {
    errors.push('description spans multiple lines (likely parse issue)')
  }

  return {
    name: declared,
    file: relFile,
    status: errors.length > 0 ? 'invalid' : 'ok',
    ...(description !== undefined ? { description } : {}),
    version,
    slotNames,
    propCount,
    errors,
  }
}

// ───────── 索引构建（顶层入口）─────────

export interface BuildIndexOptions {
  projectRoot: string
  blueprintsDir: string
  /** 覆盖 generatedAt（测试用） */
  generatedAt?: string
}

export function buildBlueprintIndex(options: BuildIndexOptions): BlueprintIndex {
  const { projectRoot, blueprintsDir } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()
  const { files } = scanBlueprintFiles(blueprintsDir)

  const entries: BlueprintIndexEntry[] = []
  for (const f of files) {
    entries.push(parseBlueprintSlim(f.fullPath, projectRoot))
  }

  return {
    schemaVersion: 1,
    generatedAt,
    projectRoot,
    blueprintsDir: relative(projectRoot, blueprintsDir),
    blueprintCount: entries.length,
    blueprints: entries,
  }
}

// ───────── 落盘（原子写）─────────

export interface WriteIndexOptions extends BuildIndexOptions {
  outPath: string
}

export function writeBlueprintIndex(options: WriteIndexOptions): BlueprintIndex {
  const index = buildBlueprintIndex(options)
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

export function loadBlueprintIndex(indexPath: string): BlueprintIndex | null {
  if (!existsSync(indexPath)) return null
  try {
    const content = readFileSync(indexPath, 'utf-8')
    const parsed = JSON.parse(content)
    const result = BlueprintIndexSchema.safeParse(parsed)
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

/** 全局 blueprint slim 索引输出路径。 */
export function getBlueprintIndexPath(projectRoot: string): string {
  return join(projectRoot, BOUNDARY_DIR, CACHE_DIR, BLUEPRINT_INDEX_JSON)
}

/** `oxn blueprint index --emit <custom>` 解析用。 */
export function resolveBlueprintIndexPath(projectRoot: string, customEmit?: string): string {
  if (customEmit) {
    return customEmit.startsWith('/') ? customEmit : join(projectRoot, customEmit)
  }
  return getBlueprintIndexPath(projectRoot)
}

// ───────── 静默重建（被 CLI create/validate/init 调）─────────
//
// 静默失败：索引写不出不应阻断主流程（blueprint 资产本身已正确）；
// 失败时返回 { ok: false, error }，由调用方决定 stderr 打 warning。
export function autoRebuildBlueprintIndex(projectRoot: string): {
  ok: boolean
  indexPath?: string
  error?: string
} {
  try {
    let config: ProjectConfig | undefined
    const configPath = join(projectRoot, BOUNDARY_DIR, 'config.json')
    if (existsSync(configPath)) {
      try {
        config = JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectConfig
      } catch {
        config = undefined
      }
    }
    const blueprintsDir = resolveAssetDir(projectRoot, 'blueprint', config)
    if (!existsSync(blueprintsDir)) return { ok: true }
    const outPath = getBlueprintIndexPath(projectRoot)
    writeBlueprintIndex({ projectRoot, blueprintsDir, outPath })
    return { ok: true, indexPath: outPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
