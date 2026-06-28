/**
 * Pool module — create-pool-entry utility (v0.6 PR-5d续)
 *
 * 5 类池管理: research / design / issue / audit / journal
 */
import { join } from 'path'
import { existsSync, mkdirSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import type { CreatePoolEntryInput, CreatePoolEntryResult } from './types'

export function createPoolEntry(input: CreatePoolEntryInput): CreatePoolEntryResult {
  const poolsDir = join(input.projectRoot, BOUNDARY_DIR, 'pools', input.pool)
  if (!existsSync(poolsDir)) {
    mkdirSync(poolsDir, { recursive: true })
  }
  const mdPath = join(poolsDir, `${input.slug}.md`)
  const now = new Date().toISOString()
  writeFileSync(mdPath, input.content, 'utf-8')
  return {
    slug: input.slug,
    pool: input.pool,
    mdPath,
    frozenPath: join(poolsDir, input.slug, 'frozen.json'),
    createdAt: now,
  }
}
