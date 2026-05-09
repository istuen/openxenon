import { sendToDaemon } from '../socket-client'

export async function handleHealth(): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'GET',
    path: '/api/v1/health',
    projectPath: ''
  }) as { status: number; body: unknown }

  return response.body
}
