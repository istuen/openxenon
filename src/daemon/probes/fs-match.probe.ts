import { existsSync, readFileSync } from 'fs'
import type { ProbeResult } from '../../common/types/task-state'

export interface FsMatchInput {
  path: string
  pattern: string
}

export function fsMatch(input: FsMatchInput): ProbeResult {
  const { path, pattern } = input

  if (!existsSync(path)) {
return {
        success: false,
        probeType: 'fs_match',
        error: `Path does not exist: ${path}`
      }
    }

    try {
      const content = readFileSync(path, 'utf-8')
      const regex = new RegExp(pattern)

      if (regex.test(content)) {
        return {
          success: true,
          probeType: 'fs_match',
          output: `Pattern "${pattern}" found in ${path}`
        }
      } else {
        return {
          success: false,
          probeType: 'fs_match',
          error: `Pattern "${pattern}" not found in ${path}`
        }
      }
    } catch (error) {
      return {
        success: false,
        probeType: 'fs_match',
        error: `Error reading file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
}