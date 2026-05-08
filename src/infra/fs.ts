import { existsSync, readFileSync, appendFileSync, writeFileSync, renameSync, unlinkSync, statSync } from 'fs'
import { dirname } from 'path'

function ensureDir(filePath: string): void {
  const dir = dirname(filePath)
  if (!existsSync(dir)) {
    const { mkdirSync } = require('fs')
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
    appendFileSync(filePath, line + '\n', 'utf-8')
  }
}