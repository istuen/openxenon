import { existsSync } from '../../../infra/filesystem'
import { getTaskDirectory } from '../../../kernel/processors/task-dir'
import { taskCircuitBreaker } from '../../circuit-breaker'
import { recoveryManager } from '../../recovery'
import { readTaskTrace } from '../../trace/writer'
import { notFound } from '../errors'
import { registerRoute } from '../router'
import { getQueryParams } from '../validation'

async function handleTaskStatus(request: Request, projectPath: string): Promise<Response> {
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

    if (!existsSync(taskDir.root)) {
      return notFound(`Task '${taskId}' not found`)
    }

    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    const latestRecoveryPoint = recoveryManager.getLatestRecoveryPoint(taskId)

    return new Response(
      JSON.stringify({
        task: {
          id: trace.taskId,
          name: trace.taskName,
          status: trace.status,
          startedAt: trace.startedAt,
          completedAt: trace.completedAt,
        },
        parts: Array.from(trace.parts.values()).map((s) => ({
          id: s.partId,
          name: s.partName,
          status: s.status,
          executedAt: s.startedAt,
          completedAt: s.completedAt,
        })),
        circuitBreakerState: taskCircuitBreaker.getState(),
        recoveryPoints: recoveryManager.getRecoveryPoints(taskId).map((rp) => ({
          id: rp.id,
          partId: rp.partId,
          timestamp: rp.timestamp,
        })),
        latestRecoveryPoint: latestRecoveryPoint
          ? {
              id: latestRecoveryPoint.id,
              partId: latestRecoveryPoint.partId,
              timestamp: latestRecoveryPoint.timestamp,
            }
          : null,
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
        error: 'TaskStatusFailed',
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

registerRoute('GET', '/api/v1/task/status', handleTaskStatus)

export { handleTaskStatus }
