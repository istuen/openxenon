import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { parseJSONBody, validateRequiredFields } from '../validation'
import { badRequest, notFound } from '../errors'
import { getTaskDirectory, ensureTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace, updateTaskStatus } from '../../lib/task-trace'
import { createEmptyStepManifest, writeStepManifest } from '../../core/manifest'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

async function handleTaskStart(
  request: Request,
  _db: Database,
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

    const taskId = body.taskId!
    const taskDir = getTaskDirectory(projectPath, taskId)

    if (!existsSync(taskDir.root)) {
      return notFound(`Task '${taskId}' not found`)
    }

    const trace = readTaskTrace(taskDir)

    if (!trace) {
      return notFound(`Task '${taskId}' not found`)
    }

    let newStatus = trace.status
    if (trace.status === 'PENDING') {
      if (!existsSync(taskDir.root)) {
        mkdirSync(taskDir.root, { recursive: true })
      }

      const manifest = createEmptyStepManifest(taskId)
      writeStepManifest(join(taskDir.root, 'step-manifest.json'), manifest)

      updateTaskStatus(taskDir, 'RUNNING')
      newStatus = 'RUNNING'
    }

    return new Response(
      JSON.stringify({
        taskId: taskId,
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