import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest } from '../errors'
import { createTask, updateTaskActiveBlueprint } from '../../db/operations/tasks'
import { createBlueprint } from '../../db/operations/blueprints'
import { createTaskDirectory } from '../../core/boundary-project'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'
import { saveBlueprintToYaml } from '../../core/blueprint-persister'
import { type Blueprint } from '../../types/arsenal/blueprint'
import { join } from 'path'
import { mkdirSync, existsSync, writeFileSync } from 'fs'

async function handleTaskSubmit(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{
      task?: string
      blueprint?: Blueprint
    }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    const validation = validateRequiredFields(body as Record<string, unknown>, ['task', 'blueprint'])

    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }

    const taskName = body.task as string
    const blueprintInput = body.blueprint as Blueprint

    const task = createTask(db, taskName)

    const blueprint = createBlueprint(db, task.id, blueprintInput.name || `${taskName}-blueprint`, 'CANONICAL')
    updateTaskActiveBlueprint(db, task.id, blueprint.id)

    const taskDir = createTaskDirectory(projectPath, task.id)

    const blueprintDir = join(taskDir, 'blueprints')
    if (!existsSync(blueprintDir)) {
      mkdirSync(blueprintDir, { recursive: true })
    }

    if (blueprintInput.topology && blueprintInput.topology.length > 0) {
      const bpFilePath = join(blueprintDir, 'bp_001.json')
      const bpContent = {
        id: blueprint.id,
        status: 'DRAFT',
        topology: blueprintInput.topology,
        edges: blueprintInput.edges || [],
        source: blueprintInput.source || null
      }
      writeFileSync(bpFilePath, JSON.stringify(bpContent, null, 2), 'utf-8')
    }

    const blueprintWithIds = {
      ...blueprintInput,
      id: blueprint.id,
      status: 'CANONICAL' as const
    }

    saveBlueprintToYaml(projectPath, task.id, blueprintWithIds)

    const manifest = createEmptyStepManifest(task.id)
    const manifestPath = join(taskDir, 'step-manifest.json')
    writeStepManifest(manifestPath, manifest)

    return new Response(
      JSON.stringify({
        taskId: task.id,
        blueprintId: blueprint.id,
        blueprintFile: `tasks/${task.id}/blueprint.json`,
        status: task.status,
        stagesCount: blueprintInput.stages?.length || 0,
        message: 'Task created successfully with Blueprint YAML'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        error: 'TaskSubmitFailed',
        message: errorMessage,
        statusCode: 500
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

registerRoute('POST', '/api/v1/task/submit', handleTaskSubmit)

export { handleTaskSubmit }