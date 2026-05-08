import { fs } from '../../infra/fs'
import { process } from '../../infra/process'

export type ProbeType = 'fs_exists' | 'fs_not_exists' | 'fs_match' | 'shell_exec'

export interface Probe {
  type: ProbeType
  pattern?: string
  patterns?: string[]
  command?: string
  cwd?: string
}

export interface ProbeResult {
  success: boolean
  probeType: string
  output?: string
  error?: string
}

export interface ProbeContext {
  projectRoot: string
}

export type ProbeExecutor = (probe: Probe, context: ProbeContext) => Promise<ProbeResult>

export const executeProbe: ProbeExecutor = async (probe, context) => {
  const { type, pattern, patterns, command, cwd } = probe

  switch (type) {
    case 'fs_exists': {
      const path = pattern || ''
      if (!path) {
        return { success: false, probeType: type, error: 'path is required for fs_exists' }
      }
      const fullPath = path.startsWith('/') ? path : `${context.projectRoot}/${path}`
      const exists = fs.exists(fullPath)
      if (exists) {
        const isDir = fs.isDirectory(fullPath)
        return {
          success: true,
          probeType: type,
          output: `${isDir ? 'directory' : 'file'} exists: ${fullPath}`
        }
      }
      return { success: false, probeType: type, error: `path does not exist: ${fullPath}` }
    }

    case 'fs_not_exists': {
      const path = pattern || ''
      if (!path) {
        return { success: false, probeType: type, error: 'path is required for fs_not_exists' }
      }
      const fullPath = path.startsWith('/') ? path : `${context.projectRoot}/${path}`
      const exists = fs.exists(fullPath)
      if (!exists) {
        return { success: true, probeType: type, output: `path does not exist: ${fullPath}` }
      }
      return { success: false, probeType: type, error: `path exists: ${fullPath}` }
    }

    case 'fs_match': {
      const path = pattern || ''
      const regexes = patterns || []
      if (!path || regexes.length === 0) {
        return { success: false, probeType: type, error: 'path and patterns are required for fs_match' }
      }
      const fullPath = path.startsWith('/') ? path : `${context.projectRoot}/${path}`
      if (!fs.exists(fullPath)) {
        return { success: false, probeType: type, error: `path does not exist: ${fullPath}` }
      }
      const content = fs.read(fullPath)
      if (content === null) {
        return { success: false, probeType: type, error: `failed to read file: ${fullPath}` }
      }
      const allMatch = regexes.every(regex => {
        try {
          return new RegExp(regex).test(content)
        } catch {
          return false
        }
      })
      if (allMatch) {
        return { success: true, probeType: type, output: `all patterns matched in ${fullPath}` }
      }
      return { success: false, probeType: type, error: `some patterns did not match in ${fullPath}` }
    }

    case 'shell_exec': {
      const cmd = command || ''
      if (!cmd) {
        return { success: false, probeType: type, error: 'command is required for shell_exec' }
      }
      const result = await process.exec(cmd, cwd || context.projectRoot)
      if (result.success) {
        return { success: true, probeType: type, output: result.stdout }
      }
      return { success: false, probeType: type, error: result.stderr || `command exited with code ${result.code}` }
    }

    default:
      return { success: false, probeType: type || 'unknown', error: `Unknown probe type: ${type}` }
  }
}

export async function executeProbeList(probes: Probe[], context: ProbeContext): Promise<ProbeResult[]> {
  return Promise.all(probes.map(probe => executeProbe(probe, context)))
}

export function reduceToVerdict(results: ProbeResult[]): 'PASSED' | 'FAILED' {
  const allPassed = results.every(r => r.success)
  return allPassed ? 'PASSED' : 'FAILED'
}