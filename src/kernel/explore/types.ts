/**
 * Exploration Types - 探索机制的核心类型定义
 * 所有类型都是纯数据，不依赖任何 I/O
 */

/**
 * 发现 — 最小信息单元
 * 不区分"覆盖缺口"还是"lint 错误"，统一为 Finding
 */
export interface Finding {
  id: string
  level: 'info' | 'warning' | 'error'
  message: string
  location?: string
  suggestion?: string
  evidence?: Record<string, unknown>
}

/**
 * 探索结果 — 所有探索维度的统一输出
 */
export interface ExplorationResult {
  name: string
  title: string
  generatedAt: number
  findings: Finding[]
  summary: string
}

/**
 * 探索规则定义
 */
export interface ExplorationRule {
  name: string
  description: string
  level: 'info' | 'warning' | 'error'
  condition: string
  message: string
  suggestion?: string
}

/**
 * 项目目录信息
 */
export interface ProjectDir {
  path: string
  fileCount: number
  hasTests: boolean
  depth: number
}

/**
 * 探针覆盖信息
 */
export interface ProbeInfo {
  type: string
  pattern: string
  source: 'builtin' | 'canonical' | 'draft'
}

/**
 * Blueprint 探针引用统计
 */
export interface BlueprintProbeRef {
  type: string
  count: number
}

/**
 * Trace 汇总信息
 */
export interface TraceSummary {
  totalStages: number
  passRate: number
  probeStats: Record<string, { total: number; passed: number }>
}

/**
 * 探索上下文 — Kernel 纯函数的输入
 */
export interface ExplorationContext {
  projectFiles: string[]
  projectDirs: ProjectDir[]
  probes: ProbeInfo[]
  blueprintProbeRefs: BlueprintProbeRef[]
  traceSummary?: TraceSummary
}

/**
 * 探索器资产元信息
 */
export interface ExplorationAsset {
  name: string
  description: string
  scope: string[]
  output: string
  rules: ExplorationRule[]
}
