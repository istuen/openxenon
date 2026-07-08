export interface ReferenceFile {
  filename: string
  content: string
}

export interface OpenXenonSkill {
  id: string
  description: string
  instruction: string
  examples?: Record<string, unknown>
  references?: ReferenceFile[]
  assets?: ReferenceFile[]
}
