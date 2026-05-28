export interface GraphNode {
  id: string
  deps?: string[]
}

export interface GraphEdge {
  from: string
  to: string
}

export interface DagNode {
  id: string
  deps: string[]
}

export interface DagValidationResult {
  valid: boolean
  errors: string[]
}