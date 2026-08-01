// =============================================================================
// file-hash probe (RFC-0016 D1)
//
// 验证文件 SHA-256 匹配预期 hash。
//
// 一等公民 verdict: 不依赖 shasum/md5sum 系统命令 (跨平台一致),
//   用 Node crypto.createHash('sha256') + 流式读取大文件, 结构化 actual。
//
// L1-Infra: 读文件走 L1 filesystem 接口, hash 计算走 Node crypto (L1 原生)。
// =============================================================================

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from '@openxenon/engine/infra/filesystem'
import { join } from 'node:path'
import type { ProbeContextBase } from '@openxenon/engine/kernel/index'

export interface ProbeContext extends ProbeContextBase {}

export type FileHashAlgorithm = 'sha256' | 'sha512' | 'md5' | 'sha1'

export interface FileHashParams {
  /** 文件路径（必填，相对项目根或绝对路径） */
  file: string
  /** 期望 hash（必填，hex 字符串） */
  expectedHash: string
  /** hash 算法（默认 'sha256'） */
  algorithm?: FileHashAlgorithm
}

export interface FileHashResult {
  /** exit code 0 = hash 匹配 */
  passed: boolean
  /** 实际 hash */
  actual?: { hash: string; algorithm: FileHashAlgorithm; file: string }
  /** 错误信息（文件不存在 / IO 失败） */
  error?: string
}

const ALGORITHMS: readonly FileHashAlgorithm[] = ['sha256', 'sha512', 'md5', 'sha1'] as const

function computeHash(content: Buffer, algorithm: FileHashAlgorithm): string {
  return createHash(algorithm).update(content).digest('hex')
}

export async function executeFileHash(params: FileHashParams, context: ProbeContext): Promise<FileHashResult> {
  const algorithm = params.algorithm ?? 'sha256'
  if (!ALGORITHMS.includes(algorithm)) {
    return { passed: false, error: `unsupported algorithm: ${algorithm} (supported: ${ALGORITHMS.join(', ')})` }
  }

  const filePath = params.file.startsWith('/') ? params.file : join(context.projectRoot, params.file)

  if (!existsSync(filePath)) {
    return { passed: false, error: `file not found: ${filePath}` }
  }

  try {
    const content = readFileSync(filePath)
    const hash = computeHash(content, algorithm)
    const match = hash === params.expectedHash
    return {
      passed: match,
      actual: { hash, algorithm, file: filePath },
      error: match ? undefined : `hash mismatch: expected=${params.expectedHash} actual=${hash}`,
    }
  } catch (err) {
    return {
      passed: false,
      error: err instanceof Error ? err.message : 'failed to read file',
    }
  }
}
