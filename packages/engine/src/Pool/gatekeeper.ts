/**
 * Pool module — review/approve gatekeeper (v0.6 PR-5d实现)
 *
 * v0.5 PR-D: review/approve 闸门。这里提供 Engine-level 封装。
 */
import { join } from 'path'
import { existsSync, readFileSync, writeFileSync } from '@openxenon/engine/infra/filesystem'
import { BOUNDARY_DIR } from '@openxenon/engine/kernel'
import type { PoolKind } from './types'
import { IAPError, IAPAction } from '@openxenon/engine/errors'

export function reviewPoolEntryFull(
  projectRoot: string,
  slug: string,
  pool: PoolKind = 'audit',
): { content: string; pool: PoolKind; slug: string; exists: boolean } {
  const path = join(projectRoot, BOUNDARY_DIR, 'pools', pool, `${slug}.md`)
  if (!existsSync(path)) return { content: '', pool, slug, exists: false }
  return { content: readFileSync(path, 'utf-8'), pool, slug, exists: true }
}

export function approvePoolEntryFull(
  projectRoot: string,
  slug: string,
  pool: PoolKind = 'audit',
  dryRun = false,
): { ok: boolean; beforeHash?: string; afterHash?: string } {
  const path = join(projectRoot, BOUNDARY_DIR, 'pools', pool, `${slug}.md`)
  if (!existsSync(path)) {
    throw new IAPError('INFRA', 'KIND_UNSUPPORTED', IAPAction.YIELD_TO_HUMAN, `audit entry not found: ${slug}`)
  }
  const content = readFileSync(path, 'utf-8')
  // Update status from pending → approved
  const updated = content.replace(/status:\s*pending/, 'status: approved')
  if (!dryRun) writeFileSync(path, updated, 'utf-8')
  return { ok: true }
}

export function rejectPoolEntryFull(
  projectRoot: string,
  slug: string,
  reason: string,
  pool: PoolKind = 'audit',
): { ok: boolean } {
  const path = join(projectRoot, BOUNDARY_DIR, 'pools', pool, `${slug}.md`)
  if (!existsSync(path)) return { ok: false }
  const content = readFileSync(path, 'utf-8')
  const updated = content.replace(/status:\s*pending/, `status: rejected\nreject_reason: "${reason}"`)
  writeFileSync(path, updated, 'utf-8')
  return { ok: true }
}
