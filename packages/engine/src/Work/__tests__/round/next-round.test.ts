import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

import { runWork, nextRoundWork, getRoundStatus, type WorkspaceState } from '../../dual-state-exec'
import { loadWorkState } from '../../dual-state-io'
import { BOUNDARY_DIR, WORK_OXN_FILE, WORK_FILE } from '@openxenon/engine/kernel'

let tmp: string

beforeEach(() => {
  tmp = join(tmpdir(), `oxn-round-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmp, { recursive: true })
  mkdirSync(join(tmp, BOUNDARY_DIR, 'works', 'test-work', '.run'), { recursive: true })
  // minimal work fixture for OXN existence check (v0.7 起 .md canonical，.oxn 仅 compat fallback)
  writeFileSync(join(tmp, BOUNDARY_DIR, 'works', 'test-work', WORK_OXN_FILE), 'work "test-work" {}\n')
})

afterEach(() => {
  rmSync(tmp, { recursive: true, force: true })
})

describe('nextRoundWork (v0.6 PR-2)', () => {
  it('initializes round 1 PENDING on runWork', () => {
    const state = runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: ['Member'],
      blueprintNames: ['dev'],
      tasks: [{ taskName: 't1', blueprint: 'dev', injects: [] }],
    })
    expect(state.currentRound).toBe(1)
    expect(state.roundHistory.length).toBe(1)
    expect(state.roundHistory[0]?.round).toBe(1)
    expect(state.roundHistory[0]?.verdict).toBe('PENDING')
  })

  it('opens round 2 after failed round 1', () => {
    runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    const result = nextRoundWork({
      projectRoot: tmp,
      workName: 'test-work',
      verdict: 'FAILED',
      failures: ['t1'],
    })
    expect(result.round).toBe(2)
    expect(result.previousVerdict).toBe('FAILED')
    expect(result.historyLength).toBe(2)
    expect(result.workspace.currentRound).toBe(2)
    expect(result.workspace.roundHistory[0]?.verdict).toBe('FAILED')
    expect(result.workspace.roundHistory[0]?.endedAt).toBeDefined()
    expect(result.workspace.roundHistory[1]?.verdict).toBe('PENDING')
  })

  it('rejects PASSED verdict with OXN_ROUND_ALREADY_PASSED', () => {
    runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    expect(() =>
      nextRoundWork({
        projectRoot: tmp,
        workName: 'test-work',
        verdict: 'PASSED',
      }),
    ).toThrow(/OXN_ROUND_ALREADY_PASSED|PASSED/)
  })

  it('supports multiple round transitions', () => {
    runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    nextRoundWork({ projectRoot: tmp, workName: 'test-work', verdict: 'FAILED' })
    nextRoundWork({ projectRoot: tmp, workName: 'test-work', verdict: 'FAILED' })
    const status = getRoundStatus(tmp, 'test-work')
    expect(status?.currentRound).toBe(3)
    expect(status?.totalRounds).toBe(3)
    expect(status?.history[0]?.verdict).toBe('FAILED')
    expect(status?.history[1]?.verdict).toBe('FAILED')
    expect(status?.history[2]?.verdict).toBe('PENDING')
  })

  it('persists state.json across reloads', () => {
    runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    nextRoundWork({ projectRoot: tmp, workName: 'test-work', verdict: 'FAILED' })
    // Simulate reload from disk
    const reloaded = loadWorkState(tmp, 'test-work')
    expect(reloaded?.currentRound).toBe(2)
    expect(reloaded?.roundHistory.length).toBe(2)
  })

  it('preserves notes when provided', () => {
    runWork({
      projectRoot: tmp,
      workName: 'test-work',
      domainNames: [],
      blueprintNames: [],
      tasks: [],
    })
    const result = nextRoundWork({
      projectRoot: tmp,
      workName: 'test-work',
      verdict: 'FAILED',
      failures: ['t1'],
      notes: 'typecheck failed in t1',
    })
    expect(result.workspace.roundHistory[0]?.notes).toBe('typecheck failed in t1')
  })
})
