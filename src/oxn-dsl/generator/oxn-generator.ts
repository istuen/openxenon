/**
 * Task 1.5 — OXN AST 生成器
 *
 * 将 Langium 解析的 AST 节点转换为 OxnAssemblyIR 中间表示。
 *
 * 职责：
 * 1. 遍历 OXNDocument → 按类型分类 → OxnAssemblyBundle
 * 2. abstract part 标记 isAbstract = true
 * 3. 禁止 abstract part 包含 execution 块（AST 层拦截）
 * 4. 保留 expression 原始文本（不求值）
 */

import type {
  OXNDocument,
  TopLevelEntity,
  ProbeDeclaration,
  InterfaceDeclaration,
  PartDeclaration,
  AbstractPartDeclaration,
  AbstractPartInBlueprint,
  BlueprintDeclaration,
  TaskDeclaration,
  StageDeclaration,
  ExpectationDeclaration,
  RuleDeclaration,
  PropDeclaration,
  PartProbeDeclaration,
  ExecutionRef,
  ParamsBlock,
  Expression,
  BinaryExpr,
  TernaryExpr,
  TemplateString,
  VariableRef,
  MethodDeclaration,
  MethodIO,
  OutputField,
  Description,
  RequiredModifier,
  DefaultValue,
  BindingEntry,
} from '../generated/ast.js'

import type {
  OxnAssemblyIR,
  OxnAssemblyPart,
  OxnAssemblyTaskIR,
  OxnAssemblyBundle,
  OxnAssemblyBundleEntity,
  OxnAssemblyProp,
  OxnAssemblyProbe,
  OxnAssemblyInterface,
  OxnAssemblyStage,
  OxnAssemblyExpectation,
  OxnAssemblyRule,
  OxnAssemblyPartProbe,
  OxnAssemblyMethod,
} from '../../kernel/schemas/oxn-assembly.schema.js'

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

function refToString(ref: langium.Reference<unknown> | undefined): string {
  if (!ref) return ''
  if (typeof ref === 'string') return ref
  if (ref && typeof ref === 'object' && 'ref' in ref) {
    return String((ref as { ref: string }).ref)
  }
  return String(ref)
}

function resolveImplementsRef(part: { implements?: langium.Reference<InterfaceDeclaration> | string }): string | undefined {
  if (!part.implements) return undefined
  if (typeof part.implements === 'string') return part.implements
  // Langium reference: try $refText or resolve to name
  const ir = part.implements as unknown as { $refText?: string; name?: string; ref?: string }
  return ir.$refText || ir.name || ir.ref
}

import { isTemplateString, isVariableRef, isBinaryExpr, isTernaryExpr } from '../generated/ast.js'
import type * as langium from 'langium'

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

export function convertInterfaceDeclaration(decl: InterfaceDeclaration): OxnAssemblyInterface {
  return {
    name: decl.name,
    methods: (decl.methods || []).map((m: MethodDeclaration): OxnAssemblyMethod => ({
      name: m.name,
      input: m.input
        ? Object.fromEntries(m.input.fields.map((f: OutputField) => [f.name, typeRefToString(f.type)]))
        : undefined,
      output: m.output
        ? Object.fromEntries(m.output.fields.map((f: OutputField) => [f.name, typeRefToString(f.type)]))
        : undefined,
    })),
  }
}

export function convertPartDeclaration(decl: PartDeclaration): OxnAssemblyPart {
  const implementsRef = resolveImplementsRef(decl)
  return {
    name: decl.name,
    implements: implementsRef,
    description: decl.descriptions?.[0]?.value,
    isAbstract: false,
    props: (decl.props || []).map(propDeclarationToAssemblyProp),
    probes: (decl.probes || []).map(partProbeToAssemblyProbe),
    execution: (decl.refs || []).map(executionRefToString),
  }
}

export function convertAbstractPartDeclaration(decl: AbstractPartDeclaration): OxnAssemblyPart {
  const paramsMap: Record<string, unknown> = {}
  if (decl.params) {
    for (const pair of decl.params.pairs) {
      paramsMap[pair.key] = expressionToString(pair.value)
    }
  }
  return {
    name: decl.name,
    implements: resolveImplementsRef(decl),
    isAbstract: true,
    props: [],
    probes: [],
    execution: [],
    params: paramsMap,
  } as OxnAssemblyPart & { params: Record<string, unknown> }
}

// ========================
// Blueprint 转换
// ========================

