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
  OXNDocument,
  TopLevelEntity,
  ProbeDeclaration,
  PartDeclaration,
  BlueprintDeclaration,
  TaskDeclaration,
  StageDeclaration,
  ExpectationDeclaration,
  RuleDeclaration,
  SlotDeclaration,
  SlotBinding,
  SlotPropBinding,
  PropDeclaration,
  PartProbeDeclaration,
  ExecutionRef,
  ParamsBlock,
  Expression,
  BinaryExpr,
  TernaryExpr,
  TemplateString,
  VariableRef,
  OutputField,
  Description,
  RequiredModifier,
  DefaultValue,
} from '../generated/ast.js'

import type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyTaskIR,
  OxnAssemblyBundle,
  OxnAssemblyBundleEntity,
  OxnAssemblyProp,
  OxnAssemblyProbe,
  OxnAssemblyStage,
  OxnAssemblyExpectation,
  OxnAssemblyRule,
  OxnAssemblyPartProbe,
  OxnAssemblySlot,
  OxnAssemblySlotBinding,
} from '../../kernel/schemas/oxn-assembly.schema.js'

import { isTemplateString, isVariableRef, isBinaryExpr, isTernaryExpr } from '../generated/ast.js'

// ========================
// Expression → String
// ========================

function expressionToString(expr: Expression): string {
  if (typeof expr === 'string') return expr
  if (typeof expr === 'number') return String(expr)
  if (typeof expr === 'boolean') return String(expr)
  if (typeof expr === 'object' && expr !== null) {
    const e = expr as Record<string, unknown>
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
    const e = expr as Record<string, unknown>
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

  let defaultValue: unknown = undefined
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
    return String((ref.ref as { ref: string }).ref)
  }
  if (ref.part && ref.probe) {
    return `${ref.part}.${ref.probe}`
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
      ? Object.fromEntries(
          decl.output[0].fields.map((f: OutputField) => [f.name, typeRefToString(f.type)])
        )
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
  }
}

// ========================
// Slot 转换
// ========================

function convertSlot(decl: SlotDeclaration): OxnAssemblySlot {
  return {
    name: decl.name,
    run: decl.run,
  }
}

function convertSlotBinding(decl: SlotBinding): OxnAssemblySlotBinding {
  const props: Record<string, unknown> = {}
  if (decl.props) {
    for (const prop of decl.props) {
      props[prop.name] = expressionToValue(prop.value)
    }
  }
  return {
    slot: decl.slot,
    ref: decl.ref,
    props,
  }
}

// ========================
// Blueprint 转换
// ========================

function convertStage(decl: StageDeclaration): OxnAssemblyStage {
  return {
    name: decl.name,
    run: decl.run || '',
    deps: decl.deps || [],
  }
}

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
    _version: decl.version || 1,
    assembly_at: new Date().toISOString(),
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    slots: (decl.slots || []).map(convertSlot),
    stages: (decl.stages || []).map(convertStage),
    expectations: (decl.expectations || []).map(convertExpectation),
    rules: (decl.rules || []).map(convertRule),
    concreteParts: [],
    abstractParts: [],
  }
}

// ========================
// Task 转换
// ========================

export function convertTaskDeclaration(decl: TaskDeclaration): OxnAssemblyTaskIR {
  return {
    name: decl.name,
    use: decl.use || '',
    slotBindings: (decl.slotBindings || []).map(convertSlotBinding),
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
    case 'TaskDeclaration':
      return { type: 'task', data: convertTaskDeclaration(entity as TaskDeclaration) }
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

export function extractTasks(document: OXNDocument): OxnAssemblyTaskIR[] {
  const tasks: OxnAssemblyTaskIR[] = []
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
  tasks: OxnAssemblyTaskIR[]
}

export function categorizeEntities(document: OXNDocument): CategorizedEntities {
  const result: CategorizedEntities = {
    probes: [],
    parts: [],
    blueprints: [],
    tasks: [],
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
      case 'TaskDeclaration':
        result.tasks.push(convertTaskDeclaration(entity as TaskDeclaration))
        break
    }
  }

  return result
}
