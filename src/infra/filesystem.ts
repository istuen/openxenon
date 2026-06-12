import type { FSWatcher } from 'fs'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  watch,
  writeFileSync,
} from 'fs'
import { dirname } from 'path'

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function atomicWrite(filePath: string, data: string): void {
  const tmpPath = `${filePath}.tmp`
  ensureDir(filePath)
  writeFileSync(tmpPath, data, 'utf-8')
  if (process.platform === 'win32') {
    try {
      if (existsSync(filePath)) {
        unlinkSync(filePath)
      }
    } catch (_error) {
      // File might not exist or be locked - proceed with rename
    }
  }
  renameSync(tmpPath, filePath)
}

export function ensureDirectory(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

export function directoryExists(path: string): boolean {
  if (!existsSync(path)) return false
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

export function readFile(path: string): string | null {
  if (!existsSync(path)) return null
  try {
    return readFileSync(path, 'utf-8')
  } catch {
    return null
  }
}

export function fileExists(path: string): boolean {
  return existsSync(path)
}

export function writeFile(path: string, content: string): void {
  ensureDir(dirname(path))
  writeFileSync(path, content, 'utf-8')
}

export function deleteFile(path: string): void {
  if (existsSync(path)) {
    unlinkSync(path)
  }
}

export const fs = {
  exists(path: string): boolean {
    return existsSync(path)
  },

  notExists(path: string): boolean {
    return !existsSync(path)
  },

  read(path: string): string | null {
    if (!existsSync(path)) return null
    try {
      return readFileSync(path, 'utf-8')
    } catch {
      return null
    }
  },

  isDirectory(path: string): boolean {
    if (!existsSync(path)) return false
    try {
      return statSync(path).isDirectory()
    } catch {
      return false
    }
  },

  isFile(path: string): boolean {
    if (!existsSync(path)) return false
    try {
      return statSync(path).isFile()
    } catch {
      return false
    }
  },

  match(path: string, pattern: RegExp): boolean {
    if (!existsSync(path)) return false
    try {
      const content = readFileSync(path, 'utf-8')
      return pattern.test(content)
    } catch {
      return false
    }
  },

  atomicWrite(filePath: string, content: string): void {
    atomicWrite(filePath, content)
  },

  appendOnly(filePath: string, line: string): void {
    appendFileSync(filePath, `${line}\n`, 'utf-8')
  },
}

export type { FSWatcher }
export {
  appendFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  watch,
  writeFileSync,
}
