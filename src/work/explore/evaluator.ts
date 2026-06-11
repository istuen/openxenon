/**
 * Exploration Evaluator - 通用探索分析引擎
 * 输入：上下文 + 规则
 * 输出：Findings
 * 纯函数，无任何 I/O
 */

import type { ExplorationContext, ExplorationResult, ExplorationRule, Finding, ProjectDir } from '../../kernel/index'

/**
 * 通用探索评估器
 */
export function evaluateExploration(
  context: ExplorationContext,
  rules: ExplorationRule[],
  meta: { name: string; title: string },
): ExplorationResult {
  const findings: Finding[] = []

  for (const rule of rules) {
    const matches = matchRuleForDirs(context, rule)
    for (const match of matches) {
      findings.push({
        id: `${rule.name}-${match.dir.path}`,
        level: rule.level,
        message: renderTemplate(rule.message, match.vars),
        location: match.vars.location as string | undefined,
        suggestion: rule.suggestion ? renderTemplate(rule.suggestion, match.vars) : undefined,
        evidence: match.vars,
      })
    }
  }

  return {
    name: meta.name,
    title: meta.title,
    generatedAt: Date.now(),
    findings,
    summary: summarize(findings),
  }
}

interface DirMatch {
  dir: ProjectDir
  vars: Record<string, unknown>
}

/**
 * 遍历所有目录，寻找匹配的规则
 */
function matchRuleForDirs(context: ExplorationContext, rule: ExplorationRule): DirMatch[] {
  const matches: DirMatch[] = []

  for (const dir of context.projectDirs) {
    const vars = {
      dir: { path: dir.path, fileCount: dir.fileCount, hasTests: dir.hasTests },
      location: dir.path,
    }

    if (evaluateCondition(rule.condition, vars, context)) {
      matches.push({ dir, vars })
    }
  }

  return matches
}

/**
 * 评估条件表达式
 */
function evaluateCondition(condition: string, vars: Record<string, unknown>, context: ExplorationContext): boolean {
  const trimmed = condition.trim()

  // 处理 NOT
  if (trimmed.startsWith('NOT ')) {
    const inner = trimmed.slice(4).trim()
    return !evaluateCondition(inner, vars, context)
  }

  // 处理 AND
  const andParts = trimmed.split(' AND ')
  if (andParts.length > 1) {
    return andParts.every((part) => evaluateCondition(part.trim(), vars, context))
  }

  // 处理 OR
  const orParts = trimmed.split(' OR ')
  if (orParts.length > 1) {
    return orParts.some((part) => evaluateCondition(part.trim(), vars, context))
  }

  // 处理比较: dir.fileCount >= 3
  const compareMatch = trimmed.match(/^(\w+)\.(\w+)\s*>=\s*(\d+)$/)
  if (compareMatch) {
    const objName = compareMatch[1]
    const propName = compareMatch[2]
    const thresholdStr = compareMatch[3]
    if (!objName || !propName || !thresholdStr) return false
    const threshold = parseInt(thresholdStr, 10)
    const obj = vars[objName] as Record<string, unknown> | undefined
    if (!obj) return false
    const value = obj[propName]
    if (typeof value !== 'number') return false
    return value >= threshold
  }

  // 处理 hasDirectProbe(dir, 'fs_exists')
  const hasDirectMatch = trimmed.match(/^hasDirectProbe\((\w+),\s*'(.+)'\)$/)
  if (hasDirectMatch) {
    const targetObj = hasDirectMatch[1]
    const probeType = hasDirectMatch[2]
    if (!targetObj || !probeType) return false
    const dir = vars[targetObj] as Record<string, unknown> | undefined
    if (!dir) return false

    const path = dir.path as string | undefined
    const fileCount = dir.fileCount as number | undefined
    if (!path || typeof fileCount !== 'number') return false
    if (fileCount < 3) return false

    const hasCover = context.probes.some(
      (p) => p.type === 'fs_exists' && (p.pattern === path || path.startsWith(`${p.pattern}/`)),
    )
    return probeType === 'fs_exists' ? hasCover : !hasCover
  }

  // 处理 fileExists('.eslintrc*')
  const fileExistsMatch = trimmed.match(/^fileExists\('(.+)'\)$/)
  if (fileExistsMatch) {
    const pattern = fileExistsMatch[1]
    if (!pattern) return false
    return context.projectFiles.some(
      (f) =>
        f === pattern ||
        f.endsWith(pattern.replace(/^\./, '')) ||
        new RegExp(`^${pattern.replace(/\*/g, '.*')}$`).test(f),
    )
  }

  return false
}

/**
 * 模板渲染
 */
export function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path) => {
    const parts = path.split('.')
    let value: unknown = vars
    for (const part of parts) {
      value = (value as Record<string, unknown>)?.[part]
    }
    return String(value ?? '')
  })
}

/**
 * 生成总结
 */
export function summarize(findings: Finding[]): string {
  const errors = findings.filter((f) => f.level === 'error').length
  const warnings = findings.filter((f) => f.level === 'warning').length
  const infos = findings.filter((f) => f.level === 'info').length
  return `${errors} 个问题, ${warnings} 个警告, ${infos} 个建议`
}
