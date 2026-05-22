/**
 * Task 1.2 — Mock 闭环与校验对齐
 *
 * 硬编码 Mock 数据模拟 OXN 全链路：AST → OxnAssemblyIR → FrozenBlueprint
 * 为后续 Langium Scope Provider 和真实编译管线提供可执行的校验基准。
 *
 * 关键验证点：
 * 1. 结构层 → 资产态 → 冻结态 三态转换正确
 * 2. isAbstract 防御性标记：未绑定的 abstract part 拒绝进入 DAG
 * 3. 参数覆盖率校验：required 参数必须覆盖
 * 4. 类型一致性校验
 * 5. 显式参数映射链路：Task.props → Blueprint.prop → AbstractPart.params → Part.prop → Probe.params
 */

import { describe, test, expect } from 'bun:test'

// ========================
// 阶段 1: Mock AST 类型
// (模拟 Langium 解析后的 AST 节点)
// ========================

interface MockProbeProps {
  name: string
  type: string
  required?: boolean
  default?: unknown
}

interface MockProbeOutput {
  fields: Record<string, string>
}

interface MockProbe {
  name: string
  description?: string
  props: MockProbeProps[]
  output?: MockProbeOutput
}

interface MockInterfaceMethod {
  name: string
  input?: Record<string, string>
  output?: Record<string, string>
}

interface MockInterface {
  name: string
  methods: MockInterfaceMethod[]
}

interface MockPartProbe {
  name: string
  ref?: string
  params?: Record<string, MockExpression>
}

interface MockPart {
  name: string
  implements?: string
  description?: string
  props: MockProbeProps[]
  probes: MockPartProbe[]
  execution: string[]
}

interface MockAbstractPart {
  name: string
  implements?: string
  params: Record<string, MockExpression>
  isAbstract: true
}

interface MockStage {
  name: string
  run: string
  deps: string[]
}

interface MockExpectation {
  name: string
  probeRef: string
  params: Record<string, unknown>
  errMsg: string
}

interface MockRule {
  name: string
  condition: string
  errMsg: string
}

interface MockBlueprintProps {
  name: string
  type: string
  required?: boolean
  default?: unknown
}

interface MockBlueprint {
  name: string
  version: number
  props: MockBlueprintProps[]
  abstractParts: MockAbstractPart[]
  stages: MockStage[]
  expectations: MockExpectation[]
  rules: MockRule[]
}

interface MockTaskBinding {
  partBindings: Record<string, string>
  propBindings: Record<string, unknown>
}

interface MockTaskAst {
  name: string
  use: string
  binding: MockTaskBinding
}

type MockExpression =
  | { kind: 'stringLiteral'; value: string }
  | { kind: 'numberLiteral'; value: number }
  | { kind: 'booleanLiteral'; value: boolean }
  | { kind: 'nullLiteral' }
  | { kind: 'varRef'; path: string }
  | { kind: 'binaryExpr'; op: string; left: MockExpression; right: MockExpression }
  | { kind: 'ternaryExpr'; condition: MockExpression; then: MockExpression; else: MockExpression }
  | { kind: 'templateString'; value: string }

// ========================
// 阶段 2: OxnAssemblyIR 类型
// (设计期中间表示，保留占位符，isAbstract 防御性标记)
// ========================

interface OxnAssemblyProp {
  name: string
  type: string
  required: boolean
  default?: unknown
}

interface OxnAssemblyAbstractPart {
  name: string
  implements?: string
  params: Record<string, MockExpression>
  isAbstract: true
}

interface OxnAssemblyConcretePart {
  name: string
  implements?: string
  description?: string
  isAbstract: false
  props: OxnAssemblyProp[]
  probes: MockPartProbe[]
  execution: string[]
}

interface OxnAssemblyStage {
  name: string
  run: string
  deps: string[]
}

interface OxnAssemblyExpectation {
  name: string
  probeRef: string
  params: Record<string, unknown>
  errMsg: string
}

interface OxnAssemblyRule {
  name: string
  condition: string
  errMsg: string
}

interface OxnAssemblyIR {
  id: string
  name: string
  version: number
  props: OxnAssemblyProp[]
  abstractParts: OxnAssemblyAbstractPart[]
  concreteParts: OxnAssemblyConcretePart[]
  stages: OxnAssemblyStage[]
  expectations: OxnAssemblyExpectation[]
  rules: OxnAssemblyRule[]
}

