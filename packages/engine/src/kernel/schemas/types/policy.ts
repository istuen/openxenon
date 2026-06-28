export enum Action {
  TERMINATE_AND_DELETE = 'TERMINATE_AND_DELETE',
  WARN_AND_PRESERVE = 'WARN_AND_PRESERVE',
  TERMINATE = 'TERMINATE',
  SILENT = 'SILENT',
}

export interface ExecutionPolicy {
  onProbeFailed(probeId: string, error: string, context: ExecutionContext): Action
  onEscapeDetected(details: string, context: ExecutionContext): Action
  canUseDraftAssets(): boolean
}

export interface ExecutionContext {
  taskId: string
  partId: string
  projectRoot: string
  sandboxMode: boolean
}
