import type { Blueprint } from '../schemas/blueprint.schema'
import type { FrozenBlueprint } from '../schemas/frozen-schema'
import { computeContentHash } from '../schemas/frozen-schema'
import { validateDagTopology, type DagNode } from '../schemas/dag-validator'
import { compileCache } from './compile-cache'

export interface CompileContext {
  taskId: string
  taskName: string
  params?: Record<string, unknown>
  dependencies?: CompileDependencies
}

export interface ResolvedProbe {
  type: string
  params: Record<string, unknown>
  probes_content?: Record<string, unknown>
}

export interface ResolvedPart {
  id: string
  name: string
  deps: string[]
  params: Record<string, unknown>
  probes: ResolvedProbe[]
  target?: Record<string, unknown>
  action?: Record<string, unknown>
}

export interface CompileDependencies {
  parts: Map<string, Record<string, unknown>>
  probes: Map<string, Record<string, unknown>>
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

function validateParams(partContent: Record<string, unknown>, providedParams: Record<string, unknown> = {}): void {
  const paramsSchema = partContent.params_schema as { required?: string[] } | undefined
  if (!paramsSchema) return

  const required = paramsSchema.required || []
  for (const key of required) {
    if (!(key in providedParams)) {
      throw new Error(`Part 缺少必填参数 "${key}"`)
    }
  }
}

function mergeProbes(
  baseProbes: Array<Record<string, unknown>>,
  overridePart: { probes_override?: Array<Record<string, unknown>>; probes_append?: Array<Record<string, unknown>>; probes?: Array<Record<string, unknown>> }
): Array<Record<string, unknown>> {
  const override = overridePart.probes_override || overridePart.probes || []
  const append = overridePart.probes_append || []

  if (overridePart.probes_override) {
    return [...override, ...append]
  }

  return [...baseProbes, ...override, ...append]
}

function pruneParts(
  parts: Array<Record<string, unknown>>,
  params: Record<string, unknown> = {}
): Array<Record<string, unknown>> {
  return parts.filter(part => {
    const condition = part.condition as string | undefined
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

function renderTemplates(part: Record<string, unknown>, ctx: CompileContext): Record<string, unknown> {
  const result = { ...part }

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

function injectMeta(part: Record<string, unknown>, ref: string, namespace: 'kernel' | 'global' | 'project', originalPath?: string): Record<string, unknown> {
  const frozenAt = new Date().toISOString()
  const content = JSON.stringify(part)

  const meta = {
    ref,
    resolved_from: namespace,
    original_path: originalPath,
    frozen_at: frozenAt,
    content_hash: computeContentHash(content)
  }

  const probes = (part.probes as Array<Record<string, unknown>> || []).map((probe, idx) => {
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
    ...part,
    _xenon_meta: meta,
    probes
  }
}

export class BlueprintCompiler {
  compileWithCache(raw: Blueprint, ctx: CompileContext, dependencyHashes: Record<string, string> = {}): FrozenBlueprint {
    const blueprintContent = JSON.stringify(raw)
    const cached = compileCache.get(blueprintContent)

    if (cached && compileCache.isValid(cached, dependencyHashes)) {
      return cached.frozenBlueprint
    }

    const frozen = this.compile(raw, ctx)
    compileCache.set(blueprintContent, frozen, dependencyHashes)
    return frozen
  }

  compile(raw: Blueprint, ctx: CompileContext): FrozenBlueprint {
    const dagNodes: DagNode[] = (raw.parts || []).map(part => ({
      id: part.id || (part as any).name,
      deps: part.deps || []
    }))

    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG 验证失败: ${dagResult.errors.join('; ')}`)
    }

    const deps = ctx.dependencies
    const parts: Array<Record<string, unknown>> = []

    for (const part of raw.parts || []) {
      let resolvedPart: Record<string, unknown>
      let resolvedRef: string | undefined = part.ref
      let partToResolve: Record<string, unknown> = part as unknown as Record<string, unknown>

      if (part.slot) {
        const slotValue = raw.slots?.[part.slot]
        if (!slotValue) {
          throw new Error(`Slot "${part.slot}" not found in blueprint slots`)
        }
        if (typeof slotValue === 'string') {
          resolvedRef = slotValue
          let partContent = deps?.parts.get(slotValue)
          if (!partContent) {
            partContent = deps?.parts.get(`project/${slotValue}`)
          }
          if (!partContent) {
            partContent = deps?.parts.get(`./${slotValue}`)
          }
          if (!partContent) {
            throw new Error(`Slot "${part.slot}" resolved to "${slotValue}" but part not found in dependencies`)
          }
          partToResolve = partContent
        } else {
          resolvedRef = `slot:${part.slot}:inline`
          partToResolve = {
            ...slotValue,
            id: part.id,
            name: part.name || slotValue.name,
            deps: part.deps || slotValue.deps || []
          }
        }
      }

      if (resolvedRef) {
        const partContent = partToResolve
        if (!partContent || typeof partContent !== 'object') {
          throw new Error(`Part ref "${resolvedRef}" 解析失败，未找到对应资产`)
        }

        validateParams(partContent, part.params || {})

        const baseProbes = (partContent.probes as Array<Record<string, unknown>>) || []
        const mergedProbes = mergeProbes(baseProbes, part as any)

        resolvedPart = {
          ...partContent,
          id: part.id || (partContent.id as string),
          name: part.name || (partContent.name as string),
          deps: part.deps || (partContent.deps as string[] || []),
          params: part.params || {},
          target: (part as any).target || (partContent as any).target,
          action: (part as any).action || (partContent as any).action,
          probes: mergedProbes
        }
      } else {
        const inlineProbes = (part.probes as Array<Record<string, unknown>>) || []
        const mergedInlineProbes = [...inlineProbes]

        resolvedPart = {
          id: part.id,
          name: part.name,
          deps: part.deps || [],
          params: part.params || {},
          target: (part as any).target,
          action: (part as any).action,
          probes: mergedInlineProbes
        }
      }

      const pruned = pruneParts([resolvedPart], ctx.params || {})
      if (pruned.length === 0) continue

      resolvedPart = pruned[0]!
      const rendered = renderTemplates(resolvedPart, ctx)

      const metaPart = injectMeta(
        rendered,
        resolvedRef || 'inline',
        resolvedRef ? 'project' : 'project',
        resolvedRef ? `ref:${resolvedRef}` : undefined
      )

      parts.push(metaPart)
    }

    return {
      id: raw.id,
      name: raw.name,
      frozen_at: new Date().toISOString(),
      parts: parts as any
    }
  }
}

export function compileBlueprint(raw: Blueprint, ctx: CompileContext): FrozenBlueprint {
  const compiler = new BlueprintCompiler()
  return compiler.compile(raw, ctx)
}

export function compileBlueprintWithCache(raw: Blueprint, ctx: CompileContext, dependencyHashes: Record<string, string> = {}): FrozenBlueprint {
  const compiler = new BlueprintCompiler()
  return compiler.compileWithCache(raw, ctx, dependencyHashes)
}