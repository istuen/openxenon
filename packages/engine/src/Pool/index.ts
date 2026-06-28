/**
 * Pool module — DDD unified entry (v0.6 PR-5d)
 *
 * 5 类池管理 + review/approve/reject 闸门。
 */
export type {
  PoolKind,
  CreatePoolEntryInput, CreatePoolEntryResult,
  ReviewPoolEntryInput, ReviewPoolEntryResult,
  ApprovePoolEntryInput, ApprovePoolEntryResult,
  RejectPoolEntryInput, RejectPoolEntryResult,
  ListPoolEntriesInput, ListPoolEntriesResult, PoolEntrySummary,
} from './types'
