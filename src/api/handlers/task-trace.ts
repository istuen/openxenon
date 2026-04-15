import type { Database } from 'bun:sqlite'
import { registerRoute } from '../router'
import { getQueryParams } from '../validation'
import { notFound } from '../errors'
import { getTaskById } from '../../db/operations/tasks'
import { getStepsByTaskId } from '../../db/operations/steps'
import { getAllProofLogs } from '../../db/operations/proof-logs'
import { getAllEscapeLogs } from '../../db/operations/escape-logs'
import { writeFileSync } from 'fs'
import { join } from 'path'
import { getTasksPath } from '../../core/project'

async function handleTaskTrace(
  request: Request,
  db: Database,
  projectPath: string
): Promise<Response> {
  try {
    const url = new URL(request.url)
    const params = getQueryParams(url.toString())
    const taskId = params.taskId
    
    if (!taskId) {
      return new Response(
        JSON.stringify({
          error: 'MissingTaskId',
          message: 'Query parameter taskId is required',
          statusCode: 400
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
    
    const task = getTaskById(db, taskId)
    
    if (!task) {
      return notFound(`Task '${taskId}' not found`)
    }
    
    const steps = getStepsByTaskId(db, taskId)
    const proofLogs = getAllProofLogs(db)
    const escapeLogs = getAllEscapeLogs(db)
    
    const trace = {
      task: {
        id: task.id,
        name: task.name,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      },
      steps: steps.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        spec: s.spec,
        proof: s.proof,
        startedAt: s.startedAt,
        completedAt: s.completedAt
      })),
      proofLogs: proofLogs.map(l => ({
        stepId: l.stepId,
        proofName: l.proofName,
        result: l.result,
        output: l.output,
        executedAt: l.executedAt
      })),
      escapeLogs: escapeLogs.map(l => ({
        taskId: l.taskId,
        stepId: l.stepId,
        detectedAt: l.detectedAt
      }))
    }
    
    const tasksPath = getTasksPath(projectPath)
    const tracePath = join(tasksPath, taskId, 'task-trace.yaml')
    
    const yamlContent = generateYaml(trace)
    writeFileSync(tracePath, yamlContent, 'utf-8')
    
    return new Response(
      JSON.stringify({
        taskId,
        tracePath,
        trace
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
        error: 'TaskTraceFailed',
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

function generateYaml(data: any): string {
  const lines: string[] = []
  
  lines.push('# Task Trace')
  lines.push(`taskId: ${data.task.id}`)
  lines.push(`taskName: ${data.task.name}`)
  lines.push(`status: ${data.task.status}`)
  lines.push(`createdAt: ${data.task.createdAt}`)
  lines.push('')
  lines.push('steps:')
  
  for (const step of data.steps) {
    lines.push(`  - id: ${step.id}`)
    lines.push(`    name: ${step.name}`)
    lines.push(`    status: ${step.status}`)
    lines.push(`    spec: ${step.spec}`)
    lines.push(`    proof: ${step.proof}`)
  }
  
  return lines.join('\n')
}

registerRoute('GET', '/api/v1/task/trace', handleTaskTrace)

export { handleTaskTrace }
