export interface RadarEntry {
  taskId: string
  stageId: string
  startTime: number
  timeout: number
}

export type TimeoutCallback = (taskId: string, stageId: string, elapsed: number) => void

export class RadarClock {
  private entries: Map<string, RadarEntry> = new Map()
  private timeoutCallbacks: TimeoutCallback[] = []
  private schedulerTimer: ReturnType<typeof setInterval> | null = null
  private checkIntervalMs: number = 1000

  startMonitor(taskId: string, stageId: string, timeoutMs: number): void {
    const key = `${taskId}:${stageId}`
    this.entries.set(key, {
      taskId,
      stageId,
      startTime: Date.now(),
      timeout: timeoutMs
    })
  }

  stopMonitor(taskId: string, stageId: string): void {
    const key = `${taskId}:${stageId}`
    this.entries.delete(key)
  }

  isTimeout(taskId: string, stageId: string): boolean {
    const key = `${taskId}:${stageId}`
    const entry = this.entries.get(key)
    if (!entry) return false

    const elapsed = Date.now() - entry.startTime
    return elapsed > entry.timeout
  }

  getElapsed(taskId: string, stageId: string): number {
    const key = `${taskId}:${stageId}`
    const entry = this.entries.get(key)
    if (!entry) return 0

    return Date.now() - entry.startTime
  }

  getRemaining(taskId: string, stageId: string): number {
    const key = `${taskId}:${stageId}`
    const entry = this.entries.get(key)
    if (!entry) return 0

    const elapsed = Date.now() - entry.startTime
    return Math.max(0, entry.timeout - elapsed)
  }

  onTimeout(callback: TimeoutCallback): void {
    this.timeoutCallbacks.push(callback)
  }

  offTimeout(callback: TimeoutCallback): void {
    const idx = this.timeoutCallbacks.indexOf(callback)
    if (idx !== -1) {
      this.timeoutCallbacks.splice(idx, 1)
    }
  }

  startScheduler(checkIntervalMs: number = 1000): void {
    this.stopScheduler()
    this.checkIntervalMs = checkIntervalMs
    this.schedulerTimer = setInterval(() => {
      this.checkTimeouts()
    }, checkIntervalMs)
  }

  stopScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer)
      this.schedulerTimer = null
    }
  }

  private checkTimeouts(): void {
    for (const [key, entry] of this.entries) {
      const elapsed = Date.now() - entry.startTime
      if (elapsed > entry.timeout) {
        for (const cb of this.timeoutCallbacks) {
          cb(entry.taskId, entry.stageId, elapsed)
        }
      }
    }
  }

  clear(): void {
    this.entries.clear()
  }

  destroy(): void {
    this.stopScheduler()
    this.entries.clear()
    this.timeoutCallbacks = []
  }
}

export const radarClock = new RadarClock()