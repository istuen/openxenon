import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { getTaskPath } from './project'
import { type Blueprint, BlueprintSchema } from '../types/arsenal/blueprint'
import { TASK_BLUEPRINT_FILE } from '../lib/task-dir'

export function saveBlueprintToYaml(projectRoot: string, taskId: string, blueprint: Blueprint): void {
  const taskPath = getTaskPath(projectRoot, taskId)

  if (!existsSync(taskPath)) {
    mkdirSync(taskPath, { recursive: true })
  }

  BlueprintSchema.parse(blueprint)

  const blueprintPath = join(taskPath, TASK_BLUEPRINT_FILE)
  writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2))
}