// =============================================================================
// fs-parseable handler (v1.1)
//
// 检查文件可被解析（当前支持 JSON）。
// 不依赖 shell，纯 JS。
// =============================================================================

import { readFileSync } from 'fs'
import { join } from 'path'
import type { ProbeContextBase } from '../../kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export interface FsParseableParams {
  /** 要解析的文件路径（当前仅 *.json） */
  path: string
}

export interface FsParseableResult {
  /** 是否成功解析 */
  parsed: boolean
  /** 解析格式（当前固定 'json'） */
  format?: 'json'
  /** 顶层字段名（仅当 parsed=true 时） */
  topLevelKeys?: string[]
  /** 错误信息（仅当 parsed=false 时） */
  error?: string
}

export async function executeFsParseable(params: FsParseableParams, context: ProbeContext): Promise<FsParseableResult> {
  const filePath = params.path
  const fullPath = filePath.startsWith('/') ? filePath : join(context.projectRoot, filePath)

  try {
    const content = readFileSync(fullPath, 'utf-8')
    const parsed = JSON.parse(content) as unknown

    if (typeof parsed !== 'object' || parsed === null) {
      return { parsed: false, error: 'JSON root is not an object' }
    }

    return {
      parsed: true,
      format: 'json',
      topLevelKeys: Object.keys(parsed),
    }
  } catch (error) {
    return {
      parsed: false,
      error: error instanceof Error ? error.message : 'Failed to read or parse file',
    }
  }
}