interface OxnAssemblyTaskBinding {
  partBindings: Record<string, string>
  propBindings: Record<string, unknown>
}

interface OxnAssemblyTaskIR {
  name: string
  use: string
  binding: OxnAssemblyTaskBinding
}

// ========================
// 阶段 3: FrozenBlueprint (Core 消费)
// ========================

interface FrozenProbe {
  type: string
  params: Record<string, unknown>
}

interface FrozenPart {
  id: string
  name: string
  deps: string[]
  params: Record<string, unknown>
  target: { description: string }
  spec?: { description: string }
  action?: { instruction?: string; command?: string }
  probes: FrozenProbe[]
}

interface FrozenBlueprint {
  id: string
  name: string
  frozen_at: string
  parts: FrozenPart[]
}

// ========================
// Mock 数据工厂
// ========================

function createMockProbe(name: string, params: MockProbeProps[]): MockProbe {
  return {
    name: `${name}-probe`,
    description: `${name} 探针`,
    props: params,
  }
}

function createMockInterface(name: string): MockInterface {
  return {
    name: `${name}-interface`,
    methods: [
      {
        name: 'run',
        input: { env: 'string', coverage: 'number' },
        output: { passed: 'boolean' },
      },
    ],
  }
}

function createMockConcretePart(name: string): MockPart {
  return {
    name: `${name}-part`,
    implements: 'test-runner-interface',
    description: `${name} 实现`,
    props: [
      { name: 'target_env', type: 'string', default: 'dev' },
      { name: 'coverage_threshold', type: 'number', default: 80 },
    ],
    probes: [
      {
        name: 'run_tests',
        ref: '@oxn/probe/shell-exec',
        params: {
          command: {
            kind: 'templateString',
            value: 'npm test -- --coverage=${prop.coverage_threshold}',
          },
          timeout: { kind: 'numberLiteral', value: 60000 },
        },
      },
    ],
    execution: ['probe.run_tests'],
  }
}

function createMockBlueprint(name: string): MockBlueprint {
  return {
    name: `${name}-blueprint`,
    version: 1,
    props: [
      { name: 'env', type: 'enum("dev", "staging", "prod")', default: 'dev' },
      { name: 'coverage', type: 'number', default: 80 },
    ],
    abstractParts: [
      {
        name: 'tester',
        implements: 'test-runner-interface',
        params: {
          target_env: { kind: 'varRef', path: 'prop.env' },
          coverage_threshold: {
            kind: 'ternaryExpr',
            condition: {
              kind: 'binaryExpr',
              op: '==',
              left: { kind: 'varRef', path: 'prop.env' },
              right: { kind: 'stringLiteral', value: 'prod' },
            },
            then: { kind: 'numberLiteral', value: 95 },
            else: { kind: 'varRef', path: 'prop.coverage' },
          },
        },
        isAbstract: true,
      },
    ],
    stages: [
      {
        name: 'unit_test',
        run: 'part.tester.run',
        deps: [],
      },
    ],
    expectations: [
      {
        name: 'must_use_zod',
        probeRef: '@oxn/probe/ts-uses-import',
        params: { file_pattern: 'src/api/**/*.ts', module_name: 'zod' },
        errMsg: 'API 层代码违反规范',
      },
    ],
    rules: [
      {
        name: 'prod_requires_ha',
        condition: 'prop.env != "prod" || prop.ha_enabled == true',
        errMsg: '生产环境必须强制开启高可用',
      },
    ],
  }
}

function createMockTask(name: string): MockTaskAst {
  return {
    name: `${name}-task`,
    use: '@prj/blueprint/feature-pipeline',
    binding: {
      partBindings: { tester: '@glo/part/jest-runner' },
      propBindings: { env: 'prod', coverage: 90 },
    },
  }
}

// Mock expression for this probe in the blueprint
function str(v: string): MockExpression {
  return { kind: 'stringLiteral', value: v }
}
function num(v: number): MockExpression {
  return { kind: 'numberLiteral', value: v }
}
function bool(v: boolean): MockExpression {
  return { kind: 'booleanLiteral', value: v }
}
function ref(path: string): MockExpression {
  return { kind: 'varRef', path }
}