function convertAbstractPartInBlueprint(decl: AbstractPartInBlueprint): OxnAssemblyPart {
  const paramsMap: Record<string, unknown> = {}
  if (decl.params) {
    for (const pair of decl.params.pairs) {
      paramsMap[pair.key] = expressionToString(pair.value)
    }
  }
  return {
    name: decl.name,
    implements: resolveImplementsRef(decl),
    isAbstract: true,
    props: [],
    probes: [],
    execution: [],
    params: paramsMap,
  } as OxnAssemblyPart & { params: Record<string, unknown> }
}

function convertStage(decl: StageDeclaration): OxnAssemblyStage {
  return {
    name: decl.name,
    run: decl.run ? executionRefToString(decl.run) : '',
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
    abstractParts: (decl.abstractParts || []).map(convertAbstractPartInBlueprint),
    concreteParts: [],  // Blueprint 中不直接声明具象 Part
    stages: (decl.stages || []).map(convertStage),
    expectations: (decl.expectations || []).map(convertExpectation),
    rules: (decl.rules || []).map(convertRule),
  }
}

// ========================
// Task 转换
// ========================

export function convertTaskDeclaration(decl: TaskDeclaration): OxnAssemblyTaskIR {
  const partBindings: Record<string, string> = {}
  const propBindings: Record<string, unknown> = {}

  for (const entry of decl.bindings || []) {
    if (entry.$type === 'PartBinding') {
      const pb = entry as { name: string; ref: string }
      partBindings[pb.name] = pb.ref
    } else if (entry.$type === 'PropBinding') {
      const pb = entry as { prop: string; value: Expression }
      propBindings[pb.prop] = expressionToValue(pb.value)
    }
  }

  return {
    name: decl.name,
    use: decl.use || '',
    binding: { partBindings, propBindings },
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
    case 'InterfaceDeclaration':
      return { type: 'interface', data: convertInterfaceDeclaration(entity as InterfaceDeclaration) }
    case 'PartDeclaration':
      return { type: 'part', data: convertPartDeclaration(entity as PartDeclaration) }
    case 'AbstractPartDeclaration':
      return { type: 'part', data: convertAbstractPartDeclaration(entity as AbstractPartDeclaration) }
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

/**
 * 将解析后的 OXNDocument AST 转换为 OxnAssemblyBundle
 *
 * @param document - Langium 解析后的文档 AST
 * @returns 包含所有实体的 Assembly Bundle
 */
export function generateOxnAssembly(document: OXNDocument): OxnAssemblyBundle {
  const entities: OxnAssemblyBundleEntity[] = []

  for (const entity of document.entities || []) {
    entities.push(convertTopLevelEntity(entity))
  }

  return { entities }
}

/**
 * 从文档中提取所有 Blueprint IR
 */
export function extractBlueprints(document: OXNDocument): OxnAssemblyIR[] {
  const blueprints: OxnAssemblyIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'BlueprintDeclaration') {
      blueprints.push(convertBlueprintDeclaration(entity as BlueprintDeclaration))
    }
  }
  return blueprints
}

/**
 * 从文档中提取所有 Task IR
 */
export function extractTasks(document: OXNDocument): OxnAssemblyTaskIR[] {
  const tasks: OxnAssemblyTaskIR[] = []
  for (const entity of document.entities || []) {
    if (entity.$type === 'TaskDeclaration') {
      tasks.push(convertTaskDeclaration(entity as TaskDeclaration))
    }
  }
  return tasks
}

/**
 * 按类型分类文档中的所有实体
 */
export interface CategorizedEntities {
  probes: OxnAssemblyProbe[]
  interfaces: OxnAssemblyInterface[]
  parts: OxnAssemblyPart[]
  blueprints: OxnAssemblyIR[]
  tasks: OxnAssemblyTaskIR[]
}

export function categorizeEntities(document: OXNDocument): CategorizedEntities {
  const result: CategorizedEntities = {
    probes: [],
    interfaces: [],
    parts: [],
    blueprints: [],
    tasks: [],
  }

  for (const entity of document.entities || []) {
    switch (entity.$type) {
      case 'ProbeDeclaration':
        result.probes.push(convertProbeDeclaration(entity as ProbeDeclaration))
        break
      case 'InterfaceDeclaration':
        result.interfaces.push(convertInterfaceDeclaration(entity as InterfaceDeclaration))
        break
      case 'PartDeclaration':
        result.parts.push(convertPartDeclaration(entity as PartDeclaration))
        break
      case 'AbstractPartDeclaration':
        result.parts.push(convertAbstractPartDeclaration(entity as AbstractPartDeclaration))
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
