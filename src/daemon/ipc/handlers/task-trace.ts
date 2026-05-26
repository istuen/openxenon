import { getTaskDirectory } from '../../../kernel/processors/task-dir'
import { readTaskTrace } from '../../trace/writer'
import { notFound } from '../errors'
import { registerRoute } from '../router'
import { getQueryParams } from '../validation'

async function handleTaskTrace(request: Request, projectPath: string): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = getQueryParams(url.toString())
    const taskId = params.taskId

    if (!taskId) {
      return new Response(
        JSON.stringify({
          error: 'MissingTaskId',
          message: 'Query parameter taskId is required',
          statusCode: 400,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const taskDir = getTaskDirectory(projectPath, taskId)
    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    return new Response(
      JSON.stringify({
        taskId,
        tracePath: taskDir.tracePath,
        trace,
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
        error: 'TaskTraceFailed',
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

registerRoute('GET', '/api/v1/task/trace', handleTaskTrace)

export { handleTaskTrace }
