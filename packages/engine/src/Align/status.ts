/**
 * Align module — get-work-status use case (v0.6 PR-5b续)
 */
import type { WorkStatusResult } from './types'
import type { WorkspaceState } from '@openxenon/engine/Work/dual-state'

/**
 * 读取 work 状态快照（从双状态机 WorkspaceState + Round history）
 */
export function computeWorkStatus(
  workName: string,
  workspace: WorkspaceState | null,
): WorkStatusResult {
  if (!workspace) {
    return { workName, status: 'not-started', currentRound: 1, roundHistory: [], tasks: [] }
  }
  return {
    workName,
    status: workspace.status,
    currentRound: workspace.currentRound,
    roundHistory: workspace.roundHistory,
    tasks: (workspace.tasks ?? []).map((t) => ({
      taskName: t.taskName,
      status: t.status,
    })),
  }
}