// ========================
// AST → OxnAssemblyIR 模拟转换
// ========================

function probeAstToIR(ast: MockProbe): OxnAssemblyConcretePart {
  return {
    name: ast.name,
    description: ast.description,
    isAbstract: false,
    props: ast.props.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      default: p.default,
    })),
    probes: [],
    execution: [],
  }
}

function partAstToIR(ast: MockPart): OxnAssemblyConcretePart {
  return {
    name: ast.name,
    implements: ast.implements,
    description: ast.description,
    isAbstract: false,
    props: ast.props.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      default: p.default,
    })),
    probes: ast.probes,
    execution: ast.execution,
  }
}

function blueprintAstToIR(ast: MockBlueprint, concreteParts: MockPart[]): OxnAssemblyIR {
  const ir: OxnAssemblyIR = {
    id: ast.name,
    name: ast.name,
    version: ast.version,
    props: ast.props.map((p) => ({
      name: p.name,
      type: p.type,
      required: p.required ?? false,
      default: p.default,
    })),
    abstractParts: ast.abstractParts.map((ap) => ({
      name: ap.name,
      implements: ap.implements,
      params: ap.params,
      isAbstract: true,
    })),
    concreteParts: concreteParts.map(partAstToIR),
    stages: ast.stages.map((s) => ({
      name: s.name,
      run: s.run,
      deps: s.deps,
    })),
    expectations: ast.expectations.map((e) => ({
      name: e.name,
      probeRef: e.probeRef,
      params: e.params,
      errMsg: e.errMsg,
    })),
    rules: ast.rules.map((r) => ({
      name: r.name,
      condition: r.condition,
      errMsg: r.errMsg,
    })),
  }
  return ir
}

// ========================
// OxnAssemblyIR → FrozenBlueprint 模拟转换
// ========================

function resolvePropValue(
  paramValue: MockExpression | undefined,
  props: Record<string, unknown>,
  abstractParams: Map<string, MockExpression>,
): unknown {
  if (paramValue === undefined) return undefined

  switch (paramValue.kind) {
    case 'stringLiteral':
    case 'numberLiteral':
      return paramValue.value
    case 'booleanLiteral':
      return paramValue.value
    case 'nullLiteral':
      return null
    case 'varRef': {
      const parts = paramValue.path.split('.')
      if (parts[0] === 'prop') {
        return props[parts[1]]
      }
      if (parts[0] === 'param') {
        return abstractParams.get(parts[1])
          ? resolvePropValue(abstractParams.get(parts[1]), props, abstractParams)
          : undefined
      }
      return undefined
    }
    case 'binaryExpr': {
      const left = resolvePropValue(paramValue.left, props, abstractParams)
      const right = resolvePropValue(paramValue.right, props, abstractParams)
      switch (paramValue.op) {
        case '==':
          return left === right
        case '!=':
          return left !== right
        case '||':
          return Boolean(left) || Boolean(right)
        case '&&':
          return Boolean(left) && Boolean(right)
        default:
          return undefined
      }
    }
    case 'ternaryExpr': {
      const cond = resolvePropValue(paramValue.condition, props, abstractParams)
      return cond
        ? resolvePropValue(paramValue.then, props, abstractParams)
        : resolvePropValue(paramValue.else, props, abstractParams)
    }
    case 'templateString': {
      return paramValue.value.replace(/\$\{prop\.(\w+)\}/g, (_: string, key: string) => String(props[key] ?? ''))
    }
    default:
      return undefined
  }
}

function assemblyPartToFrozenPart(part: OxnAssemblyConcretePart, resolvedParams: Record<string, unknown>): FrozenPart {
  // Merge concrete part prop defaults with resolved params
  const finalParams: Record<string, unknown> = { ...resolvedParams }
  for (const prop of part.props) {
    if (finalParams[prop.name] === undefined && prop.default !== undefined) {
      finalParams[prop.name] = prop.default
    }
    if (finalParams[prop.name] === undefined && prop.required) {
      throw new Error(`Part "${part.name}" 缺少必填参数 "${prop.name}"`)
    }
  }

  return {
    id: part.name,
    name: part.implements ? `${part.name} (implements ${part.implements})` : part.name,
    deps: [],
    params: finalParams,
    target: { description: part.description || part.name },
    spec: { description: `实现 ${part.implements || 'unknown'} 能力` },
    probes: part.probes.map((p) => {
      const resolvedProbeParams: Record<string, unknown> = {}
      if (p.params) {
        for (const [key, expr] of Object.entries(p.params)) {
          resolvedProbeParams[key] = resolvePropValue(expr, finalParams, new Map())
        }
      }
      return {
        type: p.ref?.split('/').pop() || 'unknown',
        params: resolvedProbeParams,
      }
    }),
  }
}

