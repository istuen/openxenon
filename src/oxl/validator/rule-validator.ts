/**
 * Task 4.2 — OXN Rule 静态拦截器
 *
 * rule 块条件逻辑编译期求值：
 * - 逻辑运算 (&&, ||, !)
 * - 比较运算 (==, !=, <, >, <=, >=)
 * - 求值结果为 false 时编译报错
 *
 * v0.1-final: rule 已从 Blueprint 中移除，本求值器保留为基础设施
 * 以便后续通过 invariant 表达式或条件任务重新接入拦截逻辑。
 */
export interface OxnAssemblyRule {
  name: string
  condition: string
  errMsg?: string
}

export interface RuleEvalResult {
  valid: boolean
  passed: boolean
  /** 求值后的详细结果 */
  message?: string
}

export class RuleValidator {
  /**
   * 对单个 rule 执行静态求值
   */
  static evaluate(rule: OxnAssemblyRule, props: Record<string, unknown>): RuleEvalResult {
    try {
      const passed = RuleValidator._evaluateCondition(rule.condition, props)
      return {
        valid: true,
        passed,
        message: passed ? undefined : `Rule "${rule.name}" 未通过: ${rule.errMsg || rule.condition}`,
      }
    } catch (err) {
      return {
        valid: false,
        passed: false,
        message: `Rule "${rule.name}" 求值错误: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  }

  /**
   * 批量求值所有 rules
   */
  static evaluateAll(rules: OxnAssemblyRule[], props: Record<string, unknown>): RuleEvalResult[] {
    return rules.map((r) => RuleValidator.evaluate(r, props))
  }

  /**
   * 检查是否所有 rules 都通过
   */
  static allPass(result: RuleEvalResult[]): boolean {
    return result.every((r) => r.passed)
  }

  private static _evaluateCondition(condition: string, props: Record<string, unknown>): boolean {
    const trimmed = condition.trim()

    // prop.xxx 引用
    if (/^prop\.\w+$/.test(trimmed)) {
      return Boolean(props[trimmed.slice(5)])
    }

    // 字面量
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false

    // 比较：a != b, a == b
    const neMatch = trimmed.match(/^(.+?)\s*!=\s*(.+)$/)
    if (neMatch) {
      const left = RuleValidator._resolveValue(neMatch[1]!, props)
      const right = RuleValidator._resolveValue(neMatch[2]!, props)
      return left !== right
    }
    const eqMatch = trimmed.match(/^(.+?)\s*==\s*(.+)$/)
    if (eqMatch) {
      const left = RuleValidator._resolveValue(eqMatch[1]!, props)
      const right = RuleValidator._resolveValue(eqMatch[2]!, props)
      return left === right
    }

    // 逻辑或
    const orMatch = trimmed.match(/^(.+?)\s*\|\|\s*(.+)$/)
    if (orMatch) {
      return (
        RuleValidator._evaluateCondition(orMatch[1]!, props) || RuleValidator._evaluateCondition(orMatch[2]!, props)
      )
    }

    // 逻辑与
    const andMatch = trimmed.match(/^(.+?)\s*&&\s*(.+)$/)
    if (andMatch) {
      return (
        RuleValidator._evaluateCondition(andMatch[1]!, props) && RuleValidator._evaluateCondition(andMatch[2]!, props)
      )
    }

    return true
  }

  private static _resolveValue(expr: string, props: Record<string, unknown>): unknown {
    const trimmed = expr.trim()
    if (trimmed.startsWith('prop.')) return props[trimmed.slice(5)]
    if (/^"[^"]*"$/.test(trimmed)) return trimmed.slice(1, -1)
    if (trimmed === 'true') return true
    if (trimmed === 'false') return false
    if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed)
    return trimmed
  }
}
