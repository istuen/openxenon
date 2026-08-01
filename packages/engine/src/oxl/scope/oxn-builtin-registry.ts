/**
 * oxn-builtin-registry.ts — v0.7 Phase 4 重写
 *
 * 替代 v0.6.x 硬编码 mock (4 probes + 3 phantom parts + 0 blueprints)，
 * 从 src/builtin/probes/*.md 与 src/builtin/blueprints/*.md 加载 15 probes + 3 blueprints。
 *
 * mdast 管线复用：
 *   - parseMarkdown (md-pipeline/utils) → tree + frontmatter
 *   - collectHeadingContexts → H2 段定位（Alignment/Scheme/Props/Output/Version/Slots）
 *   - collectListFields → listItem key-value 提取
 *
 * 路径解析：
 *   - 测试/dev：process.cwd() + '/src/builtin'
 *   - 包内：import.meta.dirname + '/../../../../src/builtin'（oxn-builtin-registry.ts 在 packages/engine/src/oxl/scope/）
 *   - fallback：空 registry（不抛错）
 *
 * D18 收窄：domains + workflows builtin 延后，本文件仅 probes + blueprints。
 */
import { existsSync, readdirSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { List, Root } from 'mdast'
import { parseMarkdown, collectHeadingContexts, collectListFields } from '../md-pipeline/utils'
import type { BuiltinAssetEntry, IBuiltinRegistry, OxnAssetType } from './oxn-scope'
import type { AssetKind } from '@openxenon/engine/infra/paths'

// ========================
// 路径解析（开发/测试 + 包内）
// ========================

function resolveBuiltinDir(): string | null {
  const candidates: string[] = []

  // 候选 1：cwd 相对路径（bun test / CLI dev mode）
  candidates.push(join(process.cwd(), 'src/builtin'))

  // 候选 2：import.meta.dirname 相对路径（包内执行）
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    // packages/engine/src/oxl/scope/ → ../../../../src/builtin
    candidates.push(join(here, '../../../../src/builtin'))
  } catch {
    // import.meta.url 不可用（如纯 CommonJS 编译）—— 跳过
  }

  for (const c of candidates) {
    if (existsSync(c)) return c
  }

  return null
}

// ========================
// Probe 解析
// ========================

interface ParsedProbe {
  name: string
  description: string
  type: string
  align?: string
  scheme?: string
  props: Array<{
    name: string
    type: string
    required: boolean
    default?: unknown
  }>
  output: Record<string, string>
  _sourcePath: string
}

function coerceScalar(raw: string | null): unknown {
  if (raw === null || raw === '') return undefined
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+$/.test(raw)) return Number(raw)
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw)
  return raw
}

function parsePropFromH3(
  h3Name: string,
  list: List | null,
): {
  name: string
  type: string
  required: boolean
  default?: unknown
} | null {
  if (!list) return null
  const fields = collectListFields(list)
  const typeField = fields.find((f) => f.key === 'type')
  if (!typeField || typeof typeField.value !== 'string') return null

  const requiredField = fields.find((f) => f.key === 'required')
  const defaultField = fields.find((f) => f.key === 'default')
  return {
    name: h3Name,
    type: typeField.value,
    required: requiredField?.value === 'true',
    default: defaultField
      ? coerceScalar(typeof defaultField.value === 'string' ? defaultField.value : null)
      : undefined,
  }
}

function parseProbe(mdPath: string): ParsedProbe | null {
  let content: string
  try {
    content = readFileSync(mdPath, 'utf-8')
  } catch {
    return null
  }

  let parsed: { tree: Root; frontmatter: Record<string, unknown> }
  try {
    parsed = parseMarkdown(content)
  } catch {
    return null
  }

  const { tree, frontmatter } = parsed
  const name = typeof frontmatter.name === 'string' ? frontmatter.name : null
  if (!name) return null

  const contexts = collectHeadingContexts(tree)
  const findSection = (h2Name: string) => contexts.find((c) => c.h2 === h2Name)

  // Alignment
  const alignCtx = findSection('Alignment')
  let align: string | undefined
  if (alignCtx?.h3List) {
    const fields = collectListFields(alignCtx.h3List)
    const f = fields.find((x) => x.key === 'align')
    if (f && typeof f.value === 'string') align = f.value
  }

  // Scheme
  const schemeCtx = findSection('Scheme')
  let scheme: string | undefined
  if (schemeCtx?.h3List) {
    const fields = collectListFields(schemeCtx.h3List)
    const f = fields.find((x) => x.key === 'scheme')
    if (f && typeof f.value === 'string') scheme = f.value
  }

  // Props
  const propsCtx = findSection('Props')
  const props: ParsedProbe['props'] = []
  if (propsCtx) {
    for (const ctx of contexts) {
      if (ctx.h2 !== 'Props') continue
      const prop = parsePropFromH3(ctx.h3 ?? '', ctx.h3List)
      if (prop) props.push(prop)
    }
  }

  // Output（Output 段直接在 H2 下用 list，无 H3）
  const output: Record<string, string> = {}
  const outputCtx = findSection('Output')
  if (outputCtx?.h3List) {
    const fields = collectListFields(outputCtx.h3List)
    for (const f of fields) {
      if (typeof f.value === 'string') output[f.key] = f.value
    }
  }

  // Description：从 H1 blockquote（> ...）取
  let description = ''
  for (const child of tree.children) {
    if (child.type === 'blockquote') {
      const para = child.children.find((c) => c.type === 'paragraph')
      if (para && 'children' in para) {
        description = para.children
          .filter((c): c is { type: 'text'; value: string } => c.type === 'text')
          .map((c) => c.value)
          .join('')
          .trim()
      }
      break
    }
  }

  return {
    name,
    description,
    type: name.replace(/-/g, '_'),
    align,
    scheme,
    props,
    output,
    _sourcePath: mdPath,
  }
}

