import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { CORE_DAEMON_CONFIG_PATH } from '../infra/global'

export function setDaemonAddress(socketPath: string): void {
  const config = {
    socketPath
  }
  writeFileSync(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config), 'utf-8')
}

export function clearDaemonAddress(): void {
  if (existsSync(CORE_DAEMON_CONFIG_PATH)) {
    unlinkSync(CORE_DAEMON_CONFIG_PATH)
  }
}

export function getDaemonAddress(): string | null {
  if (!existsSync(CORE_DAEMON_CONFIG_PATH)) {
    return null
  }
  try {
    const content = require('fs').readFileSync(CORE_DAEMON_CONFIG_PATH, 'utf-8')
    const config = JSON.parse(content)
    return config.socketPath || null
  } catch {
    return null
  }
}