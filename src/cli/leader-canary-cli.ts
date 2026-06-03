// src/cli/leader-canary-cli.ts
//
// Minimal "leader" CLI for the mvp canary track (OXN_LEADER_MODE=mvp).
// Lives alongside the reference-native leader (src/cli/leader.ts) which
// is the default (OXN_LEADER_MODE=reference).
//
// What this exposes:
//   leader status <work-name>   read state.json, report work state
//   leader trace  <work-name>   read work-trace.jsonl, list events
//
// What this DOES NOT expose (intentionally):
//   leader run / submit / new
// The mvp canary on this branch is read-only because porting the mvp
// Langium-based OXN parser to reference is out of scope. See
// src/leader-canary/README.md for the rationale.

import { defineCommand } from 'citty'
import { existsSync } from 'fs'
import { getFormatFromArgs, output, outputError } from './output'
import { getStatePath, getTracePath, getWorkDir, loadState, readTrace, type TraceEvent } from '../leader-canary'

const canaryStatus = defineCommand({
  meta: {
    name: 'status',
    description: '[mvp canary] Read work state.json and report status',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work name' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const projectRoot = process.cwd()
    const statePath = getStatePath(projectRoot, workName)
    if (!existsSync(statePath)) {
      return outputError(
        {
          code: 'OXN_WORK_NOT_FOUND',
          message: `work "${workName}" not found at ${getWorkDir(projectRoot, workName)}`,
        },
        format,
      )
    }
    const state = loadState(projectRoot, workName)
    if (!state) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `state.json invalid for "${workName}"` }, format)
    }
    const events = readTrace(projectRoot, workName)
    output(
      {
        ok: true,
        data: {
          mode: 'mvp-canary',
          workName: state.workName,
          status: state.status,
          currentPart: state.currentPart,
          completedParts: state.completedParts,
          loopMeta: state.loopMeta,
          skillContext: state.skillContext,
          partSpecs: state.partSpecs,
          traceEventCount: events.length,
          statePath,
          tracePath: getTracePath(projectRoot, workName),
          workDir: getWorkDir(projectRoot, workName),
        },
      },
      format,
    )
  },
})

const canaryTrace = defineCommand({
  meta: {
    name: 'trace',
    description: '[mvp canary] Read work-trace.jsonl and list events',
  },
  args: {
    'work-name': { type: 'string', required: true, description: 'Work name' },
    '--json': { type: 'boolean', description: 'JSON 格式输出' },
    '--yaml': { type: 'boolean', description: 'YAML 格式输出' },
  },
  run(ctx) {
    const format = getFormatFromArgs(ctx.args as Record<string, unknown>)
    const workName = ctx.args['work-name'] as string
    const projectRoot = process.cwd()
    const tracePath = getTracePath(projectRoot, workName)
    if (!existsSync(tracePath)) {
      return outputError({ code: 'OXN_WORK_NOT_FOUND', message: `trace not found at ${tracePath}` }, format)
    }
    const events: TraceEvent[] = readTrace(projectRoot, workName)
    output(
      {
        ok: true,
        data: {
          mode: 'mvp-canary',
          workName,
          tracePath,
          eventCount: events.length,
          events,
        },
      },
      format,
    )
  },
})

const canaryLeader = defineCommand({
  meta: {
    name: 'leader',
    description: 'Leader (mvp canary track — read-only state access)',
  },
  subCommands: {
    status: canaryStatus,
    trace: canaryTrace,
  },
  run() {
    console.log('mvp canary leader — subcommands: status <work-name> | trace <work-name>')
  },
})

export default canaryLeader
