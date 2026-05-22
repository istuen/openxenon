import { describe, test, expect } from 'bun:test'
import {
  validateParamCoverage,
  validateTypeConsistency,
  validateAbstractParamFields,
  resolveTemplateString,
  resolveProbeParams,
  evaluatePartParams,
  evaluateAllParts,
  collectAllErrors,
  formatValidationErrors,
  type ParamEvalResult,
} from '../evaluator/param-evaluator'
import {
  type OxnAssemblyPart,
  type OxnAssemblyProp,
} from '../../kernel/schemas/oxn-assembly.schema'

function createConcretePart(params: { name: string; props?: OxnAssemblyProp[]; probes?: OxnAssemblyPart['probes']; execution?: string[] }): OxnAssemblyPart {
  return { name: params.name, description: undefined, props: params.props || [], probes: params.probes || [], execution: params.execution || [] }
}

// ========================
// 覆盖率校验
// ========================

describe('validateParamCoverage', () => {
  test('全部 required 有值 → 通过', () => {
    const props = [
      { name: 'api_key', type: 'string', required: true },
      { name: 'timeout', type: 'number', required: false, default: 30000 },
    ]
    const result = validateParamCoverage(props, { api_key: 'sk-123' })
    expect(result.valid).toBe(true)
    expect(result.covered).toContain('api_key')
    expect(result.missing).toHaveLength(0)
  })

  test('required 缺失 → 报错', () => {
    const props = [
      { name: 'api_key', type: 'string', required: true },
      { name: 'region', type: 'string', required: true },
    ]
    const result = validateParamCoverage(props, { api_key: 'sk-123' })
    expect(result.valid).toBe(false)
    expect(result.missing).toContain('region')
    expect(result.errors[0].kind).toBe('missing_required')
  })

  test('有 default 的 required → 豁免', () => {
    const props = [{ name: 'timeout', type: 'number', required: true, default: 30000 }]
    const result = validateParamCoverage(props, {})
    expect(result.valid).toBe(true)
  })

  test('全部通过', () => {
    const props = [
      { name: 'a', type: 'string', required: false },
      { name: 'b', type: 'number', required: false },
    ]
    const result = validateParamCoverage(props, {})
    expect(result.valid).toBe(true)
  })
})

// ========================
// 类型一致性校验
// ========================

describe('validateTypeConsistency', () => {
  test('类型匹配通过', () => {
    const props: OxnAssemblyProp[] = [
      { name: 'env', type: 'string', required: false },
      { name: 'coverage', type: 'number', required: false },
      { name: 'enabled', type: 'boolean', required: false },
    ]
    const result = validateTypeConsistency(props, { env: 'prod', coverage: 95, enabled: true })
    expect(result.valid).toBe(true)
  })

  test('number 类型不匹配', () => {
    const props = [{ name: 'coverage', type: 'number', required: false }]
    const result = validateTypeConsistency(props, { coverage: 'high' })
    expect(result.valid).toBe(false)
    expect(result.errors[0].kind).toBe('type_mismatch')
  })

  test('enum 越界', () => {
    const props = [{ name: 'env', type: 'enum("dev", "staging", "prod")', required: false }]
    const result = validateTypeConsistency(props, { env: 'testing' })
    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('枚举')
  })

  test('enum 合法值通过', () => {
    const props = [{ name: 'env', type: 'enum("dev", "staging", "prod")', required: false }]
    const result = validateTypeConsistency(props, { env: 'prod' })
    expect(result.valid).toBe(true)
  })

  test('any 类型接受任意值', () => {
    const props = [{ name: 'data', type: 'any', required: false }]
    expect(validateTypeConsistency(props, { data: 'text' }).valid).toBe(true)
    expect(validateTypeConsistency(props, { data: 123 }).valid).toBe(true)
    expect(validateTypeConsistency(props, { data: { nested: true } }).valid).toBe(true)
  })
})

// ========================
// 模板字符串求值
// ========================

describe('resolveTemplateString', () => {
  test('单变量替换', () => {
    expect(resolveTemplateString('deploy --env=${prop.env}', { env: 'prod' })).toBe('deploy --env=prod')
  })

  test('多变量替换', () => {
    expect(resolveTemplateString('${prop.a}_${prop.b}', { a: 'x', b: 'y' })).toBe('x_y')
  })

  test('未定义变量保留占位符', () => {
    expect(resolveTemplateString('${prop.missing}', {})).toBe('${prop.missing}')
  })
})

