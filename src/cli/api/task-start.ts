import { defineCommand } from 'citty'
import { socketRequest } from '../../api/socket-client'
import { DAEMON_SOCK_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'
import { existsSync, readFileSync } from 'fs'
import { getTaskDirectory } from '../../lib/task-dir'
import { readTaskTrace } from '../../lib/task-trace'
import { parseBlueprintYaml } from '../../lib/blueprint-parser'
import type { DaemonPayload } from '../../types/daemon-payload'

const CURRENT_SCHEMA_VERSION = '1.0.0'

export default defineCommand({
  meta: {
    name: 'task-start',
    description: '开始执行任务（文件系统优先模式）'
  },
  args: {
    'task-id': {
      type: 'string',
      description: '任务 ID',
      required: true
    },
    '--policy': {
      type: 'string',
      default: 'PRODUCTION',
      description: '执行策略：PRODUCTION 或 SANDBOX'
    }
  },
  async run({ args }) {
    const { isRunning } = isDaemonRunning()

    if (!isRunning) {
      console.error('Error: Daemon is not running')
      console.error('Start it with: oxn daemon start')
      process.exit(1)
    }

    const projectRoot = process.cwd()
    const taskId = args['task-id']
    const taskDir = getTaskDirectory(projectRoot, taskId)

    if (!existsSync(taskDir.root)) {
      console.error(`Error: Task '${taskId}' not found`)
      process.exit(1)
    }

    const trace = readTaskTrace(taskDir)
    if (trace && (trace.status === 'COMPLETED' || trace.status === 'FAILED')) {
      console.error(`Error: Task '${taskId}' has already ${trace.status.toLowerCase()}`)
      process.exit(1)
    }

    if (!existsSync(taskDir.blueprintPath)) {
      console.error(`Error: Blueprint not found for task '${taskId}'`)
      process.exit(1)
    }

    try {
      const blueprintContent = readFileSync(taskDir.blueprintPath, 'utf-8')
      const parsedBlueprint = parseBlueprintYaml(blueprintContent)

      const payload: DaemonPayload = {
        command: 'EXECUTE_TASK',
        project_root: projectRoot,
        task_id: taskId,
        policy: (args['--policy'] as 'PRODUCTION' | 'SANDBOX') || 'PRODUCTION',
        schema_version: CURRENT_SCHEMA_VERSION,
        blueprint: {
          id: parsedBlueprint.id,
          name: parsedBlueprint.name,
          stages: parsedBlueprint.stages
        }
      }

      const response = await socketRequest(
        DAEMON_SOCK_PATH,
        'POST',
        '/api/v1/fs/execute',
        payload,
        projectRoot
      )

      if (response.status >= 200 && response.status < 300) {
        console.log(JSON.stringify(response.body, null, 2))
      } else {
        console.error(`Error: ${JSON.stringify(response.body)}`)
        process.exit(1)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.error(`Error: ${errorMessage}`)
      process.exit(1)
    }
  }
})