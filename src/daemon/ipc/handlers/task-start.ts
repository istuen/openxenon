import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest, notFound } from '../errors'
import { readTaskTrace } from '../../trace/writer'
import { existsSync } from 'fs'
import { join } from 'path'
import { BOUNDARY_DIR } from '../../../kernel/constants'

async function handleTaskStart(
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
    const taskDir = join(projectPath, BOUNDARY_DIR, 'tasks', taskId)

    if (!existsSync(taskDir)) {
      return notFound(`Task '${taskId}' not found`)
    }

    const trace = readTaskTrace(
      { root: taskDir, taskId, blueprintPath: join(taskDir, 'blueprint.oxn'), tracePath: join(taskDir, 'task-trace.jsonl'), manifestPath: join(taskDir, 'state.json') }
    )

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    return new Response(
      JSON.stringify({
        taskId: taskId,
        status: trace.status
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
        error: 'TaskStartFailed',
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

registerRoute('POST', '/api/v1/task/start', handleTaskStart)

export { handleTaskStart }
