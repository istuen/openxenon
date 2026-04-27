import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskById, updateTaskStatus } from '../../db/operations/tasks'
import { loadBlueprintFromYaml } from '../../core/blueprint-loader'
import { StagingManager } from '../../core/staging'
import { dispatchArsenalProof } from '../../core/proof-dispatcher'
import type { ProofExecutionContext } from '../../types/proof'

async function handleStepVerify(
  request: Request,
  db: Database,
  projectPath: string
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

    const task = getTaskById(db, body.taskId)
    if (!task) {
      return notFound('Task not found')
    }

    let blueprint
    try {
      blueprint = loadBlueprintFromYaml(projectPath, body.taskId)
    } catch {
      return notFound('Blueprint YAML not found for this task')
    }

    const stageId = body.stageId || (blueprint.stages[0]?.id)
    const stage = blueprint.stages.find(s => s.id === stageId)

    if (!stage) {
      return notFound(`Stage '${stageId}' not found in blueprint`)
    }

    const staging = new StagingManager(projectPath, body.taskId)
    const stagingPath = staging.getStagingPath()

    const context: ProofExecutionContext = {
      projectRoot: stagingPath,
      timeout: 30000
    }

    const proofResult = await dispatchArsenalProof(stage.proof, context)

    if (proofResult.passed) {
      staging.moveToSrc()
      updateTaskStatus(db, body.taskId, 'RUNNING')
    } else {
      staging.cleanup()
    }

    return new Response(
      JSON.stringify({
        success: proofResult.passed,
        stageId: stage.id,
        probeResults: proofResult.probeResults,
        errors: proofResult.errors,
        stagingPath
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
