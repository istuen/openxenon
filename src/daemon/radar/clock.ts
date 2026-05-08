export interface RadarEntry {
  taskId: string
  stageId: string
  startTime: number
  timeout: number
}

export class RadarClock {
  private entries: Map<string, RadarEntry> = new Map()

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

  clear(): void {
    this.entries.clear()
  }
}

export const radarClock = new RadarClock()