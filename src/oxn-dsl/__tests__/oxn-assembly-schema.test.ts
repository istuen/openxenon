import { describe, expect, test } from 'bun:test'
import {
  createOxnAssemblyIR,
  OxnAssemblyBundleSchema,
  OxnAssemblyExpectationSchema,
  type OxnAssemblyIR,
  OxnAssemblyPartSchema,
  OxnAssemblyProbeSchema,
  OxnAssemblyPropSchema,
  OxnAssemblyRuleSchema,
  OxnAssemblyTaskIRSchema,
  OxnTypeReferenceSchema,
  validateOxnAssemblyIR,
} from '../schemas/oxn-assembly.schema'

function _createAbstractPart(params: { name: string; implements?: string }): any {
  return { name: params.name, description: undefined, props: [], probes: [], execution: [] }
}
function _createConcretePart(params: {
  name: string
  implements?: string
  props?: { name: string; type: string; required?: boolean; default?: unknown }[]
  probes?: { name: string; ref?: string; params?: Record<string, unknown> }[]
  execution?: string[]
}): any {
  return {
    name: params.name,
    description: undefined,
    props: params.props || [],
    probes: params.probes || [],
    execution: params.execution || [],
  }
}

// ========================
// 类型引用测试
// ========================

describe('OxnTypeReference', () => {
  test('合法基本类型: string, number, boolean, any', () => {
    expect(() => OxnTypeReferenceSchema.parse('string')).not.toThrow()
    expect(() => OxnTypeReferenceSchema.parse('number')).not.toThrow()
    expect(() => OxnTypeReferenceSchema.parse('boolean')).not.toThrow()
    expect(() => OxnTypeReferenceSchema.parse('any')).not.toThrow()
  })

  test('合法泛型类型: list<T>, map<T>', () => {
    expect(() => OxnTypeReferenceSchema.parse('list<string>')).not.toThrow()
    expect(() => OxnTypeReferenceSchema.parse('map<number>')).not.toThrow()
    expect(() => OxnTypeReferenceSchema.parse('list<map<string>>')).not.toThrow()
  })

  test('合法枚举类型', () => {
    expect(() => OxnTypeReferenceSchema.parse('enum("dev", "staging", "prod")')).not.toThrow()
  })

  test('非法类型被拒绝', () => {
    expect(() => OxnTypeReferenceSchema.parse('')).toThrow()
    expect(() => OxnTypeReferenceSchema.parse('object')).toThrow()
    expect(() => OxnTypeReferenceSchema.parse('void')).toThrow()
  })
})

// ========================
// Assembly Prop 测试
// ========================

describe('OxnAssemblyProp', () => {
  test('required prop 不带 default', () => {
    const prop = OxnAssemblyPropSchema.parse({
      name: 'path',
      type: 'string',
      required: true,
    })
    expect(prop.name).toBe('path')
    expect(prop.required).toBe(true)
    expect(prop.default).toBeUndefined()
  })

  test('optional prop 带 default', () => {
    const prop = OxnAssemblyPropSchema.parse({
      name: 'timeout',
      type: 'number',
      required: false,
      default: 60000,
    })
    expect(prop.name).toBe('timeout')
    expect(prop.required).toBe(false)
    expect(prop.default).toBe(60000)
  })
})

// ========================
// Assembly Part 测试
// ========================

// OxnAssemblyPart isAbstract — removed in v3.0 (Slot paradigm has no abstract/concrete distinction)

// ========================
// Assembly IR 测试
// ========================

describe('OxnAssemblyIR', () => {
  function makeBlueprint(): OxnAssemblyIR {
    return createOxnAssemblyIR({
      id: 'feature-pipeline',
      name: 'feature-pipeline',
    })
  }

  test('合法 Blueprint IR 通过校验', () => {
    const ir = makeBlueprint()
    ir.slots.push({ name: 'tester', deps: [] })
    ir.blueprintParts.push({ name: 'jest-runner', props: [], probes: [], execution: ['run_tests'] })

    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
  })

  test('空 Blueprint IR 通过校验', () => {
    const ir = makeBlueprint()
    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
  })

  test('IR 包含完整的 expectation 和 rule', () => {
    const ir = makeBlueprint()
    ir.expectations.push({
      name: 'must_use_zod',
      probeRef: '@oxn/probe/ts-uses-import',
      params: { file_pattern: 'src/api/**/*.ts' },
      errMsg: '必须使用 Zod',
    })
    ir.rules.push({
      name: 'prod_requires_ha',
      condition: 'prop.env != "prod" || prop.ha_enabled == true',
      errMsg: '生产环境必须开启 HA',
    })

    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
    expect(ir.expectations).toHaveLength(1)
    expect(ir.rules).toHaveLength(1)
  })

  test('IR 空骨架结构有效', () => {
    const ir = makeBlueprint()
    expect(ir.id).toBe('feature-pipeline')
    expect(ir._version).toBe(1)
    expect(ir.assembly_at).toBeTruthy()
    expect(ir.abstractParts).toEqual([])
    expect(ir.concreteParts).toEqual([])
    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
  })
})

// ========================
// Assembly Task IR 测试
// ========================

describe('OxnAssemblyTaskIR', () => {
  test('合法 Task slot binding', () => {
    const task = OxnAssemblyTaskIRSchema.parse({
      name: 'validate-feature-auth',
      use: '@prj/blueprints/feature-pipeline',
      slotBindings: [{ slot: 'tester', ref: '@glo/parts/jest-runner', props: { env: 'prod' } }],
    })
    expect(task.name).toBe('validate-feature-auth')
    expect(task.use).toBe('@prj/blueprints/feature-pipeline')
    expect(task.slotBindings).toHaveLength(1)
    expect(task.slotBindings[0].slot).toBe('tester')
  })
})

