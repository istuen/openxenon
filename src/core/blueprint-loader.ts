import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { getTaskPath } from './project'
import { safeParseBlueprint, type Blueprint } from '../types/arsenal/blueprint'
import { TASK_BLUEPRINT_FILE } from '../lib/task-dir'

export function resolveBlueprintPath(projectRoot: string, taskId: string): string {
  return join(getTaskPath(projectRoot, taskId), TASK_BLUEPRINT_FILE)
}

export function loadBlueprintFromYaml(projectRoot: string, taskId: string): Blueprint {
  const blueprintPath = resolveBlueprintPath(projectRoot, taskId)

  if (!existsSync(blueprintPath)) {
    throw new Error(`Blueprint file not found: ${blueprintPath}`)
  }

  const content = readFileSync(blueprintPath, 'utf-8')
  const parsed = JSON.parse(content)

  const result = safeParseBlueprint(parsed)
  if (!result.success) {
    throw new Error(`Invalid Blueprint schema: ${result.error.message}`)
  }

  return result.data
}

export function blueprintExists(projectRoot: string, taskId: string): boolean {
  const blueprintPath = resolveBlueprintPath(projectRoot, taskId)
  return existsSync(blueprintPath)
}