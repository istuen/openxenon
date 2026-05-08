import { existsSync, statSync } from 'fs'
import type { ProbeResult } from '../../common/types/task-state'

export interface FsExistsInput {
  path: string
}

export function fsExists(input: FsExistsInput): ProbeResult {
  const { path } = input

  try {
    const exists = existsSync(path)

    if (exists) {
      const stats = statSync(path)
      const type = stats.isDirectory() ? 'directory' : 'file'

      return {
        success: true,
        probeType: 'fs_exists',
        output: `${type} exists: ${path}`
      }
    } else {
      return {
        success: false,
        probeType: 'fs_exists',
        error: `Path does not exist: ${path}`
      }
    }
  } catch (error) {
    return {
      success: false,
      probeType: 'fs_exists',
      error: `Error checking path: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}