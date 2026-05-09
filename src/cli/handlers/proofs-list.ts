import { sendToDaemon } from '../socket-client'

export async function handleProofsList(projectPath: string): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'GET',
    path: '/api/v1/proofs/list',
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
