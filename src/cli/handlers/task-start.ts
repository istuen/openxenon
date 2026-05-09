import { sendToDaemon } from '../socket-client'

export async function handleTaskStart(projectPath: string, taskId: string): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/task/start',
    body: { taskId },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
