import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { listAllProofs } from '../../core/proof-dispatcher'

async function handleProofsList(
  _request: Request,
  _db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const proofs = listAllProofs(projectPath)
    
    return new Response(
      JSON.stringify({
        proofs: proofs.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          layer: p.layer
        }))
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
        error: 'ProofsListFailed',
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

registerRoute('GET', '/api/v1/proofs/list', handleProofsList)

export { handleProofsList }
