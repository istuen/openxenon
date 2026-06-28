import type { Blueprint, CompiledBlueprint, HashPort } from '@openxenon/engine/kernel/index'
import { computeContentHash } from '@openxenon/engine/kernel/index'
import { type DagNode, validateDagTopology } from '@openxenon/engine/oxl/validators/blueprint-dag'
import type { IOxnCompiler } from '../contracts/oxn-compiler-port'
import { createOxnServices } from '../langium-driver/oxn-services'

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

function resolveParams(
  partContent: Record<string, unknown>,
  providedParams: Record<string, unknown> = {},
): Record<string, unknown> {
  const propsSchema = partContent.props as
    | {
        type: string
        properties?: Record<string, { type: string; default?: unknown; description?: string }>
        required?: string[]
        default?: Record<string, unknown>
      }
    | undefined

  if (!propsSchema) return { ...providedParams }

  const schemaDefaults = propsSchema.default || {}
  const properties = propsSchema.properties || {}
  const propDefaults: Record<string, unknown> = {}
  for (const [key, prop] of Object.entries(properties)) {
    if (prop.default !== undefined) {
      propDefaults[key] = prop.default
    }
  }

  const merged = { ...schemaDefaults, ...propDefaults, ...providedParams }

  const required = propsSchema.required || []
  for (const key of required) {
    if (!(key in merged) || merged[key] === undefined || merged[key] === null) {
      throw new Error(`Part "${partContent.id || partContent.name}" missing required parameter "${key}"`)
    }
  }

  return merged
}

function mergeProbes(
  baseProbes: Array<Record<string, unknown>>,
  partProbes: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  if (partProbes.length > 0) {
    return partProbes
  }
  return baseProbes
}

function pruneParts(
  parts: Array<Record<string, unknown>>,
  params: Record<string, unknown> = {},
): Array<Record<string, unknown>> {
  return parts.filter((part) => {
    const condition = part.condition as string | undefined
    if (!condition) return true
    return evaluateCondition(condition, params)
  })
}

function renderString(str: string, ctx: CompileContext): string {
  return str
    .replace(/\{\{([^}]+)\}\}/g, (_match, expr) => {
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
    .replace(/\$\{([^}]+)\}/g, (_match, expr) => {
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
      return `\${${trimmed}}`
    })
}

function renderValue(value: unknown, ctx: CompileContext): unknown {
  if (typeof value === 'string') {
    return renderString(value, ctx)
  }
  if (Array.isArray(value)) {
    return value.map((v) => renderValue(v, ctx))
  }
  if (value !== null && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      result[k] = renderValue(v, ctx)
    }
    return result
  }
  return value
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

  const probes = result.probes as Array<Record<string, unknown>> | undefined
  if (probes) {
    result.probes = probes.map((probe) => {
      const rendered = { ...probe }
      if (probe.command && typeof probe.command === 'string') {
        rendered.command = renderString(probe.command, ctx)
      }
      if (probe.pattern && typeof probe.pattern === 'string') {
        rendered.pattern = renderString(probe.pattern, ctx)
      }
      if (probe.params && typeof probe.params === 'object') {
        rendered.params = renderValue(probe.params, ctx)
      }
      return rendered
    })
  }

  return result
}

export class OxnCompiler implements IOxnCompiler {
  constructor(private readonly hashPort: HashPort) {
    createOxnServices()
  }

