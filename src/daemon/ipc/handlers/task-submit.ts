import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest } from '../errors'
import { writeTaskStart } from '../../trace/writer'
import type { Blueprint } from '../../../kernel/schemas/blueprint.schema'
import { randomUUID } from 'crypto'
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { BOUNDARY_DIR, BLUEPRINT_FILE } from '../../../kernel/constants'

async function handleTaskSubmit(
  request: Request,
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
    const taskDir = join(projectPath, BOUNDARY_DIR, 'tasks', taskId)

    if (!existsSync(taskDir)) {
      mkdirSync(taskDir, { recursive: true })
    }

    const blueprintPath = join(taskDir, BLUEPRINT_FILE)
    writeFileSync(blueprintPath, JSON.stringify(blueprintInput, null, 2), 'utf-8')

    writeTaskStart(
      { root: taskDir, taskId, blueprintPath, tracePath: join(taskDir, 'task-trace.yaml'), manifestPath: join(taskDir, 'step-manifest.json') },
      taskId,
      taskName
    )

    return new Response(
      JSON.stringify({
        taskId: taskId,
        blueprintId: taskId,
        blueprintFile: `tasks/${taskId}/${BLUEPRINT_FILE}`,
        status: 'RUNNING',
        stagesCount: blueprintInput.stages?.length || 0,
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
