import { defineCommand } from 'citty'
import { startDaemon, stopDaemon, getDaemonStatus } from '../daemon'
import { join } from 'path'

const startCommand = defineCommand({
  meta: {
    name: 'start',
    description: '启动全局 Core 引擎'
  },
  async run() {
    console.log('启动 Xenonix Core 守护进程...')
    
    const serverPath = join(process.cwd(), 'src', 'server.ts')
    const result = await startDaemon(serverPath)
    
    if (result.success) {
      console.log(`✓ Daemon started successfully (PID: ${result.pid})`)
      console.log(`  API server listening on 127.0.0.1:8420`)
      console.log(`  PID file: ~/.xenonix/daemon.pid`)
      console.log(`  Log file: ~/.xenonix/daemon.log`)
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
    console.log('停止 Xenonix Core 守护进程...')
    
    const result = await stopDaemon()
    
    if (result.success) {
      console.log('✓ Daemon stopped successfully')
    } else {
      console.error(`✗ Failed to stop daemon: ${result.error}`)
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
    
    console.log('Xenonix Core 状态:')
    
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
    status: () => Promise.resolve(statusCommand)
  }
})
