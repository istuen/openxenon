// =============================================================================
// work-blueprints-merger.ts — PR-3
//
// 把 work.oxn 中声明的 blueprint ref 列表 → 合并成 per-work `blueprints.json`（slim）。
//
// slim 内容：name / version / slots[{name, deps, observe}] / sourceHash
//   - 不展开 prop 列表（决策不需要）
//   - 不展开 slot 的 description（也不需要；slim 哲学）
//   - 不递归 part/probe 内容（那是 Proof 轴的事）
//
// 与 work-domains-merger 对称设计。
// =============================================================================

import { existsSync, readFileSync, writeFileSync, renameSync, mkdirSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join, relative } from 'path'
import { z } from 'zod'
import { parseOxnReference } from '@openxenon/engine/oxl/scope/oxn-scope'
import { BOUNDARY_DIR, WORK_BLUEPRINTS_JSON } from '@openxenon/engine/kernel'
import { hashText } from './plan-hash'

// ───────── Zod schema ─────────

export const SlotSlimSchema = z.object({
  name: z.string().min(1),
  deps: z.array(z.string()).default([]),
  observe: z.array(z.string()).default([]),
})

export const PerWorkBlueprintEntrySchema = z.object({
  name: z.string().min(1),
  scope: z.enum(['@oxn', '@prj']),
  file: z.string().min(1),
  status: z.enum(['ok', 'invalid']),
  version: z.number().int().min(1).default(1),
  slots: z.array(SlotSlimSchema).default([]),
  errors: z.array(z.string()).default([]),
  ref: z.string().min(1),
})

export const PerWorkBlueprintsIndexSchema = z.object({
  schemaVersion: z.literal(1),
  workName: z.string().min(1),
  generatedAt: z.string().min(1),
  projectRoot: z.string().min(1),
  sourceHash: z.string().regex(/^[0-9a-f]{64}$/),
  declaredRefs: z.array(z.string()),
  blueprintCount: z.number().int().min(0),
  invalidCount: z.number().int().min(0),
  blueprints: z.array(PerWorkBlueprintEntrySchema),
})

export type SlotSlim = z.infer<typeof SlotSlimSchema>
export type PerWorkBlueprintEntry = z.infer<typeof PerWorkBlueprintEntrySchema>
export type PerWorkBlueprintsIndex = z.infer<typeof PerWorkBlueprintsIndexSchema>

// ───────── ref 提取（与 domains merger 对称）─────────

export interface DeclaredBlueprintRef {
  name: string
  ref: string | null
}

export function extractBlueprintRefs(workOxnContent: string): DeclaredBlueprintRef[] {
  const out: DeclaredBlueprintRef[] = []
  // 不要求行首（允许 `work "x" { blueprint "Y" ref "Z"; }` 内联）
  // 用 `;` 终止符做 disambiguate：task 内的 `blueprint "Z"` 无 `;` 不会误匹配
  const re = /blueprint\s+"([^"]+)"(?:\s+ref\s+"([^"]+)")?\s*;/g
  for (const m of workOxnContent.matchAll(re)) {
    out.push({ name: m[1]!, ref: m[2] ?? null })
  }
  return out
}

// ───────── ref → file 解析 ─────────

export function resolveBlueprintFile(
  ref: string | null,
  name: string,
  projectRoot: string,
): { scope: '@oxn' | '@prj'; filePath: string } | null {
  const bpDir = join(projectRoot, BOUNDARY_DIR, 'blueprints')
  const candidates = (n: string): string[] => {
    const kebab = toKebab(n)
    return [join(bpDir, `${n}.oxn`), join(bpDir, `${kebab}.oxn`)]
  }

  if (ref) {
    const parsed = parseOxnReference(ref)
    if (parsed) {
      if (parsed.scope === 'oxn') return null
      for (const fp of candidates(parsed.name)) {
        if (existsSync(fp)) return { scope: '@prj', filePath: fp }
      }
      return null
    }
  }
  for (const fp of candidates(name)) {
    if (existsSync(fp)) return { scope: '@prj', filePath: fp }
  }
  return null
}

function toKebab(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase()
}

// ───────── blueprint.oxn → slim 解析（regex-only）─────────

export interface ParsedBlueprintSlim {
  name: string | null
  version: number
  slots: SlotSlim[]
  errors: string[]
}

/**
 * 从 blueprint.oxn 内容提取 slim 字段。
 * 永远不抛错；错误累积在 result.errors。
 */
export function parseBlueprintSlim(content: string): ParsedBlueprintSlim {
  const errors: string[] = []

  const nameMatch = content.match(/^\s*blueprint\s+"([^"]+)"\s*\{/m)
  const name = nameMatch?.[1] ?? null

  // version = N（默认 1）
  let version = 1
  const verMatch = content.match(/^\s*version\s*=\s*(\d+)\s*;?/m)
  if (verMatch) {
    const n = Number.parseInt(verMatch[1]!, 10)
    if (Number.isFinite(n) && n >= 1) version = n
    else errors.push(`invalid version: ${verMatch[1]}`)
  }

  // slots[] —— 块状或内联
  const slots: SlotSlim[] = []
  for (const blockMatch of content.matchAll(/slot\s+"([^"]+)"\s*\{([^}]*)\}/g)) {
    const slotName = blockMatch[1]!
    const body = blockMatch[2]!
    const slots_ = parseSlotSlim(slotName, body, errors)
    slots.push(slots_)
  }

  if (!name) {
    errors.push('no `blueprint "X" { ... }` declaration found')
  }

  return { name, version, slots, errors }
}

