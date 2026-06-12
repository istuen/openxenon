import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from '../infra/filesystem'
import { getProjectBoundaryPath } from '../infra/paths'
import { daemonLogger } from './logger'

export interface RecoveryPoint {
  id: string
  taskId: string
  partId: string
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
  autoCheckpointIntervalMs: 60000,
}

export class RecoveryManager {
  private config: RecoveryConfig
  private recoveryPoints: Map<string, RecoveryPoint[]> = new Map()
  private projectRoot: string

  constructor(config: Partial<RecoveryConfig> = {}, projectRoot?: string) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.projectRoot = projectRoot ? getProjectBoundaryPath(projectRoot) : getProjectBoundaryPath(process.cwd())
  }

  private getProjectBoundary(): string {
    return this.projectRoot
  }

  createRecoveryPoint(taskId: string, partId: string, metadata: Record<string, unknown> = {}): RecoveryPoint | null {
    const projectBoundary = this.getProjectBoundary()
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
    const stateBackupPath = join(recoveryDir, `${id}-state.json`)
    const artifactBackupPath = join(recoveryDir, `${id}-artifact.json`)

    try {
      const stateContent = readFileSync(statePath, 'utf-8')
      writeFileSync(stateBackupPath, stateContent, 'utf-8')
      if (existsSync(artifactPath)) {
        const artifactContent = readFileSync(artifactPath, 'utf-8')
        writeFileSync(artifactBackupPath, artifactContent, 'utf-8')
      }
    } catch (error) {
      daemonLogger.error(`Failed to backup state files: ${error}`)
      return null
    }

    const recoveryPoint: RecoveryPoint = {
      id,
      taskId,
      partId,
      timestamp: Date.now(),
      statePath: stateBackupPath,
      artifactPath: artifactBackupPath,
      metadata,
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

    daemonLogger.info(`Created recovery point ${id} for task ${taskId} at part ${partId}`)

    return recoveryPoint
  }

  getRecoveryPoints(taskId: string): RecoveryPoint[] {
    if (this.recoveryPoints.has(taskId)) {
      return this.recoveryPoints.get(taskId)!
    }

    const projectBoundary = this.getProjectBoundary()
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
    const target = points.find((p) => p.id === recoveryPointId)

    if (!target) {
      daemonLogger.error(`Recovery point ${recoveryPointId} not found`)
      return false
    }

    const projectBoundary = this.getProjectBoundary()
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

  retry(taskId: string, fromPartId?: string): boolean {
    const latest = this.getLatestRecoveryPoint(taskId)

    if (!latest) {
      daemonLogger.error(`No recovery points found for task ${taskId}`)
      return false
    }

    const projectBoundary = this.getProjectBoundary()
    const statePath = join(projectBoundary, 'tasks', taskId, 'state.json')

    try {
      const stateContent = readFileSync(statePath, 'utf-8')
      const state = JSON.parse(stateContent)

      if (state.status === 'COMPLETED' || state.status === 'FAILED') {
        daemonLogger.warn(`Cannot retry task with status ${state.status}`)
        return false
      }

      daemonLogger.info(`Retrying task ${taskId} from part ${fromPartId || latest.partId}`)
      return true
    } catch (error) {
      daemonLogger.error(`Retry failed: ${error}`)
      return false
    }
  }

  clearRecoveryPoints(taskId: string): void {
    const points = this.recoveryPoints.get(taskId) || []
    const projectBoundary = this.getProjectBoundary()
    const recoveryDir = join(projectBoundary, 'tasks', taskId, 'recovery')

    for (const point of points) {
      try {
        if (existsSync(point.statePath)) {
          rmSync(point.statePath, { force: true })
        }
        if (existsSync(point.artifactPath)) {
          rmSync(point.artifactPath, { force: true })
        }
      } catch {}
    }

    try {
      const indexPath = join(recoveryDir, 'index.json')
      if (existsSync(indexPath)) {
        rmSync(indexPath, { force: true })
      }
    } catch {}

    this.recoveryPoints.delete(taskId)
    daemonLogger.info(`Cleared recovery points for task ${taskId}`)
  }
}

export const recoveryManager = new RecoveryManager()

export function createRecoveryManager(config?: Partial<RecoveryConfig>, projectRoot?: string): RecoveryManager {
  return new RecoveryManager(config, projectRoot)
}
