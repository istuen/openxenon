import type { Stage, Blueprint } from '../schemas/blueprint.schema'
import { resolveStageRef, type StageResolution } from './stage-resolver'
import { createXenonMeta, type XenonMeta, computeContentHash } from '../schemas/frozen-schema'
import { getProjectBoundaryPath } from './project'

export interface LineageReportEntry {
  stageId: string
  status: '✅' | '⚠️'
  resolved: string
  source: 'kernel' | 'global' | 'project'
  message: string
}

export interface LineageReport {
  entries: LineageReportEntry[]
  totalStages: number
}

export function renderLineageReport(report: LineageReport): string {
  const lines: string[] = ['[Core] Resolving blueprint assets...']
  for (const entry of report.entries) {
    lines.push(`  ${entry.status} stage: ${entry.stageId}`)
    lines.push(`     -> resolved: ${entry.resolved}`)
    lines.push(`     -> version frozen.`)
  }
  return lines.join('\n')
}

export function generateLineageReport(stages: Stage[]): LineageReport {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const entries: LineageReportEntry[] = []

  for (const stage of stages) {
    if (stage.ref) {
      const resolution = resolveStageRef(stage.ref, projectBoundary)

      entries.push({
        stageId: stage.id,
        status: '✅',
        resolved: resolution.originalPath || (resolution.namespace === 'oxn' ? 'builtin' : resolution.namespace),
        source: resolution.namespace as 'kernel' | 'global' | 'project',
        message: ''
      })
    } else {
      entries.push({
        stageId: stage.id,
        status: '✅',
        resolved: 'inline',
        source: 'project',
        message: 'inline stage (no ref)'
      })
    }
  }

  return { entries, totalStages: stages.length }
}

export function injectStageMeta(
  stage: Stage,
  resolution: StageResolution,
  _appendedProbeRefs: string[] = []
): Stage & { _xenon_meta: XenonMeta } {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(stage)

  return {
    _xenon_meta: {
      ref: resolution.rawRef,
      resolved_from: resolution.namespace,
      original_path: resolution.originalPath,
      frozen_at: frozenAt,
      content_hash: computeContentHash(content),
      appended: false
    },
    ...stage
  } as Stage & { _xenon_meta: XenonMeta }
}

export function injectProbeMeta(
  probe: { type?: string; ref?: string; params?: Record<string, unknown>; pattern?: string; command?: string },
  ref: string,
  resolvedFrom: 'kernel' | 'global' | 'project',
  appended: boolean = false
): typeof probe & { _xenon_meta: XenonMeta } {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(probe)

  return {
    ...probe,
    _xenon_meta: {
      ref,
      resolved_from: resolvedFrom,
      frozen_at: frozenAt,
      content_hash: computeContentHash(content),
      appended
    }
  } as typeof probe & { _xenon_meta: XenonMeta }
}

export function resolveBlueprintRefs(blueprint: Blueprint): {
  frozenStages: Array<Stage & { _xenon_meta: XenonMeta }>
  lineageReport: LineageReport
} {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const frozenStages: Array<Stage & { _xenon_meta: XenonMeta }> = []
  const lineageEntries: LineageReportEntry[] = []

  for (const stage of blueprint.stages || []) {
    let resolvedStage: Stage

    if (stage.ref) {
      const resolution = resolveStageRef(stage.ref, projectBoundary)

      if (!resolution.found || !resolution.stage) {
        throw new Error(`Stage ref "${stage.ref}" 解析失败，未找到对应资产`)
      }

      resolvedStage = {
        ...resolution.stage,
        id: stage.id || resolution.stage.id,
        name: stage.name || resolution.stage.name,
        deps: stage.deps || resolution.stage.deps || [],
        params: stage.params || {},
        probes: mergeStageProbes(resolution.stage, stage)
      }

      lineageEntries.push({
        stageId: stage.id,
        status: '✅',
        resolved: resolution.originalPath || (resolution.namespace === 'oxn' ? 'builtin' : resolution.namespace),
        source: resolution.namespace as 'kernel' | 'global' | 'project',
        message: ''
      })
    } else {
      resolvedStage = stage
      lineageEntries.push({
        stageId: stage.id,
        status: '✅',
        resolved: 'inline',
        source: 'project',
        message: 'inline stage (no ref)'
      })
    }

    const injectedProbes = (resolvedStage.probes || []).map(p => {
      const ref = p.ref || p.type || ''
      return injectProbeMeta(p, ref, 'project', false)
    })

    if (stage.probes_append) {
      for (const p of stage.probes_append) {
        const ref = p.ref || p.type || ''
        injectedProbes.push(injectProbeMeta(p, ref, 'project', true))
      }
    }

    frozenStages.push({
      _xenon_meta: createXenonMeta({
        ref: stage.ref || 'inline',
        resolvedFrom: stage.ref ? 'project' : 'project',
        content: JSON.stringify(resolvedStage)
      }),
      ...resolvedStage,
      probes: injectedProbes
    } as Stage & { _xenon_meta: XenonMeta })
  }

  return {
    frozenStages,
    lineageReport: {
      entries: lineageEntries,
      totalStages: blueprint.stages?.length || 0
    }
  }
}

function mergeStageProbes(baseStage: { probes?: any[] }, overrideStage: Stage): any[] {
  const baseProbes = baseStage.probes || []
  const overrideProbes = overrideStage.probes_override || overrideStage.probes || []
  const appendProbes = overrideStage.probes_append || []

  if (overrideStage.probes_override) {
    return [...overrideProbes, ...appendProbes]
  }

  return [...baseProbes, ...overrideProbes, ...appendProbes]
}

export function freezeBlueprint(blueprint: Blueprint): {
  frozenBlueprint: {
    id: string
    name: string
    frozen_at: string
    stages: Array<Stage & { _xenon_meta: XenonMeta }>
  }
  lineageReport: LineageReport
} {
  const { frozenStages, lineageReport } = resolveBlueprintRefs(blueprint)

  return {
    frozenBlueprint: {
      id: blueprint.id,
      name: blueprint.name,
      frozen_at: new Date().toISOString(),
      stages: frozenStages
    },
    lineageReport
  }
}