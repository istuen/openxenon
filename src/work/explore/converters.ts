import type {
  ExplorationContext,
  ProjectDir,
  ProbeInfo,
  BlueprintProbeRef,
  TraceSummary,
  ExplorationRule,
  ExplorationAsset,
} from '../../kernel/index'

interface RawProjectDir {
  path: string
  fileCount: number
  hasTests: boolean
  depth: number
}

interface RawProbeInfo {
  type: string
  pattern: string
  source: 'builtin' | 'canonical' | 'draft'
}

interface RawBlueprintProbeRef {
  type: string
  count: number
}

interface RawTraceSummary {
  totalStages: number
  passRate: number
  probeStats: Record<string, { total: number; passed: number }>
}

interface RawExplorationAsset {
  name: string
  description: string
  scope: string[]
  output: string
  rules: RawExplorationRule[]
}

interface RawExplorationRule {
  name: string
  description: string
  level: 'info' | 'warning' | 'error'
  condition: string
  message: string
  suggestion?: string
}

interface RawExplorationContext {
  projectFiles: string[]
  projectDirs: RawProjectDir[]
  probes: RawProbeInfo[]
  blueprintProbeRefs: RawBlueprintProbeRef[]
  traceSummary?: RawTraceSummary
}

export function toProjectDir(raw: RawProjectDir): ProjectDir {
  return {
    path: raw.path,
    fileCount: raw.fileCount,
    hasTests: raw.hasTests,
    depth: raw.depth,
  }
}

export function toProbeInfo(raw: RawProbeInfo): ProbeInfo {
  return {
    type: raw.type,
    pattern: raw.pattern,
    source: raw.source,
  }
}

export function toBlueprintProbeRef(raw: RawBlueprintProbeRef): BlueprintProbeRef {
  return {
    type: raw.type,
    count: raw.count,
  }
}

export function toTraceSummary(raw: RawTraceSummary): TraceSummary {
  return {
    totalStages: raw.totalStages,
    passRate: raw.passRate,
    probeStats: raw.probeStats,
  }
}

export function toExplorationRule(raw: RawExplorationRule): ExplorationRule {
  return {
    name: raw.name,
    description: raw.description,
    level: raw.level,
    condition: raw.condition,
    message: raw.message,
    suggestion: raw.suggestion,
  }
}

export function toExplorationAsset(raw: RawExplorationAsset): ExplorationAsset {
  return {
    name: raw.name,
    description: raw.description,
    scope: raw.scope,
    output: raw.output,
    rules: raw.rules.map(toExplorationRule),
  }
}

export function toExplorationContext(raw: RawExplorationContext): ExplorationContext {
  return {
    projectFiles: raw.projectFiles,
    projectDirs: raw.projectDirs.map(toProjectDir),
    probes: raw.probes.map(toProbeInfo),
    blueprintProbeRefs: raw.blueprintProbeRefs.map(toBlueprintProbeRef),
    traceSummary: raw.traceSummary ? toTraceSummary(raw.traceSummary) : undefined,
  }
}
