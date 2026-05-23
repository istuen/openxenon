import { describe, test, expect, beforeEach } from 'bun:test'
import {
  OxnKernelAdapter,
  resolveTemplateString,
  adaptConcretePart,
  adaptOxnToFrozen,
  type AdapterResult,
} from '../../oxn-dsl/compiler/oxn-adapter'

import {
  createOxnAssemblyIR,
  validateOxnAssemblyIR,
  type OxnAssemblyIR,
  type OxnAssemblyPart,
  type OxnAssemblySlotBinding,
} from '../../kernel/schemas/oxn-assembly.schema'

import { validateFrozenBlueprint, type FrozenBlueprint } from '../../kernel/schemas/frozen-schema'

function createAbstractPart(params: { name: string; implements?: string; params?: Record<string, unknown> }): OxnAssemblyPart {
  return { name: params.name, description: undefined, props: [], probes: [], execution: [] }
}
function createConcretePart(params: { name: string; props?: OxnAssemblyPart['props']; probes?: OxnAssemblyPart['probes']; execution?: string[] }): OxnAssemblyPart {
  return { name: params.name, description: undefined, props: params.props || [], probes: params.probes || [], execution: params.execution || [] }
}

// ========================
// 表达式求值
// ========================

// resolveAbstractParams — removed in v3.0 (Interface + AbstractPart abolished)
// validateAbstractBindings — removed in v3.0

describe('resolveTemplateString', () => {
  test('单个 prop 替换', () => {
    const result = resolveTemplateString('npm test -- --coverage=${prop.coverage_threshold}', {
      coverage_threshold: 95,
    })
    expect(result).toBe('npm test -- --coverage=95')
  })

  test('多个 prop 替换', () => {
    const result = resolveTemplateString('deploy --env=${prop.target_env} --region=${prop.region}', {
      target_env: 'prod',
      region: 'us-east-1',
    })
    expect(result).toBe('deploy --env=prod --region=us-east-1')
  })

  test('未定义的 prop 保留占位符', () => {
    const result = resolveTemplateString('deploy --env=${prop.unknown}', {})
    expect(result).toBe('deploy --env=${prop.unknown}')
  })
})

// ========================
// isAbstract 防御性校验
// ========================

// ========================
// adaptConcretePart
// ========================

