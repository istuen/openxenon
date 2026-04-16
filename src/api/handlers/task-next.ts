import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { getQueryParams } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskById } from '../../db/operations/tasks'
import { getNextPendingStep } from '../../db/operations/steps'

async function handleTaskNext(
  request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = getQueryParams(url.toString())
    const taskId = params.taskId
    
    if (!taskId) {
      return badRequest('Query parameter taskId is required')
    }
    
    const task = getTaskById(db, taskId)
    
    if (!task) {
      return notFound(`Task '${taskId}' not found`)
    }
    
    if (task.status !== 'running') {
      return new Response(
        JSON.stringify({
          stepId: null,
          message: 'Task not started'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const step = getNextPendingStep(db, taskId)
    
    if (!step) {
      return new Response(
        JSON.stringify({
          stepId: null,
          message: 'All steps complete'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    return new Response(
      JSON.stringify({
        stepId: step.id,
        name: step.name,
        status: step.status,
        spec: step.spec,
        proof: step.proof
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
