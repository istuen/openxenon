import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest } from '../errors'
import { createTask } from '../../db/operations/tasks'
import { createStep } from '../../db/operations/steps'
import { createTaskDirectory } from '../../core/boundary-project'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'
import type { Playbook } from '../../types'
import { join } from 'path'

async function handleTaskSubmit(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ task?: string; steps?: unknown[] }>(request)
    
    if (!body) {
      return badRequest('Request body is required')
    }
    
    const validation = validateRequiredFields(body as Record<string, unknown>, ['task', 'steps'])
    
    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }
    
    const playbook: Playbook = {
      task: body.task!,
      steps: body.steps as any[]
    }
    
    const task = createTask(db, playbook.task, playbook)
    
    for (const [index, step] of playbook.steps.entries()) {
      const stepId = `${task.id}-${index + 1}`
      const stepData = step as { name: string; spec: string; proof: string }
      createStep(db, stepId, task.id, stepData.name, stepData.spec, stepData.proof)
    }
    
    const taskDir = createTaskDirectory(projectPath, task.id)
    
    const manifest = createEmptyStepManifest(task.id)
    const manifestPath = join(taskDir, 'step-manifest.json')
    writeStepManifest(manifestPath, manifest)
    
    return new Response(
      JSON.stringify({
        taskId: task.id,
        status: task.status,
        stepsCount: playbook.steps.length,
        message: 'Task created successfully'
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
        error: 'TaskSubmitFailed',
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

registerRoute('POST', '/api/v1/task/submit', handleTaskSubmit)

export { handleTaskSubmit }
