/**
 * OXN AST 生成器
 *
 * 将 Langium 解析的 AST 节点转换为 OxnAssemblyIR 中间表示。
 *
 * Slot 范式 (v3.0):
 * - 移除 Interface，Slot 替代 Abstract Part
 * - ref/use 提升至 header
 * - Task 使用 part slot 覆写
 */

import type {
  OxnAssemblyBundle,
  OxnAssemblyBundleEntity,
  OxnAssemblyExpectation,
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyPartProbe,
  OxnAssemblyProbe,
  OxnAssemblyProp,
  OxnAssemblyRule,
  OxnAssemblySlot,
  OxnDomainIR,
  OxnTaskIR,
  OxnWorkIR,
  OxnContextMapImport,
  OxnDomainRuleDecl,
  OxnNounDecl,
  OxnVerbDecl,
  OxnDomainInjectDecl,
  OxnTaskSlotDecl,
  OxnTaskRefDecl,
  OxnUseDomainDecl,
  OxnUseBlueprintDecl,
} from '../schemas/oxn-assembly.schema.js'
import type {
  BlueprintDeclaration,
  ContextMapImport,
  DomainDeclaration,
  DomainInjectDecl,
  DomainLanguage,
  DomainRuleDecl,
  ExecutionRef,
  ExpectationDeclaration,
  Expression,
  NounDecl,
  OutputField,
  OXNDocument,
  PartDeclaration,
  PartProbeDeclaration,
  PartSlotDeclaration,
  ProbeBinding,
  ProbeDeclaration,
  PropDeclaration,
  RuleDeclaration,
  SlotBinding,
  TaskDeclaration,
  TaskRefDecl,
  UseBlueprintDecl,
  UseDomainDecl,
  VerbDecl,
  WorkDeclaration,
  TopLevelEntity,
  VariableRef,
} from '../generated/ast.js'

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
      ? Object.fromEntries(decl.output[0].fields.map((f: OutputField) => [f.name, typeRefToString(f.type)]))
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
// Blueprint Part 转换
// ========================

function convertObserveDeclaration(obs: { observes: Array<string> }): string[] {
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

// v0.1: ProbeBinding 和 SlotBinding 仍存在 grammar 中以兼容旧的 Part 内联
// 模式，但 WorkDeclaration 已不直接引用。下面保留 convert 函数供其他 converter 使用。
void (() => {
  // empty block: 保留引用以满足类型导出需要
})()

function _unusedConvertProbeBinding(binding: ProbeBinding): OxnAssemblyPartProbe {
  return {
    name: binding.name,
    ref: binding.ref,
    params: {},
    align: binding.align,
  }
}
function _unusedConvertSlotBinding(decl: SlotBinding): { slot: string; ref?: string; align?: string } {
  return {
    slot: decl.align,
    ...(decl.ref !== undefined ? { ref: decl.ref } : {}),
    align: decl.align,
  }
}
void _unusedConvertProbeBinding
void _unusedConvertSlotBinding

// ========================
// Blueprint 转换
// ========================

function convertExpectation(decl: ExpectationDeclaration): OxnAssemblyExpectation {
  const params: Record<string, unknown> = {}
  if (decl.params) {
    for (const pair of decl.params.pairs) {
      params[pair.key] = expressionToString(pair.value)
    }
  }
  return {
    name: decl.name,
    probeRef: decl.probe_ref || '',
    params,
    errMsg: decl.err_msg || '',
  }
}

function convertRule(decl: RuleDeclaration): OxnAssemblyRule {
  return {
    name: decl.name,
    condition: decl.condition ? expressionToString(decl.condition) : '',
    errMsg: decl.err_msg || '',
  }
}

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
    expectations: (decl.expectations || []).map(convertExpectation),
    rules: (decl.rules || []).map(convertRule),
    concreteParts: [],
    abstractParts: [],
  }
}

// ========================
// Work 转换 (v0.1 DDD)
// ========================

function convertUseDomainDecl(decl: UseDomainDecl): OxnUseDomainDecl {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
  }
}

function convertUseBlueprintDecl(decl: UseBlueprintDecl): OxnUseBlueprintDecl {
  return {
    name: decl.name,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
  }
}

