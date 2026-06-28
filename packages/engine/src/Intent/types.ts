/**
 * Intent module — shared types (v0.6 PR-5b)
 *
 * E2 Work · Intent 阶段（工程师创建 work + 选边界 + 多轮调整）
 * Module: packages/engine/src/Intent/
 */

export type WorkType = 'asset' | 'develop' | 'proof'

export interface CreateWorkInput {
  workName: string
  type: WorkType
  assetKind?: 'domain' | 'blueprint' | 'stack'
  assetRefs?: Array<{ kind: string; name: string; ref: string }>
  targetWork?: string
  probes?: string[]
  projectRoot: string
}

export interface CreateWorkResult {
  workPath: string
  content: string
  createdAt: string
}

export interface ValidateWorkInput {
  workName: string
  projectRoot: string
}

export interface ValidateWorkResult {
  ok: boolean
  errors: string[]
  assets: { domains: string[]; blueprints: string[] }
}

export interface LockWorkInput {
  workName: string
  projectRoot: string
}

export interface LockWorkResult {
  ok: boolean
  planLock: {
    workOxnHash: string
    workDomainsHash: string
    blueprintsHash: string
    tasksHash: string
    allHash: string
  }
}

export interface GetContextInput {
  workName: string
  taskName: string
  projectRoot: string
}

export interface WorkContext {
  workName: string
  taskName: string
  skillContext: string
  currentRound: number
}
