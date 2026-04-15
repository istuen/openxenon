import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskById, updateTaskStatus } from '../../db/operations/tasks'

async function handleTaskStop(
  request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ taskId?: string }>(request)
    
    if (!body) {
      return badRequest('Request body is required')
    }
    
    const validation = validateRequiredFields(body as Record<string, unknown>, ['taskId'])
    
    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }
    
    const task = getTaskById(db, body.taskId!)
    
    if (!task) {
      return notFound(`Task '${body.taskId}' not found`)
    }
    
    const updatedTask = updateTaskStatus(db, body.taskId!, 'failed')
    
    return new Response(
      JSON.stringify({
        status: 'stopped',
        taskId: body.taskId,
        taskStatus: updatedTask?.status
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
        error: 'TaskStopFailed',
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

registerRoute('POST', '/api/v1/task/stop', handleTaskStop)

export { handleTaskStop }
