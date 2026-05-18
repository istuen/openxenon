export type ExecutionPolicyType = 'PRODUCTION' | 'SANDBOX'

export type DaemonCommand = 'EXECUTE_TASK' | 'EXECUTE_STEP' | 'VERIFY_STEP'

export interface DaemonPayload {
  command: DaemonCommand
  project_root: string
  task_id: string
  policy: ExecutionPolicyType
  schema_version: string
  blueprint?: BlueprintPayload
  step_id?: string
}

export interface BlueprintPayload {
  id: string
  name: string
  parts: PartPayload[]
}

export interface PartPayload {
  id: string
  name: string
  deps: string[]
  target?: {
    description: string
  }
  spec?: {
    description: string
  }
  probes: ProbePayload[]
}

export interface ProbePayload {
  type: string
  pattern?: string
  command?: string
}