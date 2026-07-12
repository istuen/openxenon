/**
 * dual-track.ts — YAML compilation pipeline (v0.7.0: Langium removed)
 *
 * v0.7.0: OXN pipeline removed; only YAML pipeline remains
 */

import { existsSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { dirname, join } from 'path'
import { parse as parseYaml } from 'yaml'
import { ensureDirectory } from '@openxenon/engine/infra/filesystem'
import { preloadCompileDependencies } from '@openxenon/engine/infra/loader'
import { compileBlueprint, compileFrozen } from '@openxenon/engine/oxl/compiler/blueprint-compiler'
import { ASSEMBLY_JSON, BOUNDARY_DIR, FROZEN_BLUEPRINT_JSON } from '@openxenon/engine/kernel'
import type { Blueprint } from '@openxenon/engine/kernel'
import type { FrozenBlueprint } from '@openxenon/engine/kernel'

export type PipelineMode = 'yaml'

/**
 * Detect pipeline mode (v0.7.0: only YAML supported)
 */
export function detectPipeline(_blueprintPath: string): PipelineMode {
  return 'yaml'
}

// ========================
// YAML pipeline
// ========================

export interface YamlSubmitResult {
  taskId: string
  frozen: FrozenBlueprint
  pipeline: 'yaml'
}

export function submitYamlPipeline(
  blueprintPath: string,
  cwd: string,
  taskId: string,
  _taskName: string,
  params?: Record<string, unknown>,
): YamlSubmitResult {
  const content = readFileSync(blueprintPath, 'utf-8')
  const parsed = parseYaml(content) as Blueprint

  const compileCtx = {
    taskId,
    taskName: parsed.name || parsed.id || taskId,
    params: params || {},
  }

  const bpDir = dirname(blueprintPath)
  const assemblyPath = join(bpDir, 'blueprint.assembly.json')

  let frozenBlueprint: FrozenBlueprint
  if (existsSync(assemblyPath)) {
    const assembly = JSON.parse(readFileSync(assemblyPath, 'utf-8'))
    frozenBlueprint = compileFrozen(assembly, compileCtx)
  } else {
    frozenBlueprint = compileBlueprint(parsed, {
      ...compileCtx,
      dependencies: preloadCompileDependencies(join(cwd, BOUNDARY_DIR), {}, {}),
    })
  }

  return { taskId, frozen: frozenBlueprint, pipeline: 'yaml' }
}

// ========================
// Unified submit entry
// ========================

export interface UnifiedSubmitResult {
  taskId: string
  frozen: FrozenBlueprint
  pipeline: PipelineMode
}

/**
 * Unified Task submit entry: always uses YAML pipeline (v0.7.0)
 */
export function unifiedTaskSubmit(
  blueprintPath: string,
  cwd: string,
  taskId: string,
  taskName: string,
  options?: {
    params?: Record<string, unknown>
  },
): UnifiedSubmitResult {
  const result = submitYamlPipeline(blueprintPath, cwd, taskId, taskName, options?.params)
  return { ...result, pipeline: 'yaml' }
}

/**
 * Write FrozenBlueprint to task directory
 */
export function writeFrozenToTaskDir(
  cwd: string,
  taskId: string,
  frozen: FrozenBlueprint,
  _assembly?: unknown,
  sourceFormat?: string,
): { frozenPath: string; assemblyPath?: string } {
  const taskDir = join(cwd, BOUNDARY_DIR, 'tasks', taskId)
  ensureDirectory(taskDir)

  // Inject source_format metadata
  if (sourceFormat && !('_source_format' in (frozen as Record<string, unknown>))) {
    ;(frozen as Record<string, unknown>)._source_format = sourceFormat
  }

  const frozenPath = join(taskDir, FROZEN_BLUEPRINT_JSON)
  writeFileSync(frozenPath, JSON.stringify(frozen, null, 2), 'utf-8')

  return { frozenPath, assemblyPath: undefined }
}
