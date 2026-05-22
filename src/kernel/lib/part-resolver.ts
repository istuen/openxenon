import { parse as parseYaml } from 'yaml'
// eslint-disable-next-line no-restricted-imports -- TODO(Phase-3): pure functions to kernel, loadStandardByName via higher-order injection
import { parseProbeNamespace, isValidProbeRef, isBareProbeRef, loadStandardByName } from '../../infra/loader'
import { BUILTIN_PARTS } from '../../arsenals/builtin'
import type { PartDefinition } from '../schemas/part-asset'

export interface PartResolution {
  found: boolean
  part?: PartDefinition
  namespace: 'oxn' | 'scope' | 'project'
  scopeName?: string
  originalPath?: string
  rawRef: string
}

export function resolveBuiltinPart(name: string): PartDefinition | null {
  const builtin = BUILTIN_PARTS[name]
  if (!builtin) return null
  return {
    id: builtin.id || name,
    name: builtin.name || name,
    _version: builtin._version ?? 1,
    description: builtin.description || '',
    props: builtin.props,
    target: builtin.target,
    spec: builtin.spec,
    action: builtin.action,
    probes: builtin.probes as PartDefinition['probes'],
    deps: builtin.deps,
  }
}

export function resolvePartRef(ref: string, projectBoundary: string): PartResolution {
  if (isBareProbeRef(ref)) {
    throw new Error(`Part ref "${ref}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
  }

  if (!isValidProbeRef(ref)) {
    throw new Error(`Part ref "${ref}" 格式无效`)
  }

  const parsed = parseProbeNamespace(ref)
  if (!parsed) {
    return { found: false, namespace: 'project', rawRef: ref }
  }

  const { namespace, scopeName, probeName } = parsed

  if (namespace === 'oxn') {
    const part = resolveBuiltinPart(probeName)
    return {
      found: part !== null,
      part: part ?? undefined,
      namespace: 'oxn',
      rawRef: ref,
    }
  }

  if (namespace === 'scope' && scopeName) {
    const partData = loadStandardByName('global', projectBoundary, probeName, 'parts')
    if (partData) {
      try {
        const part = parseYaml(partData.content) as PartDefinition
        return {
          found: true,
          part,
          namespace: 'scope',
          scopeName,
          originalPath: partData.path,
          rawRef: ref,
        }
      } catch {
        return { found: false, namespace: 'scope', scopeName, rawRef: ref }
      }
    }
    return { found: false, namespace: 'scope', scopeName, rawRef: ref }
  }

  if (namespace === 'project') {
    const partData = loadStandardByName('project', projectBoundary, probeName, 'parts')
    if (partData) {
      try {
        const part = parseYaml(partData.content) as PartDefinition
        return {
          found: true,
          part,
          namespace: 'project',
          originalPath: partData.path,
          rawRef: ref,
        }
      } catch {
        return { found: false, namespace: 'project', rawRef: ref }
      }
    }
    return { found: false, namespace: 'project', rawRef: ref }
  }

  return { found: false, namespace: 'project', rawRef: ref }
}
