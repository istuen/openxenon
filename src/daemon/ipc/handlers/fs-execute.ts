import { directoryExists, ensureDirectory } from '@openxenon/engine/infra/filesystem'
import { getProbeHandler, type ProbeResult as InfraProbeResult } from '@openxenon/engine/infra/probes'
import { getTaskDirectory } from '@openxenon/engine/Work/task-directory'
import { evaluateProbe, type ProbeDefinition } from '@openxenon/engine/Work/probe-evaluator'
import {
  createProbeResult,
  readTaskTrace,
  writePartComplete,
  writePartStart,
  writeTaskStart,
  writeTaskStatus,
} from '../../trace/writer'
import type { DaemonPayload } from '../../types/daemon-payload'
import { badRequest, notFound } from '../errors'
import { registerRoute } from '../router'

const CURRENT_SCHEMA_VERSION = '1.0.0'

async function handleFsExecute(request: Request, _projectPath: string): Promise<Response> {
  try {
    const body = (await request.json()) as DaemonPayload

    if (!body.command || !body.task_id || !body.project_root || !body.policy) {
      return badRequest('Missing required fields: command, task_id, project_root, policy')
    }

    if (body.schema_version !== CURRENT_SCHEMA_VERSION) {
      return badRequest(`Unsupported schema version: ${body.schema_version}. Expected: ${CURRENT_SCHEMA_VERSION}`)
    }

    const taskDir = getTaskDirectory(body.project_root, body.task_id)

    if (!directoryExists(taskDir.root)) {
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
        statusCode: 500,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }
}

async function handleExecuteTask(
  payload: DaemonPayload,
  taskDir: ReturnType<typeof getTaskDirectory>,
): Promise<Response> {
  if (!payload.blueprint) {
    return badRequest('EXECUTE_TASK requires blueprint in payload')
  }

  ensureDirectory(taskDir.root)

  let trace = readTaskTrace(taskDir)
  if (!trace) {
    trace = writeTaskStart(taskDir, payload.task_id, payload.blueprint.name)
  }

  if (trace.status === 'COMPLETED' || trace.status === 'FAILED') {
    return new Response(
      JSON.stringify({
        taskId: payload.task_id,
        status: trace.status,
        message: 'Task already completed or failed',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    )
  }

  writeTaskStatus(taskDir, payload.task_id, 'RUNNING')

  for (const part of payload.blueprint.parts) {
    writePartStart(taskDir, payload.task_id, part.id, part.name)
    writePartComplete(taskDir, payload.task_id, part.id, 'RUNNING')

    let partState = trace.parts.get(part.id)
    if (!partState) {
      partState = { partId: part.id, partName: part.name, status: 'RUNNING', probes: [], startedAt: Date.now() }
      trace.parts.set(part.id, partState)
    }

    for (const probe of part.probes) {
      const result = await executeProbe(probe.type, probe.pattern || probe.command || '', payload.project_root)
      const probeResult = createProbeResult(probe.type, result.result, result.output, result.error)
      partState.probes.push(probeResult)
    }

    const allProbesPassed = partState.probes.every((p) => p.result === 'PASSED')
    partState.status = allProbesPassed ? 'PASSED' : 'FAILED'
    writePartComplete(taskDir, payload.task_id, part.id, partState.status)
  }

  const allPassed = Array.from(trace.parts.values()).every((s) => s.status === 'PASSED')
  writeTaskStatus(taskDir, payload.task_id, allPassed ? 'COMPLETED' : 'FAILED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      status: allPassed ? 'COMPLETED' : 'FAILED',
      partsCount: payload.blueprint.parts.length,
      message: allPassed ? 'Task completed successfully' : 'Task failed',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

async function handleExecuteStep(
  payload: DaemonPayload,
  taskDir: ReturnType<typeof getTaskDirectory>,
): Promise<Response> {
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

  const part = payload.blueprint.parts.find((s) => s.id === payload.step_id)
  if (!part) {
    return notFound(`Part not found: ${payload.step_id}`)
  }

  writePartComplete(taskDir, payload.task_id, payload.step_id, 'RUNNING')

  for (const probe of part.probes) {
    const result = await executeProbe(probe.type, probe.pattern || probe.command || '', taskDir.root)
    const probeResult = createProbeResult(probe.type, result.result, result.output, result.error)

    const currentTrace = readTaskTrace(taskDir)
    if (currentTrace) {
      const partState = currentTrace.parts.get(payload.step_id)
      if (partState) {
        partState.probes.push(probeResult)
      }
    }
  }

  writePartComplete(taskDir, payload.task_id, payload.step_id, 'PASSED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      stepId: payload.step_id,
      status: 'PASSED',
      message: 'Step executed successfully',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
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

  const part = trace.parts.get(payload.step_id)
  if (!part) {
    return notFound(`Part not found: ${payload.step_id}`)
  }

  const allProbesPassed = part.probes.every((p) => p.result === 'PASSED')

  return new Response(
    JSON.stringify({
      taskId: payload.task_id,
      stepId: payload.step_id,
      status: part.status,
      allProbesPassed,
      probes: part.probes,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

async function executeProbe(probeType: string, pattern: string, projectRoot: string): Promise<InfraProbeResult> {
  let params: Record<string, unknown>
  let actualType = probeType

  switch (probeType) {
    case 'fs_content_match': {
      actualType = 'fs_match'
      const colonIndex = pattern.indexOf(':')
      if (colonIndex === -1) {
        return {
          probeType,
          result: 'FAILED',
          error: 'fs_content_match requires file:regex format',
          executedAt: Date.now(),
        }
      }
      const file = pattern.substring(0, colonIndex)
      const regex = pattern.substring(colonIndex + 1)
      params = { file, regex }
      break
    }
    case 'exec_exit_zero': {
      actualType = 'shell_exec'
      params = { command: pattern }
      break
    }
    default:
      params = { pattern }
  }

  const handler = getProbeHandler(actualType)
  if (!handler) {
    return { probeType, result: 'FAILED', error: `Unknown probe type: ${probeType}`, executedAt: Date.now() }
  }

  const context = { projectRoot }

  try {
    const result = (await handler(params, context)) as InfraProbeResult
    const definition: ProbeDefinition = { type: actualType, params }
    const verdict = evaluateProbe(definition, result)

    return {
      ...result,
      result: verdict.passed ? 'PASSED' : 'FAILED',
      executedAt: Date.now(),
    }
  } catch (error) {
    return {
      probeType,
      result: 'FAILED',
      error: error instanceof Error ? error.message : String(error),
      executedAt: Date.now(),
    }
  }
}

registerRoute('POST', '/api/v1/fs/execute', handleFsExecute)

export { handleFsExecute }
