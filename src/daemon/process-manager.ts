import { spawn } from 'child_process'
import { daemonLogger } from './logger'

export interface ManagedProcess {
  id: string
  pid: number
  taskId: string
  partId: string
  command: string
  args: string[]
  startTime: number
  status: 'running' | 'stopped' | 'timeout'
}

export class ProcessManager {
  private processes: Map<string, ManagedProcess> = new Map()

  spawn(taskId: string, partId: string, command: string, args: string[] = []): ManagedProcess | null {
    const id = `${taskId}:${partId}`

    if (this.processes.has(id)) {
      daemonLogger.warn(`Process already running for ${id}`)
      return null
    }

    try {
      const child = spawn(command, args, {
        stdio: 'pipe',
        detached: false,
      })

      const managed: ManagedProcess = {
        id,
        pid: child.pid!,
        taskId,
        partId,
        command,
        args,
        startTime: Date.now(),
        status: 'running',
      }

      this.processes.set(id, managed)

      child.on('exit', (code, _signal) => {
        const proc = this.processes.get(id)
        if (proc) {
          proc.status = code === 0 ? 'stopped' : 'stopped'
          daemonLogger.info(`Process ${id} exited with code ${code}`)
        }
      })

      child.on('error', (err) => {
        daemonLogger.error(`Process ${id} error: ${err.message}`)
        const proc = this.processes.get(id)
        if (proc) {
          proc.status = 'stopped'
        }
      })

      daemonLogger.info(`Spawned process ${id} with pid ${child.pid}`)
      return managed
    } catch (error) {
      daemonLogger.error(`Failed to spawn process ${id}: ${error}`)
      return null
    }
  }

  kill(taskId: string, partId: string): boolean {
    const id = `${taskId}:${partId}`
    const proc = this.processes.get(id)

    if (!proc) {
      daemonLogger.warn(`No process found for ${id}`)
      return false
    }

    try {
      process.kill(proc.pid, 'SIGTERM')
      proc.status = 'stopped'
      daemonLogger.info(`Killed process ${id} (pid ${proc.pid})`)
      return true
    } catch (error) {
      daemonLogger.error(`Failed to kill process ${id}: ${error}`)
      return false
    }
  }

  killAll(): void {
    for (const [id, proc] of this.processes) {
      try {
        process.kill(proc.pid, 'SIGTERM')
        daemonLogger.info(`Killed process ${id}`)
      } catch {}
    }
    this.processes.clear()
  }

  get(taskId: string, partId: string): ManagedProcess | undefined {
    return this.processes.get(`${taskId}:${partId}`)
  }

  getAll(): ManagedProcess[] {
    return Array.from(this.processes.values())
  }

  markTimeout(taskId: string, partId: string): boolean {
    const id = `${taskId}:${partId}`
    const proc = this.processes.get(id)

    if (!proc) {
      return false
    }

    proc.status = 'timeout'
    return this.kill(taskId, partId)
  }

  remove(taskId: string, partId: string): boolean {
    const id = `${taskId}:${partId}`
    return this.processes.delete(id)
  }
}

export const processManager = new ProcessManager()