describe('resolveProbeParams', () => {
  test('递归替换嵌套 params', () => {
    const probeParams = {
      command: 'test --env=${prop.env}',
      nested: { key: '${prop.env}_value' },
    }
    const result = resolveProbeParams(probeParams, { env: 'prod' })
    expect(result.command).toBe('test --env=prod')
    expect(result.nested).toEqual({ key: 'prod_value' })
  })
})

// ========================
// 抽象参数验证
// ========================

describe('validateAbstractParamFields', () => {
  test('字段匹配通过', () => {
    const part = createConcretePart({
      name: 'jest',
      props: [
        { name: 'target_env', type: 'string' },
        { name: 'coverage_threshold', type: 'number' },
      ],
    })
    const result = validateAbstractParamFields(['target_env', 'coverage_threshold'], part)
    expect(result.valid).toBe(true)
  })

  test('未知字段报错', () => {
    const part = createConcretePart({ name: 'jest', props: [{ name: 'target_env', type: 'string' }] })
    const result = validateAbstractParamFields(['target_env', 'bad_field'], part)
    expect(result.valid).toBe(false)
    expect(result.errors[0].message).toContain('bad_field')
  })
})

// ========================
// evaluatePartParams 集成
// ========================

describe('evaluatePartParams', () => {
  test('完整求值流程：覆盖率 + 类型 + 模板', () => {
    const part = createConcretePart({
      name: 'jest-runner',
      props: [
        { name: 'target_env', type: 'string', required: false, default: 'dev' },
        { name: 'coverage_threshold', type: 'number', required: false, default: 80 },
      ],
      probes: [
        {
          name: 'run',
          ref: '@oxn/probe/shell-exec',
          params: { command: 'npm test -- --coverage=${prop.coverage_threshold}' },
        },
      ],
    })

    const result = evaluatePartParams({
      part,
      taskProps: { coverage_threshold: 95 },
    })

    expect(result.valid).toBe(true)
    expect(result.resolved.coverage_threshold).toBe(95)
    expect(result.resolved.target_env).toBe('dev')
  })

  test('required 缺失 → valid=false', () => {
    const part = createConcretePart({
      name: 'worker',
      props: [{ name: 'api_key', type: 'string', required: true }],
    })
    const result = evaluatePartParams({ part, taskProps: {} })
    expect(result.valid).toBe(false)
    expect(result.coverage.errors[0].kind).toBe('missing_required')
  })

  test('类型不匹配 → valid=false', () => {
    const part = createConcretePart({
      name: 'worker',
      props: [{ name: 'count', type: 'number', required: false }],
    })
    const result = evaluatePartParams({ part, taskProps: { count: 'many' } })
    expect(result.valid).toBe(false)
  })
})

describe('evaluateAllParts', () => {
  test('批量求值多个 parts', () => {
    const parts = [
      createConcretePart({ name: 'build', props: [{ name: 'env', type: 'string' }] }),
      createConcretePart({ name: 'test', props: [{ name: 'env', type: 'string', required: true }] }),
    ]

    const results = evaluateAllParts(parts, { env: 'prod' })
    expect(results.size).toBe(2)
    expect(results.get('build')!.valid).toBe(true)
    expect(results.get('test')!.valid).toBe(true)
  })

  test('collectAllErrors 聚合错误', () => {
    const parts = [
      createConcretePart({ name: 'a', props: [{ name: 'x', type: 'number', required: true }] }),
      createConcretePart({ name: 'b', props: [{ name: 'y', type: 'string', required: true }] }),
    ]
    const results = evaluateAllParts(parts, { x: 'not_a_number' })
    const errors = collectAllErrors(results)
    expect(errors.length).toBeGreaterThanOrEqual(1)
  })

  test('formatValidationErrors 格式化', () => {
    const errors = [
      { kind: 'missing_required' as const, message: '缺少 a', details: {} },
      { kind: 'type_mismatch' as const, message: '类型错误 b', details: {} },
    ]
    const formatted = formatValidationErrors(errors)
    expect(formatted).toContain('1.')
    expect(formatted).toContain('2.')
  })
})