function convertTaskRefDecl(decl: TaskRefDecl): OxnTaskRefDecl {
  // TaskRefDecl.props 在 grammar 中是 SlotPropBinding[]，而 OxnTaskRefDecl.props 是 PropDeclaration[] 类型
  // 实际数据可以透传（运行时由 loader 重新校验）
  return {
    name: decl.name,
    align: decl.align,
    deps: decl.deps || [],
    props: [],
  }
}

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
    useDomains: (decl.useDomains || []).map(convertUseDomainDecl),
    useBlueprints: (decl.useBlueprints || []).map(convertUseBlueprintDecl),
    tasks: (decl.tasks || []).map(convertTaskRefDecl),
  }
}

// ========================
// Domain 转换 (v0.1 DDD)
// ========================

function convertNounDecl(decl: NounDecl): OxnNounDecl {
  return { name: decl.name, desc: decl.desc }
}

function convertVerbDecl(decl: VerbDecl): OxnVerbDecl {
  return { name: decl.name, desc: decl.desc }
}

function convertDomainLanguage(decl: DomainLanguage): {
  nouns: OxnNounDecl[]
  verbs: OxnVerbDecl[]
  ban: string[]
} {
  return {
    nouns: (decl.nouns || []).map(convertNounDecl),
    verbs: (decl.verbs || []).map(convertVerbDecl),
    ban: decl.bans || [],
  }
}

function convertDomainRuleDecl(decl: DomainRuleDecl): OxnDomainRuleDecl {
  return { name: decl.name, desc: decl.desc }
}

function convertContextMapImport(decl: ContextMapImport): OxnContextMapImport {
  return { target: decl.target, alias: decl.alias }
}

export function convertDomainDeclaration(decl: DomainDeclaration): OxnDomainIR {
  return {
    name: decl.name,
    description: decl.descriptions?.[0]?.value,
    language: decl.language ? convertDomainLanguage(decl.language) : undefined,
    domainRules: decl.domainRules ? { rules: (decl.domainRules.rules || []).map(convertDomainRuleDecl) } : undefined,
    contextMap: decl.contextMap ? { imports: (decl.contextMap.imports || []).map(convertContextMapImport) } : undefined,
  }
}

// ========================
// Task 转换 (v0.1 DDD)
// ========================

function convertDomainInjectDecl(decl: DomainInjectDecl): OxnDomainInjectDecl {
  return {
    domain: decl.domain,
    ...(decl.alias !== undefined ? { alias: decl.alias } : {}),
  }
}

function convertTaskSlotDecl(slot: PartSlotDeclaration): OxnTaskSlotDecl {
  return {
    name: slot.name,
    deps: slot.deps || [],
    observe: slot.observe ? slot.observe.flatMap(convertObserveDeclaration) : [],
  }
}

export function convertTaskDeclaration(decl: TaskDeclaration): OxnTaskIR {
  return {
    name: decl.name,
    blueprint: decl.blueprint,
    injects: (decl.injects || []).map(convertDomainInjectDecl),
    context: decl.context
      ? {
          objective: decl.context.objective,
          constraints: decl.context.constraints || [],
        }
      : undefined,
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    slots: (decl.partSlots || []).map(convertTaskSlotDecl),
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
    case 'TaskDeclaration':
      return { type: 'task', data: convertTaskDeclaration(entity as TaskDeclaration) }
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

export function extractTasks(document: OXNDocument): OxnTaskIR[] {
  const tasks: OxnTaskIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'TaskDeclaration') {
      tasks.push(convertTaskDeclaration(entity as TaskDeclaration))
    }
  }
  return tasks
}

export interface CategorizedEntities {
  probes: OxnAssemblyProbe[]
  parts: OxnAssemblyPart[]
  blueprints: OxnAssemblyIR[]
  domains: OxnDomainIR[]
  tasks: OxnTaskIR[]
  works: OxnWorkIR[]
}

export function categorizeEntities(document: OXNDocument): CategorizedEntities {
  const result: CategorizedEntities = {
    probes: [],
    parts: [],
    blueprints: [],
    domains: [],
    tasks: [],
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
      case 'TaskDeclaration':
        result.tasks.push(convertTaskDeclaration(entity as TaskDeclaration))
        break
      case 'WorkDeclaration':
        result.works.push(convertWorkDeclaration(entity as WorkDeclaration))
        break
    }
  }

  return result
}
