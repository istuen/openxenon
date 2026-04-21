import type { OpenXenonSkill } from '../skills/types'

export interface SkillAdapter {
  readonly toolId: string
  render(skill: OpenXenonSkill): string
  getOutputPath(skillId: string): string
}
