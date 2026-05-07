import { registerRoute } from '../router'
import { registerProject } from '../../core/registry'
import { existsSync, mkdirSync } from 'fs'
import { getProjectBoundaryPath, getTasksPath, getProjectProofsPath } from '../../core/project'
import { GLOBAL_BOUNDARY_PATH, GLOBAL_PROOFS_PATH, COMMON_PROOFS_PATH, TEMPLATES_PATH } from '../../core/global'

function ensureGlobalBoundary(): void {
  if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
    mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
  }
  if (!existsSync(GLOBAL_PROOFS_PATH)) {
    mkdirSync(GLOBAL_PROOFS_PATH, { recursive: true })
  }
  if (!existsSync(COMMON_PROOFS_PATH)) {
    mkdirSync(COMMON_PROOFS_PATH, { recursive: true })
  }
  if (!existsSync(TEMPLATES_PATH)) {
    mkdirSync(TEMPLATES_PATH, { recursive: true })
  }
}

function ensureProjectBoundary(projectRoot: string): void {
  const boundaryPath = getProjectBoundaryPath(projectRoot)
  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }
  const proofsPath = getProjectProofsPath(projectRoot)
  if (!existsSync(proofsPath)) {
    mkdirSync(proofsPath, { recursive: true })
  }
  const tasksPath = getTasksPath(projectRoot)
  if (!existsSync(tasksPath)) {
    mkdirSync(tasksPath, { recursive: true })
  }
}

async function handleWorkspaceInit(
  _request: Request,
  projectPath: string
): Promise<Response> {
  try {
    ensureGlobalBoundary()
    ensureProjectBoundary(projectPath)

    const project = registerProject(projectPath, projectPath.split('/').pop() || 'unnamed')

    return new Response(
      JSON.stringify({
        projectId: project.id,
        status: project.status,
        message: 'Project initialized successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    if (errorMessage.includes('already exists') || errorMessage.includes('UNIQUE constraint')) {
      return new Response(
        JSON.stringify({
          error: 'ProjectAlreadyExists',
          message: 'Project already initialized',
          statusCode: 409
        }),
        {
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    return new Response(
      JSON.stringify({
        error: 'InitializationFailed',
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

registerRoute('POST', '/api/v1/workspace/init', handleWorkspaceInit)

export { handleWorkspaceInit }