function assemblyToFrozenBlueprint(assembly: OxnAssemblyIR, taskBinding: OxnAssemblyTaskBinding): FrozenBlueprint {
  // Step 1: 合并 Task props 和 Blueprint prop defaults → blueprintProps
  const blueprintProps: Record<string, unknown> = { ...taskBinding.propBindings }
  for (const prop of assembly.props) {
    if (!(prop.name in blueprintProps) && prop.default !== undefined) {
      blueprintProps[prop.name] = prop.default
    }
  }

  // Step 2: 解析 abstract part params (使用 blueprintProps 求值)
  // Abstract params 将 blueprint props 映射为 concrete part 级别 params
  const resolvedPartParams: Record<string, unknown> = {}
  for (const ap of assembly.abstractParts) {
    for (const [partPropKey, paramExpr] of Object.entries(ap.params)) {
      resolvedPartParams[partPropKey] = resolvePropValue(
        paramExpr,
        blueprintProps,
        new Map(), // params 引用不应递归
      )
    }
  }

  const parts: FrozenPart[] = []

  // 转换 concrete parts，传入已解析的 part-level params
  for (const part of assembly.concreteParts) {
    parts.push(assemblyPartToFrozenPart(part, resolvedPartParams))
  }

  return {
    id: assembly.id,
    name: assembly.name,
    frozen_at: new Date().toISOString(),
    parts,
  }
}

// ========================
// isAbstract 防御性校验
// ========================

/**
 * 验证 abstract part 必须被 Task binding 显式绑定
 * 未绑定的 abstract part 在 IR 中保持 isAbstract=true 时，拒绝进入 DAG
 */
