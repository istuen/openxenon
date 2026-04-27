import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { badRequest, notFound } from '../errors'
import { getTaskById } from '../../db/operations/tasks'
import { loadBlueprintFromYaml } from '../../core/blueprint-loader'

async function handleTaskNext(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      return badRequest('Query parameter taskId is required')
    }

    const task = getTaskById(db, taskId)

    if (!task) {
      return notFound(`Task '${taskId}' not found`)
    }

    if (task.status !== 'RUNNING') {
      return new Response(
        JSON.stringify({
          stageId: null,
          message: 'Task not started'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    let blueprint
    try {
      blueprint = loadBlueprintFromYaml(projectPath, taskId)
    } catch {
      return notFound('Blueprint YAML not found for this task')
    }

    const firstStage = blueprint.stages[0]

    if (!firstStage) {
      return new Response(
        JSON.stringify({
          stageId: null,
          message: 'No stages defined in blueprint'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        stageId: firstStage.id,
        name: firstStage.name,
        proof: firstStage.proof,
        spec: firstStage.proof.spec.description
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
        error: 'TaskNextFailed',
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

registerRoute('GET', '/api/v1/task/next', handleTaskNext)

export { handleTaskNext }