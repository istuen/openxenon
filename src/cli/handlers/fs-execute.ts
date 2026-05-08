import { registerRoute } from '../../daemon/ipc/router'
import { badRequest, notFound } from '../../daemon/ipc/errors'
import type { DaemonPayload } from '../../daemon/types/daemon-payload'
import { getTaskDirectory, ensureTaskDirectory } from '../../kernel/lib/task-dir'
import { readTaskTrace, writeTaskStart, writeTaskStatus, writeStageStart, writeStageComplete, createProbeResult } from '../../daemon/trace/writer'
import { existsSync } from 'fs'

const CURRENT_SCHEMA_VERSION = '1.0.0'

async function handleFsExecute(
  request: Request,
  _projectPath: string
): Promise<Response> {
  try {
    const body = await request.json() as DaemonPayload

    if (!body.command || !body.task_id || !body.project_root || !body.policy) {
      return badRequest('Missing required fields: command, task_id, project_root, policy')
    }

    if (body.schema_version !== CURRENT_SCHEMA_VERSION) {
      return badRequest(`Unsupported schema version: ${body.schema_version}. Expected: ${CURRENT_SCHEMA_VERSION}`)
    }

    const taskDir = getTaskDirectory(body.project_root, body.task_id)

    if (!existsSync(taskDir.root)) {
      return notFound(`Task directory not found: ${taskDir.root}`)
    }

    switch (body.command) {
      case 'EXECUTE_TASK':
        return handleExecuteTask(body, taskDir)
      case 'EXECUTE_STEP':
        return handleExecuteStep(body, taskDir)
      case 'VERIFY_STEP':
        return handleVerifyStep(body, taskDir)
      default:
        return badRequest(`Unknown command: ${body.command}`)
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({
        error: 'FsExecuteFailed',
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

function handleExecuteTask(payload: DaemonPayload, taskDir: ReturnType<typeof getTaskDirectory>): Response {
  if (!payload.blueprint) {
    return badRequest('EXECUTE_TASK requires blueprint in payload')
  }

  ensureTaskDirectory(taskDir)

  let trace = readTaskTrace(taskDir)
  if (!trace) {
    trace = writeTaskStart(taskDir, payload.task_id, payload.blueprint.name)
  }

  if (trace.status === 'COMPLETED' || trace.status === 'FAILED') {
    return new Response(
      JSON.stringify({
        taskId: payload.task_id,
        status: trace.status,
        message: 'Task already completed or failed'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }

  writeTaskStatus(taskDir, payload.task_id, 'RUNNING')

  for (const stage of payload.blueprint.stages) {
    writeStageStart(taskDir, payload.task_id, stage.id, stage.name)

    writeStageComplete(taskDir, payload.task_id, stage.id, 'RUNNING')

    for (const probe of stage.proof.probes) {
      const result = executeProbe(probe.type, probe.pattern || probe.command || '', payload.project_root)
      const probeResult = createProbeResult(probe.type, result.passed ? 'PASSED' : 'FAILED', result.output, result.error)

      const currentTrace = readTaskTrace(taskDir)
      if (currentTrace) {
        const stageState = currentTrace.stages.get(stage.id)
        if (stageState) {
          stageState.probes.push(probeResult)
        }
      }
    }

    const currentTrace = readTaskTrace(taskDir)
    const lastStage = currentTrace ? Array.from(currentTrace.stages.values())[currentTrace.stages.size - 1] : null
    const allProbesPassed = lastStage?.probes.every(p => p.result === 'PASSED') ?? true
    writeStageComplete(taskDir, payload.task_id, stage.id, allProbesPassed ? 'PASSED' : 'FAILED')
  }

  const finalTrace = readTaskTrace(taskDir)
  const allPassed = finalTrace ? Array.from(finalTrace.stages.values()).every(s => s.status === 'PASSED') : false
  writeTaskStatus(taskDir, payload.task_id, allPassed ? 'COMPLETED' : 'FAILED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      status: allPassed ? 'COMPLETED' : 'FAILED',
      stagesCount: payload.blueprint.stages.length,
      message: allPassed ? 'Task completed successfully' : 'Task failed'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

function handleExecuteStep(payload: DaemonPayload, taskDir: ReturnType<typeof getTaskDirectory>): Response {
  if (!payload.step_id) {
    return badRequest('EXECUTE_STEP requires step_id in payload')
  }

  if (!payload.blueprint) {
    return badRequest('EXECUTE_STEP requires blueprint in payload')
  }

  const trace = readTaskTrace(taskDir)
  if (!trace) {
    return notFound('Task trace not found')
  }

  const stage = payload.blueprint.stages.find(s => s.id === payload.step_id)
  if (!stage) {
    return notFound(`Stage not found: ${payload.step_id}`)
  }

  writeStageComplete(taskDir, payload.task_id, payload.step_id, 'RUNNING')

  for (const probe of stage.proof.probes) {
    const result = executeProbe(probe.type, probe.pattern || probe.command || '', taskDir.root)
    const probeResult = createProbeResult(probe.type, result.passed ? 'PASSED' : 'FAILED', result.output, result.error)

    const currentTrace = readTaskTrace(taskDir)
    if (currentTrace) {
      const stageState = currentTrace.stages.get(payload.step_id)
      if (stageState) {
        stageState.probes.push(probeResult)
      }
    }
  }

  writeStageComplete(taskDir, payload.task_id, payload.step_id, 'PASSED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      stepId: payload.step_id,
      status: 'PASSED',
      message: 'Step executed successfully'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

function handleVerifyStep(payload: DaemonPayload, taskDir: ReturnType<typeof getTaskDirectory>): Response {
  if (!payload.step_id) {
    return badRequest('VERIFY_STEP requires step_id in payload')
  }

  const trace = readTaskTrace(taskDir)
  if (!trace) {
    return notFound('Task trace not found')
  }

  const stage = trace.stages.get(payload.step_id)
  if (!stage) {
    return notFound(`Stage not found: ${payload.step_id}`)
  }

  const allProbesPassed = stage.probes.every(p => p.result === 'PASSED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      stepId: payload.step_id,
      status: stage.status,
      allProbesPassed,
      probes: stage.probes
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  )
}

interface ProbeResult {
  passed: boolean
  output?: string
  error?: string
}

function executeProbe(probeType: string, pattern: string, projectRoot: string): ProbeResult {
  switch (probeType) {
    case 'fs_exists':
      return executeFsExistsProbe(pattern, projectRoot)
    case 'fs_content_match':
      return executeFsContentMatchProbe(pattern, projectRoot)
    case 'exec_exit_zero':
      return executeExecExitZeroProbe(pattern, projectRoot)
    default:
      return { passed: false, error: `Unknown probe type: ${probeType}` }
  }
}

function executeFsExistsProbe(pattern: string, projectRoot: string): ProbeResult {
  const { existsSync } = require('fs')
  const path = require('path')
  const fullPath = path.isAbsolute(pattern) ? pattern : path.join(projectRoot, pattern)
  const exists = existsSync(fullPath)
  return { passed: exists, output: exists ? 'File exists' : 'File not found' }
}

function executeFsContentMatchProbe(pattern: string, projectRoot: string): ProbeResult {
  const { existsSync, readFileSync } = require('fs')
  const path = require('path')
  const [filePattern, regexPattern] = pattern.split(':')
  const fullPath = path.isAbsolute(filePattern) ? filePattern : path.join(projectRoot, filePattern)

  if (!existsSync(fullPath)) {
    return { passed: false, error: `File not found: ${fullPath}` }
  }

  if (!regexPattern) {
    return { passed: false, error: 'Regex pattern is required for fs_content_match probe' }
  }

  try {
    const content = readFileSync(fullPath, 'utf-8')
    const regex = new RegExp(regexPattern)
    const matches = regex.test(content)
    return { passed: matches, output: matches ? 'Pattern matched' : 'Pattern not found' }
  } catch (error) {
    return { passed: false, error: `Error reading file: ${error}` }
  }
}

function executeExecExitZeroProbe(command: string, projectRoot: string): ProbeResult {
  const { spawn } = require('child_process')
  const path = require('path')

  return new Promise((resolve) => {
    const isAbsolute = path.isAbsolute(command)
    const fullCommand = isAbsolute ? command : path.join(projectRoot, command)
    const proc = spawn(fullCommand, [], { shell: true, cwd: projectRoot })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => { stdout += data.toString() })
    proc.stderr.on('data', (data: Buffer) => { stderr += data.toString() })

    proc.on('close', (code: number) => {
      resolve({
        passed: code === 0,
        output: stdout || stderr,
        error: code !== 0 ? `Command exited with code ${code}` : undefined
      })
    })

    proc.on('error', (err: Error) => {
      resolve({ passed: false, error: err.message })
    })
  }) as unknown as ProbeResult
}

registerRoute('POST', '/api/v1/fs/execute', handleFsExecute)

export { handleFsExecute }