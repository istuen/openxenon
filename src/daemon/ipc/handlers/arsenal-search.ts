import { getProjectBoundaryPath } from '../../../kernel'
import { globalArsenalRegistry } from '../../registry'
import { registerRoute } from '../router'

async function handleArsenalSearch(_request: Request, projectPath: string): Promise<Response> {
  const projectBoundary = getProjectBoundaryPath(projectPath || process.cwd())

  globalArsenalRegistry.buildIndex(projectBoundary)

  const matches = globalArsenalRegistry.search('')

  return new Response(JSON.stringify({ matches }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

registerRoute('GET', '/api/v1/arsenal/search', handleArsenalSearch)

export { handleArsenalSearch }
