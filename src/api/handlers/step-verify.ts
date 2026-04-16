import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest, notFound } from '../errors'
import { getStepById, getStepByTaskIdAndName } from '../../db/operations/steps'
import { verifyStep } from '../../verification/dual-track'
import { findProof, listAvailableProofs } from '../proof-finder'

async function handleStepVerify(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ stepId?: string; taskId?: string; stepName?: string; proofPath?: string }>(request)
    
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
    
    let proofPath = body.proofPath
    
    if (!proofPath) {
      const proofLocation = findProof(step.proof, projectPath)
      if (!proofLocation) {
        const available = listAvailableProofs(projectPath)
        return notFound(`Proof '${step.proof}' not found. Available proofs: ${available.slice(0, 10).join(', ')}${available.length > 10 ? '...' : ''}`)
      }
      proofPath = proofLocation.path
    }
    
    const result = await verifyStep({
      db,
      stepId: step.id,
      proofPath
    })
    
    return new Response(
      JSON.stringify({
        success: result.success,
        output: result.output,
        error: result.error
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
