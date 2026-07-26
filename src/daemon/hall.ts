import { EventEmitter } from 'events'

export interface PartEvent {
  taskId: string
  partId: string
  partName: string
  status: 'STARTED' | 'COMPLETED' | 'DEVIATED' | 'TIMEOUT'
  timestamp: number
  details?: Record<string, unknown>
}

export interface TaskEvent {
  taskId: string
  taskName: string
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'DEVIATED' | 'ABANDONED'
  timestamp: number
  currentPart?: string
}

export interface ProbeEvent {
  taskId: string
  partId: string
  probeType: string
  result: 'COMPLETED' | 'DEVIATED'
  timestamp: number
}

export type HallEvent = PartEvent | TaskEvent | ProbeEvent

class HallEmitter extends EventEmitter {
  private static instance: HallEmitter

  static getInstance(): HallEmitter {
    if (!HallEmitter.instance) {
      HallEmitter.instance = new HallEmitter()
    }
    return HallEmitter.instance
  }

  emitPartStarted(taskId: string, partId: string, partName: string): void {
    this.emit('part:started', {
      taskId,
      partId,
      partName,
      status: 'STARTED',
      timestamp: Date.now(),
    } satisfies PartEvent)
  }

  emitPartCompleted(taskId: string, partId: string, partName: string, details?: Record<string, unknown>): void {
    this.emit('part:completed', {
      taskId,
      partId,
      partName,
      status: 'COMPLETED',
      timestamp: Date.now(),
      details,
    } satisfies PartEvent)
  }

  emitPartFailed(taskId: string, partId: string, partName: string, details?: Record<string, unknown>): void {
    this.emit('part:failed', {
      taskId,
      partId,
      partName,
      status: 'DEVIATED',
      timestamp: Date.now(),
      details,
    } satisfies PartEvent)
  }

  emitPartTimeout(taskId: string, partId: string, partName: string): void {
    this.emit('part:timeout', {
      taskId,
      partId,
      partName,
      status: 'TIMEOUT',
      timestamp: Date.now(),
    } satisfies PartEvent)
  }

  emitTaskCreated(taskId: string, taskName: string): void {
    this.emit('task:created', {
      taskId,
      taskName,
      status: 'CREATED',
      timestamp: Date.now(),
    } satisfies TaskEvent)
  }

  emitTaskRunning(taskId: string, taskName: string, currentPart?: string): void {
    this.emit('task:running', {
      taskId,
      taskName,
      status: 'RUNNING',
      timestamp: Date.now(),
      currentPart,
    } satisfies TaskEvent)
  }

  emitTaskCompleted(taskId: string, taskName: string): void {
    this.emit('task:completed', {
      taskId,
      taskName,
      status: 'COMPLETED',
      timestamp: Date.now(),
    } satisfies TaskEvent)
  }

  emitTaskFailed(taskId: string, taskName: string): void {
    this.emit('task:failed', {
      taskId,
      taskName,
      status: 'DEVIATED',
      timestamp: Date.now(),
    } satisfies TaskEvent)
  }

  emitProbeResult(taskId: string, partId: string, probeType: string, result: 'COMPLETED' | 'DEVIATED'): void {
    this.emit('probe:result', {
      taskId,
      partId,
      probeType,
      result,
      timestamp: Date.now(),
    } satisfies ProbeEvent)
  }
}

export const hallEmitter = HallEmitter.getInstance()
