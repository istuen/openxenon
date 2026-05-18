import type { XnPartStatus } from './core'

/**
 * @deprecated MVP 0.1 后被 Blueprint YAML 中的 Stage 替代。
 * 仅用于 DB 降级兼容。
 */
export interface LegacyStage {
  id: string
  blueprintId: string
  name: string
  deps: string[]
  target: string
  spec: string
  action?: string
  status: XnPartStatus
  createdAt?: number
  completedAt?: number
}

/**
 * MVP 0.1: Stage 定义来自 Blueprint YAML，不再从 DB 读取。
 * 此接口保留用于类型引用。
 */
export interface Stage {
  id: string
  blueprintId?: string
  name: string
  deps: string[]
  target?: { description: string; glob?: string }
  spec?: { description: string; constraints?: string[] }
  status?: XnPartStatus
}