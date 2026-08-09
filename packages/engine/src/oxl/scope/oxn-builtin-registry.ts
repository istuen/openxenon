/**
 * oxn-builtin-registry.ts — Phase 4 builtin 加载 + ADR-0090 物理位置迁移
 *
 * 替代 v0.6.x 硬编码 mock (4 probes + 3 phantom parts + 0 blueprints)，
 * 从 packages/engine/src/builtin/{kind}/*.md 加载 27 builtin assets（ADR-0090）：
 *   - 19 probes
 *   - 4 blueprints (3 原生 + md-author)
 *   - 1 domain (doc-md)
 *   - 1 workflow (md-author)
 *   - 1 stack (md-stack)
 *   - 1 roadmap (md-system, 收为 assetmap/)
 *
 * mdast 管线复用：
 *   - parseMarkdown (md-pipeline/utils) → tree + frontmatter
 *   - collectHeadingContexts → H2 段定位（Alignment/Scheme/Props/Output/Version/Slots）
 *   - collectListFields → listItem key-value 提取
 *
 * 路径解析（ADR-0090 修订）：
 *   - 候选 1：cwd + '/packages/engine/src/builtin'（OXN 仓库 dev mode，从 root 运行）
 *   - 候选 2：import.meta.dirname + '/../../builtin'（3 级向上：packages/engine/src/oxl/scope/ → packages/engine/src/builtin/）
 *   - 候选 3：fallback，空 registry（不抛错）
 *
 * 决策：builtin 现在归属 engine 包，跟着 engine npm 一起发布（ADR-0090 D3）。
 * D18 延后由 ADR-0090 D2 解除：5 类 builtin 全部加载。
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

/**
 * ADR-0090 builtin 物理位置：packages/engine/src/builtin/
 *
 * 候选路径优先级（resolveBuiltinDir）：
 *   1. cwd + 'packages/engine/src/builtin' — OXN repo dev mode (CLI 从 root 跑)
 *   2. import.meta.dirname + '../../builtin' — 3 级向上到 engine/src/builtin
 *      (registry 文件在 packages/engine/src/oxl/scope/)
 *   3. cwd + 'src/builtin' — v0.6.x 兼容路径（已废弃，保留 fallback）
 */
