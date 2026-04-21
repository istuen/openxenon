export interface Step {
  id: string
  name: string
  spec: string
  proof: string
  targetState?: string
}

export interface Playbook {
  task: string
  steps: Step[]
}