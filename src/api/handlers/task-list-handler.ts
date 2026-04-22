import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { getAllTasks } from '../../db/operations/tasks'

async function handleTaskListHandler(
  _request: Request,
  db: Database,
  _projectPath: string
): Promise<Response> {
  try {
    const tasks = getAllTasks(db)

    const simplifiedTasks = tasks.map(t => ({
      id: t.id,
      name: t.name,
      status: t.status,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }))

    return new Response(
      JSON.stringify({
        tasks: simplifiedTasks,
        total: tasks.length
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({
        error: 'TaskListFailed',
        message: errorMessage,
        statusCode: 500
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

registerRoute('GET', '/api/v1/task/list', handleTaskListHandler)

export { handleTaskListHandler }
