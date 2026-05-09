import { sendToDaemon } from '../socket-client'

export async function handleTaskTrace(projectPath: string, taskId: string): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'GET',
    path: `/api/v1/task/trace?taskId=${encodeURIComponent(taskId)}`,
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
