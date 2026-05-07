import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { getProjectBoundaryPath } from './project'

export interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
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

function getProjectConfigPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'config.json')
}

function readConfig(projectRoot: string): ProjectConfig {
  const configPath = getProjectConfigPath(projectRoot)
  if (!existsSync(configPath)) {
    return { version: 1, mode: 'PRODUCTION' }
  }
  try {
    return JSON.parse(readFileSync(configPath, 'utf-8')) as ProjectConfig
  } catch {
    return { version: 1, mode: 'PRODUCTION' }
  }
}

export function getSpaceMode(projectRoot: string): 'PRODUCTION' | 'SANDBOX' {
  return readConfig(projectRoot).mode
}

export function setSpaceMode(projectRoot: string, mode: 'PRODUCTION' | 'SANDBOX'): void {
  const configPath = getProjectConfigPath(projectRoot)
  const config = readConfig(projectRoot)
  config.mode = mode
  atomicWrite(configPath, JSON.stringify(config, null, 2))
}
