import type { SupportedLocale } from '../cli/project-config'
import { DEFAULT_LOCALE } from '../cli/project-config'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
import zhCnLeader from './locales/zh-CN/oxn-leader/instruction.md' with { type: 'text' }
import zhCnLeaderBlueprintRef from './locales/zh-CN/oxn-leader/references/blueprint-creation.md' with { type: 'text' }
import type { OpenXenonSkill, ReferenceFile } from './types'

export interface SkillContent {
  instruction: string
  references: ReferenceFile[]
}

interface SkillMeta {
  id: string
  description: string
}

const skillMeta: SkillMeta[] = [
  { id: 'oxn-cli', description: '统一的 OpenXenon CLI 操作入口，把自然语言翻译成 oxn 命令并执行' },
  { id: 'oxn-work', description: '发起 OpenXenon Work（work new 创建 work）' },
  { id: 'oxn-leader', description: '驱动 OpenXenon Work 状态机（run/submit/status 三阶段循环）' },
]

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-cli': { instruction: zhCnOxnCli, references: [] },
    'oxn-work': {
      instruction: zhCnWork,
      references: [{ filename: 'blueprint-format.md', content: zhCnWorkBlueprintRef }],
    },
    'oxn-leader': {
      instruction: zhCnLeader,
      references: [{ filename: 'blueprint-creation.md', content: zhCnLeaderBlueprintRef }],
    },
  },
}

export function getSkillContent(skillId: string, locale: SupportedLocale): SkillContent | null {
  return skillContents[locale]?.[skillId] ?? skillContents[DEFAULT_LOCALE]?.[skillId] ?? null
}

export function getAllSkillsForLocale(locale: SupportedLocale): OpenXenonSkill[] {
  return skillMeta.map((meta) => {
    const content = getSkillContent(meta.id, locale)
    return {
      id: meta.id,
      description: meta.description,
      instruction: content?.instruction ?? '',
      references: content?.references,
    }
  })
}
