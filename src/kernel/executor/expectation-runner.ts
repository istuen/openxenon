/**
 * Task 4.3 — OXN Expectation 运行时断言执行器
 *
 * 绑定在 Blueprint 上的 expectation 在运行时执行：
 * - 关联的 Probe 执行验证
 * - 失败时中断流水线，返回 err_msg
 */
import type { OxnAssemblyExpectation } from '../../kernel/schemas/oxn-assembly.schema'

export interface ExpectationResult {
  name: string
  passed: boolean
  probeRef: string
  params: Record<string, unknown>
  /** 实际的验证结果 */
  actual?: unknown
  /** 错误消息 */
  error?: string
  errMsg?: string
}

/** Probe handler type - simplified for the runner */
export type ProbeHandler = (params: Record<string, unknown>) => Promise<{ passed: boolean; output?: unknown }>

export interface ExpectationRunnerConfig {
  /** 内置探针处理函数映射 */
  handlers: Record<string, ProbeHandler>
}

export class ExpectationRunner {
  private handlers: Record<string, ProbeHandler>

  constructor(config: ExpectationRunnerConfig) {
    this.handlers = config.handlers
  }

  /**
   * 执行单个 expectation 断言
   */
  async runOne(exp: OxnAssemblyExpectation): Promise<ExpectationResult> {
    const probeName = exp.probeRef.split('/').pop() || exp.probeRef
    const handler = this.handlers[probeName]

    if (!handler) {
      return {
        name: exp.name,
        passed: false,
        probeRef: exp.probeRef,
        params: exp.params,
        error: `未知探针: ${probeName}`,
        errMsg: exp.errMsg,
      }
    }

    try {
      const result = await handler(exp.params)
      return {
        name: exp.name,
        passed: result.passed,
        probeRef: exp.probeRef,
        params: exp.params,
        actual: result.output,
        errMsg: result.passed ? undefined : exp.errMsg,
      }
    } catch (err) {
      return {
        name: exp.name,
        passed: false,
        probeRef: exp.probeRef,
        params: exp.params,
        error: err instanceof Error ? err.message : String(err),
        errMsg: exp.errMsg,
      }
    }
  }

  /**
   * 执行所有 expectations
   * 返回第一个失败的结果（fail-fast），或全部通过
   */
  async runAll(expectations: OxnAssemblyExpectation[]): Promise<ExpectationResult[]> {
    const results: ExpectationResult[] = []

    for (const exp of expectations) {
      const result = await this.runOne(exp)
      results.push(result)
      if (!result.passed) {
        break // fail-fast
      }
    }

    return results
  }

  /**
   * 检查是否全部通过
   */
  static allPassed(results: ExpectationResult[]): boolean {
    return results.length > 0 && results.every((r) => r.passed)
  }

  /**
   * 获取失败原因摘要
   */
  static failureSummary(results: ExpectationResult[]): string {
    const failures = results.filter((r) => !r.passed)
    if (failures.length === 0) return ''
    return failures.map((f) => `  [${f.name}] ${f.errMsg || f.error || 'unknown'}`).join('\n')
  }
}