function resolveBuiltinDir(): string | null {
  const candidates: string[] = []

  // 候选 1：OXN repo dev mode (cwd 为仓库根)
  candidates.push(join(process.cwd(), 'packages/engine/src/builtin'))

  // 候选 2：import.meta.dirname 相对路径（包内执行 / npm 安装后）
  try {
    const here = dirname(fileURLToPath(import.meta.url))
    // packages/engine/src/oxl/scope/ → ../../builtin (3 级)
    candidates.push(join(here, '../../builtin'))
  } catch {
    // import.meta.url 不可用（如纯 CommonJS 编译）—— 跳过
  }

  // 候选 3：v0.6.x 兼容（fallback，仅在过渡期生效）
  candidates.push(join(process.cwd(), 'src/builtin'))

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
// Generic Asset 解析（domain / workflow / stack / roadmap）
// ========================
//
// 这 4 类 builtin 暂不需要 H2 段解析（不像 Probe/Blueprint 有 Alignment/Scheme/Props/Output/Version/Slots
// 这种结构化段）。当前只解析 frontmatter + 保留 raw 文本，调用者按需 deep-parse。
// 未来如果 Domain/Workflow 引入 H2 结构（如 Term / Invariant / Ban 段），再扩展 `parseGenericAsset`。

interface ParsedGenericAsset {
  name: string
  version: number
  abstract: string
  references: string[]
  raw: string
  _sourcePath: string
}

function parseGenericAsset(mdPath: string): ParsedGenericAsset | null {
  const raw = readFileSync(mdPath, 'utf-8')
  const { frontmatter } = parseMarkdown(raw)
  const name = typeof frontmatter.name === 'string' ? frontmatter.name : null
  if (!name) return null
  const version = typeof frontmatter.version === 'number' ? frontmatter.version : 0.1
  const abstract = typeof frontmatter.abstract === 'string' ? frontmatter.abstract : ''
  const refs = Array.isArray(frontmatter.references)
    ? (frontmatter.references as unknown[]).filter((r): r is string => typeof r === 'string')
    : []
  return {
    name,
    version,
    abstract,
    references: refs,
    raw,
    _sourcePath: mdPath,
  }
}

// ========================
// Registry 实现
// ========================

export class OxnBuiltinRegistry implements IBuiltinRegistry {
  private probes: Map<string, Record<string, unknown>>
  private blueprints: Map<string, Record<string, unknown>>
  private domains: Map<string, Record<string, unknown>>
  private workflows: Map<string, Record<string, unknown>>
  private stacks: Map<string, Record<string, unknown>>
  private roadmaps: Map<string, Record<string, unknown>>
  private interfaces: Map<string, Record<string, unknown>>
  private readonly builtinDir: string | null

  constructor(builtinDir?: string) {
    this.probes = new Map()
    this.blueprints = new Map()
    this.domains = new Map()
    this.workflows = new Map()
    this.stacks = new Map()
    this.roadmaps = new Map()
    this.interfaces = new Map()
    this.builtinDir = builtinDir ?? resolveBuiltinDir()
    this._initProbes()
    this._initBlueprints()
    this._initDomains()
    this._initWorkflows()
    this._initStacks()
    this._initAssetmaps()
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

  private _initDomains(): void {
    if (!this.builtinDir) return
    const dir = join(this.builtinDir, 'domains')
    if (!existsSync(dir)) return
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseGenericAsset(join(dir, f))
      if (!parsed) continue
      this.domains.set(parsed.name, {
        name: parsed.name,
        version: parsed.version,
        abstract: parsed.abstract,
        references: parsed.references,
        _builtin: true,
        _type: 'domain',
        _sourcePath: parsed._sourcePath,
        _raw: parsed.raw,
      })
    }
  }

  private _initWorkflows(): void {
    if (!this.builtinDir) return
    const dir = join(this.builtinDir, 'workflows')
    if (!existsSync(dir)) return
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseGenericAsset(join(dir, f))
      if (!parsed) continue
      this.workflows.set(parsed.name, {
        name: parsed.name,
        version: parsed.version,
        abstract: parsed.abstract,
        references: parsed.references,
        _builtin: true,
        _type: 'workflow',
        _sourcePath: parsed._sourcePath,
        _raw: parsed.raw,
      })
    }
  }

  private _initStacks(): void {
    if (!this.builtinDir) return
    const dir = join(this.builtinDir, 'stacks')
    if (!existsSync(dir)) return
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseGenericAsset(join(dir, f))
      if (!parsed) continue
      this.stacks.set(parsed.name, {
        name: parsed.name,
        version: parsed.version,
        abstract: parsed.abstract,
        references: parsed.references,
        _builtin: true,
        _type: 'stack',
        _sourcePath: parsed._sourcePath,
        _raw: parsed.raw,
      })
    }
  }

  private _initAssetmaps(): void {
    if (!this.builtinDir) return
    const dir = join(this.builtinDir, 'assetmaps')
    if (!existsSync(dir)) return
    const files = readdirSync(dir).filter((f) => f.endsWith('.md'))
    for (const f of files) {
      const parsed = parseGenericAsset(join(dir, f))
      if (!parsed) continue
      this.roadmaps.set(parsed.name, {
        name: parsed.name,
        version: parsed.version,
        abstract: parsed.abstract,
        references: parsed.references,
        _builtin: true,
        _type: 'assetmap', // 🆕 v0.6.4: 'roadmap' → 'assetmap'
        _sourcePath: parsed._sourcePath,
        _raw: parsed.raw,
      })
    }
  }

  // ---- 查询接口 ----

  getProbe(name: string): Record<string, unknown> | null {
    return this.probes.get(name) ?? null
  }

  getPart(_name: string): Record<string, unknown> | null {
    // parts builtin 延后（packages/engine/src/builtin/ 无 parts/*.md）
    // 接口保留但返回 null
    return null
  }

  getInterface(name: string): Record<string, unknown> | null {
    return this.interfaces.get(name) ?? null
  }

  getBlueprint(name: string): Record<string, unknown> | null {
    return this.blueprints.get(name) ?? null
  }

  /** ADR-0090 D2 新增：domain / workflow / stack / roadmap 查询 */
  getDomain(name: string): Record<string, unknown> | null {
    return this.domains.get(name) ?? null
  }

  getWorkflow(name: string): Record<string, unknown> | null {
    return this.workflows.get(name) ?? null
  }

  getStack(name: string): Record<string, unknown> | null {
    return this.stacks.get(name) ?? null
  }

  /** roadmap kind → assetmap 命名收敛后，查询仍走 getRoadmap（保留 RFC-0013 D4 枚举） */
  getRoadmap(name: string): Record<string, unknown> | null {
    return this.roadmaps.get(name) ?? null
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
    return (
      this.probes.size +
      this.blueprints.size +
      this.domains.size +
      this.workflows.size +
      this.stacks.size +
      this.roadmaps.size +
      this.interfaces.size
    )
  }

  /** 当前 builtin 目录（调试用） */
  getBuiltinDir(): string | null {
    return this.builtinDir
  }

  /**
   * 读 builtin asset 原始文本（v0.6.2 I-4 引入, v0.6.2-alpha.2 实现）。
   *
   * ADR-0090 修订：5 类 builtin 全部填齐（D18 延后解除）。
   *
   * AssetKind → builtin 子目录映射:
   * - probe      → probes/      (19 个 builtin)
   * - blueprint  → blueprints/  (4 个 builtin: verify-pipeline / git-workflow / leader-test-dsl / md-author)
   * - domain     → domains/     (1 个 builtin: doc-md)
   * - workflow   → workflows/   (1 个 builtin: md-author)
   * - stack      → stacks/      (1 个 builtin: md-stack)
   * - roadmap    → assetmaps/   (1 个 builtin: md-system)
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
      domain: 'domains',
      workflow: 'workflows',
      stack: 'stacks',
      assetmap: 'assetmaps', // 🆕 v0.6.4: 'roadmap' → 'assetmap'
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
