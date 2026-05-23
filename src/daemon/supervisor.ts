import { existsSync, readFileSync, writeFileSync } from '../infra/filesystem'
import { DAEMON_PID_PATH } from '../infra/global'
import { daemonLogger } from './logger'

export interface SupervisorConfig {
  maxRestartAttempts: number
  restartDelayMs: number
  healthCheckIntervalMs: number
}

export interface SupervisorState {
  isRunning: boolean
  pid: number
  restartCount: number
  lastRestartTime: number | null
}

const DEFAULT_CONFIG: SupervisorConfig = {
  maxRestartAttempts: 5,
  restartDelayMs: 5000,
  healthCheckIntervalMs: 30000,
}

export class DaemonSupervisor {
  private config: SupervisorConfig
  private state: SupervisorState
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private restartTimer: ReturnType<typeof setTimeout> | null = null

  constructor(config: Partial<SupervisorConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.state = {
      isRunning: false,
      pid: 0,
      restartCount: 0,
      lastRestartTime: null,
    }
    this.loadState()
  }

  private loadState(): void {
    const statePath = DAEMON_PID_PATH.replace('pid', 'supervisor-state')
    if (existsSync(statePath)) {
      try {
        const content = readFileSync(statePath, 'utf-8')
        const saved = JSON.parse(content)
        this.state.restartCount = saved.restartCount || 0
        this.state.lastRestartTime = saved.lastRestartTime || null
      } catch {
        // ignore
      }
    }
  }

  private saveState(): void {
    const statePath = DAEMON_PID_PATH.replace('pid', 'supervisor-state')
    writeFileSync(
      statePath,
      JSON.stringify({
        restartCount: this.state.restartCount,
        lastRestartTime: this.state.lastRestartTime,
      }),
      'utf-8',
    )
  }

  isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  startDaemon(serverPath: string): boolean {
    if (this.state.isRunning) {
      daemonLogger.warn('Daemon is already running')
      return false
    }

    if (this.state.restartCount >= this.config.maxRestartAttempts) {
      daemonLogger.error(`Max restart attempts (${this.config.maxRestartAttempts}) reached`)
      return false
    }

    try {
      const { spawn } = require('child_process')
      const proc = spawn('bun', ['run', serverPath], {
        detached: true,
        stdio: ['ignore', 'ignore', 'ignore'],
      })

      proc.unref()

      this.state.pid = proc.pid
      this.state.isRunning = true
      this.state.lastRestartTime = Date.now()
      this.state.restartCount++

      writeFileSync(DAEMON_PID_PATH, proc.pid.toString(), 'utf-8')
      this.saveState()

      daemonLogger.info(`Daemon started with PID ${proc.pid} (restart #${this.state.restartCount})`)

      this.startHealthCheck(serverPath)

      return true
    } catch (error) {
      daemonLogger.error(`Failed to start daemon: ${error}`)
      return false
    }
  }

  stopDaemon(): boolean {
    if (!this.state.isRunning && this.state.pid === 0) {
      daemonLogger.warn('Daemon is not running')
      return false
    }

    try {
      if (this.state.pid > 0) {
        process.kill(this.state.pid, 'SIGTERM')
      }

      this.state.isRunning = false
      this.state.pid = 0

      this.stopHealthCheck()

      daemonLogger.info('Daemon stopped')
      return true
    } catch (error) {
      daemonLogger.error(`Failed to stop daemon: ${error}`)
      return false
    }
  }

  private startHealthCheck(serverPath: string): void {
    this.stopHealthCheck()

    this.healthCheckTimer = setInterval(() => {
      if (this.state.pid > 0 && !this.isProcessRunning(this.state.pid)) {
        daemonLogger.warn(`Daemon process ${this.state.pid} is not running`)
        this.handleDaemonCrash(serverPath)
      }
    }, this.config.healthCheckIntervalMs)
  }

  private stopHealthCheck(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }

  private handleDaemonCrash(serverPath: string): void {
    this.state.isRunning = false

    if (this.state.restartCount >= this.config.maxRestartAttempts) {
      daemonLogger.error(`Max restart attempts reached, supervisor giving up`)
      return
    }

    daemonLogger.info(`Scheduling daemon restart in ${this.config.restartDelayMs}ms...`)

    this.restartTimer = setTimeout(() => {
      daemonLogger.info('Attempting to restart daemon...')
      this.startDaemon(serverPath)
    }, this.config.restartDelayMs)
  }

  getState(): SupervisorState {
    return { ...this.state }
  }

  resetRestartCount(): void {
    this.state.restartCount = 0
    this.saveState()
    daemonLogger.info('Restart count reset')
  }

  destroy(): void {
    this.stopHealthCheck()
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
    }
  }
}

export const daemonSupervisor = new DaemonSupervisor()
