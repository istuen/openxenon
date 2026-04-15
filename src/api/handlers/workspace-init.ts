import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { ensureProjectBoundary } from '../../core/boundary-project'
import { registerProject } from '../../core/registry'
import { ensureGlobalBoundary } from '../../core/boundary'

async function handleWorkspaceInit(
  _request: Request,
  _db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const globalDb = ensureGlobalBoundary()
    ensureProjectBoundary(projectPath)
    
    const project = registerProject(globalDb, projectPath)
    
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