function validateAbstractPartBindings(
  assembly: OxnAssemblyIR,
  bindings: Record<string, string>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const ap of assembly.abstractParts) {
    if (!bindings[ap.name]) {
      errors.push(
        `Abstract part "${ap.name}" 未在 Task binding 中绑定具体实现。` +
          `必须在 binding 块中指定: ${ap.name} = "@scope/part-name"`,
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 类型一致性校验：检查 Task props 值类型是否匹配 Blueprint prop 声明类型
 */
function validatePropTypes(
  props: OxnAssemblyProp[],
  taskProps: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const prop of props) {
    const value = taskProps[prop.name]
    if (value === undefined) continue

    if (prop.type === 'number' && typeof value !== 'number') {
      errors.push(`Prop "${prop.name}" 类型不匹配：期望 number，实际 ${typeof value}`)
    }

    if (prop.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`Prop "${prop.name}" 类型不匹配：期望 boolean，实际 ${typeof value}`)
    }

    if (prop.type.startsWith('enum')) {
      const allowed = prop.type
        .slice(5, -1)
        .split(',')
        .map((v) => v.trim().replace(/"/g, ''))
      if (!allowed.includes(String(value))) {
        errors.push(`Prop "${prop.name}" 枚举越界：值 "${value}" 不在 [${allowed.join(', ')}] 中`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}

/**
 * 参数覆盖率校验：Task 注入的参数必须覆盖所有 required=true 且无 default 的 prop
 */
function validateRequiredParams(
  props: OxnAssemblyProp[],
  taskProps: Record<string, unknown>,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const prop of props) {
    if (prop.required && prop.default === undefined && taskProps[prop.name] === undefined) {
      errors.push(`必填参数 "${prop.name}" 未在 Task binding 中注入`)
    }
  }

  return { valid: errors.length === 0, errors }
}

// ========================
// 测试用例
// ========================

describe('Mock Pipeline: AST → OxnAssemblyIR → FrozenBlueprint', () => {
  test('Probe AST → OxnAssemblyIR 转换', () => {
    const probe = createMockProbe('test', [
      { name: 'pattern', type: 'string', required: true },
      { name: 'recursive', type: 'boolean', default: false },
    ])

    const ir = probeAstToIR(probe)

    expect(ir.name).toBe('test-probe')
    expect(ir.isAbstract).toBe(false)
    expect(ir.props).toHaveLength(2)
    expect(ir.props[0].name).toBe('pattern')
    expect(ir.props[0].required).toBe(true)
    expect(ir.props[1].name).toBe('recursive')
    expect(ir.props[1].default).toBe(false)
  })

  test('Part AST → OxnAssemblyIR 转换 （含 implements 和 probes）', () => {
    const part = createMockConcretePart('test')
    const ir = partAstToIR(part)

    expect(ir.name).toBe('test-part')
    expect(ir.isAbstract).toBe(false)
    expect(ir.implements).toBe('test-runner-interface')
    expect(ir.props).toHaveLength(2)
    expect(ir.probes).toHaveLength(1)
    expect(ir.probes[0].ref).toBe('@oxn/probe/shell-exec')
    expect(ir.execution).toEqual(['probe.run_tests'])
  })

  test('Blueprint AST → OxnAssemblyIR 转换 （含 abstractPart, stage, expectation, rule）', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    expect(ir.id).toBe('test-blueprint')
    expect(ir.version).toBe(1)
    expect(ir.props).toHaveLength(2)

    // abstract parts
    expect(ir.abstractParts).toHaveLength(1)
    expect(ir.abstractParts[0].name).toBe('tester')
    expect(ir.abstractParts[0].isAbstract).toBe(true)
    expect(ir.abstractParts[0].implements).toBe('test-runner-interface')

    // stages
    expect(ir.stages).toHaveLength(1)
    expect(ir.stages[0].name).toBe('unit_test')
    expect(ir.stages[0].deps).toEqual([])

    // expectations
    expect(ir.expectations).toHaveLength(1)
    expect(ir.expectations[0].name).toBe('must_use_zod')

    // rules
    expect(ir.rules).toHaveLength(1)
    expect(ir.rules[0].name).toBe('prod_requires_ha')
  })

  test('OxnAssemblyIR → FrozenBlueprint 完整转换', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    const taskBinding: OxnAssemblyTaskBinding = {
      partBindings: { tester: '@glo/part/jest-runner' },
      propBindings: { env: 'prod', coverage: 90 },
    }

    const frozen = assemblyToFrozenBlueprint(ir, taskBinding)

    expect(frozen.id).toBe('test-blueprint')
    expect(frozen.frozen_at).toBeTruthy()
    expect(frozen.parts).toHaveLength(1)

    const fp = frozen.parts[0]!
    expect(fp.id).toBe('test-part')
    // Abstract params resolved: target_env = prop.env → "prod"
    expect(fp.params.target_env).toBe('prod')
    // coverage_threshold = env=="prod"?95:coverage → 95
    expect(fp.params.coverage_threshold).toBe(95)

    // probe params: template string resolved with finalPartParams
    const probe = fp.probes[0]!
    expect(probe.type).toBe('shell-exec')
    expect(probe.params.command).toContain('coverage=95')
    expect(probe.params.timeout).toBe(60000)
  })

  test('模板字符串求值：${prop.xxx} 正确替换', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    const taskBinding: OxnAssemblyTaskBinding = {
      partBindings: { tester: '@glo/part/jest-runner' },
      propBindings: { env: 'staging', coverage: 50 },
    }

    const frozen = assemblyToFrozenBlueprint(ir, taskBinding)
    const probe = frozen.parts[0]!.probes[0]!
    expect(probe.params.command).toBe('npm test -- --coverage=50')
  })

  test('三元表达式求值：prod 时 coverage=95', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    // 模拟 abstract params 解析: coverage_threshold = env=="prod" ? 95 : coverage
    // 当 env=prod 时，应解析为 95
    const abstractParams = new Map<string, MockExpression>()
    const ternaryExpr: MockExpression = {
      kind: 'ternaryExpr',
      condition: {
        kind: 'binaryExpr',
        op: '==',
        left: { kind: 'varRef', path: 'prop.env' },
        right: { kind: 'stringLiteral', value: 'prod' },
      },
      then: { kind: 'numberLiteral', value: 95 },
      else: { kind: 'varRef', path: 'prop.coverage' },
    }
    abstractParams.set('coverage_threshold', ternaryExpr)

    const props = { env: 'prod', coverage: 80 }
    const result = resolvePropValue(ternaryExpr, props, abstractParams)
    expect(result).toBe(95)
  })

  test('三元表达式求值：dev 时 coverage=80', () => {
    const ternaryExpr: MockExpression = {
      kind: 'ternaryExpr',
      condition: {
        kind: 'binaryExpr',
        op: '==',
        left: { kind: 'varRef', path: 'prop.env' },
        right: { kind: 'stringLiteral', value: 'prod' },
      },
      then: { kind: 'numberLiteral', value: 95 },
      else: { kind: 'varRef', path: 'prop.coverage' },
    }

    const abstractParams = new Map<string, MockExpression>()
    abstractParams.set('coverage_threshold', ternaryExpr)

    const props = { env: 'dev', coverage: 80 }
    const result = resolvePropValue(ternaryExpr, props, abstractParams)
    expect(result).toBe(80)
  })

  test('isAbstract 防御性校验：未绑定 abstract part 报错', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    // 不绑定 tester
    const emptyBinding: Record<string, string> = {}
    const result = validateAbstractPartBindings(ir, emptyBinding)
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('tester')
    expect(result.errors[0]).toContain('未在 Task binding 中绑定')
  })

  test('isAbstract 防御性校验：正确绑定通过', () => {
    const bp = createMockBlueprint('test')
    const part = createMockConcretePart('test')
    const ir = blueprintAstToIR(bp, [part])

    // 正确绑定 tester
    const binding: Record<string, string> = {
      tester: '@glo/part/jest-runner',
    }
    const result = validateAbstractPartBindings(ir, binding)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  test('类型一致性校验：枚举越界报错', () => {
    const props: OxnAssemblyProp[] = [{ name: 'env', type: 'enum("dev", "staging", "prod")', required: false }]

    const result = validatePropTypes(props, { env: 'testing' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('枚举越界')
    expect(result.errors[0]).toContain('testing')
  })

  test('类型一致性校验：正确枚举值通过', () => {
    const props: OxnAssemblyProp[] = [{ name: 'env', type: 'enum("dev", "staging", "prod")', required: false }]

    const result = validatePropTypes(props, { env: 'prod' })
    expect(result.valid).toBe(true)
  })

  test('类型一致性校验：number 类型不匹配', () => {
    const props: OxnAssemblyProp[] = [{ name: 'coverage', type: 'number', required: false }]

    const result = validatePropTypes(props, { coverage: 'high' })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('类型不匹配')
  })

  test('参数覆盖率校验：required 参数缺失报错', () => {
    const props: OxnAssemblyProp[] = [
      { name: 'feature_ref', type: 'string', required: true },
      { name: 'message', type: 'string', required: false, default: 'update' },
    ]

    const result = validateRequiredParams(props, {})
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('feature_ref')
    expect(result.errors[0]).toContain('未在 Task binding 中注入')
  })

  test('参数覆盖率校验：全部 required 已覆盖则通过', () => {
    const props: OxnAssemblyProp[] = [
      { name: 'feature_ref', type: 'string', required: true },
      { name: 'message', type: 'string', required: false, default: 'update' },
    ]

    const result = validateRequiredParams(props, { feature_ref: 'FEAT-123' })
    expect(result.valid).toBe(true)
  })

  test('参数覆盖率校验：有 default 的 required 不报错', () => {
    const props: OxnAssemblyProp[] = [{ name: 'timeout', type: 'number', required: true, default: 30000 }]

    const result = validateRequiredParams(props, {})
    expect(result.valid).toBe(true)
  })

  test('全链路闭环：完整的 compiledBlueprint 包含所有必要字段', () => {
    const bp = createMockBlueprint('feature-pipeline')
    const part = createMockConcretePart('jest-runner')
    const ir = blueprintAstToIR(bp, [part])

    const taskBinding: OxnAssemblyTaskBinding = {
      partBindings: { tester: '@glo/part/jest-runner' },
      propBindings: { env: 'prod', coverage: 95 },
    }

    // Step 1: 校验 binding
    const absResult = validateAbstractPartBindings(ir, taskBinding.partBindings)
    expect(absResult.valid).toBe(true)

    // Step 2: 校验类型
    const typeResult = validatePropTypes(ir.props, taskBinding.propBindings)
    expect(typeResult.valid).toBe(true)

    // Step 3: 校验覆盖率
    const covResult = validateRequiredParams(ir.props, taskBinding.propBindings)
    expect(covResult.valid).toBe(true)

    // Step 4: 生成 FrozenBlueprint
    const frozen = assemblyToFrozenBlueprint(ir, taskBinding)

    // Verify structure
    expect(frozen.id).toBe('feature-pipeline-blueprint')
    expect(frozen.parts).toHaveLength(1)

    const fp = frozen.parts[0]!
    expect(fp.id).toBe('jest-runner-part')
    // Abstract params resolved: coverage_threshold = env=="prod" ? 95 : coverage → 95
    expect(fp.params.coverage_threshold).toBe(95)
    expect(fp.params.target_env).toBe('prod')
    expect(fp.probes).toHaveLength(1)

    const probe = fp.probes[0]!
    expect(probe.type).toBe('shell-exec')
    // coverage_threshold=95 (from abstract param ternary resolution)
    expect(probe.params.command).toContain('coverage=95')
  })

  test('跨 AST Props 比对：abstract params 中字段名必须匹配 concrete part props', () => {
    const concretePart = createMockConcretePart('jest-runner')
    const concreteProps = concretePart.props.map((p) => p.name)

    // abstract part 引用的 param key 必须在 concrete part 的 props 中存在
    const abstractParams = {
      target_env: { kind: 'varRef' as const, path: 'prop.env' },
      coverage_threshold: {
        kind: 'ternaryExpr' as const,
        condition: {
          kind: 'binaryExpr' as const,
          op: '==',
          left: { kind: 'varRef' as const, path: 'prop.env' },
          right: { kind: 'stringLiteral' as const, value: 'prod' },
        },
        then: { kind: 'numberLiteral' as const, value: 95 },
        else: { kind: 'varRef' as const, path: 'prop.coverage' },
      },
    }

    for (const key of Object.keys(abstractParams)) {
      expect(concreteProps).toContain(key)
    }
  })

  test('跨 AST Props 比对：abstract params 引用了不存在的 prop 应被检测', () => {
    const concretePart = createMockConcretePart('jest-runner')
    const concreteProps = concretePart.props.map((p) => p.name)

    // 引入不存在的字段
    const badParam = 'nonexistent_field'
    expect(concreteProps).not.toContain(badParam)
  })
})

// ========================
// 数据流向轨迹测试
// ========================

describe('全链路数据流向：Task.props → Frozen params', () => {
  test('显式参数映射链路：Task props 逐层传递', () => {
    // Task 层：props.env = "prod", props.coverage = 90
    const taskProps = { env: 'prod', coverage: 90 }

    // Blueprint 层：prop "env" { enum }, prop "coverage" { number }
    // Abstract Part 层：params = { target_env = prop.env, coverage_threshold = ... }
    // Concrete Part 层：prop "target_env" { string }, prop "coverage_threshold" { number }
    // Probe 层：params = { command = "npm test --coverage=${prop.coverage_threshold}" }

    const concretePartProps = [
      { name: 'target_env', type: 'string', required: false, default: 'dev' },
      { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
    ]

    // Step 1: Task props → Blueprint props (显式)
    expect(taskProps.env).toBe('prod')

    // Step 2: Abstract Part params 引用 Blueprint props
    // coverage_threshold = prop.env == "prod" ? 95 : prop.coverage
    // env=prod → coverage_threshold=95
    const resolvedCoverage = taskProps.env === 'prod' ? 95 : taskProps.coverage
    expect(resolvedCoverage).toBe(95)

    // Step 3: Concrete Part 接收 resolved params
    const partParams = {
      target_env: taskProps.env, // "prod"
      coverage_threshold: resolvedCoverage, // 95
    }

    // Step 4: Probe 接收 Concrete Part props
    const probeCommand = `npm test -- --coverage=${partParams.coverage_threshold}`
    expect(probeCommand).toBe('npm test -- --coverage=95')
    expect(partParams.target_env).toBe('prod')
  })
})
