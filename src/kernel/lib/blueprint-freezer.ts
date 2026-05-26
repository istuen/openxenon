import type { Blueprint, Part, Probe } from '../schemas/blueprint.schema'
import { computeContentHash, createXenonMeta, type XenonMeta } from '../schemas/frozen-schema'
import { type PartResolution, resolvePartRef } from '../../work/part-resolver'
import { getProjectBoundaryPath } from './project'
import { BUILTIN_PARTS } from '../../arsenals/builtin'

function getBuiltinAssets() {
  return Object.entries(BUILTIN_PARTS).map(([name, def]) => ({
    name,
    type: 'parts' as const,
    state: 'canonical' as const,
    path: `builtin:${name}`,
    content: JSON.stringify(def),
  }))
}

function mergePartProbes(base: Record<string, unknown>, override: Part): Probe[] {
  const baseProbes = ((base.probes as Probe[]) || []) as Probe[]
  const overrideProbes = override.probes || []
  if (overrideProbes.length > 0) {
    return overrideProbes
  }
  return baseProbes
}

export interface LineageReportEntry {
  partId: string
  status: '✅' | '⚠️'
  resolved: string
  source: 'kernel' | 'global' | 'project'
  message: string
}

export interface LineageReport {
  entries: LineageReportEntry[]
  totalParts: number
}

export function renderLineageReport(report: LineageReport): string {
  const lines: string[] = ['[Core] Resolving blueprint assets...']
  for (const entry of report.entries) {
    lines.push(`  ${entry.status} part: ${entry.partId}`)
    lines.push(`     -> resolved: ${entry.resolved}`)
    lines.push(`     -> version frozen.`)
  }
  return lines.join('\n')
}

export function generateLineageReport(parts: Part[]): LineageReport {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const builtinAssets = getBuiltinAssets()
  const entries: LineageReportEntry[] = []

  for (const part of parts) {
    if (part.ref) {
      const resolution = resolvePartRef(part.ref, projectBoundary, builtinAssets)

      entries.push({
        partId: part.id,
        status: '✅',
        resolved: resolution.originalPath || (resolution.namespace === 'oxn' ? 'builtin' : resolution.namespace),
        source: resolution.namespace as 'kernel' | 'global' | 'project',
        message: '',
      })
    } else {
      entries.push({
        partId: part.id,
        status: '✅',
        resolved: 'inline',
        source: 'project',
        message: 'inline part (no ref)',
      })
    }
  }

  return { entries, totalParts: parts.length }
}

export function injectPartMeta(
  part: Part,
  resolution: PartResolution,
  _appendedProbeRefs: string[] = [],
): Part & { _xenon_meta: XenonMeta } {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(part)

  return {
    _xenon_meta: {
      ref: resolution.rawRef,
      resolved_from: resolution.namespace,
      original_path: resolution.originalPath,
      frozen_at: frozenAt,
      content_hash: computeContentHash(content),
      appended: false,
    },
    ...part,
  } as Part & { _xenon_meta: XenonMeta }
}

export function injectProbeMeta(
  probe: { type?: string; ref?: string; params?: Record<string, unknown>; pattern?: string; command?: string },
  ref: string,
  resolvedFrom: 'kernel' | 'global' | 'project',
  appended: boolean = false,
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
      appended,
    },
  } as typeof probe & { _xenon_meta: XenonMeta }
}

export function resolveBlueprintRefs(blueprint: Blueprint): {
  frozenParts: Array<Part & { _xenon_meta: XenonMeta }>
  lineageReport: LineageReport
} {
  const projectBoundary = getProjectBoundaryPath(process.cwd())
  const builtinAssets = getBuiltinAssets()
  const frozenParts: Array<Part & { _xenon_meta: XenonMeta }> = []
  const lineageEntries: LineageReportEntry[] = []

  for (const part of blueprint.parts || []) {
    let resolvedPart: Part

    if (part.ref) {
      const resolution = resolvePartRef(part.ref, projectBoundary, builtinAssets)

      if (!resolution.found || !resolution.part) {
        throw new Error(`Part ref "${part.ref}" 解析失败，未找到对应资产`)
      }

      resolvedPart = {
        ...resolution.part,
        id: part.id || resolution.part.id,
        name: part.name || resolution.part.name,
        deps: part.deps || resolution.part.deps || [],
        params: part.params || {},
        probes: mergePartProbes(resolution.part, part),
      }

      lineageEntries.push({
        partId: part.id,
        status: '✅',
        resolved: resolution.originalPath || (resolution.namespace === 'oxn' ? 'builtin' : resolution.namespace),
        source: resolution.namespace as 'kernel' | 'global' | 'project',
        message: '',
      })
    } else {
      resolvedPart = part
      lineageEntries.push({
        partId: part.id,
        status: '✅',
        resolved: 'inline',
        source: 'project',
        message: 'inline part (no ref)',
      })
    }

    const injectedProbes = (resolvedPart.probes || []).map((p) => {
      const ref = p.ref || p.type || ''
      return injectProbeMeta(p, ref, 'project', false)
    })

    frozenParts.push({
      _xenon_meta: createXenonMeta({
        ref: part.ref || 'inline',
        resolvedFrom: part.ref ? 'project' : 'project',
        content: JSON.stringify(resolvedPart),
      }),
      ...resolvedPart,
      probes: injectedProbes,
    } as Part & { _xenon_meta: XenonMeta })
  }

  return {
    frozenParts,
    lineageReport: {
      entries: lineageEntries,
      totalParts: blueprint.parts?.length || 0,
    },
  }
}

export function freezeBlueprint(blueprint: Blueprint): {
  frozenBlueprint: {
    id: string
    name: string
    frozen_at: string
    parts: Array<Part & { _xenon_meta: XenonMeta }>
  }
  lineageReport: LineageReport
} {
  const { frozenParts, lineageReport } = resolveBlueprintRefs(blueprint)

  return {
    frozenBlueprint: {
      id: blueprint.id,
      name: blueprint.name,
      frozen_at: new Date().toISOString(),
      parts: frozenParts,
    },
    lineageReport,
  }
}
