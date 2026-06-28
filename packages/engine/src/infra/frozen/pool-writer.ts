// =============================================================================
// pool-writer.ts (v0.2 Sprint 4 T8 — Intent Pool v3 最小骨架)
//
// Intent Pool 写入器 — 仅 research 池可用 (其他 4 池 union 留 Sprint 6 扩)
// 物理路径: src/infra/frozen/pool-writer.ts
// 父文档: .openxenon/forges/sprints/sprint-4/2026-06-15-intent-pool-minimal-research.md §T4.1
//
// 职责:
//   1. 写 .openxenon/pools/research/<slug>.md (可写)
//   2. 写 .openxenon/pools/research/<slug>/frozen.json (chmod 0o444, content_hash) 复用 writeImmutable
//
// L1-Infra 层 — 可依赖 L0-Contract + L1-Infra 自身 (filesystem-async + frozen/immutable)
// 不得 import 上层 (L2+ / L3)
// =============================================================================

import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from '../filesystem-async'
import { writeFrozenImmutable, FROZEN_FILE_MODE } from '../frozen/immutable'
import { IAPError, IAPAction } from '@openxenon/engine/kernel/index'

/** 池类型 (v0.2 T8: research only; T13 Sprint 6: 全部 5 池启用) */
export type IntentPool = 'research' | 'design' | 'issue' | 'audit' | 'journal'

export interface WritePoolEntryInput {
  pool: IntentPool
  /** 池内唯一 slug (小写 + 中划线; 由调用方校验) */
  slug: string
  /** markdown # 一级标题 (用于 fallback 渲染) */
  title: string
  /** 完整 markdown 内容 (含 heading) */
  content: string
  /** 额外 metadata (写入 frozen.json) */
  metadata?: Record<string, unknown>
}

export interface WritePoolEntryOutput {
  /** .openxenon/pools/research/<slug>.md 路径 */
  path: string
  /** .openxenon/pools/research/<slug>/frozen.json 路径 (不可变) */
  frozenPath: string
  /** SHA-256 of body */
  hash: string
}

const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/

export async function writePoolEntry(projectRoot: string, input: WritePoolEntryInput): Promise<WritePoolEntryOutput> {
  // 1. 校验 slug
  if (!SLUG_PATTERN.test(input.slug)) {
    throw new IAPError(
      'INFRA',
      'PROVIDER_DUPLICATE',
      IAPAction.YIELD_TO_HUMAN,
      `pool slug "${input.slug}" must match /^[a-z0-9][a-z0-9-]*$/`,
      { component: 'pool-writer', slug: input.slug },
    )
  }

  const poolsDir = join(projectRoot, '.openxenon', 'pools')
  const poolDir = join(poolsDir, input.pool)
  const poolEntryDir = join(poolDir, input.slug)
  const mdPath = join(poolDir, `${input.slug}.md`)
  const frozenPath = join(poolEntryDir, 'frozen.json')

  // 2. 写 md 文件 (可写)
  await mkdir(poolEntryDir, { recursive: true })
  const fullContent = `# ${input.title}\n\n${input.content}`
  await writeFile(mdPath, fullContent, { mode: 0o644 })

  // 3. 写 frozen.json (复用 writeFrozenImmutable — chmod 0o444 + content_hash)
  const body = {
    pool: input.pool,
    slug: input.slug,
    title: input.title,
    contentLength: fullContent.length,
    metadata: input.metadata ?? {},
    frozenAt: new Date().toISOString(),
  }

  // writeFrozenImmutable 内部算 hash + 写 chmod 0o444
  // 我们额外算一份返回 (writeFrozenImmutable 返回 void)
  const bodyHash = createHash('sha256').update(JSON.stringify(body)).digest('hex')
  writeFrozenImmutable(frozenPath, body, (_b, h) => ({
    frozen_at: body.frozenAt,
    content_hash: h,
  }))

  return {
    path: mdPath,
    frozenPath,
    hash: bodyHash,
  }
}

// 重新导出 FROZEN_FILE_MODE 供测试 + 文档用
export { FROZEN_FILE_MODE }
