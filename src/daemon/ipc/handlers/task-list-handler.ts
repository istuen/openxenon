import { join } from 'path'
import { existsSync, readdirSync, readFileSync } from '../../../infra/filesystem'
import { daemonLogger } from '../../logger'
import { registerRoute } from '../router'

async function handleTaskListHandler(_request: Request, projectPath: string): Promise<Response> {
  try {
    const tasksDir = join(projectPath, '.openxenon', 'tasks')

    if (!existsSync(tasksDir)) {
      return new Response(
        JSON.stringify({
          tasks: [],
          total: 0,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }

    const taskIds = readdirSync(tasksDir).filter((f) => {
      const tracePath = join(tasksDir, f, 'task-trace.jsonl')
      return existsSync(tracePath)
    })

    const tasks = taskIds
      .map((taskId) => {
        const tracePath = join(tasksDir, taskId, 'task-trace.jsonl')
        try {
          const content = readFileSync(tracePath, 'utf-8')
          return JSON.parse(content)
        } catch (error) {
          daemonLogger.warn(`Failed to read task trace: ${tracePath} - ${error}`)
          return null
        }
      })
      .filter(Boolean)

    const simplifiedTasks = tasks.map((t: any) => ({
      id: t.taskId,
      name: t.taskName,
      status: t.status,
      startedAt: t.startedAt,
      completedAt: t.completedAt,
    }))

    return new Response(
      JSON.stringify({
        tasks: simplifiedTasks,
        total: tasks.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        error: 'TaskListFailed',
        message: errorMessage,
        statusCode: 500,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

registerRoute('GET', '/api/v1/task/list', handleTaskListHandler)

export { handleTaskListHandler }
