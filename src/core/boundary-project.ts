import { mkdirSync, existsSync, writeFileSync } from 'fs'
import { join } from 'path'
import { getProjectBoundaryPath, getProjectDbPath, getProjectProofsPath, getTasksPath } from './project'
import { initProjectDb } from '../db/init'
import type { Database } from 'bun:sqlite'

export function ensureProjectBoundary(projectRoot: string): Database {
  const boundaryPath = getProjectBoundaryPath(projectRoot)
  
  if (!existsSync(boundaryPath)) {
    mkdirSync(boundaryPath, { recursive: true })
  }
  
  const proofsPath = getProjectProofsPath(projectRoot)
  if (!existsSync(proofsPath)) {
    mkdirSync(proofsPath, { recursive: true })
  }
  
  const tasksPath = getTasksPath(projectRoot)
  if (!existsSync(tasksPath)) {
    mkdirSync(tasksPath, { recursive: true })
  }
  
  const dbPath = getProjectDbPath(projectRoot)
  return initProjectDb(dbPath)
}

export function createTaskDirectory(projectRoot: string, taskId: string): string {
  const tasksPath = getTasksPath(projectRoot)
  const taskPath = join(tasksPath, taskId)
  
  if (!existsSync(taskPath)) {
    mkdirSync(taskPath, { recursive: true })
  }

  const blueprintsPath = join(taskPath, 'blueprints')
  if (!existsSync(blueprintsPath)) {
    mkdirSync(blueprintsPath, { recursive: true })
  }
  
  const manifestPath = join(taskPath, 'step-manifest.json')
  if (!existsSync(manifestPath)) {
    writeFileSync(manifestPath, JSON.stringify({
      taskId,
      stepId: '',
      status: 'pending',
      artifacts: [],
      timestamp: Date.now()
    }, null, 2))
  }
  
  return taskPath
}
