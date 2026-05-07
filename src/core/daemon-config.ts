import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs'
import { dirname } from 'path'
import { CORE_DAEMON_CONFIG_PATH } from './global'

export interface DaemonConfig {
  version: 1
  address: string | null
  startedAt: number | null
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    import('fs').then(({ mkdirSync }) => mkdirSync(dir, { recursive: true }))
  }
}

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = filePath + '.tmp'
  ensureDir(filePath)
  writeFileSync(tmpPath, data, 'utf-8')
  if (process.platform === 'win32' && existsSync(filePath)) {
    unlinkSync(filePath)
  }
  renameSync(tmpPath, filePath)
}

function readDaemonConfig(): DaemonConfig {
  if (!existsSync(CORE_DAEMON_CONFIG_PATH)) {
    return { version: 1, address: null, startedAt: null }
  }
  try {
    return JSON.parse(readFileSync(CORE_DAEMON_CONFIG_PATH, 'utf-8')) as DaemonConfig
  } catch {
    return { version: 1, address: null, startedAt: null }
  }
}

export function getDaemonAddress(): string | null {
  return readDaemonConfig().address
}

export function setDaemonAddress(address: string): void {
  const config = readDaemonConfig()
  config.address = address
  atomicWrite(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function clearDaemonAddress(): void {
  const config = readDaemonConfig()
  config.address = null
  config.startedAt = null
  atomicWrite(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function setDaemonStartedAt(timestamp: number): void {
  const config = readDaemonConfig()
  config.startedAt = timestamp
  atomicWrite(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2))
}
