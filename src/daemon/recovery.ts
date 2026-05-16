import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { daemonLogger } from './logger'
import { getProjectBoundaryPath } from '../kernel'

export interface RecoveryPoint {
  id: string
  taskId: string
  stageId: string
  timestamp: number
  statePath: string
  artifactPath: string
  metadata: Record<string, unknown>
}

export interface RecoveryConfig {
  maxRecoveryPoints: number
  autoCheckpointIntervalMs: number
}

const DEFAULT_CONFIG: RecoveryConfig = {
  maxRecoveryPoints: 5,
  autoCheckpointIntervalMs: 60000
}

export class RecoveryManager {
  private config: RecoveryConfig
  private recoveryPoints: Map<string, RecoveryPoint[]> = new Map()

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  createRecoveryPoint(taskId: string, stageId: string, metadata: Record<string, unknown> = {}): RecoveryPoint | null {
    const projectBoundary = getProjectBoundaryPath(process.cwd())
    const recoveryDir = join(projectBoundary, 'tasks', taskId, 'recovery')

    if (!existsSync(recoveryDir)) {
      mkdirSync(recoveryDir, { recursive: true })
    }

    const statePath = join(projectBoundary, 'tasks', taskId, 'state.json')
    const artifactPath = join(projectBoundary, 'tasks', taskId, 'artifact.json')

    if (!existsSync(statePath)) {
      daemonLogger.error('Cannot create recovery point: state.json not found')
      return null
    }

    const id = `rp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const recoveryPoint: RecoveryPoint = {
      id,
      taskId,
      stageId,
      timestamp: Date.now(),
      statePath,
      artifactPath,
      metadata
    }

    const points = this.getRecoveryPoints(taskId)
    points.push(recoveryPoint)

    if (points.length > this.config.maxRecoveryPoints) {
      const oldest = points.shift()
      if (oldest) {
        daemonLogger.info(`Removed oldest recovery point: ${oldest.id}`)
      }
    }

    this.recoveryPoints.set(taskId, points)

    const indexPath = join(recoveryDir, 'index.json')
    writeFileSync(indexPath, JSON.stringify(points, null, 2), 'utf-8')

    daemonLogger.info(`Created recovery point ${id} for task ${taskId} at stage ${stageId}`)

    return recoveryPoint
  }

  getRecoveryPoints(taskId: string): RecoveryPoint[] {
    if (this.recoveryPoints.has(taskId)) {
      return this.recoveryPoints.get(taskId)!
    }

    const projectBoundary = getProjectBoundaryPath(process.cwd())
    const indexPath = join(projectBoundary, 'tasks', taskId, 'recovery', 'index.json')

    if (!existsSync(indexPath)) {
      return []
    }

    try {
      const content = readFileSync(indexPath, 'utf-8')
      const points = JSON.parse(content) as RecoveryPoint[]
      this.recoveryPoints.set(taskId, points)
      return points
    } catch {
      return []
    }
  }

  getLatestRecoveryPoint(taskId: string): RecoveryPoint | null {
    const points = this.getRecoveryPoints(taskId)
    return points.length > 0 ? (points.at(-1) ?? null) : null
  }

  rollbackTo(taskId: string, recoveryPointId: string): boolean {
    const points = this.getRecoveryPoints(taskId)
    const target = points.find(p => p.id === recoveryPointId)

    if (!target) {
      daemonLogger.error(`Recovery point ${recoveryPointId} not found`)
      return false
    }

    const projectBoundary = getProjectBoundaryPath(process.cwd())
    const stateDestPath = join(projectBoundary, 'tasks', taskId, 'state.json')
    const artifactDestPath = join(projectBoundary, 'tasks', taskId, 'artifact.json')

    try {
      if (existsSync(target.statePath)) {
        const stateContent = readFileSync(target.statePath, 'utf-8')
        writeFileSync(stateDestPath, stateContent, 'utf-8')
      }

      if (existsSync(target.artifactPath)) {
        const artifactContent = readFileSync(target.artifactPath, 'utf-8')
        writeFileSync(artifactDestPath, artifactContent, 'utf-8')
      }

      daemonLogger.info(`Rolled back task ${taskId} to recovery point ${recoveryPointId}`)
      return true
    } catch (error) {
      daemonLogger.error(`Rollback failed: ${error}`)
      return false
    }
  }

  retry(taskId: string, fromStageId?: string): boolean {
    const latest = this.getLatestRecoveryPoint(taskId)

    if (!latest) {
      daemonLogger.error(`No recovery points found for task ${taskId}`)
      return false
    }

    const projectBoundary = getProjectBoundaryPath(process.cwd())
    const statePath = join(projectBoundary, 'tasks', taskId, 'state.json')

    try {
      const stateContent = readFileSync(statePath, 'utf-8')
      const state = JSON.parse(stateContent)

      if (state.status === 'COMPLETED' || state.status === 'FAILED') {
        daemonLogger.warn(`Cannot retry task with status ${state.status}`)
        return false
      }

      daemonLogger.info(`Retrying task ${taskId} from stage ${fromStageId || latest.stageId}`)
      return true
    } catch (error) {
      daemonLogger.error(`Retry failed: ${error}`)
      return false
    }
  }

  clearRecoveryPoints(taskId: string): void {
    this.recoveryPoints.delete(taskId)
    daemonLogger.info(`Cleared recovery points for task ${taskId}`)
  }
}

export const recoveryManager = new RecoveryManager()