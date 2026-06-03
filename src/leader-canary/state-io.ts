import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { BOUNDARY_DIR } from '../kernel/constants'
import type { WorkState } from './state'
import { WorkStateSchema } from './state'

export type StateIo = {
  worksDir: string
}

export function getWorkDir(projectRoot: string, workName: string): string {
  return join(projectRoot, BOUNDARY_DIR, 'works', workName)
}

export function getStatePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), 'state.json')
}

export function getTracePath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), 'work-trace.jsonl')
}

export function getFrozenPath(projectRoot: string, workName: string): string {
  return join(getWorkDir(projectRoot, workName), 'frozen.json')
}

export function ensureWorkDir(projectRoot: string, workName: string): string {
  const dir = getWorkDir(projectRoot, workName)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function loadState(projectRoot: string, workName: string): WorkState | null {
  const path = getStatePath(projectRoot, workName)
  if (!existsSync(path)) return null
  try {
    const content = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(content)
    const result = WorkStateSchema.safeParse(parsed)
    if (!result.success) {
      throw new Error(`Invalid state.json: ${result.error.message}`)
    }
    return result.data
  } catch (err) {
    throw new Error(`Failed to load state: ${err instanceof Error ? err.message : String(err)}`)
  }
}

export function saveState(projectRoot: string, workName: string, state: WorkState): void {
  const path = getStatePath(projectRoot, workName)
  ensureWorkDir(projectRoot, workName)
  const dir = dirname(path)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  const tmpPath = `${path}.tmp`
  state.updatedAt = new Date().toISOString()
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8')
  renameSync(tmpPath, path)
}

export function stateExists(projectRoot: string, workName: string): boolean {
  return existsSync(getStatePath(projectRoot, workName))
}
