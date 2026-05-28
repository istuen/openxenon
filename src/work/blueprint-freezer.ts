import type { Blueprint, Part, Probe } from '../../kernel/schemas/validators/blueprint.schema'
import { computeContentHash, createXenonMeta, type XenonMeta } from '../../kernel/schemas/validators/frozen-schema'
import type { PartPort } from '../../kernel/contracts/part-port'

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

function mergePartProbes(base: Record<string, unknown>, override: Part): Probe[] {
  const baseProbes = ((base.probes as Probe[]) || []) as Probe[]
  const overrideProbes = override.probes || []
  if (overrideProbes.length > 0) {
    return overrideProbes
  }
  return baseProbes
}

export interface BlueprintFreezerConfig {
  partPort: PartPort
}

export class BlueprintFreezer {
  private partPort: PartPort

  constructor(config: BlueprintFreezerConfig) {
    this.partPort = config.partPort
  }

  async freezeBlueprint(blueprint: Blueprint): Promise<{
    frozenBlueprint: {
      id: string
      name: string
      frozen_at: string
      parts: Array<Part & { _xenon_meta: XenonMeta }>
    }
    lineageReport: LineageReport
  }> {
    const frozenParts: Array<Part & { _xenon_meta: XenonMeta }> = []
    const lineageEntries: LineageReportEntry[] = []

    for (const part of blueprint.parts || []) {
      let resolvedPart: Part | null = null

      if (part.ref) {
        const fetchedPart = await this.partPort.fetchPartDefinition(part.ref)

        if (fetchedPart) {
          resolvedPart = {
            ...fetchedPart,
            id: part.id || fetchedPart.id,
            name: part.name || fetchedPart.name,
            deps: part.deps || fetchedPart.deps || [],
            params: part.params || {},
            probes: mergePartProbes(fetchedPart, part),
          }

          lineageEntries.push({
            partId: part.id,
            status: '✅',
            resolved: fetchedPart.name || part.ref,
            source: 'project',
            message: '',
          })
        }
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

      if (!resolvedPart) {
        throw new Error(`Part ref "${part.ref}" 解析失败，未找到对应资产`)
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
      frozenBlueprint: {
        id: blueprint.id,
        name: blueprint.name,
        frozen_at: new Date().toISOString(),
        parts: frozenParts,
      },
      lineageReport: {
        entries: lineageEntries,
        totalParts: blueprint.parts?.length || 0,
      },
    }
  }
}

export function injectPartMeta(
  part: Part,
  _resolution: { rawRef: string; namespace: string; originalPath?: string },
): Part & { _xenon_meta: XenonMeta } {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(part)

  return {
    _xenon_meta: {
      ref: _resolution.rawRef,
      resolved_from: _resolution.namespace as 'kernel' | 'global' | 'project',
      original_path: _resolution.originalPath,
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

export function generateLineageReport(_parts: Part[], _partPort: PartPort): LineageReport {
  return { entries: [], totalParts: 0 }
}
