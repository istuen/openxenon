import { registerRoute } from '../../daemon/ipc/router'
import { getQueryParams } from '../../daemon/ipc/validation'
import { notFound } from '../../daemon/ipc/errors'
import { getTaskDirectory } from '../../kernel/lib/task-dir'
import { readTaskTrace } from '../../daemon/trace/writer'
import { existsSync } from 'fs'

async function handleTaskStatus(
  request: Request,
  projectPath: string
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

    const taskDir = getTaskDirectory(projectPath, taskId)

    if (!existsSync(taskDir.root)) {
      return notFound(`Task '${taskId}' not found`)
    }

    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    return new Response(
      JSON.stringify({
        task: {
          id: trace.taskId,
          name: trace.taskName,
          status: trace.status,
          startedAt: trace.startedAt,
          completedAt: trace.completedAt
        },
        stages: Array.from(trace.stages.values()).map(s => ({
          id: s.stageId,
          name: s.stageName,
          status: s.status,
          executedAt: s.startedAt,
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