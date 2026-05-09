import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest } from '../errors'

async function handleStepVerify(
  request: Request,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{
      taskId?: string
      stageId?: string
    }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    if (!body.taskId) {
      return badRequest('taskId is required')
    }

    return new Response(
      JSON.stringify({
        success: true,
        taskId: body.taskId,
        stageId: body.stageId,
        message: 'Step verify stub - needs implementation with new architecture'
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
