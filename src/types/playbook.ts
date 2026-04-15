export interface Step {
  id: string
  name: string
  spec: string
  proof: string
}

export interface Playbook {
  task: string
  steps: Step[]
}
