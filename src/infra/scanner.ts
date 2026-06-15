import { existsSync, readdirSync, statSync } from './filesystem'
import { join } from 'path'

interface ScannedFile {
  path: string
  isDirectory: boolean
}

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
          isDirectory: fileStat.isDirectory(),
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

export interface ScanResult {
  items: Array<{
    path: string
    isDirectory: boolean
    children?: ScanResult
  }>
  truncated: boolean
}

/**
 * v1.1 fix-p2-robustness scanner-truncation: 返回 { items, truncated } 双字段。
 * 修复前: 达 maxDepth 时静默返回 [], 调用方无法区分「目录是空」与「扫描被截断」。
 * 修复后: truncated 字段明示扫描是否触达 maxDepth, 调用方可决定是否要
 *         给用户告警 / 增大 maxDepth / 接受截断。
 */
export function scanDirectoryRecursive(dirPath: string, maxDepth: number = 10, currentDepth: number = 0): ScanResult {
  if (!existsSync(dirPath)) {
    return { items: [], truncated: false }
  }

  if (currentDepth >= maxDepth) {
    // 触达 maxDepth, 明示 truncated
    return { items: [], truncated: true }
  }

  const items: ScanResult['items'] = []
  let truncated = false

  try {
    const stat = statSync(dirPath)
    if (!stat.isDirectory()) {
      return { items: [], truncated: false }
    }

    const files = readdirSync(dirPath)

    for (const file of files) {
      const filePath = join(dirPath, file)
      try {
        const fileStat = statSync(filePath)
        if (fileStat.isDirectory()) {
          const childResult = scanDirectoryRecursive(filePath, maxDepth, currentDepth + 1)
          if (childResult.truncated) truncated = true
          items.push({
            path: filePath,
            isDirectory: true,
            children: childResult,
          })
        } else {
          items.push({
            path: filePath,
            isDirectory: false,
          })
        }
      } catch {
        // Skip files we can't access
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error)
  }

  return { items, truncated }
}
