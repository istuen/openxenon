import type { SkillAdapter } from './types'
import type { OpenXenonSkill } from '../skills/types'

export class OpenCodeAdapter implements SkillAdapter {
  readonly toolId = 'opencode'

  getOutputPath(skillId: string): string {
    return `.opencode/skills/${skillId}/SKILL.md`
  }

  render(skill: OpenXenonSkill): string {
    let content = `---
name: ${skill.id}
description: ${skill.description}
---

${skill.instruction}
`

    if (skill.examples && Object.keys(skill.examples).length > 0) {
      content += '\n## Examples\n\n'
      for (const [name, example] of Object.entries(skill.examples)) {
        content += `### ${name}\n\n\`\`\`yaml\n${JSON.stringify(example, null, 2)}\n\`\`\`\n\n`
      }
    }

    return content
  }
}
