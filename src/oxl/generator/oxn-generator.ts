/**
 * OXN AST 生成器 (v0.1-final)
 *
 * 将 Langium 解析的 AST 节点转换为 OxnAssemblyIR 中间表示。
 *
 * v0.1-final 变更：
 * - Domain: noun/verb → term, domain_rules → invariant
 * - Blueprint: 移除 expectation/rule
 * - Work: use_domain/use_blueprint → domain/blueprint/part/probe ref
 * - Task: inject → domain/blueprint/part/probe 声明式对齐
 */

import type {
  OxnAssemblyBundle,
  OxnAssemblyBundleEntity,
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyPartProbe,
  OxnAssemblyProbe,
  OxnAssemblyProp,
  OxnAssemblySlot,
  OxnDomainIR,
  OxnTaskIR,
  OxnWorkIR,
  OxnTermDecl,
  OxnInvariantDecl,
  OxnWorkResourceRef,
  OxnTaskPartDecl,
} from '../schemas/oxn-assembly.schema.js'
import type {
  BlueprintDeclaration,
  DomainDeclaration,
  ExecutionRef,
  Expression,
  InvariantDecl,
  OXNDocument,
  PartDeclaration,
  PartProbeDeclaration,
  PartSlotDeclaration,
  ProbeDeclaration,
  PropDeclaration,
  TaskDeclaration,
  TaskPartDecl,
  TaskProbeDecl,
  TermDecl,
  TopLevelEntity,
  VariableRef,
  WorkDeclaration,
  DomainRefDecl,
  BlueprintRefDecl,
  PartRefDecl,
  ProbeRefDecl,
  ObserveDeclaration,
} from '../generated/ast.js'
import { isTaskDepsField } from '../generated/ast.js'

import { isBinaryExpr, isTemplateString, isTernaryExpr, isVariableRef } from '../generated/ast.js'

// ========================
// Expression → String
// ========================

function expressionToString(expr: Expression): string {
  if (typeof expr === 'string') return expr
  if (typeof expr === 'number') return String(expr)
  if (typeof expr === 'boolean') return String(expr)
  if (typeof expr === 'object' && expr !== null) {
    const e = expr as unknown as Record<string, unknown>
    if (e.$type === 'LiteralExpr' && (e as any).$cstNode?.text) {
      const text = (e as any).$cstNode.text as string
      if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
        return text.slice(1, -1)
      }
      return text
    }
  }
  if (isTemplateString(expr)) return expr.value
  if (isVariableRef(expr)) return varRefToString(expr)
  if (isBinaryExpr(expr)) {
    const left = expressionToString(expr.left)
    const right = expressionToString(expr.right)
    return `${left} ${expr.op} ${right}`
  }
  if (isTernaryExpr(expr)) {
    const cond = expressionToString(expr.condition)
    const thenVal = expressionToString(expr.then)
    const elseVal = expressionToString(expr.else)
    return `${cond} ? ${thenVal} : ${elseVal}`
  }
  return String(expr)
}

function varRefToString(ref: VariableRef): string {
  const path = ref.path
  const parts: string[] = []
  if (path.prefix) parts.push(path.prefix)
  parts.push(path.name)
  for (const seg of path.segments) parts.push(seg)
  return parts.join('.')
}

// ========================
// Type Helpers
// ========================

function typeRefToString(type: unknown): string {
  if (typeof type === 'string') return type
  if (typeof type === 'object' && type !== null) {
    const t = type as Record<string, unknown>
    if (t.$type === 'EnumType') return `enum(${(t.values as string[]).join(', ')})`
    if (t.$type === 'GenericType') return `${t.container}<${typeRefToString(t.inner)}>`
    if (t.$type === 'AnyType') return 'any'
    if (t.$type === 'AnyTypeRef') return 'any'
  }
  return String(type)
}

// ========================
// Props 转换
// ========================

