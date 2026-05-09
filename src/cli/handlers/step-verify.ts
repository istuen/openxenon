import { sendToDaemon } from '../socket-client'

export async function handleStepVerify(
  projectPath: string,
  taskId: string,
  stageId?: string
): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/step/verify',
    body: { taskId, stageId },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
