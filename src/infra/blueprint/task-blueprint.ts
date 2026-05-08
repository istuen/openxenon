import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { getTaskPath } from '../../kernel'
import { homedir } from 'os'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const TEMPLATE_BLUEPRINT_SOURCE = join(__dirname, '..', 'templates', 'blueprint.yaml')
export const TEMPLATE_BLUEPRINT_PATH = join(homedir(), '.openxenon', 'templates', 'blueprint.yaml')

export interface CreateTaskOptions {
  projectRoot: string
  taskId: string
  taskName: string
  taskDescription: string
}

export function getTaskBlueprintPath(projectRoot: string, taskId: string): string {
  return join(getTaskPath(projectRoot, taskId), 'blueprint.yaml')
}

export function createTaskDirectory(projectRoot: string, taskId: string): string {
  const taskPath = getTaskPath(projectRoot, taskId)

  if (!existsSync(taskPath)) {
    mkdirSync(taskPath, { recursive: true })
  }

  return taskPath
}

export function createTaskBlueprintFromTemplate(options: CreateTaskOptions): string {
  const { projectRoot, taskId, taskName, taskDescription } = options

  createTaskDirectory(projectRoot, taskId)

  const blueprintPath = getTaskBlueprintPath(projectRoot, taskId)
  const templateContent = loadBlueprintTemplate()

  const filledContent = fillBlueprintTemplate(templateContent, {
    TASK_ID: taskId,
    TASK_NAME: taskName,
    TASK_DESCRIPTION: taskDescription,
    CREATED_AT: new Date().toISOString()
  })

  writeFileSync(blueprintPath, filledContent, 'utf-8')

  return blueprintPath
}

export function loadBlueprintTemplate(): string {
  if (existsSync(TEMPLATE_BLUEPRINT_PATH)) {
    return readFileSync(TEMPLATE_BLUEPRINT_PATH, 'utf-8')
  }

  if (existsSync(TEMPLATE_BLUEPRINT_SOURCE)) {
    return readFileSync(TEMPLATE_BLUEPRINT_SOURCE, 'utf-8')
  }

  throw new Error(`Blueprint template not found at ${TEMPLATE_BLUEPRINT_PATH} or ${TEMPLATE_BLUEPRINT_SOURCE}`)
}

export function fillBlueprintTemplate(
  template: string,
  values: Record<string, string>
): string {
  let result = template

  for (const [key, value] of Object.entries(values)) {
    const placeholder = `{{${key}}}`
    result = result.split(placeholder).join(value)
  }

  return result
}

export function loadTaskBlueprint(projectRoot: string, taskId: string): string {
  const blueprintPath = getTaskBlueprintPath(projectRoot, taskId)

  if (!existsSync(blueprintPath)) {
    throw new Error(`Blueprint file not found: ${blueprintPath}`)
  }

  return readFileSync(blueprintPath, 'utf-8')
}

export function validateBlueprintYaml(yamlContent: string): boolean {
  try {
    const lines = yamlContent.split('\n')

    for (const line of lines) {
      if (line.includes('task:') || line.includes('stages:') || line.includes('stageDefinitions:')) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}