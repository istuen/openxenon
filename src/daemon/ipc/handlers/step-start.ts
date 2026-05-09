import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskDirectory } from '../../../kernel/lib/task-dir'
import { readTaskTrace, writeStageStart, writeStageComplete } from '../../trace/writer'
import { createStageState } from '../../../kernel/lib/task-trace'
import { readBlueprint } from '../../../kernel/lib/blueprint-parser'

async function handleStepStart(
  request: Request,
  projectPath: string
): Promise<Response> {
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

    let stage = parsed.stages.find(s => s.id === body.stepId || s.name === body.stepName)

    if (!stage) {
      return notFound('Stage not found')
    }

    let stageState = trace.stages.get(stage!.id)

    if (!stageState) {
      writeStageStart(taskDir, taskId, stage.id, stage.name)
      stageState = createStageState(stage.id, stage.name)
      stageState.status = 'PENDING'
      trace.stages.set(stage.id, stageState)
    }

    if (stageState.status === 'PENDING') {
      writeStageComplete(taskDir, taskId, stage.id, 'RUNNING')
      stageState.status = 'RUNNING'
    }

    return new Response(
      JSON.stringify({
        stepId: stage.id,
        status: stageState.status
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
        error: 'StepStartFailed',
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

registerRoute('POST', '/api/v1/step/start', handleStepStart)

export { handleStepStart }