// ========================
// Blueprint 解析
// ========================

interface ParsedBlueprintSlot {
  name: string
  deps: string[]
  observe: string[]
}

interface ParsedBlueprint {
  name: string
  version: number
  slots: ParsedBlueprintSlot[]
  _sourcePath: string
}

function parseBlueprintSlot(h3Name: string, list: List | null): ParsedBlueprintSlot | null {
  if (!list) return null
  const fields = collectListFields(list)
  const depsField = fields.find((f) => f.key === 'deps')
  const observeField = fields.find((f) => f.key === 'observe')

  const deps = depsField ? collectDeps(depsField.value) : []
  const observe = observeField ? collectObserve(observeField.value) : []
  return { name: h3Name, deps, observe }
}

function collectDeps(value: string | string[] | null): string[] {
  if (value === null) return []
  if (Array.isArray(value)) return value
  // inline `[]` → 空
  if (value === '' || value === '[]') return []
  // block sequence: ['verify', 'fix']
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function collectObserve(value: string | string[] | null): string[] {
  return collectDeps(value)
}

function parseBlueprint(mdPath: string): ParsedBlueprint | null {
  let content: string
  try {
    content = readFileSync(mdPath, 'utf-8')
  } catch {
    return null
  }

  let parsed: { tree: Root; frontmatter: Record<string, unknown> }
  try {
    parsed = parseMarkdown(content)
  } catch {
    return null
  }

  const { tree, frontmatter } = parsed
  const name = typeof frontmatter.name === 'string' ? frontmatter.name : null
  if (!name) return null

  const contexts = collectHeadingContexts(tree)
  const findSection = (h2Name: string) => contexts.find((c) => c.h2 === h2Name)

  // Version（H2 Version 下单 - version: 1）
  let version = 1
  const versionCtx = findSection('Version')
  if (versionCtx?.h3List) {
    const fields = collectListFields(versionCtx.h3List)
    const f = fields.find((x) => x.key === 'version')
    if (f && typeof f.value === 'string') {
      const n = Number(f.value)
      if (Number.isFinite(n)) version = n
    }
  }

  // Slots
  const slots: ParsedBlueprintSlot[] = []
  for (const ctx of contexts) {
    if (ctx.h2 !== 'Slots') continue
    const slot = parseBlueprintSlot(ctx.h3 ?? '', ctx.h3List)
    if (slot) slots.push(slot)
  }

  return { name, version, slots, _sourcePath: mdPath }
}

// ========================
// Registry 实现
// ========================

export class OxnBuiltinRegistry implements IBuiltinRegistry {
  private probes: Map<string, Record<string, unknown>>
  private blueprints: Map<string, Record<string, unknown>>
  private interfaces: Map<string, Record<string, unknown>>
  private readonly builtinDir: string | null

  constructor(builtinDir?: string) {
    this.probes = new Map()
    this.blueprints = new Map()
    this.interfaces = new Map()
    this.builtinDir = builtinDir ?? resolveBuiltinDir()
    this._initProbes()
    this._initBlueprints()
  }

  private _initProbes(): void {
    if (!this.builtinDir) return
    const probesDir = join(this.builtinDir, 'probes')
    if (!existsSync(probesDir)) return
    const files = readdirSync(probesDir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseProbe(join(probesDir, f))
      if (!parsed) continue
      this.probes.set(parsed.name, {
        name: parsed.name,
        type: parsed.type,
        description: parsed.description,
        align: parsed.align,
        scheme: parsed.scheme,
        props: parsed.props,
        output: parsed.output,
        _builtin: true,
        _type: 'probe',
        _sourcePath: parsed._sourcePath,
      })
    }
  }

  private _initBlueprints(): void {
    if (!this.builtinDir) return
    const bpDir = join(this.builtinDir, 'blueprints')
    if (!existsSync(bpDir)) return
    const files = readdirSync(bpDir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseBlueprint(join(bpDir, f))
      if (!parsed) continue
      this.blueprints.set(parsed.name, {
        name: parsed.name,
        version: parsed.version,
        slots: parsed.slots,
        _builtin: true,
        _type: 'blueprint',
        _sourcePath: parsed._sourcePath,
      })
    }
  }

  // ---- 查询接口 ----

  getProbe(name: string): Record<string, unknown> | null {
    return this.probes.get(name) ?? null
  }

  getPart(_name: string): Record<string, unknown> | null {
    // D18 收窄：parts builtin 延后（src/builtin/ 无 parts/*.md）
    // 接口保留但返回 null
    return null
  }

  getInterface(_name: string): Record<string, unknown> | null {
    return this.interfaces.get(_name) ?? null
  }

  getBlueprint(name: string): Record<string, unknown> | null {
    return this.blueprints.get(name) ?? null
  }

  has(name: string, type: OxnAssetType): boolean {
    switch (type) {
      case 'probe':
        return this.probes.has(name)
      case 'part':
        return false // parts builtin 延后
      case 'interface':
        return this.interfaces.has(name)
      case 'blueprint':
        return this.blueprints.has(name)
      default:
        return false
    }
  }

  listByType(type: OxnAssetType): BuiltinAssetEntry[] {
    switch (type) {
      case 'probe':
        return Array.from(this.probes.entries()).map(([name, data]) => ({
          name,
          type: 'probe',
          data,
        }))
      case 'blueprint':
        return Array.from(this.blueprints.entries()).map(([name, data]) => ({
          name,
          type: 'blueprint',
          data,
        }))
      case 'part':
      case 'interface':
      default:
        return []
    }
  }

  // ---- 扩展接口 ----

  /** 注册一个内置资产（供测试和动态注册使用） */
  register(name: string, type: OxnAssetType, data: Record<string, unknown>): void {
    const map = this._getMap(type)
    map.set(name, data)
  }

  /** 获取资产数量 */
  count(type: OxnAssetType): number {
    return this._getMap(type).size
  }

  /** 全部资产数量 */
  totalCount(): number {
    return this.probes.size + this.blueprints.size + this.interfaces.size
  }

  /** 当前 builtin 目录（调试用） */
  getBuiltinDir(): string | null {
    return this.builtinDir
  }

  /**
   * 读 builtin asset 原始文本（v0.6.2 I-4 引入, v0.6.2-alpha.2 实现）。
   *
   * AssetKind → builtin 子目录映射:
   * - blueprint → blueprints/  (3 个 builtin: verify-pipeline / git-workflow / leader-test-dsl)
   * - domain/workflow/stack/roadmap → builtin 延后 (src/builtin/{kinds}/ 目录空) → null
   *
   * 返 null 场景:
   * - builtinDir 为 null (registry 未初始化)
   * - kind 不在 builtin 支持列表
   * - 文件不存在 (name 不在 builtin)
   */
  readBuiltinAsset(kind: AssetKind, name: string): string | null {
    if (!this.builtinDir) return null
    const subdirMap: Record<AssetKind, string | null> = {
      blueprint: 'blueprints',
      domain: null, // builtin 延后 (oxn-builtin-registry.ts:16-17)
      workflow: null,
      stack: null,
      roadmap: null,
    }
    const subdir = subdirMap[kind]
    if (!subdir) return null
    const path = join(this.builtinDir, subdir, `${name}.md`)
    if (!existsSync(path)) return null
    return readFileSync(path, 'utf-8')
  }

  private _getMap(type: OxnAssetType): Map<string, Record<string, unknown>> {
    switch (type) {
      case 'probe':
        return this.probes
      case 'blueprint':
        return this.blueprints
      case 'interface':
        return this.interfaces
      case 'part':
      default:
        return new Map()
    }
  }
}

// ========================
// 单例
// ========================

let _instance: OxnBuiltinRegistry | null = null

export function getBuiltinRegistry(): OxnBuiltinRegistry {
  if (!_instance) {
    _instance = new OxnBuiltinRegistry()
  }
  return _instance
}

/** 重置单例（测试用） */
export function resetBuiltinRegistry(): void {
  _instance = null
}
