import type { XenonixSkill } from '../skills/types'

export interface SkillAdapter {
  readonly toolId: string
  render(skill: XenonixSkill): string
  getOutputPath(skillId: string): string
}