function expressionToValue(expr: Expression): unknown {
  if (typeof expr === 'number') return expr
  if (typeof expr === 'boolean') return expr
  if (typeof expr === 'string') return expr
  if (typeof expr === 'object' && expr !== null) {
    const e = expr as unknown as Record<string, unknown>
    if (e.$type === 'LiteralExpr' && (e as any).$cstNode?.text) {
      const text = (e as any).$cstNode.text as string
      if (text.length >= 2 && text[0] === '"' && text[text.length - 1] === '"') {
        return text.slice(1, -1)
      }
      return text
    }
  }
  if (isTemplateString(expr)) {
    const raw = expr.value
    if (raw.length >= 2 && raw[0] === '"' && raw[raw.length - 1] === '"') {
      return raw.slice(1, -1)
    }
    return raw
  }
  return expressionToString(expr)
}

function propDeclarationToAssemblyProp(prop: PropDeclaration): OxnAssemblyProp {
  let required = false
  if (prop.required) {
    required = typeof prop.required.value === 'boolean' ? prop.required.value : prop.required.value === 'true'
  }

  let defaultValue: unknown
  if (prop.default) {
    defaultValue = expressionToValue(prop.default.value)
  }

  return {
    name: prop.name,
    type: typeRefToString(prop.type),
    required,
    default: defaultValue,
  }
}

// ========================
// Part Probe 转换
// ========================

function partProbeToAssemblyProbe(probe: PartProbeDeclaration): OxnAssemblyPartProbe {
  const params: Record<string, unknown> = {}
  if (probe.params) {
    for (const pair of probe.params.pairs) {
      params[pair.key] = expressionToString(pair.value)
    }
  }

  return {
    name: probe.name,
    ref: probe.ref,
    params,
  }
}

// ========================
// Execution 转换
// ========================

function executionRefToString(ref: ExecutionRef): string {
  if (ref.ref && typeof ref.ref === 'object' && 'ref' in ref.ref) {
    return String((ref.ref as unknown as { ref: string }).ref)
  }
  if ((ref as any).part && (ref as any).probe) {
    return `${(ref as any).part}.${(ref as any).probe}`
  }
  return 'unknown'
}

// ========================
// Top-Level Entity 分发
// ========================

export function convertProbeDeclaration(decl: ProbeDeclaration): OxnAssemblyProbe {
  return {
    name: decl.name,
    description: decl.descriptions?.[0]?.value,
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    output: decl.output?.[0]
      ? Object.fromEntries(decl.output[0].fields.map((f) => [f.name, typeRefToString(f.type)]))
      : undefined,
  }
}

export function convertPartDeclaration(decl: PartDeclaration): OxnAssemblyPart {
  return {
    name: decl.name,
    description: decl.descriptions?.[0]?.value,
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    probes: (decl.probes || []).map(partProbeToAssemblyProbe),
    execution: (decl.refs || []).map(executionRefToString),
    deps: [],
  }
}

// ========================
// Blueprint Part Slot 转换
// ========================

function convertObserveDeclaration(obs: ObserveDeclaration): string[] {
  return obs.observes || []
}

function convertPartSlotDeclaration(decl: PartSlotDeclaration): OxnAssemblySlot {
  return {
    name: decl.name,
    deps: decl.deps || [],
    intent: decl.name,
    observe: decl.observe ? decl.observe.flatMap(convertObserveDeclaration) : [],
    isMulti: false,
  }
}

// ========================
// Blueprint 转换 (v0.1-final: 无 expectation/rule)
// ========================

export function convertBlueprintDeclaration(decl: BlueprintDeclaration): OxnAssemblyIR {
  return {
    id: decl.name,
    name: decl.name,
    type: 'task',
    _version: decl.version || 1,
    assembly_at: new Date().toISOString(),
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    slots: (decl.partSlots || []).map(convertPartSlotDeclaration),
    blueprintParts: [],
    stages: [],
    concreteParts: [],
    abstractParts: [],
  }
}

