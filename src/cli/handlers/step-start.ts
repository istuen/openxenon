import { sendToDaemon } from '../socket-client'

export async function handleStepStart(
  projectPath: string,
  taskId: string,
  stepId?: string,
  stepName?: string
): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/step/start',
    body: { taskId, stepId, stepName },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
