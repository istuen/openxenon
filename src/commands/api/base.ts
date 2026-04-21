import { defineCommand } from 'citty'
import { getDaemonAddress } from '../../db/operations/daemon-config'
import { initCoreDb } from '../../db/init'
import { CORE_DB_PATH } from '../../core/global'
import { isDaemonRunning } from '../../daemon/process'

export default defineCommand({
  meta: {
    name: 'base',
    description: '输出 Core 引擎当前通信地址'
  },
  run() {
    const { isRunning } = isDaemonRunning()

    if (!isRunning) {
      console.error('Error: Core daemon is not running')
      console.error('Start it with: oxn daemon start')
      process.exit(1)
    }

    const db = initCoreDb(CORE_DB_PATH)
    const address = getDaemonAddress(db)

    if (!address) {
      console.error('Error: Daemon address not found in database')
      console.error('This may indicate an incomplete startup. Try restarting the daemon.')
      process.exit(1)
    }

    console.log(address)
  }
})