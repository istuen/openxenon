import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { getQueryParams } from '../validation'
import { notFound } from '../errors'
import { getTaskById } from '../../db/operations/tasks'
import { getStepsByTaskId } from '../../db/operations/steps'

async function handleTaskStatus(
  request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = getQueryParams(url.toString())
    const taskId = params.taskId
    
    if (!taskId) {
      return new Response(
        JSON.stringify({
          error: 'MissingTaskId',
          message: 'Query parameter taskId is required',
          statusCode: 400
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const task = getTaskById(db, taskId)
    
    if (!task) {
      return notFound(`Task '${taskId}' not found`)
    }
    
    const steps = getStepsByTaskId(db, taskId)
    
    return new Response(
      JSON.stringify({
        task: {
          id: task.id,
          name: task.name,
          status: task.status,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt
        },
        steps: steps.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          proof: s.proof,
          startedAt: s.startedAt,
          completedAt: s.completedAt
        }))
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
        error: 'TaskStatusFailed',
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

registerRoute('GET', '/api/v1/task/status', handleTaskStatus)

export { handleTaskStatus }
