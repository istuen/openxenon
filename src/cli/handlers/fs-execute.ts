import { sendToDaemon } from '../socket-client'

export async function handleFsExecute(
  projectPath: string,
  payload: {
    command: string
    task_id: string
    project_root: string
    policy: string
    blueprint?: unknown
    step_id?: string
    schema_version?: string
  }
): Promise<unknown> {
  const response = await sendToDaemon({
    method: 'POST',
    path: '/api/v1/fs/execute',
    body: {
      schema_version: '1.0.0',
      ...payload
    },
    projectPath
  }) as { status: number; body: unknown }

  return response.body
}
