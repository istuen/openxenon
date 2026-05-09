import { sendToDaemon } from '../socket-client'

export async function handleTaskStop(projectPath: string, taskId: string): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/task/stop',
    body: { taskId },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
