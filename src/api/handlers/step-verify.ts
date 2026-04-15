import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest, notFound } from '../errors'
import { getStepById } from '../../db/operations/steps'
import { verifyStep } from '../../verification/dual-track'

async function handleStepVerify(
  request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ stepId?: string; proofPath?: string }>(request)
    
    if (!body) {
      return badRequest('Request body is required')
    }
    
    const validation = validateRequiredFields(body as Record<string, unknown>, ['stepId', 'proofPath'])
    
    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }
    
    const step = getStepById(db, body.stepId!)
    
    if (!step) {
      return notFound(`Step '${body.stepId}' not found`)
    }
    
    const result = await verifyStep({
      db,
      stepId: body.stepId!,
      proofPath: body.proofPath!
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
