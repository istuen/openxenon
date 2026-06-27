/**
 * sync-validation.ts — v0.4 Phase 2 序列化质量守卫
 *
 * 两个不变量 (RFC §3.2 / D6):
 *   1. serialize(IR) 输出必通过 langium parse
 *   2. serialize → compile → extract → IR 必 ≈ 原 IR (round-trip)
 *
 * 错误码 (D6 E_SYNC_* 前缀):
 *   - E_SYNC_LANGIUM_VALIDATION_FAILED — 反向 .oxn 不通过 parser
 *   - E_SYNC_ROUND_TRIP_LOSS — 关键字段丢失 (term 数 / ban 数 / invariant 数)
 *
 * L0–L3: L1-OXL 层
 */

import { URI } from 'langium'
import type { DomainIR } from './transformers/domain'
import type { BlueprintIR } from './transformers/blueprint'
import type { WorkIR } from './transformers/work'
import { compileOxnToMd } from '../md-bridge/oxl-md-decompiler.js'
import { createOxnParser } from '../../oxl'
import { extractDomainIR, type DomainTerm, type DomainBan, type DomainInvariant } from './transformers/domain'
import { extractBlueprintIR, type BlueprintProp, type BlueprintSlot } from './transformers/blueprint'
import { extractWorkIR, type WorkTaskIR } from './transformers/work'
import { parseMarkdown } from './utils'

export type SyncEntity = 'domain' | 'blueprint' | 'work'

export interface LangiumValidationResult {
  ok: boolean
  errors: string[]
}

export interface RoundTripResult<T> {
  ok: boolean
  original: T
  recovered: T | null
  lostFields: string[]
  errors: string[]
}

// ========================================================================
// Langium 解析验证
// ========================================================================

/** 验证反向编译的 .oxn 能被 langium 解析 (不抛错即通过) */
export async function validateOxnParseable(oxnContent: string): Promise<LangiumValidationResult> {
  // 每次创建新 parser (避免 singleton 状态污染)
  const parser = createOxnParser()
  const result = await parser.parse(oxnContent, URI.file('sync.oxn'))
  return {
    ok: result.parseErrors.length === 0,
    errors: result.parseErrors,
  }
}

// ========================================================================
// Round-trip 检测
// ========================================================================

/** 用同样的 extract 函数从 .md 抽 IR, 验证关键字段不丢 */
async function rerunDomainExtract(mdContent: string): Promise<DomainIR | null> {
  try {
    const { tree, frontmatter } = parseMarkdown(mdContent)
    return extractDomainIR(tree, frontmatter)
  } catch {
    return null
  }
}

async function rerunBlueprintExtract(mdContent: string): Promise<BlueprintIR | null> {
  try {
    const { tree, frontmatter } = parseMarkdown(mdContent)
    return extractBlueprintIR(tree, frontmatter)
  } catch {
    return null
  }
}

async function rerunWorkExtract(mdContent: string): Promise<WorkIR | null> {
  try {
    const { tree, frontmatter } = parseMarkdown(mdContent)
    return extractWorkIR(tree, frontmatter)
  } catch {
    return null
  }
}

/** 比较 DomainIR 关键字段 (terms/bans/invariants/stack 数 + name) */
export function diffDomainIR(original: DomainIR, recovered: DomainIR): string[] {
  const lost: string[] = []
  if (original.name !== recovered.name) lost.push(`name: "${original.name}" → "${recovered.name}"`)
  if (original.terms.length !== recovered.terms.length) {
    lost.push(`terms: ${original.terms.length} → ${recovered.terms.length}`)
  }
  if (original.bans.length !== recovered.bans.length) {
    lost.push(`bans: ${original.bans.length} → ${original.bans.length}`)
  }
  if (original.invariants.length !== recovered.invariants.length) {
    lost.push(`invariants: ${original.invariants.length} → ${recovered.invariants.length}`)
  }
  return lost
}

