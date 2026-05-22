import { describe, test, expect } from 'bun:test'
import {
  OxnAssemblyPropSchema,
  OxnAssemblyPartSchema,
  OxnAssemblyIRSchema,
  OxnAssemblyTaskIRSchema,
  OxnAssemblyBundleSchema,
  OxnAssemblyInterfaceSchema,
  OxnAssemblyExpectationSchema,
  OxnAssemblyRuleSchema,
  OxnAssemblyStageSchema,
  OxnAssemblyProbeSchema,
  OxnTypeReferenceSchema,
  createOxnAssemblyIR,
  createAbstractPart,
  createConcretePart,
  validateOxnAssemblyIR,
  type OxnAssemblyIR,
} from '../../kernel/schemas/oxn-assembly.schema'

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

describe('OxnAssemblyPart — isAbstract 防御性标记', () => {
  test('具象零件 (isAbstract=false) 含 execution', () => {
    const part = OxnAssemblyPartSchema.parse({
      name: 'jest-runner',
      implements: 'test-runner',
      isAbstract: false,
      execution: ['probe.run_tests'],
    })
    expect(part.isAbstract).toBe(false)
    expect(part.execution).toEqual(['probe.run_tests'])
  })

  test('抽象零件 (isAbstract=true) 含 execution 被 schema 拒绝', () => {
    expect(() =>
      OxnAssemblyPartSchema.parse({
        name: 'tester',
        implements: 'test-runner',
        isAbstract: true,
        execution: ['probe.run_tests'], // 违规
      }),
    ).toThrow('抽象零件')
  })

  test('抽象零件 (isAbstract=true) 不含 execution 通过', () => {
    const part = OxnAssemblyPartSchema.parse({
      name: 'tester',
      implements: 'test-runner',
      isAbstract: true,
      execution: [],
    })
    expect(part.isAbstract).toBe(true)
    expect(part.execution).toEqual([])
  })
})

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
    ir.abstractParts.push(createAbstractPart({ name: 'tester', implements: 'test-runner' }))
    ir.concreteParts.push(
      createConcretePart({
        name: 'jest-runner',
        implements: 'test-runner',
        execution: ['probe.run_tests'],
      }),
    )
    ir.stages.push({
      name: 'unit_test',
      run: 'part.tester.run',
      deps: [],
    })

    expect(() => validateOxnAssemblyIR(ir)).not.toThrow()
    expect(ir.abstractParts[0].isAbstract).toBe(true)
    expect(ir.concreteParts[0].isAbstract).toBe(false)
  })

  test('抽象零件放入 concreteParts 被 IR 级拒绝', () => {
    const ir = makeBlueprint()
    ir.concreteParts.push({
      name: 'tester',
      implements: 'test-runner',
      isAbstract: true,
      props: [],
      probes: [],
      execution: [],
    })

    expect(() => validateOxnAssemblyIR(ir)).toThrow()
  })

  test('具象零件放入 abstractParts 被 IR 级拒绝', () => {
    const ir = makeBlueprint()
    ir.abstractParts.push({
      name: 'jest-runner',
      implements: 'test-runner',
      isAbstract: false,
      props: [],
      probes: [],
      execution: [],
    })

    expect(() => validateOxnAssemblyIR(ir)).toThrow()
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
  test('合法 Task binding', () => {
    const task = OxnAssemblyTaskIRSchema.parse({
      name: 'validate-feature-auth',
      use: '@prj/blueprint/feature-pipeline',
      binding: {
        partBindings: { tester: '@glo/part/jest-runner' },
        propBindings: { env: 'prod', coverage: 90 },
      },
    })
    expect(task.name).toBe('validate-feature-auth')
    expect(task.use).toBe('@prj/blueprint/feature-pipeline')
    expect(task.binding.partBindings.tester).toBe('@glo/part/jest-runner')
    expect(task.binding.propBindings.env).toBe('prod')
  })
})

// ========================
// Assembly Interface 测试
// ========================

describe('OxnAssemblyInterface', () => {
  test('完整 interface 包含 method input/output', () => {
    const iface = OxnAssemblyInterfaceSchema.parse({
      name: 'test-runner',
      methods: [
        {
          name: 'run',
          input: { env: 'string', coverage: 'number' },
          output: { passed: 'boolean' },
        },
      ],
    })
    expect(iface.methods).toHaveLength(1)
    expect(iface.methods[0].input?.env).toBe('string')
  })
})

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

describe('OxnAssemblyStage', () => {
  test('Stage 引用零件方法', () => {
    const stage = OxnAssemblyStageSchema.parse({
      name: 'unit_test',
      run: 'part.tester.run',
      deps: ['prepare-env'],
    })
    expect(stage.run).toBe('part.tester.run')
    expect(stage.deps).toEqual(['prepare-env'])
  })
})

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
            implements: 'test-runner',
            isAbstract: false,
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

  test('Bundle 支持 Task 实体', () => {
    const bundle = OxnAssemblyBundleSchema.parse({
      entities: [
        {
          type: 'task',
          data: {
            name: 'deploy-prod',
            use: '@prj/blueprint/deploy',
            binding: {
              partBindings: { worker: '@glo/part/k8s-worker' },
              propBindings: { env: 'prod' },
            },
          },
        },
      ],
    })
    expect(bundle.entities[0].data.use).toBe('@prj/blueprint/deploy')
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
  test('isAbstract 缺失时 schema 拒绝', () => {
    expect(() =>
      OxnAssemblyPartSchema.parse({
        name: 'bad-part',
        execution: [],
      }),
    ).toThrow()
  })

  test('空名称被拒绝', () => {
    expect(() =>
      OxnAssemblyPartSchema.parse({
        name: '',
        isAbstract: false,
        execution: [],
      }),
    ).toThrow()
  })
})
