import { EventEmitter } from 'events'

export interface StageEvent {
  taskId: string
  stageId: string
  stageName: string
  status: 'STARTED' | 'COMPLETED' | 'FAILED' | 'TIMEOUT'
  timestamp: number
  details?: Record<string, unknown>
}

export interface TaskEvent {
  taskId: string
  taskName: string
  status: 'CREATED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'ABANDONED'
  timestamp: number
  currentStage?: string
}

export interface ProbeEvent {
  taskId: string
  stageId: string
  probeType: string
  result: 'PASSED' | 'FAILED'
  timestamp: number
}

export type HallEvent = StageEvent | TaskEvent | ProbeEvent

class HallEmitter extends EventEmitter {
  private static instance: HallEmitter

  static getInstance(): HallEmitter {
    if (!HallEmitter.instance) {
      HallEmitter.instance = new HallEmitter()
    }
    return HallEmitter.instance
  }

  emitStageStarted(taskId: string, stageId: string, stageName: string): void {
    this.emit('stage:started', {
      taskId,
      stageId,
      stageName,
      status: 'STARTED',
      timestamp: Date.now()
    } satisfies StageEvent)
  }

  emitStageCompleted(taskId: string, stageId: string, stageName: string, details?: Record<string, unknown>): void {
    this.emit('stage:completed', {
      taskId,
      stageId,
      stageName,
      status: 'COMPLETED',
      timestamp: Date.now(),
      details
    } satisfies StageEvent)
  }

  emitStageFailed(taskId: string, stageId: string, stageName: string, details?: Record<string, unknown>): void {
    this.emit('stage:failed', {
      taskId,
      stageId,
      stageName,
      status: 'FAILED',
      timestamp: Date.now(),
      details
    } satisfies StageEvent)
  }

  emitStageTimeout(taskId: string, stageId: string, stageName: string): void {
    this.emit('stage:timeout', {
      taskId,
      stageId,
      stageName,
      status: 'TIMEOUT',
      timestamp: Date.now()
    } satisfies StageEvent)
  }

  emitTaskCreated(taskId: string, taskName: string): void {
    this.emit('task:created', {
      taskId,
      taskName,
      status: 'CREATED',
      timestamp: Date.now()
    } satisfies TaskEvent)
  }

  emitTaskRunning(taskId: string, taskName: string, currentStage?: string): void {
    this.emit('task:running', {
      taskId,
      taskName,
      status: 'RUNNING',
      timestamp: Date.now(),
      currentStage
    } satisfies TaskEvent)
  }

  emitTaskCompleted(taskId: string, taskName: string): void {
    this.emit('task:completed', {
      taskId,
      taskName,
      status: 'COMPLETED',
      timestamp: Date.now()
    } satisfies TaskEvent)
  }

  emitTaskFailed(taskId: string, taskName: string): void {
    this.emit('task:failed', {
      taskId,
      taskName,
      status: 'FAILED',
      timestamp: Date.now()
    } satisfies TaskEvent)
  }

  emitProbeResult(taskId: string, stageId: string, probeType: string, result: 'PASSED' | 'FAILED'): void {
    this.emit('probe:result', {
      taskId,
      stageId,
      probeType,
      result,
      timestamp: Date.now()
    } satisfies ProbeEvent)
  }
}

export const hallEmitter = HallEmitter.getInstance()