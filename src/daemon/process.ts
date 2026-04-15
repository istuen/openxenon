import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { DAEMON_PID_PATH, GLOBAL_BOUNDARY_PATH } from '../core/global'
import { daemonLogger } from './logger'

export interface DaemonProcessInfo {
  pid: number
  isRunning: boolean
}

export function isDaemonRunning(): DaemonProcessInfo {
  if (!existsSync(DAEMON_PID_PATH)) {
    return { pid: 0, isRunning: false }
  }
  
  try {
    const pidContent = readFileSync(DAEMON_PID_PATH, 'utf-8').trim()
    const pid = parseInt(pidContent, 10)
    
    if (isNaN(pid) || pid <= 0) {
      return { pid: 0, isRunning: false }
    }
    
    try {
      process.kill(pid, 0)
      return { pid, isRunning: true }
    } catch {
      return { pid, isRunning: false }
    }
  } catch (error) {
    daemonLogger.error(`Failed to read PID file: ${error}`)
    return { pid: 0, isRunning: false }
  }
}

export function startDaemon(serverPath: string): { success: boolean; pid?: number; error?: string } {
  const { isRunning, pid: existingPid } = isDaemonRunning()
  
  if (isRunning) {
    return {
      success: false,
      error: `Daemon already running with PID ${existingPid}`
    }
  }
  
  if (existsSync(DAEMON_PID_PATH)) {
    daemonLogger.info('Cleaning up stale PID file')
    try {
      unlinkSync(DAEMON_PID_PATH)
    } catch (error) {
      daemonLogger.error(`Failed to remove stale PID file: ${error}`)
    }
  }
  
  try {
    if (!existsSync(GLOBAL_BOUNDARY_PATH)) {
      const { mkdirSync } = require('fs')
      mkdirSync(GLOBAL_BOUNDARY_PATH, { recursive: true })
    }
    
    const proc = Bun.spawn(['bun', 'run', serverPath], {
      detached: true,
      stdio: ['ignore', 'ignore', 'ignore'],
      cwd: process.cwd()
    })
    
    proc.unref()
    
    const pid = proc.pid
    writeFileSync(DAEMON_PID_PATH, pid.toString(), 'utf-8')
    
    daemonLogger.info(`Daemon started with PID ${pid}`)
    
    return {
      success: true,
      pid
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    daemonLogger.error(`Failed to start daemon: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage
    }
  }
}

export async function stopDaemon(): Promise<{ success: boolean; error?: string }> {
  const { isRunning, pid } = isDaemonRunning()
  
  if (!isRunning) {
    if (existsSync(DAEMON_PID_PATH)) {
      daemonLogger.info('Cleaning up stale PID file')
      try {
        unlinkSync(DAEMON_PID_PATH)
      } catch (error) {
        daemonLogger.error(`Failed to remove stale PID file: ${error}`)
      }
    }
    
    return {
      success: false,
      error: 'Daemon is not running'
    }
  }
  
  try {
    process.kill(pid, 'SIGTERM')
    
    let attempts = 0
    const maxAttempts = 10
    const checkInterval = 500
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, checkInterval))
      
      try {
        process.kill(pid, 0)
        attempts++
      } catch {
        break
      }
    }
    
    if (existsSync(DAEMON_PID_PATH)) {
      unlinkSync(DAEMON_PID_PATH)
    }
    
    daemonLogger.info(`Daemon stopped (PID ${pid})`)
    
    return { success: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    daemonLogger.error(`Failed to stop daemon: ${errorMessage}`)
    return {
      success: false,
      error: errorMessage
    }
  }
}