// ========================
// Assembly Interface 测试
// ========================

// OxnAssemblyInterface — removed in v3.0
// OxnAssemblyStage — removed in v3.1

// ========================
// Assembly Probe 测试
// ========================

describe('OxnAssemblyProbe', () => {
  test('完整 probe 定义', () => {
    const probe = OxnAssemblyProbeSchema.parse({
      name: 'fs-exists',
      description: '验证文件是否存在',
      props: [
        { name: 'path', type: 'string', required: true },
        { name: 'recursive', type: 'boolean', default: false },
      ],
      output: { exists: 'boolean' },
    })
    expect(probe.props).toHaveLength(2)
    expect(probe.output?.exists).toBe('boolean')
  })
})

// ========================
// Assembly Stage 测试
// ========================

// ========================
// Assembly Expectation 测试
// ========================

describe('OxnAssemblyExpectation', () => {
  test('Expectation 含 probe ref 和 params', () => {
    const exp = OxnAssemblyExpectationSchema.parse({
      name: 'must_use_zod',
      probeRef: '@oxn/probe/ts-uses-import',
      params: { file_pattern: 'src/api/**/*.ts' },
      errMsg: 'API 层必须使用 Zod',
    })
    expect(exp.probeRef).toContain('@oxn')
    expect(exp.params.file_pattern).toBe('src/api/**/*.ts')
  })
})

// ========================
// Assembly Rule 测试
// ========================

describe('OxnAssemblyRule', () => {
  test('Rule 含条件表达式', () => {
    const rule = OxnAssemblyRuleSchema.parse({
      name: 'prod_requires_ha',
      condition: 'prop.env != "prod" || prop.ha_enabled == true',
      errMsg: '生产环境必须开启 HA',
    })
    expect(rule.condition).toContain('prop.env')
  })
})

// ========================
// Assembly Bundle 测试
// ========================

describe('OxnAssemblyBundle', () => {
  test('Bundle 包含多种实体类型', () => {
    const bundle = OxnAssemblyBundleSchema.parse({
      entities: [
        {
          type: 'probe',
          data: {
            name: 'fs-exists',
            props: [{ name: 'path', type: 'string', required: true }],
          },
        },
        {
          type: 'part',
          data: {
            name: 'jest-runner',
            execution: ['probe.run_tests'],
          },
        },
        {
          type: 'blueprint',
          data: createOxnAssemblyIR({ id: 'ci-pipeline', name: 'ci-pipeline' }),
        },
      ],
    })
    expect(bundle.entities).toHaveLength(3)
    expect(bundle.entities[0].type).toBe('probe')
    expect(bundle.entities[1].type).toBe('part')
    expect(bundle.entities[2].type).toBe('blueprint')
  })

  test('Bundle 支持 Task 实体 (v0.1)', () => {
    const bundle = OxnAssemblyBundleSchema.parse({
      entities: [
        {
          type: 'task',
          data: {
            name: 'deploy-prod',
            blueprint: 'deploy',
            injects: [{ domain: 'MemberContext' }],
            slots: [{ name: 'worker', deps: [], observe: [] }],
          },
        },
      ],
    })
    expect(bundle.entities[0].type).toBe('task')
    expect((bundle.entities[0].data as { blueprint: string }).blueprint).toBe('deploy')
  })
})

// ========================
// 与 Mock Pipeline 的互操作性验证
// ========================

describe('与 Mock Pipeline (Task 1.2) 互操作', () => {
  test('Mock 数据结构可通过 OxnAssemblyIRSchema 校验', () => {
    // 模拟 Task 1.2 mock pipeline 产出的 IR
    const ir: OxnAssemblyIR = {
      id: 'feature-pipeline-blueprint',
      name: 'feature-pipeline-blueprint',
      _version: 1,
      assembly_at: new Date().toISOString(),
      props: [
        { name: 'env', type: 'enum("dev", "staging", "prod")', required: false, default: 'dev' },
        { name: 'coverage', type: 'number', required: false, default: 80 },
      ],
      abstractParts: [
        {
          name: 'tester',
          implements: 'test-runner-interface',
          isAbstract: true,
          props: [],
          probes: [],
          execution: [],
        },
      ],
      concreteParts: [
        {
          name: 'jest-runner-part',
          implements: 'test-runner-interface',
          isAbstract: false,
          props: [
            { name: 'target_env', type: 'string', required: false, default: 'dev' },
            { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
          ],
          probes: [
            {
              name: 'run_tests',
              ref: '@oxn/probe/shell-exec',
              params: {
                command: 'npm test -- --coverage=${prop.coverage_threshold}',
                timeout: 60000,
              },
            },
          ],
          execution: ['probe.run_tests'],
        },
      ],
      stages: [{ name: 'unit_test', run: 'part.tester.run', deps: [] }],
      expectations: [
        {
          name: 'must_use_zod',
          probeRef: '@oxn/probe/ts-uses-import',
          params: { file_pattern: 'src/api/**/*.ts' },
          errMsg: '必须使用 Zod',
        },
      ],
      rules: [
        {
          name: 'prod_requires_ha',
          condition: 'prop.env != "prod" || prop.ha_enabled == true',
          errMsg: '生产环境需开启 HA',
        },
      ],
    }

    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
  })
})

// ========================
// Edge Cases
// ========================

describe('Edge Cases', () => {
  test('空名称被拒绝', () => {
    expect(() =>
      OxnAssemblyPartSchema.parse({
        name: '',
        execution: [],
      }),
    ).toThrow()
  })
})
