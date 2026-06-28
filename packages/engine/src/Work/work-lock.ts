import {
  readWorkFile as readBirthCert,
  writeWorkFile,
  applyPlanLock,
  clearPlanLock,
} from './birth-cert'
import { hashWorkPlan } from './plan-hash'

export interface LockResult {
  ok: true
  workName: string
  lockedAt: string
  planLock: {
    workOxnHash: string
    workDomainsHash: string
    blueprintsHash: string
    tasksHash: string
    allHash: string | null
  }
}

export function lockWork(projectRoot: string, workName: string): LockResult {
  const existing = readBirthCert(projectRoot, workName)
  if (!existing.ok) {
    throw new Error(`.work not lockable: ${existing.reason}`)
  }

  if (existing.cert.planLock !== null) {
    throw new Error(`work "${workName}" already locked`)
  }

  const hash = hashWorkPlan(projectRoot, workName)
  if (hash.allHash === null) {
    throw new Error(`cannot compute complete plan hash; missing: ${hash.missing.join(', ')}`)
  }

  const locked = applyPlanLock(existing.cert, hash)
  writeWorkFile(projectRoot, workName, locked)

  const pl = locked.planLock!
  return {
    ok: true,
    workName,
    lockedAt: pl.lockedAt,
    planLock: {
      workOxnHash: pl.workOxnHash,
      workDomainsHash: pl.workDomainsHash,
      blueprintsHash: pl.blueprintsHash,
      tasksHash: pl.tasksHash,
      allHash: pl.allHash ?? null,
    },
  }
}

export interface UnlockResult {
  ok: true
  workName: string
  cleared: boolean
  clearedAt: string
  previousLockedAt: string
}

export function unlockWork(projectRoot: string, workName: string): UnlockResult {
  const existing = readBirthCert(projectRoot, workName)
  if (!existing.ok) {
    throw new Error(`.work not readable: ${existing.reason}`)
  }

  if (existing.cert.planLock === null) {
    throw new Error(`work "${workName}" is not locked`)
  }

  const cleared = clearPlanLock(existing.cert)
  writeWorkFile(projectRoot, workName, cleared)

  return {
    ok: true,
    workName,
    cleared: true,
    clearedAt: cleared.updatedAt,
    previousLockedAt: existing.cert.planLock.lockedAt,
  }
}
