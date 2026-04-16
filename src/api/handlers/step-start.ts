import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest, notFound } from '../errors'
import { getStepById, updateStepStatus, getStepByTaskIdAndName } from '../../db/operations/steps'

async function handleStepStart(
  request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ stepId?: string; taskId?: string; stepName?: string }>(request)
    
    if (!body) {
      return badRequest('Request body is required')
    }
    
    let step = null
    
    if (body.stepId) {
      step = getStepById(db, body.stepId)
    } else if (body.taskId && body.stepName) {
      step = getStepByTaskIdAndName(db, body.taskId, body.stepName)
    } else {
      return badRequest('Either stepId or (taskId + stepName) is required')
    }
    
    if (!step) {
      return notFound('Step not found')
    }
    
    if (step.status === 'pending') {
      updateStepStatus(db, step.id, 'running')
    }
    
    return new Response(
      JSON.stringify({
        stepId: step.id,
        status: step.status === 'pending' ? 'running' : step.status
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
