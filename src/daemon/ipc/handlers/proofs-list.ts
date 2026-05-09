import { registerRoute } from '../router'

async function handleProofsList(
  _request: Request,
  _projectPath: string
): Promise<Response> {
  return new Response(
    JSON.stringify({
      proofs: [
        { id: 'fs_exists', name: 'File System Exists', category: 'built-in', layer: 'L1' },
        { id: 'fs_match', name: 'File System Match', category: 'built-in', layer: 'L1' },
        { id: 'shell_exec', name: 'Shell Execute', category: 'built-in', layer: 'L1' }
      ]
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

registerRoute('GET', '/api/v1/proofs/list', handleProofsList)

export { handleProofsList }
