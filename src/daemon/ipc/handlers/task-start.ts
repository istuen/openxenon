import { join } from 'path'
import { existsSync } from '@openxenon/engine/infra/filesystem'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import { readTaskTrace } from '../../trace/writer'
import { badRequest, notFound } from '../errors'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'

async function handleTaskStart(request: Request, projectPath: string): Promise<Response> {
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

    const trace = readTaskTrace({
      root: taskDir,
      taskId,
      blueprintPath: join(taskDir, 'blueprint.md'),
      tracePath: join(taskDir, 'task-trace.jsonl'),
    })

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    return new Response(
      JSON.stringify({
        taskId: taskId,
        status: trace.status,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        error: 'TaskStartFailed',
        message: errorMessage,
        statusCode: 500,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

registerRoute('POST', '/api/v1/task/start', handleTaskStart)

export { handleTaskStart }
