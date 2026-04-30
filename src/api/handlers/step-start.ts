import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace, updateStageTrace, createStageTrace, createProbeResult } from '../../lib/task-trace'
import { readBlueprint } from '../../lib/blueprint-parser'
import { existsSync } from 'fs'

async function handleStepStart(
  request: Request,
  _db: Database,
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

    let stageTrace = trace.stages.find(s => s.stageId === stage!.id)

    if (!stageTrace) {
      stageTrace = createStageTrace(stage.id, stage.name)
      trace.stages.push(stageTrace)
    }

    if (stageTrace.status === 'PENDING') {
      updateStageTrace(taskDir, stage.id, {
        status: 'RUNNING',
        executedAt: new Date().toISOString()
      })
      stageTrace.status = 'RUNNING'
    }

    return new Response(
      JSON.stringify({
        stepId: stage.id,
        status: stageTrace.status === 'PENDING' ? 'RUNNING' : stageTrace.status
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