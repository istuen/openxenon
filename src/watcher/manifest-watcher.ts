import { existsSync, type FSWatcher, readFileSync, watch } from 'fs'
import { readTaskTrace } from '../daemon/trace/writer'
import { getTaskDirectory } from '../kernel/lib/task-dir'
import type { StepManifest } from '../kernel/lib/types/task'

export interface ManifestWatcherOptions {
  projectRoot: string
  taskId: string
  manifestPath: string
  escapeTimeout?: number
  onEscape?: (manifest: StepManifest) => void
}

export class ManifestWatcher {
  private projectRoot: string
  private taskId: string
  private manifestPath: string
  private escapeTimeout: number
  private onEscape?: (manifest: StepManifest) => void
  private watcher: FSWatcher | null = null
  private lastManifest: StepManifest | null = null
  private lastHeartbeat: number = 0

  constructor(options: ManifestWatcherOptions) {
    this.projectRoot = options.projectRoot
    this.taskId = options.taskId
    this.manifestPath = options.manifestPath
    this.escapeTimeout = options.escapeTimeout || 30000
    this.onEscape = options.onEscape
  }

  watch(): FSWatcher {
    if (!existsSync(this.manifestPath)) {
      throw new Error(`Manifest path does not exist: ${this.manifestPath}`)
    }

    this.watcher = watch(this.manifestPath, (event) => {
      if (event === 'change') {
        this.handleManifestChange()
      }
    })

    return this.watcher
  }

  private handleManifestChange(): void {
    try {
      const manifest = this.readManifest()
      if (!manifest) return

      this.lastManifest = manifest
      this.lastHeartbeat = Date.now()

      const taskDir = getTaskDirectory(this.projectRoot, this.taskId)
      const trace = readTaskTrace(taskDir)

      if (trace) {
        const stageState = trace.parts.get(manifest.stepId)
        if (stageState) {
          stageState.status = manifest.status as any
        }
      }

      this.detectEscape(manifest)
    } catch (error) {
      console.error('Error handling manifest change:', error)
    }
  }

  private readManifest(): StepManifest | null {
    try {
      const content = readFileSync(this.manifestPath, 'utf-8')
      return JSON.parse(content) as StepManifest
    } catch {
      return null
    }
  }

  private detectEscape(_manifest: StepManifest): void {
    if (this.onEscape && this.lastHeartbeat > 0) {
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat

      if (timeSinceLastHeartbeat > this.escapeTimeout) {
        this.onEscape(_manifest)
      }
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }
  }

  getLastHeartbeat(): number {
    return this.lastHeartbeat
  }

  getLastManifest(): StepManifest | null {
    return this.lastManifest
  }
}