// ========================
// Domain 转换 (v0.1-final: term/ban/invariant; v0.1.1: 多 invariant 块)
// ========================

function convertTermDecl(decl: TermDecl): OxnTermDecl {
  return { name: decl.name, desc: decl.desc }
}

function convertInvariantDecl(decl: InvariantDecl): OxnInvariantDecl {
  return { value: decl.value ?? '' }
}

function convertDomainLanguage(decl: {
  terms?: { terms: TermDecl[] }
  ban?: { bans: string[] }
  invariants?: Array<{ invariants: InvariantDecl[] }>
}): {
  terms: OxnTermDecl[]
  ban: string[]
  invariant: OxnInvariantDecl[]
} {
  const invariantList: InvariantDecl[] = []
  for (const block of decl.invariants ?? []) {
    for (const inv of block.invariants ?? []) invariantList.push(inv)
  }
  return {
    terms: (decl.terms?.terms || []).map(convertTermDecl),
    ban: decl.ban?.bans || [],
    invariant: invariantList.map(convertInvariantDecl),
  }
}

export function convertDomainDeclaration(decl: DomainDeclaration): OxnDomainIR {
  const hasLanguage = !!(decl.terms || decl.ban || (decl.invariants && decl.invariants.length > 0))
  return {
    name: decl.name,
    description: decl.descriptions?.[0]?.value,
    language: hasLanguage ? convertDomainLanguage(decl as any) : undefined,
  }
}

// ========================
// Work 转换 (v0.1-final: 统一资源池)
// ========================

function convertDomainRefDecl(decl: DomainRefDecl): OxnWorkResourceRef {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
    ...(decl.ref !== undefined ? { ref: decl.ref } : {}),
  }
}

function convertBlueprintRefDecl(decl: BlueprintRefDecl): OxnWorkResourceRef {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
    ...(decl.ref !== undefined ? { ref: decl.ref } : {}),
  }
}

function convertPartRefDecl(decl: PartRefDecl): OxnWorkResourceRef {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
    ...(decl.ref !== undefined ? { ref: decl.ref } : {}),
  }
}

function convertProbeRefDecl(decl: ProbeRefDecl): OxnWorkResourceRef {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
    ...(decl.ref !== undefined ? { ref: decl.ref } : {}),
  }
}

// ========================
// Task 转换 (v0.1-final: 声明式对齐)
// ========================

function convertTaskProbeDecl(decl: TaskProbeDecl): { name: string; ref: string; params?: Record<string, unknown> } {
  const params: Record<string, unknown> = {}
  if (decl.params) {
    for (const pair of decl.params.pairs) {
      params[pair.key] = expressionToString(pair.value)
    }
  }
  return {
    name: decl.name,
    ref: decl.ref,
    ...(Object.keys(params).length > 0 ? { params } : {}),
  }
}

function convertTaskPartDecl(decl: TaskPartDecl): OxnTaskPartDecl {
  return {
    name: decl.name,
    ...(decl.skill_context !== undefined ? { skillContext: decl.skill_context } : {}),
    probes: (decl.probes || []).map(convertTaskProbeDecl),
  }
}

export function convertTaskDeclaration(decl: TaskDeclaration): OxnTaskIR {
  return {
    name: decl.name,
    ...(decl.domain !== undefined ? { domain: decl.domain } : {}),
    ...(decl.blueprint !== undefined ? { blueprint: decl.blueprint } : {}),
    parts: (decl.parts || []).map(convertTaskPartDecl),
    ...(isTaskDepsField(decl) && decl.deps ? { deps: decl.deps.deps || [] } : {}),
  }
}

// ========================
// Work 转换主入口
// ========================

