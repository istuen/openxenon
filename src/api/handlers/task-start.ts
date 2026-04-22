import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskById, updateTaskStatus } from '../../db/operations/tasks'
import { mkdirSync, existsSync } from 'fs'
import { join } from 'path'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'

async function handleTaskStart(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const body = await parseJSONBody<{ taskId?: string }>(request)

    if (!body) {
      return badRequest('Request body is required')
    }

    const validation = validateRequiredFields(body as Record<string, unknown>, ['taskId'])

    if (!validation.valid) {
      return badRequest(`Field '${validation.missingField}' is required`)
    }

    const task = getTaskById(db, body.taskId!)

    if (!task) {
      return notFound(`Task '${body.taskId}' not found`)
    }

    let newStatus = task.status
    if (task.status === 'PENDING') {
      const taskDir = join(projectPath, '.openxenon', 'tasks', task.id)
      if (!existsSync(taskDir)) {
        mkdirSync(taskDir, { recursive: true })
      }

      const manifest = createEmptyStepManifest(task.id)
      writeStepManifest(join(taskDir, 'step-manifest.json'), manifest)

      const updated = updateTaskStatus(db, body.taskId!, 'RUNNING')
      newStatus = updated?.status || 'RUNNING'
    }

    return new Response(
      JSON.stringify({
        taskId: body.taskId,
        status: newStatus
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
        error: 'TaskStartFailed',
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

registerRoute('POST', '/api/v1/task/start', handleTaskStart)

export { handleTaskStart }