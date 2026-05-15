import { parseProbeNamespace, isValidProbeRef, isBareProbeRef, loadStandardByName } from '../../infra/loader'
import { BUILTIN_STAGES } from '../../arsenals/builtin'
import type { StageDefinition } from '../schemas/stage-asset'

export interface StageResolution {
  found: boolean
  stage?: StageDefinition
  namespace: 'oxn' | 'scope' | 'project'
  scopeName?: string
  shadow: boolean
  originalPath?: string
  rawRef: string
}

export function resolveBuiltinStage(name: string): StageDefinition | null {
  const builtin = BUILTIN_STAGES[name]
  if (!builtin) return null
  return {
    id: builtin.id || name,
    name: builtin.name || name,
    description: builtin.description || '',
    params_schema: builtin.params_schema,
    target: builtin.target,
    spec: builtin.spec,
    action: builtin.action,
    probes: builtin.probes as StageDefinition['probes'],
    deps: builtin.deps
  }
}

export function resolveStageRef(
  ref: string,
  projectBoundary: string
): StageResolution {
  if (isBareProbeRef(ref)) {
    throw new Error(`Stage ref "${ref}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
  }

  if (!isValidProbeRef(ref)) {
    throw new Error(`Stage ref "${ref}" 格式无效`)
  }

  const parsed = parseProbeNamespace(ref)
  if (!parsed) {
    return { found: false, namespace: 'project', shadow: false, rawRef: ref }
  }

  const { namespace, scopeName, probeName } = parsed

  if (namespace === 'oxn') {
    const stage = resolveBuiltinStage(probeName)
    return {
      found: stage !== null,
      stage: stage ?? undefined,
      namespace: 'oxn',
      shadow: false,
      rawRef: ref
    }
  }

  if (namespace === 'scope' && scopeName) {
    const stageData = loadStandardByName(projectBoundary, probeName, 'stages')
    if (stageData) {
      try {
        const stage = JSON.parse(stageData.content) as StageDefinition
        return {
          found: true,
          stage,
          namespace: 'scope',
          scopeName,
          shadow: false,
          originalPath: stageData.path,
          rawRef: ref
        }
      } catch {
        return { found: false, namespace: 'scope', shadow: false, rawRef: ref }
      }
    }
    return { found: false, namespace: 'scope', scopeName, shadow: false, rawRef: ref }
  }

  if (namespace === 'project') {
    const stageData = loadStandardByName(projectBoundary, probeName, 'stages')
    if (stageData) {
      try {
        const stage = JSON.parse(stageData.content) as StageDefinition
        return {
          found: true,
          stage,
          namespace: 'project',
          shadow: false,
          originalPath: stageData.path,
          rawRef: ref
        }
      } catch {
        return { found: false, namespace: 'project', shadow: false, rawRef: ref }
      }
    }
    return { found: false, namespace: 'project', shadow: false, rawRef: ref }
  }

  return { found: false, namespace: 'project', shadow: false, rawRef: ref }
}