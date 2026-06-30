import { getTaskDirectory } from '@openxenon/engine/Work/task-directory'
import { createPartState } from '@openxenon/engine/Work/task-trace'
import { readBlueprint, readTaskTrace, writePartComplete, writePartStart } from '../../trace/writer'
import { badRequest, notFound } from '../errors'
import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'

async function handleStepStart(request: Request, projectPath: string): Promise<Response> {
  try {
    const body = await parseJSONBody<{ stepId?: string; taskId?: string; stepName?: string }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    const taskId = body.taskId
    if (!taskId) {
      return badRequest('taskId is required')
    }

    const taskDir = getTaskDirectory(projectPath, taskId)
    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound('Task not found')
    }

    const parsed = readBlueprint(taskDir)
    if (!parsed) {
      return notFound('Blueprint not found')
    }

    const part = parsed.parts.find((s) => s.id === body.stepId || s.name === body.stepName)

    if (!part) {
      return notFound('Part not found')
    }

    let partState = trace.parts.get(part?.id)

    if (!partState) {
      writePartStart(taskDir, taskId, part.id, part.name)
      partState = createPartState(part.id, part.name)
      partState.status = 'PENDING'
      trace.parts.set(part.id, partState)
    }

    const currentPartState = partState

    if (currentPartState.status === 'PENDING') {
      writePartStart(taskDir, taskId, part.id, part.name)
      currentPartState.status = 'RUNNING'
    }

    writePartComplete(taskDir, taskId, part.id, currentPartState.status)

    return new Response(
      JSON.stringify({
        stepId: part.id,
        status: currentPartState.status,
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
        error: 'StepStartFailed',
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

registerRoute('POST', '/api/v1/step/start', handleStepStart)

export { handleStepStart }
