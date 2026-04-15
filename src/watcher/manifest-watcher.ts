import { watch, type FSWatcher } from 'fs'
import { readFileSync } from 'fs'
import type { Database } from 'bun:sqlite'
import type { StepManifest } from '../types'
import { updateStepManifest, getStepById } from '../db/operations/steps'
import { createEscapeLog } from '../db/operations/escape-logs'

export interface ManifestWatcherOptions {
  db: Database
  manifestPath: string
  taskId: string
  escapeTimeout?: number
  onEscape?: (manifest: StepManifest) => void
}

export class ManifestWatcher {
  private db: Database
  private manifestPath: string
  private taskId: string
  private escapeTimeout: number
  private onEscape?: (manifest: StepManifest) => void
  private watcher: FSWatcher | null = null
  private lastManifest: StepManifest | null = null
  private lastHeartbeat: number = 0

  constructor(options: ManifestWatcherOptions) {
    this.db = options.db
    this.manifestPath = options.manifestPath
    this.taskId = options.taskId
    this.escapeTimeout = options.escapeTimeout || 30000
    this.onEscape = options.onEscape
  }

  watch(): FSWatcher {
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

      const manifestBefore = this.lastManifest ? JSON.stringify(this.lastManifest) : null
      const manifestAfter = JSON.stringify(manifest)

      updateStepManifest(this.db, manifest.stepId, manifest)

      this.lastManifest = manifest
      this.lastHeartbeat = Date.now()

      this.detectEscape(manifest, manifestBefore, manifestAfter)
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

  private detectEscape(manifest: StepManifest, manifestBefore: string | null, manifestAfter: string): void {
    const step = getStepById(this.db, manifest.stepId)
    if (!step) return

    const timeSinceLastHeartbeat = Date.now() - (step.lastHeartbeat || 0) * 1000

    if (timeSinceLastHeartbeat > this.escapeTimeout) {
      createEscapeLog(
        this.db,
        this.taskId,
        manifest.stepId,
        manifestBefore || undefined,
        manifestAfter
      )

      if (this.onEscape) {
        this.onEscape(manifest)
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
