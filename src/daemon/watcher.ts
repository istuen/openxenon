import { type FSWatcher, watch } from '../infra/filesystem'
import { daemonLogger } from './logger'

export interface WatcherConfig {
  watchPaths: string[]
  ignorePaths: string[]
  extensions: string[]
  debounceMs: number
}

export interface WatchEvent {
  path: string
  type: 'create' | 'update' | 'delete'
  timestamp: number
}

type WatchCallback = (event: WatchEvent) => void | Promise<void>

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: ['src', 'tests'],
  ignorePaths: ['node_modules', 'dist', '.git', '.openxenon'],
  extensions: ['.ts', '.js', '.yaml', '.yml', '.json'],
  debounceMs: 500,
}

export class FileWatcher {
  private config: WatcherConfig
  private watchers: Map<string, FSWatcher> = new Map()
  private callbacks: Set<WatchCallback> = new Set()
  private debounceTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  constructor(config: Partial<WatcherConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  shouldIgnore(path: string): boolean {
    for (const ignore of this.config.ignorePaths) {
      if (path.includes(ignore)) {
        return true
      }
    }
    return false
  }

  shouldWatch(path: string): boolean {
    const lastDot = path.lastIndexOf('.')
    if (lastDot === -1) return false
    const ext = path.substring(lastDot)
    return this.config.extensions.includes(ext)
  }

  addCallback(callback: WatchCallback): void {
    this.callbacks.add(callback)
  }

  removeCallback(callback: WatchCallback): void {
    this.callbacks.delete(callback)
  }

  async start(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      await this.watchDirectory(watchPath)
    }
    daemonLogger.info(`File watcher started, watching: ${this.config.watchPaths.join(', ')}`)
  }

  private async watchDirectory(dirPath: string): Promise<void> {
    if (this.watchers.has(dirPath)) {
      return
    }

    try {
      const watcher = watch(dirPath, { recursive: true }, (eventType, filename) => {
        if (!filename) return

        const fullPath = filename.toString()
        if (this.shouldIgnore(fullPath)) {
          return
        }

        if (!this.shouldWatch(fullPath)) {
          return
        }

        const mappedType = eventType === 'rename' ? 'update' : 'update'
        this.debounceEvent(fullPath, mappedType)
      })

      watcher.on('error', (err) => {
        daemonLogger.error(`Watch error on ${dirPath}: ${err.message}`)
      })

      this.watchers.set(dirPath, watcher)
      daemonLogger.info(`Watching directory: ${dirPath}`)
    } catch (error) {
      daemonLogger.error(`Failed to watch directory ${dirPath}: ${error}`)
    }
  }

  private debounceEvent(path: string, type: string): void {
    const existingTimer = this.debounceTimers.get(path)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(path)
      const event: WatchEvent = {
        path,
        type: type as WatchEvent['type'],
        timestamp: Date.now(),
      }

      daemonLogger.info(`File ${type}: ${path}`)

      for (const callback of this.callbacks) {
        try {
          const result = callback(event)
          if (result instanceof Promise) {
            result.catch((err) => daemonLogger.error(`Callback error: ${err}`))
          }
        } catch (err) {
          daemonLogger.error(`Callback error: ${err}`)
        }
      }
    }, this.config.debounceMs)

    this.debounceTimers.set(path, timer)
  }

  stop(): void {
    for (const [path, watcher] of this.watchers) {
      watcher.close()
      daemonLogger.info(`Stopped watching: ${path}`)
    }
    this.watchers.clear()

    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer)
    }
    this.debounceTimers.clear()

    daemonLogger.info('File watcher stopped')
  }

  isRunning(): boolean {
    return this.watchers.size > 0
  }
}

export const fileWatcher = new FileWatcher()
