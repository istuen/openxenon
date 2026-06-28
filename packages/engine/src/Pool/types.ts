/**
 * Pool module — shared types (v0.6 PR-5d)
 *
 * 5 类池管理: research / design / issue / audit / journal
 * Module: packages/engine/src/Pool/
 */

export type PoolKind = 'research' | 'design' | 'issue' | 'audit' | 'journal'

export interface CreatePoolEntryInput {
  pool: PoolKind
  slug: string
  title: string
  content: string
  metadata?: Record<string, unknown>
  projectRoot: string
}

export interface CreatePoolEntryResult {
  slug: string
  pool: PoolKind
  mdPath: string
  frozenPath: string
  createdAt: string
}

export interface ReviewPoolEntryInput {
  slug: string
  pool?: PoolKind
  projectRoot: string
}

export interface ReviewPoolEntryResult {
  slug: string
  title: string
  pool: PoolKind
  content: string
  status: 'pending' | 'approved' | 'rejected'
  suggestedAt: string
}

export interface ApprovePoolEntryInput {
  slug: string
  pool?: PoolKind
  dryRun?: boolean
  projectRoot: string
}

export interface ApprovePoolEntryResult {
  slug: string
  targetKind: 'domain' | 'blueprint' | 'stack'
  targetName: string
  beforeHash: string
  afterHash: string
  appliedAt: string
}

export interface RejectPoolEntryInput {
  slug: string
  pool?: PoolKind
  reason: string
  projectRoot: string
}

export interface RejectPoolEntryResult {
  slug: string
  status: 'rejected'
  reason: string
  rejectedAt: string
}

export interface ListPoolEntriesInput {
  pool?: PoolKind
  projectRoot: string
}

export interface PoolEntrySummary {
  slug: string
  pool: PoolKind
  title: string
  status: string
  suggestedAt: string
}

export interface ListPoolEntriesResult {
  entries: PoolEntrySummary[]
}