describe('adaptConcretePart', () => {
  test('具象零件转换，参数和探针正确', () => {
    const part = createConcretePart({
      name: 'jest-runner',
      implements: 'test-runner',
      description: 'Jest 测试执行器',
      props: [
        { name: 'target_env', type: 'string', required: false, default: 'dev' },
        { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
      ],
      probes: [
        {
          name: 'run_test',
          ref: '@oxn/probe/shell-exec',
          params: {
            command: 'npm test -- --coverage=${prop.coverage_threshold}',
            timeout: 60000,
          },
        },
      ],
      execution: ['probe.run_test'],
    })

    const resolvedParams = { target_env: 'prod', coverage_threshold: 95 }
    const frozenPart = adaptConcretePart(part, resolvedParams)

    expect(frozenPart.id).toBe('jest-runner')
    expect(frozenPart.params.target_env).toBe('prod')
    expect(frozenPart.params.coverage_threshold).toBe(95)
    expect(frozenPart.probes).toHaveLength(1)
    expect(frozenPart.probes[0].type).toBe('shell_exec')
    expect(frozenPart.probes[0].params.command).toContain('coverage=95')
    expect(frozenPart.probes[0].params.timeout).toBe(60000)
  })

  test('使用 prop 默认值填充未传入的参数', () => {
    const part = createConcretePart({
      name: 'test-part',
      props: [{ name: 'timeout', type: 'number', required: false, default: 30000 }],
    })

    const frozenPart = adaptConcretePart(part, {})
    expect(frozenPart.params.timeout).toBe(30000)
  })

  test('required 参数缺失抛异常', () => {
    const part = createConcretePart({
      name: 'test-part',
      props: [{ name: 'api_key', type: 'string', required: true }],
    })

    expect(() => adaptConcretePart(part, {})).toThrow('api_key')
  })
})

// ========================
// 主适配器集成测试
// ========================

describe('OxnKernelAdapter', () => {
  let adapter: OxnKernelAdapter

  function makeFeaturePipeline(): { ir: OxnAssemblyIR; slotBindings: OxnAssemblySlotBinding[] } {
    const ir = createOxnAssemblyIR({ id: 'feature-pipeline', name: 'feature-pipeline' })
    ir.props = [
      { name: 'env', type: 'enum("dev", "staging", "prod")', required: false, default: 'dev' },
      { name: 'coverage', type: 'number', required: false, default: 80 },
    ]

    ir.concreteParts.push(
      createConcretePart({
        name: 'jest-runner',
        description: 'Jest 测试',
        props: [
          { name: 'target_env', type: 'string', required: false, default: 'dev' },
          { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
        ],
        probes: [{
          name: 'run_test',
          ref: '@oxn/probes/exec-exit-zero',
          params: { command: 'npm test -- --coverage=${prop.coverage_threshold}', timeout: 60000 },
        }],
        execution: ['run_test'],
      }),
    )

    ir.slots = [{ name: 'tester', deps: [] }]
    ir.expectations = []
    ir.rules = []

    const slotBindings: OxnAssemblySlotBinding[] = [
      { slot: 'tester', ref: '@glo/parts/jest-runner', props: { target_env: 'prod', coverage_threshold: 90 } }
    ]

    return { ir, slotBindings }
  }

  beforeEach(() => {
    adapter = new OxnKernelAdapter()
  })

  test('完整适配流程：OxnAssemblyIR → FrozenBlueprint', () => {
    const { ir, slotBindings } = makeFeaturePipeline()
    const result = adapter.adapt(ir, slotBindings)

    expect(result.warnings).toHaveLength(0)

    const frozen = result.frozen
    expect(frozen.id).toBe('feature-pipeline')
    expect(frozen.frozen_at).toBeTruthy()

    expect(() => validateFrozenBlueprint(frozen)).not.toThrow()
  })

  test('FrozenPart 参数正确', () => {
    const ir = createOxnAssemblyIR({ id: 'test', name: 'test' })
    ir.slots = [{ name: 'tester', deps: [] }]
    ir.concreteParts.push(
      createConcretePart({
        name: 'jest-runner',
        props: [
          { name: 'target_env', type: 'string' },
          { name: 'coverage_threshold', type: 'number', default: 80 },
        ],
      }),
    )

    const slotBindings: OxnAssemblySlotBinding[] = [
      { slot: 'tester', ref: '@glo/parts/jest-runner', props: { target_env: 'prod' } }
    ]

    const result = adapter.adapt(ir, slotBindings)
    const part = result.frozen.parts[0]!
    expect(part.params.coverage_threshold).toBe(80)
  })

  test('adaptStrict 在有 warnings 时抛异常', () => {
    const ir = createOxnAssemblyIR({ id: 'test', name: 'test' })
    // No slots or deps → DAG has no entry nodes
    expect(() => adapter.adaptStrict(ir, [])).toThrow()
  })

  test('FrozenBlueprint 通过终态 schema 校验', () => {
    const { ir, slotBindings } = makeFeaturePipeline()
    const frozen = adapter.adaptStrict(ir, slotBindings)

    expect(() => validateFrozenBlueprint(frozen)).not.toThrow()
  })

  test('便捷函数 adaptOxnToFrozen', () => {
    const { ir, slotBindings } = makeFeaturePipeline()
    const result: AdapterResult = adaptOxnToFrozen(ir, slotBindings)
    expect(result.warnings).toHaveLength(0)
    expect(() => validateFrozenBlueprint(result.frozen)).not.toThrow()
  })

  test('多 concrete parts 生成多个 FrozenPart', () => {
    const ir = createOxnAssemblyIR({ id: 'multi', name: 'multi' })
    ir.concreteParts.push(createConcretePart({ name: 'build', execution: ['build'] }))
    ir.concreteParts.push(createConcretePart({ name: 'test', execution: ['test'] }))
    ir.concreteParts.push(createConcretePart({ name: 'deploy', execution: ['deploy'] }))
    ir.slots = [
      { name: 'build', deps: [] },
      { name: 'test', deps: ['build'] },
      { name: 'deploy', deps: ['test'] },
    ]

    const slotBindings: OxnAssemblySlotBinding[] = []
    const frozen = adapter.adaptStrict(ir, slotBindings)
    expect(frozen.parts.length).toBeGreaterThanOrEqual(3)
  })
})
