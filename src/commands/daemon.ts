import { defineCommand } from 'citty'
import { startDaemonWithHealthCheck, stopDaemon, getDaemonStatus } from '../daemon'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

function getServerPath(): string {
  const homePath = process.env.XENONIX_HOME
  if (homePath) {
    const serverPath = join(homePath, 'src', 'server.ts')
    if (existsSync(serverPath)) {
      return serverPath
    }
  }
  
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  
  if (__filename.includes('$bunfs')) {
    const candidates = [
      '/Users/issac/pro/openxenon/src/server.ts',
      join(process.cwd(), 'src', 'server.ts'),
    ]
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate
      }
    }
  }
  
  if (__filename.includes('dist/oxn') || __filename.includes('dist\\oxn')) {
    return join(__dirname, '..', 'src', 'server.ts')
  }
  
  return join(__dirname, '..', 'server.ts')
}

const startCommand = defineCommand({
  meta: {
    name: 'start',
    description: '启动全局 Core 引擎'
  },
  async run() {
    console.log('启动 OpenXenon Core 守护进程...')
    
    const serverPath = getServerPath()
    const result = await startDaemonWithHealthCheck(serverPath)
    
    if (result.success) {
      console.log(`✓ Daemon started successfully (PID: ${result.pid})`)
      console.log(`  Health check passed in ${result.healthCheckMs}ms`)
      console.log(`  API server listening on 127.0.0.1:8420`)
console.log(`  PID file: ~/.openxenon/daemon.pid`)
  console.log(`  Log file: ~/.openxenon/daemon.log`)
    } else {
      console.error(`✗ Failed to start daemon: ${result.error}`)
      process.exit(1)
    }
  }
})

const stopCommand = defineCommand({
  meta: {
    name: 'stop',
    description: '停止全局 Core 引擎'
  },
  async run() {
    console.log('停止 OpenXenon Core 守护进程...')
    
    const result = await stopDaemon()
    
    if (result.success) {
      console.log('✓ Daemon stopped successfully')
    } else {
      console.error(`✗ Failed to stop daemon: ${result.error}`)
      process.exit(1)
    }
  }
})

const restartCommand = defineCommand({
  meta: {
    name: 'restart',
    description: '重启全局 Core 引擎'
  },
  async run() {
    console.log('重启 OpenXenon Core 守护进程...')
    
    const stopResult = await stopDaemon()
    
    if (stopResult.success) {
      console.log('✓ Daemon stopped')
    } else if (stopResult.error?.includes('not running')) {
      console.log('  Daemon was not running, starting...')
    } else {
      console.error(`✗ Failed to stop daemon: ${stopResult.error}`)
      process.exit(1)
    }
    
    const serverPath = getServerPath()
    const startResult = await startDaemonWithHealthCheck(serverPath)
    
    if (startResult.success) {
      console.log(`✓ Daemon restarted successfully (PID: ${startResult.pid})`)
      console.log(`  Health check passed in ${startResult.healthCheckMs}ms`)
    } else {
      console.error(`✗ Failed to start daemon: ${startResult.error}`)
      process.exit(1)
    }
  }
})

const statusCommand = defineCommand({
  meta: {
    name: 'status',
    description: '查看 Core 引擎状态'
  },
  async run() {
    const status = getDaemonStatus()
    
    console.log('OpenXenon Core 状态:')
    
    if (status.isRunning) {
      console.log(`  状态: 运行中 (PID: ${status.pid})`)
    } else {
      console.log('  状态: 未运行')
    }
    
    console.log(`  日志文件: ${status.logPath}`)
    
    if (status.recentLogs.length > 0) {
      console.log('\n最近日志:')
      for (const log of status.recentLogs) {
        console.log(`  ${log}`)
      }
    }
  }
})

export default defineCommand({
  meta: {
    name: 'daemon',
    description: '管理全局 Core 引擎的生命周期'
  },
  subCommands: {
    start: () => Promise.resolve(startCommand),
    stop: () => Promise.resolve(stopCommand),
    restart: () => Promise.resolve(restartCommand),
    status: () => Promise.resolve(statusCommand)
  }
})
