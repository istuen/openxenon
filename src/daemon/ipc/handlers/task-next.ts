import { getTaskDirectory } from '@openxenon/engine/Work/task-directory'
import { readBlueprint, readTaskTrace } from '../../trace/writer'
import { badRequest, notFound } from '../errors'
import { registerRoute } from '../router'

async function handleTaskNext(request: Request, projectPath: string): Promise<Response> {
  try {
    const url = new URL(request.url)
    const taskId = url.searchParams.get('taskId')

    if (!taskId) {
      return badRequest('Query parameter taskId is required')
    }

    const taskDir = getTaskDirectory(projectPath, taskId)
    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    if (trace.status !== 'RUNNING') {
      return new Response(
        JSON.stringify({
          partId: null,
          message: 'Task not started',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const parsed = readBlueprint(taskDir)
    if (!parsed) {
      return notFound('Blueprint YAML not found for this task')
    }

    const firstPart = parsed.parts[0]

    if (!firstPart) {
      return new Response(
        JSON.stringify({
          partId: null,
          message: 'No parts defined in blueprint',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    return new Response(
      JSON.stringify({
        partId: firstPart.id,
        name: firstPart.name,
        target: firstPart.target,
        spec: firstPart.spec?.description,
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
        error: 'TaskNextFailed',
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

registerRoute('GET', '/api/v1/task/next', handleTaskNext)

export { handleTaskNext }
