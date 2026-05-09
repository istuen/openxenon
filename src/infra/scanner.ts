import { readdirSync, statSync, existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import type { ScannedFile } from '../kernel/lib/custom-proofs-resolver'

const GLOBAL_PROOFS_PATH = join(homedir(), '.openxenon', 'custom-proofs')
const PROJECT_PROOFS_DIR = '.openxenon/proofs'

export function scanDirectory(dirPath: string): ScannedFile[] {
  if (!existsSync(dirPath)) {
    return []
  }

  const results: ScannedFile[] = []

  try {
    const stat = statSync(dirPath)
    if (!stat.isDirectory()) {
      return []
    }

    const files = readdirSync(dirPath)

    for (const file of files) {
      const filePath = join(dirPath, file)
      try {
        const fileStat = statSync(filePath)
        results.push({
          path: filePath,
          isDirectory: fileStat.isDirectory()
        })
      } catch {
        // Skip files we can't access
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return results
}

export function scanDirectoryRecursive(
  dirPath: string,
  maxDepth: number = 10,
  currentDepth: number = 0
): Array<{ path: string; isDirectory: boolean; children?: ReturnType<typeof scanDirectoryRecursive> }> {
  if (!existsSync(dirPath) || currentDepth >= maxDepth) {
    return []
  }

  const results: Array<{ path: string; isDirectory: boolean; children?: ReturnType<typeof scanDirectoryRecursive> }> = []

  try {
    const stat = statSync(dirPath)
    if (!stat.isDirectory()) {
      return []
    }

    const files = readdirSync(dirPath)

    for (const file of files) {
      const filePath = join(dirPath, file)
      try {
        const fileStat = statSync(filePath)
        if (fileStat.isDirectory()) {
          const children = scanDirectoryRecursive(filePath, maxDepth, currentDepth + 1)
          results.push({
            path: filePath,
            isDirectory: true,
            children
          })
        } else {
          results.push({
            path: filePath,
            isDirectory: false
          })
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return results
}

export function getGlobalProofsPath(): string {
  return GLOBAL_PROOFS_PATH
}

export function getProjectProofsPath(projectRoot: string): string {
  return join(projectRoot, PROJECT_PROOFS_DIR)
}

export function scanProjectProofsSync(projectRoot: string): ReturnType<typeof scanDirectoryRecursive> {
  const proofsPath = getProjectProofsPath(projectRoot)
  return scanDirectoryRecursive(proofsPath)
}

export function scanGlobalProofsSync(): ReturnType<typeof scanDirectoryRecursive> {
  return scanDirectoryRecursive(GLOBAL_PROOFS_PATH)
}