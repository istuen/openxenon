import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest } from '../errors'
import { ensureTaskDirectory, getTaskDirectory, TASK_BLUEPRINT_FILE } from '../../lib/task-dir'
import { createTaskTrace } from '../../lib/task-trace'
import { saveBlueprintToYaml } from '../../core/blueprint-persister'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'
import type { Blueprint } from '../../types/arsenal/blueprint'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { randomUUID } from 'crypto'

async function handleTaskSubmit(
  request: Request,
  _db: unknown,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{
      task?: string
      blueprint?: Blueprint
    }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    const validation = validateRequiredFields(body as Record<string, unknown>, ['task', 'blueprint'])

    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }

    const taskName = body.task as string
    const blueprintInput = body.blueprint as Blueprint

    const taskId = randomUUID()

    const taskDir = getTaskDirectory(projectPath, taskId)
    ensureTaskDirectory(taskDir)

    const blueprintWithIds = {
      ...blueprintInput,
      id: taskId,
      status: 'CANONICAL' as const
    }

    saveBlueprintToYaml(projectPath, taskId, blueprintWithIds)

    const manifest = createEmptyStepManifest(taskId)
    const manifestPath = join(taskDir.root, 'step-manifest.json')
    writeStepManifest(manifestPath, manifest)

    createTaskTrace(taskDir, taskId, taskName)

    return new Response(
      JSON.stringify({
        taskId: taskId,
        blueprintId: taskId,
        blueprintFile: `tasks/${taskId}/${TASK_BLUEPRINT_FILE}`,
        status: 'PENDING',
        stagesCount: blueprintInput.stages?.length || 0,
        message: 'Task created successfully with Blueprint YAML'
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