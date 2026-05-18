import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest } from '../errors'
import { taskCircuitBreaker } from '../../circuit-breaker'
import { recoveryManager } from '../../recovery'

async function handleStepVerify(
  request: Request,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{
      taskId?: string
      partId?: string
      passed?: boolean
    }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    if (!body.taskId) {
      return badRequest('taskId is required')
    }

    if (taskCircuitBreaker.isOpen()) {
      return new Response(
        JSON.stringify({
          error: 'CircuitBreakerOpen',
          message: 'Task execution is paused due to repeated failures. Please wait and retry.',
          statusCode: 503
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    if (body.passed === false || body.passed === true) {
      if (body.passed) {
        taskCircuitBreaker.recordSuccess()
      } else {
        taskCircuitBreaker.recordFailure()
      }

      if (body.taskId && body.partId) {
        recoveryManager.createRecoveryPoint(body.taskId, body.partId, {
          verified: body.passed,
          timestamp: Date.now()
        })
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        taskId: body.taskId,
        partId: body.partId,
        circuitBreakerState: taskCircuitBreaker.getState(),
        message: body.passed ? 'Part verified successfully' : 'Part verification failed'
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
        error: 'StepVerifyFailed',
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

registerRoute('POST', '/api/v1/step/verify', handleStepVerify)

export { handleStepVerify }