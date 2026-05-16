import type { Blueprint } from '../schemas/blueprint.schema'
import type { FrozenBlueprint } from '../schemas/frozen-schema'
import { parseProbeNamespace, isValidProbeRef, isBareProbeRef, loadStandardByName } from '../../infra/loader'
import { BUILTIN_PROBES, BUILTIN_STAGES } from '../../arsenals/builtin'
import { computeContentHash } from '../schemas/frozen-schema'
import { validateDagTopology, type DagNode } from '../schemas/dag-validator'

export interface CompileContext {
  taskId: string
  taskName: string
  params?: Record<string, unknown>
  projectBoundary: string
}

export interface StageResolution {
  found: boolean
  content?: Record<string, unknown>
  namespace: 'kernel' | 'global' | 'project'
  shadow: boolean
  originalPath?: string
  rawRef: string
}

function evaluateCondition(condition: string, params: Record<string, unknown>): boolean {
  const match = condition.match(/^\{\{params\.(\w+)\}\}\s*(==|!=)\s*(.+)$/)
  if (!match) {
    throw new Error(`Invalid condition syntax: ${condition}`)
  }
  const [, key, operator, literal] = match
  if (!key || !operator || !literal) {
    throw new Error(`Invalid condition match`)
  }
  const value = String(params[key] ?? '')
  const expected = literal.replace(/^['"]|['"]$/g, '')
  return operator === '==' ? value === expected : value !== expected
}

function resolveRef(ref: string, type: 'stage' | 'probe', projectBoundary: string): StageResolution {
  if (isBareProbeRef(ref)) {
    throw new Error(`Ref "${ref}" 缺少命名空间前缀。必须使用 oxn/、@scope/ 或 ./ 前缀。`)
  }
  if (!isValidProbeRef(ref)) {
    throw new Error(`Ref "${ref}" 格式无效`)
  }

  const parsed = parseProbeNamespace(ref)
  if (!parsed) {
    return { found: false, namespace: 'project', shadow: false, rawRef: ref }
  }

  const { namespace, scopeName, probeName } = parsed

  if (namespace === 'oxn') {
    if (type === 'probe') {
      const builtin = BUILTIN_PROBES[probeName as keyof typeof BUILTIN_PROBES]
      if (builtin) {
        return {
          found: true,
          content: builtin as unknown as Record<string, unknown>,
          namespace: 'kernel',
          shadow: false,
          rawRef: ref
        }
      }
    } else {
      const builtin = BUILTIN_STAGES[probeName as keyof typeof BUILTIN_STAGES]
      if (builtin) {
        return {
          found: true,
          content: builtin as unknown as Record<string, unknown>,
          namespace: 'kernel',
          shadow: false,
          rawRef: ref
        }
      }
    }
  }

  if (namespace === 'scope' && scopeName) {
    const assetData = loadStandardByName('global', projectBoundary, probeName, type === 'stage' ? 'stages' : 'probes')
    if (assetData) {
      try {
        const content = JSON.parse(assetData.content)
        return {
          found: true,
          content,
          namespace: 'global',
          shadow: false,
          originalPath: assetData.path,
          rawRef: ref
        }
      } catch {
        return { found: false, namespace: 'global', shadow: false, rawRef: ref }
      }
    }
  }

  if (namespace === 'project') {
    const assetData = loadStandardByName('project', projectBoundary, probeName, type === 'stage' ? 'stages' : 'probes')
    if (assetData) {
      try {
        const content = JSON.parse(assetData.content)
        return {
          found: true,
          content,
          namespace: 'project',
          shadow: false,
          originalPath: assetData.path,
          rawRef: ref
        }
      } catch {
        return { found: false, namespace: 'project', shadow: false, rawRef: ref }
      }
    }
  }

  return { found: false, namespace: 'project', shadow: false, rawRef: ref }
}

function validateParams(stageContent: Record<string, unknown>, providedParams: Record<string, unknown> = {}): void {
  const paramsSchema = stageContent.params_schema as { required?: string[] } | undefined
  if (!paramsSchema) return

  const required = paramsSchema.required || []
  for (const key of required) {
    if (!(key in providedParams)) {
      throw new Error(`Stage 缺少必填参数 "${key}"`)
    }
  }
}

function mergeProbes(
  baseProbes: Array<Record<string, unknown>>,
  overrideStage: { probes_override?: Array<Record<string, unknown>>; probes_append?: Array<Record<string, unknown>>; probes?: Array<Record<string, unknown>> }
): Array<Record<string, unknown>> {
  const override = overrideStage.probes_override || overrideStage.probes || []
  const append = overrideStage.probes_append || []

  if (overrideStage.probes_override) {
    return [...override, ...append]
  }

  return [...baseProbes, ...override, ...append]
}

function pruneStages(
  stages: Array<Record<string, unknown>>,
  params: Record<string, unknown> = {}
): Array<Record<string, unknown>> {
  return stages.filter(stage => {
    const condition = stage.condition as string | undefined
    if (!condition) return true
    return evaluateCondition(condition, params)
  })
}

function renderString(str: string, ctx: CompileContext): string {
  return str.replace(/\{\{([^}]+)\}\}/g, (_match, expr) => {
    const trimmed = expr.trim()
    if (trimmed.startsWith('params.')) {
      const key = trimmed.slice(7)
      const value = ctx.params?.[key]
      return value !== undefined ? String(value) : ''
    }
    if (trimmed.startsWith('task.')) {
      const key = trimmed.slice(5)
      if (key === 'id') return ctx.taskId
      if (key === 'name') return ctx.taskName
    }
    return `{{${trimmed}}}`
  })
}

function renderTemplates(stage: Record<string, unknown>, ctx: CompileContext): Record<string, unknown> {
  const result = { ...stage }

  if (result.action) {
    const action = result.action as { instruction?: string; command?: string }
    if (action.instruction) {
      action.instruction = renderString(action.instruction, ctx)
    }
    if (action.command) {
      action.command = renderString(action.command, ctx)
    }
  }

  if (result.condition) {
    result.condition = renderString(result.condition as string, ctx)
  }

  return result
}

function injectMeta(stage: Record<string, unknown>, ref: string, namespace: 'kernel' | 'global' | 'project', shadow: boolean, originalPath?: string): Record<string, unknown> {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(stage)

  const meta = {
    ref,
    resolved_from: namespace,
    shadow,
    original_path: originalPath,
    frozen_at: frozenAt,
    content_hash: computeContentHash(content)
  }

  const probes = (stage.probes as Array<Record<string, unknown>> || []).map((probe, idx) => {
    const probeRef = (probe.ref as string) || `inline-probe-${idx}`
    return {
      ...probe,
      _xenon_meta: {
        ...meta,
        ref: probeRef
      }
    }
  })

  return {
    ...stage,
    _xenon_meta: meta,
    probes
  }
}

export class BlueprintCompiler {
  compile(raw: Blueprint, ctx: CompileContext): FrozenBlueprint {
    const dagNodes: DagNode[] = (raw.stages || []).map(stage => ({
      id: stage.id || (stage as any).name,
      deps: stage.deps || []
    }))

    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG 验证失败: ${dagResult.errors.join('; ')}`)
    }

    const { projectBoundary } = ctx
    const stages: Array<Record<string, unknown>> = []

    for (const stage of raw.stages || []) {
      let resolvedStage: Record<string, unknown>

      if (stage.ref) {
        const resolution = resolveRef(stage.ref, 'stage', projectBoundary)
        if (!resolution.found || !resolution.content) {
          throw new Error(`Stage ref "${stage.ref}" 解析失败，未找到对应资产`)
        }

        validateParams(resolution.content, stage.params || {})

        const baseProbes = (resolution.content.probes as Array<Record<string, unknown>>) || []
        const mergedProbes = mergeProbes(baseProbes, stage as any)

        resolvedStage = {
          ...resolution.content,
          id: stage.id || (resolution.content.id as string),
          name: stage.name || (resolution.content.name as string),
          deps: stage.deps || (resolution.content.deps as string[] || []),
          params: stage.params || {},
          target: (stage as any).target || (resolution.content as any).target,
          action: (stage as any).action || (resolution.content as any).action,
          probes: mergedProbes
        }
      } else {
        const inlineProbes = (stage.probes as Array<Record<string, unknown>>) || []
        const mergedInlineProbes = [...inlineProbes]

        resolvedStage = {
          id: stage.id,
          name: stage.name,
          deps: stage.deps || [],
          params: stage.params || {},
          target: (stage as any).target,
          action: (stage as any).action,
          probes: mergedInlineProbes
        }
      }

      const pruned = pruneStages([resolvedStage], ctx.params || {})
      if (pruned.length === 0) continue

      resolvedStage = pruned[0]!
      const rendered = renderTemplates(resolvedStage, ctx)

      const metaStage = injectMeta(
        rendered,
        stage.ref || 'inline',
        stage.ref ? 'project' : 'project',
        false,
        stage.ref ? `ref:${stage.ref}` : undefined
      )

      stages.push(metaStage)
    }

    return {
      id: raw.id,
      name: raw.name,
      frozen_at: new Date().toISOString(),
      stages: stages as any
    }
  }
}

export function compileBlueprint(raw: Blueprint, ctx: CompileContext): FrozenBlueprint {
  const compiler = new BlueprintCompiler()
  return compiler.compile(raw, ctx)
}