function parseSlotSlim(name: string, body: string, _errors: string[]): SlotSlim {
  // deps = ["a", "b"]  (数组形式)
  // 不锚定 ^ —— slot body 内可能有 `deps = []; observe = [...]` 同行的多字段
  // slot body 由 slot { ... } 包裹，边界已隔离；多个 deps/observe 块取最后匹配的
  const deps: string[] = []
  const depsMatch = body.match(/deps\s*=\s*\[([^\]]*)\]/)
  if (depsMatch) {
    for (const m of depsMatch[1]!.matchAll(/"([^"]+)"/g)) {
      deps.push(m[1]!)
    }
  }
  // observe = ["fs-match"]
  const observe: string[] = []
  const obsMatch = body.match(/observe\s*=\s*\[([^\]]*)\]/)
  if (obsMatch) {
    for (const m of obsMatch[1]!.matchAll(/"([^"]+)"/g)) {
      observe.push(m[1]!)
    }
  }
  return { name, deps, observe }
}

// ───────── 顶层：构建 per-work blueprints index ─────────

export interface BuildPerWorkBlueprintsOptions {
  projectRoot: string
  workName: string
  workOxnPath: string
  /** 覆盖 generatedAt（测试用） */
  generatedAt?: string
}

export function buildPerWorkBlueprintsIndex(options: BuildPerWorkBlueprintsOptions): PerWorkBlueprintsIndex {
  const { projectRoot, workName, workOxnPath } = options
  const generatedAt = options.generatedAt ?? new Date().toISOString()

  if (!existsSync(workOxnPath)) {
    throw new Error(`work.oxn not found at ${workOxnPath}`)
  }
  const content = readFileSync(workOxnPath, 'utf-8')
  const sourceHash = hashText(content)
  const declared = extractBlueprintRefs(content)

  const seen = new Set<string>()
  const uniqueRefs: string[] = []
  const uniqueDeclared: DeclaredBlueprintRef[] = []
  for (const d of declared) {
    if (seen.has(d.name)) continue
    seen.add(d.name)
    uniqueRefs.push(d.ref ?? `@prj/blueprints/${d.name}`)
    uniqueDeclared.push(d)
  }

  const blueprints: PerWorkBlueprintEntry[] = []
  for (const decl of uniqueDeclared) {
    const resolved = resolveBlueprintFile(decl.ref, decl.name, projectRoot)
    const refStr = decl.ref ?? `@prj/blueprints/${decl.name}`

    if (!resolved) {
      const errors: string[] = []
      if (decl.ref?.startsWith('@oxn/')) {
        errors.push('@oxn/ scope has no builtin blueprint registry (V1)')
      } else {
        errors.push(`blueprint file not found for ref "${refStr}"`)
      }
      blueprints.push({
        name: decl.name,
        scope: decl.ref?.startsWith('@oxn/') ? '@oxn' : '@prj',
        file: '(unresolved)',
        status: 'invalid',
        version: 1,
        slots: [],
        errors,
        ref: refStr,
      })
      continue
    }

    let bpContent: string
    try {
      bpContent = readFileSync(resolved.filePath, 'utf-8')
    } catch (err) {
      blueprints.push({
        name: decl.name,
        scope: resolved.scope,
        file: relative(projectRoot, resolved.filePath),
        status: 'invalid',
        version: 1,
        slots: [],
        errors: [`read failed: ${err instanceof Error ? err.message : String(err)}`],
        ref: refStr,
      })
      continue
    }

    const slim = parseBlueprintSlim(bpContent)
    blueprints.push({
      name: decl.name,
      scope: resolved.scope,
      file: relative(projectRoot, resolved.filePath),
      status: slim.errors.length > 0 ? 'invalid' : 'ok',
      version: slim.version,
      slots: slim.slots,
      errors: slim.errors,
      ref: refStr,
    })
  }

  const invalidCount = blueprints.filter((b) => b.status === 'invalid').length
  return {
    schemaVersion: 1,
    workName,
    generatedAt,
    projectRoot,
    sourceHash,
    declaredRefs: uniqueRefs,
    blueprintCount: blueprints.length,
    invalidCount,
    blueprints,
  }
}

// ───────── 落盘 ─────────

export interface WritePerWorkBlueprintsOptions extends BuildPerWorkBlueprintsOptions {
  outPath: string
}

export function writePerWorkBlueprintsIndex(options: WritePerWorkBlueprintsOptions): PerWorkBlueprintsIndex {
  const idx = buildPerWorkBlueprintsIndex(options)
  const { outPath } = options
  const dir = dirname(outPath)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmpPath = `${outPath}.tmp`
  writeFileSync(tmpPath, JSON.stringify(idx, null, 2), 'utf-8')
  renameSync(tmpPath, outPath)
  return idx
}

export function loadPerWorkBlueprintsIndex(filePath: string): PerWorkBlueprintsIndex | null {
  if (!existsSync(filePath)) return null
  try {
    const parsed = JSON.parse(readFileSync(filePath, 'utf-8'))
    const result = PerWorkBlueprintsIndexSchema.safeParse(parsed)
    if (!result.success) return null
    return result.data
  } catch {
    return null
  }
}

// ───────── 路径工具 ─────────

export function getPerWorkBlueprintsJsonPath(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName, WORK_BLUEPRINTS_JSON)
}
