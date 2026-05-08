import { registerRoute } from '../../daemon/ipc/router'
import { parseJSONBody, validateRequiredFields } from '../../daemon/ipc/validation'
import { badRequest, notFound } from '../../daemon/ipc/errors'
import { getTaskDirectory } from '../../kernel/lib/task-dir'
import { readTaskTrace, writeTaskStatus } from '../../daemon/trace/writer'
import { existsSync } from 'fs'

async function handleTaskStop(
  request: Request,
  projectPath: string
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

    const taskId = body.taskId!
    const taskDir = getTaskDirectory(projectPath, taskId)

    if (!existsSync(taskDir.root)) {
      return notFound(`Task '${taskId}' not found`)
    }

    const trace = readTaskTrace(taskDir)
    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    writeTaskStatus(taskDir, taskId, 'FAILED')

    return new Response(
      JSON.stringify({
        status: 'stopped',
        taskId: taskId,
        taskStatus: 'FAILED'
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