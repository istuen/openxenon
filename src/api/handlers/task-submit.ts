import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest } from '../errors'
import { createTask, updateTaskActiveBlueprint } from '../../db/operations/tasks'
import { createBlueprint } from '../../db/operations/blueprints'
import { createStage } from '../../db/operations/stages'
import { createTaskDirectory } from '../../core/boundary-project'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'
import { join } from 'path'

async function handleTaskSubmit(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ task?: string; stages?: unknown[] }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    const validation = validateRequiredFields(body as Record<string, unknown>, ['task', 'stages'])

    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }

    const taskName = body.task as string
    const stagesInput = (body.stages || []) as Array<{
      name: string
      spec: string
      proof: string
      target?: string
      deps?: string[]
      action?: string
    }>

    const task = createTask(db, taskName)

    const blueprint = createBlueprint(db, task.id, `${taskName}-blueprint`, 'CANONICAL')
    updateTaskActiveBlueprint(db, task.id, blueprint.id)

    for (const stageInput of stagesInput) {
      createStage(
        db,
        blueprint.id,
        stageInput.name,
        stageInput.target || stageInput.spec,
        stageInput.spec,
        stageInput.proof,
        stageInput.deps || [],
        stageInput.action
      )
    }

    const taskDir = createTaskDirectory(projectPath, task.id)

    const manifest = createEmptyStepManifest(task.id)
    const manifestPath = join(taskDir, 'step-manifest.json')
    writeStepManifest(manifestPath, manifest)

    return new Response(
      JSON.stringify({
        taskId: task.id,
        blueprintId: blueprint.id,
        status: task.status,
        stagesCount: stagesInput.length,
        message: 'Task created successfully'
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