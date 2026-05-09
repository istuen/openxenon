import { sendToDaemon } from '../socket-client'

export async function handleTaskSubmit(
  projectPath: string,
  task: string,
  blueprint: unknown
): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/task/submit',
    body: { task, blueprint },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
