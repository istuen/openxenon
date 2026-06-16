// =============================================================================
// token-writer.ts (v0.2.2)
//
// L1-Infra IO 层：Token 摄入记录的写入器。
//
// 存储格式：JSONL（追加模式，多 AI 会话可并发追加同一 Work 文件）。
// 路径：.openxenon/insights/tokens/<workRef>.jsonl
//
// 纯洁性约束：
//   - 路径常量（INSIGHTS_SUBDIR / TOKENS_SUBDIR）定义在文件内部，不进 kernel
//   - 只做文件 IO + schema 校验，不调 L0-Processor
//   - Schema 校验失败 → 抛 IAPError（调用方在 CLI 层捕获后 outputError）
// =============================================================================

import { join } from 'path'
import { existsSync, mkdirSync } from '../filesystem'
import { fs } from '../filesystem'
import { safeValidateTokenRecord, IAPError, IAPAction, BOUNDARY_DIR } from '../../kernel/index'

const INSIGHTS_SUBDIR = 'insights'
const TOKENS_SUBDIR = 'tokens'

export function writeTokenRecord(projectRoot: string, input: unknown): { path: string; recorded: number } {
  const v = safeValidateTokenRecord(input)
  if (!v.success) {
    const issues = v.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new IAPError(
      'PROOF',
      'INGEST_SCHEMA_INVALID',
      IAPAction.YIELD_TO_HUMAN,
      `Token ingest schema invalid: ${issues}`,
      { issues: v.error.issues.map((i) => ({ path: i.path, message: i.message })) },
    )
  }

  const dir = join(projectRoot, BOUNDARY_DIR, INSIGHTS_SUBDIR, TOKENS_SUBDIR)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  const filePath = join(dir, `${v.data.workRef}.jsonl`)
  const line = `${JSON.stringify(v.data)}\n`
  fs.appendOnly(filePath, line)

  const content = fs.read(filePath) ?? ''
  const recorded = content.trim() === '' ? 0 : content.trim().split('\n').length

  return { path: filePath, recorded }
}
