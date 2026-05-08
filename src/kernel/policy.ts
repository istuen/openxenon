export enum Action {
  TERMINATE_AND_DELETE = 'TERMINATE_AND_DELETE',
  WARN_AND_PRESERVE = 'WARN_AND_PRESERVE',
  TERMINATE = 'TERMINATE',
  SILENT = 'SILENT'
}

export interface ExecutionPolicy {
  onProbeFailed(probeId: string, error: string, context: ExecutionContext): Action
  onEscapeDetected(details: string, context: ExecutionContext): Action
  canUseDraftAssets(): boolean
}

export interface ExecutionContext {
  taskId: string
  stageId: string
  projectRoot: string
  sandboxMode: boolean
}

export class ProductionPolicy implements ExecutionPolicy {
  onProbeFailed(probeId: string, error: string, context: ExecutionContext): Action {
    console.warn(`[Production] Probe '${probeId}' failed: ${error}`)
    console.warn(`[Production] Terminating and deleting working directory for task '${context.taskId}'`)
    return Action.TERMINATE_AND_DELETE
  }

  onEscapeDetected(details: string, context: ExecutionContext): Action {
    console.error(`[Production] Escape detected in task '${context.taskId}': ${details}`)
    console.error(`[Production] Terminating task execution`)
    return Action.TERMINATE
  }

  canUseDraftAssets(): boolean {
    return false
  }
}

export class SandboxPolicy implements ExecutionPolicy {
  onProbeFailed(probeId: string, error: string, context: ExecutionContext): Action {
    console.warn(`[Sandbox] Probe '${probeId}' failed: ${error}`)
    console.warn(`[Sandbox] Preserving working directory for task '${context.taskId}' (sandbox mode)`)
    return Action.WARN_AND_PRESERVE
  }

  onEscapeDetected(details: string, context: ExecutionContext): Action {
    console.log(`[Sandbox] Escape detected in task '${context.taskId}': ${details} (logged only, sandbox mode)`)
    return Action.SILENT
  }

  canUseDraftAssets(): boolean {
    return true
  }
}

export function getExecutionPolicy(sandboxMode: boolean): ExecutionPolicy {
  return sandboxMode ? new SandboxPolicy() : new ProductionPolicy()
}