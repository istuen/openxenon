import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest } from '../errors'
import { taskCircuitBreaker } from '../../circuit-breaker'
import { recoveryManager } from '../../recovery'

async function handleRecoveryRollback(request: Request, _projectPath: string): Promise<Response> {
  try {
    const body = await parseJSONBody<{
      taskId?: string
      recoveryPointId?: string
      action?: 'rollback' | 'retry'
    }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    if (!body.taskId) {
      return badRequest('taskId is required')
    }

    if (!body.action) {
      return badRequest('action is required (rollback or retry)')
    }

    if (taskCircuitBreaker.isOpen() && body.action === 'retry') {
      return new Response(
        JSON.stringify({
          error: 'CircuitBreakerOpen',
          message: 'Cannot retry due to circuit breaker. Please wait.',
          statusCode: 503,
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    if (body.action === 'rollback') {
      if (!body.recoveryPointId) {
        return badRequest('recoveryPointId is required for rollback')
      }

      const success = recoveryManager.rollbackTo(body.taskId, body.recoveryPointId)

      if (success) {
        taskCircuitBreaker.forceClose()
        return new Response(
          JSON.stringify({
            success: true,
            taskId: body.taskId,
            recoveryPointId: body.recoveryPointId,
            message: 'Rollback successful, circuit breaker reset',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      } else {
        return new Response(
          JSON.stringify({
            error: 'RollbackFailed',
            message: 'Failed to rollback to recovery point',
            statusCode: 500,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    if (body.action === 'retry') {
      const success = recoveryManager.retry(body.taskId)

      if (success) {
        return new Response(
          JSON.stringify({
            success: true,
            taskId: body.taskId,
            message: 'Retry initiated',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      } else {
        return new Response(
          JSON.stringify({
            error: 'RetryFailed',
            message: 'Failed to retry task',
            statusCode: 500,
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }
    }

    return badRequest('Invalid action')
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        error: 'RecoveryFailed',
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

registerRoute('POST', '/api/v1/recovery/rollback', handleRecoveryRollback)

export { handleRecoveryRollback }
