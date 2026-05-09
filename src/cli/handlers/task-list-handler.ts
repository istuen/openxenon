import { sendToDaemon } from '../socket-client'

export async function handleTaskListHandler(projectPath: string): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'GET',
    path: '/api/v1/task/list',
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