  compile(raw: Blueprint, ctx: CompileContext): CompiledBlueprint {
    const dagNodes: DagNode[] = (raw.parts || []).map((part) => ({
      id: part.id || part.name || '',
      deps: part.deps || [],
    }))

    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG validation failed: ${dagResult.errors.join('; ')}`)
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
            deps: part.deps || (slotValue as Record<string, unknown>).deps || [],
          }
        }
      }

      if (resolvedRef) {
        const partContent = partToResolve
        if (!partContent || typeof partContent !== 'object') {
          throw new Error(`Part ref "${resolvedRef}" resolution failed, no matching asset found`)
        }

        const resolvedPartParams = resolveParams(partContent, part.params || {})

        if (part.min_version !== undefined) {
          const required = part.min_version
          const actual = (partContent._version as number) || 1
          if (actual < required) {
            throw new Error(
              `Part "${part.id}" requires version >= ${required} of "${resolvedRef}", ` + `but got version ${actual}`,
            )
          }
        }

        const baseProbes = (partContent.probes as Array<Record<string, unknown>>) || []
        const partProbes = (part.probes as Array<Record<string, unknown>>) || []
        const mergedProbes = mergeProbes(baseProbes, partProbes)

        resolvedPart = {
          ...partContent,
          id: part.id || (partContent.id as string),
          name: part.name || (partContent.name as string),
          deps: part.deps || (partContent.deps as string[]) || [],
          params: resolvedPartParams,
          target: part.target || (partContent as { target?: unknown }).target,
          action: part.action || (partContent as { action?: unknown }).action,
          probes: mergedProbes,
        }
      } else {
        const inlineProbes = (part.probes as Array<Record<string, unknown>>) || []
        const mergedInlineProbes = [...inlineProbes]

        resolvedPart = {
          id: part.id,
          name: part.name,
          deps: part.deps || [],
          params: part.params || {},
          target: part.target,
          action: part.action,
          probes: mergedInlineProbes,
        }
      }

      const pruned = pruneParts([resolvedPart], ctx.params || {})
      if (pruned.length === 0) continue

      resolvedPart = pruned[0]!
      const rendered = renderTemplates(resolvedPart, ctx)

      const metaPart = this.injectMetaWithHash(
        rendered,
        resolvedRef || 'inline',
        resolvedRef ? 'project' : 'project',
        resolvedRef ? `ref:${resolvedRef}` : undefined,
      )

      parts.push(metaPart)
    }

    return {
      id: raw.id,
      name: raw.name,
      frozen_at: new Date().toISOString(),
      parts: parts as any,
    }
  }

  compileAssembly(raw: Blueprint, ctx: CompileContext): Record<string, unknown> {
    const deps = ctx.dependencies
    const parts: Array<Record<string, unknown>> = []

    for (const part of raw.parts || []) {
      const resolved: Record<string, unknown> = { ...part }

      if (part.slot) {
        resolved._assembly_slot = part.slot
        parts.push(resolved)
        continue
      }

      if (part.ref) {
        const partContent =
          deps?.parts.get(part.ref) || deps?.parts.get(`project/${part.ref}`) || deps?.parts.get(`./${part.ref}`)
        if (partContent) {
          if (part._depHash && partContent._compiled_hash) {
            const expected = part._depHash
            const actual = partContent._compiled_hash as string
            if (actual !== expected) {
              throw new Error(
                `Part "${part.id}" requires compiled hash "${expected}", ` +
                  `got "${actual}". Dependency updated - re-promote required.`,
              )
            }
          }

          Object.assign(resolved, {
            ...partContent,
            id: part.id || partContent.id,
            name: part.name || partContent.name,
            deps: part.deps || partContent.deps || [],
            params: part.params || {},
          })
          delete resolved.ref
        }
      }

      parts.push(resolved)
    }

    return {
      id: raw.id,
      name: raw.name,
      _version: raw._version,
      assembly_at: new Date().toISOString(),
      props: raw.props,
      slots: raw.slots,
      parts,
    }
  }

  compileFrozen(assembly: Record<string, unknown>, ctx: CompileContext): CompiledBlueprint {
    const slots = (assembly.slots as Record<string, unknown>) || {}
    const parts: Array<Record<string, unknown>> = []

    for (const part of (assembly.parts as Array<Record<string, unknown>>) || []) {
      const resolved = { ...part }

      if (resolved._assembly_slot) {
        const slotName = resolved._assembly_slot as string
        const slotValue = slots[slotName]
        if (slotValue) {
          const slotDef = typeof slotValue === 'string' ? { ref: slotValue } : (slotValue as Record<string, unknown>)
          Object.assign(resolved, slotDef)
        }
      }

      const resolvedParams = resolveParams(resolved, (part.params || {}) as Record<string, unknown>)

      const pruned = pruneParts([resolved], ctx.params || {})
      if (pruned.length === 0) continue

      const partOut = { ...pruned[0], params: resolvedParams }
      const rendered = renderTemplates(partOut, ctx)
      const metaPart = this.injectMetaWithHash(
        rendered,
        (part.ref as string) || (part.slot as string) || 'inline',
        'project',
      )
      parts.push(metaPart)
    }

    const dagNodes: DagNode[] = parts.map((p) => ({
      id: (p.id || p.name) as string,
      deps: (p.deps as string[]) || [],
    }))
    const dagResult = validateDagTopology(dagNodes)
    if (!dagResult.valid) {
      throw new Error(`DAG validation failed: ${dagResult.errors.join('; ')}`)
    }

    return {
      id: (assembly.id || assembly.name) as string,
      name: (assembly.name || assembly.id) as string,
      frozen_at: new Date().toISOString(),
      parts: parts as any,
    }
  }

  private injectMetaWithHash(
    part: Record<string, unknown>,
    ref: string,
    namespace: 'kernel' | 'global' | 'project',
    originalPath?: string,
  ): Record<string, unknown> {
    const frozenAt = new Date().toISOString()
    const content = JSON.stringify(part)

    const meta = {
      ref,
      resolved_from: namespace,
      original_path: originalPath,
      frozen_at: frozenAt,
      content_hash: computeContentHash(content, this.hashPort),
    }

    const probes = ((part.probes as Array<Record<string, unknown>>) || []).map((probe, idx) => {
      const probeRef = (probe.ref as string) || `inline-probe-${idx}`
      return {
        ...probe,
        _xenon_meta: {
          ...meta,
          ref: probeRef,
        },
      }
    })

    return {
      ...part,
      _xenon_meta: meta,
      probes,
    }
  }
}

export function createOxnCompiler(hashPort: HashPort): IOxnCompiler {
  return new OxnCompiler(hashPort)
}

export class BlueprintCompiler extends OxnCompiler {}

export function compileBlueprint(raw: Blueprint, ctx: CompileContext): CompiledBlueprint {
  const compiler = new OxnCompiler(null as any)
  return compiler.compile(raw, ctx)
}

export function compileAssembly(raw: Blueprint, ctx: CompileContext): Record<string, unknown> {
  const compiler = new OxnCompiler(null as any)
  return compiler.compileAssembly(raw, ctx)
}

export function compileFrozen(assembly: Record<string, unknown>, ctx: CompileContext): CompiledBlueprint {
  const compiler = new OxnCompiler(null as any)
  return compiler.compileFrozen(assembly, ctx)
}