export function diffBlueprintIR(original: BlueprintIR, recovered: BlueprintIR): string[] {
  const lost: string[] = []
  if (original.name !== recovered.name) lost.push(`name: "${original.name}" → "${recovered.name}"`)
  if (original.props.length !== recovered.props.length) {
    lost.push(`props: ${original.props.length} → ${recovered.props.length}`)
  }
  if (original.slots.length !== recovered.slots.length) {
    lost.push(`slots: ${original.slots.length} → ${recovered.slots.length}`)
  }
  return lost
}

export function diffWorkIR(original: WorkIR, recovered: WorkIR): string[] {
  const lost: string[] = []
  if (original.name !== recovered.name) lost.push(`name: "${original.name}" → "${recovered.name}"`)
  if (original.tasks.length !== recovered.tasks.length) {
    lost.push(`tasks: ${original.tasks.length} → ${recovered.tasks.length}`)
  }
  return lost
}

/**
 * Domain round-trip 验证: serialize(IR) → compile → extract → diff
 * 返回 ok=true 表示 round-trip 完整
 */
export async function verifyDomainRoundTrip(
  originalIr: DomainIR,
  oxnContent: string,
): Promise<RoundTripResult<DomainIR>> {
  // Step 1: langium parse
  const parseResult = await validateOxnParseable(oxnContent)
  if (!parseResult.ok) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: parseResult.errors }
  }

  // Step 2: .oxn → .md (compile, 含 frontmatter 模拟真实 sync 流程)
  let mdContent: string
  try {
    const result = await compileOxnToMd(oxnContent, { entity: 'domain', frontmatter: true })
    mdContent = result.md
  } catch (err) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: [`compile: ${String(err)}`] }
  }

  // Step 3: .md → IR (extract)
  const recovered = await rerunDomainExtract(mdContent)
  if (!recovered) {
    return { ok: false, original: originalIr, recovered: null, lostFields: ['all'], errors: ['md extract failed'] }
  }

  // Step 4: diff
  const lost = diffDomainIR(originalIr, recovered)
  return { ok: lost.length === 0, original: originalIr, recovered, lostFields: lost, errors: [] }
}

export async function verifyBlueprintRoundTrip(
  originalIr: BlueprintIR,
  oxnContent: string,
): Promise<RoundTripResult<BlueprintIR>> {
  const parseResult = await validateOxnParseable(oxnContent)
  if (!parseResult.ok) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: parseResult.errors }
  }

  let mdContent: string
  try {
    const result = await compileOxnToMd(oxnContent, { entity: 'blueprint', frontmatter: true })
    mdContent = result.md
  } catch (err) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: [`compile: ${String(err)}`] }
  }

  const recovered = await rerunBlueprintExtract(mdContent)
  if (!recovered) {
    return { ok: false, original: originalIr, recovered: null, lostFields: ['all'], errors: ['md extract failed'] }
  }

  const lost = diffBlueprintIR(originalIr, recovered)
  return { ok: lost.length === 0, original: originalIr, recovered, lostFields: lost, errors: [] }
}

export async function verifyWorkRoundTrip(originalIr: WorkIR, oxnContent: string): Promise<RoundTripResult<WorkIR>> {
  const parseResult = await validateOxnParseable(oxnContent)
  if (!parseResult.ok) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: parseResult.errors }
  }

  let mdContent: string
  try {
    const result = await compileOxnToMd(oxnContent, { entity: 'work', frontmatter: true })
    mdContent = result.md
  } catch (err) {
    return { ok: false, original: originalIr, recovered: null, lostFields: [], errors: [`compile: ${String(err)}`] }
  }

  const recovered = await rerunWorkExtract(mdContent)
  if (!recovered) {
    return { ok: false, original: originalIr, recovered: null, lostFields: ['all'], errors: ['md extract failed'] }
  }

  const lost = diffWorkIR(originalIr, recovered)
  return { ok: lost.length === 0, original: originalIr, recovered, lostFields: lost, errors: [] }
}

// re-export common types for convenience
export type { DomainTerm, DomainBan, DomainInvariant, BlueprintProp, BlueprintSlot, WorkTaskIR }