export function convertWorkDeclaration(decl: WorkDeclaration): OxnWorkIR {
  return {
    name: decl.name,
    context: decl.context
      ? {
          goal: decl.context.goal,
          constraints: decl.context.constraints || [],
          loopPolicy: decl.context.loopPolicy?.maxIterations
            ? { maxIterations: decl.context.loopPolicy.maxIterations }
            : undefined,
        }
      : undefined,
    domains: (decl.domains || []).map(convertDomainRefDecl),
    blueprints: (decl.blueprints || []).map(convertBlueprintRefDecl),
    parts: (decl.parts || []).map(convertPartRefDecl),
    probes: (decl.probes || []).map(convertProbeRefDecl),
    tasks: (decl.tasks || []).map(convertTaskDeclaration),
  }
}

// ========================
// Top-Level Dispatch
// ========================

function convertTopLevelEntity(entity: TopLevelEntity): OxnAssemblyBundleEntity {
  const $type = (entity as { $type: string }).$type

  switch ($type) {
    case 'ProbeDeclaration':
      return { type: 'probe', data: convertProbeDeclaration(entity as ProbeDeclaration) }
    case 'PartDeclaration':
      return { type: 'part', data: convertPartDeclaration(entity as PartDeclaration) }
    case 'BlueprintDeclaration':
      return { type: 'blueprint', data: convertBlueprintDeclaration(entity as BlueprintDeclaration) }
    case 'DomainDeclaration':
      return { type: 'domain', data: convertDomainDeclaration(entity as DomainDeclaration) }
    case 'WorkDeclaration':
      return { type: 'work', data: convertWorkDeclaration(entity as WorkDeclaration) }
    default:
      throw new Error(`Unknown top-level entity type: ${$type}`)
  }
}

// ========================
// 主入口
// ========================

export function generateOxnAssembly(document: OXNDocument): OxnAssemblyBundle {
  const entities: OxnAssemblyBundleEntity[] = []

  for (const entity of document.entities || []) {
    entities.push(convertTopLevelEntity(entity))
  }

  return { entities }
}

export function extractBlueprints(document: OXNDocument): OxnAssemblyIR[] {
  const blueprints: OxnAssemblyIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'BlueprintDeclaration') {
      blueprints.push(convertBlueprintDeclaration(entity as BlueprintDeclaration))
    }
  }
  return blueprints
}

export function extractWorks(document: OXNDocument): OxnWorkIR[] {
  const works: OxnWorkIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'WorkDeclaration') {
      works.push(convertWorkDeclaration(entity as WorkDeclaration))
    }
  }
  return works
}

export function extractDomains(document: OXNDocument): OxnDomainIR[] {
  const domains: OxnDomainIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'DomainDeclaration') {
      domains.push(convertDomainDeclaration(entity as DomainDeclaration))
    }
  }
  return domains
}

export interface CategorizedEntities {
  probes: OxnAssemblyProbe[]
  parts: OxnAssemblyPart[]
  blueprints: OxnAssemblyIR[]
  domains: OxnDomainIR[]
  works: OxnWorkIR[]
}

export function categorizeEntities(document: OXNDocument): CategorizedEntities {
  const result: CategorizedEntities = {
    probes: [],
    parts: [],
    blueprints: [],
    domains: [],
    works: [],
  }

  for (const entity of document.entities || []) {
    switch (entity.$type) {
      case 'ProbeDeclaration':
        result.probes.push(convertProbeDeclaration(entity as ProbeDeclaration))
        break
      case 'PartDeclaration':
        result.parts.push(convertPartDeclaration(entity as PartDeclaration))
        break
      case 'BlueprintDeclaration':
        result.blueprints.push(convertBlueprintDeclaration(entity as BlueprintDeclaration))
        break
      case 'DomainDeclaration':
        result.domains.push(convertDomainDeclaration(entity as DomainDeclaration))
        break
      case 'WorkDeclaration':
        result.works.push(convertWorkDeclaration(entity as WorkDeclaration))
        break
    }
  }

  return result
}
