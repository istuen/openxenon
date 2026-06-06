import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync } from 'fs'

// ========================
// Task 4.1: Interface Validator
// ========================

// ========================
// Task 4.1: Interface Validator — 已移除 (Slot 范式不需要 Interface)
// ========================
// InterfaceValidator 随 v3.0 废除 Interface 机制一同删除

// ========================
// Task 4.2: Rule Validator
// ========================
import { RuleValidator } from '../validator/rule-validator'

describe('RuleValidator (Task 4.2)', () => {
  test('简单 prop 引用求值', () => {
    const result = RuleValidator.evaluate(
      { name: 'check', condition: 'prop.enabled', errMsg: 'err' },
      { enabled: true },
    )
    expect(result.passed).toBe(true)
  })

  test('比较表达式 != ', () => {
    const result = RuleValidator.evaluate(
      { name: 'prod_check', condition: 'prop.env != "prod"', errMsg: 'err' },
      { env: 'dev' },
    )
    expect(result.passed).toBe(true)
  })

  test('比较表达式 == ', () => {
    const result = RuleValidator.evaluate(
      { name: 'prod_check', condition: 'prop.env == "prod"', errMsg: 'err' },
      { env: 'prod' },
    )
    expect(result.passed).toBe(true)
  })

  test('逻辑或 ||', () => {
    const result = RuleValidator.evaluate(
      { name: 'check', condition: 'prop.env != "prod" || prop.ha == true', errMsg: 'err' },
      { env: 'dev', ha: false },
    )
    expect(result.passed).toBe(true)
  })

  test('逻辑与 &&', () => {
    const result = RuleValidator.evaluate(
      { name: 'check', condition: 'prop.a == true && prop.b == true', errMsg: 'err' },
      { a: true, b: false },
    )
    expect(result.passed).toBe(false)
  })

  test('布尔字面量 true/false', () => {
    expect(RuleValidator.evaluate({ name: 't', condition: 'true', errMsg: '' }, {}).passed).toBe(true)
    expect(RuleValidator.evaluate({ name: 'f', condition: 'false', errMsg: '' }, {}).passed).toBe(false)
  })

  test('evaluateAll 批量求值', () => {
    const rules = [
      { name: 'r1', condition: 'true', errMsg: 'e1' },
      { name: 'r2', condition: 'false', errMsg: 'e2' },
      { name: 'r3', condition: 'true', errMsg: 'e3' },
    ]
    const results = RuleValidator.evaluateAll(rules, {})
    expect(results).toHaveLength(3)
    expect(results[0].passed).toBe(true)
    expect(results[1].passed).toBe(false)
    expect(RuleValidator.allPass(results)).toBe(false)
  })
})

// ========================
// Task 4.3: Expectation Runner
// ========================
import { ExpectationRunner } from '../executor/expectation-runner'

describe('ExpectationRunner (Task 4.3)', () => {
  test('执行期望通过', async () => {
    const runner = new ExpectationRunner({
      handlers: {
        'fs-exists': async (_params) => ({ passed: true, output: 'found' }),
      },
    })

    const results = await runner.runAll([
      { name: 'check_config', probeRef: '@oxn/probe/fs-exists', params: { pattern: '*.ts' }, errMsg: 'missing' },
    ])

    expect(results).toHaveLength(1)
    expect(results[0].passed).toBe(true)
    expect(ExpectationRunner.allPassed(results)).toBe(true)
  })

  test('执行期望失败', async () => {
    const runner = new ExpectationRunner({
      handlers: {
        'fs-exists': async () => ({ passed: false, output: 'not found' }),
      },
    })

    const results = await runner.runAll([
      { name: 'missing_check', probeRef: '@oxn/probe/fs-exists', params: {}, errMsg: '文件缺失' },
    ])

    expect(results[0].passed).toBe(false)
    expect(results[0].errMsg).toBe('文件缺失')
  })

  test('未知探针返回失败', async () => {
    const runner = new ExpectationRunner({ handlers: {} })
    const results = await runner.runAll([{ name: 'bad', probeRef: '@oxn/probe/unknown', params: {}, errMsg: 'err' }])
    expect(results[0].passed).toBe(false)
    expect(results[0].error).toContain('未知探针')
  })

  test('fail-fast 机制', async () => {
    let secondCalled = false
    const runner = new ExpectationRunner({
      handlers: {
        fail: async () => ({ passed: false }),
        pass: async () => {
          secondCalled = true
          return { passed: true }
        },
      },
    })

    await runner.runAll([
      { name: 'first', probeRef: '@oxn/probe/fail', params: {}, errMsg: 'fail' },
      { name: 'second', probeRef: '@oxn/probe/pass', params: {}, errMsg: 'pass' },
    ])

    expect(secondCalled).toBe(false) // fail-fast
  })

  test('failureSummary 格式化', () => {
    const results = [
      { name: 'a', passed: true, probeRef: 'x', params: {} },
      { name: 'b', passed: false, probeRef: 'y', params: {}, errMsg: 'bad' },
    ]
    const summary = ExpectationRunner.failureSummary(results)
    expect(summary).toContain('bad')
  })
})

// ========================
// Task 4.4: Core Migration
// ========================

describe('Core Migration (Task 4.4)', () => {
  test('迁移后的 OXN 蓝图文件存在', () => {
    expect(existsSync('src/oxn-dsl/builtin/blueprints/migrated-blueprints.oxn')).toBe(true)
  })

  test('迁移文件包含 verify-readme 和 test-check-readme', () => {
    const content = readFileSync('src/oxn-dsl/builtin/blueprints/migrated-blueprints.oxn', 'utf-8')
    expect(content).toContain('verify-readme')
    expect(content).toContain('test-check-readme')
    expect(content).toContain('blueprint')
    expect(content).toContain('type "task"')
    expect(content).toContain('part slot')
  })

  test('builtin probes 使用 @oxn scope 引用', () => {
    const content = readFileSync('src/oxn-dsl/builtin/probes/builtin-probes.oxn', 'utf-8')
    expect(content).toContain('fs-exists')
    expect(content).toContain('exec-exit-zero')
    expect(content).toContain('fs-content-match')
  })
})

// ========================
// Task 4.5: Deprecation（已删除 — DEPRECATION.md 在 7c6720d 移除）
// ========================
