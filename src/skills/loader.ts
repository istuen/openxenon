import type { SupportedLocale } from '../cli/project-config'
import { DEFAULT_LOCALE } from '../cli/project-config'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
// v0.1: 英文版 Skill 已废弃（zh-CN 为唯一权威）
import type { OpenXenonSkill, ReferenceFile } from './types'

export interface SkillContent {
  instruction: string
  references: ReferenceFile[]
}

interface SkillMeta {
  id: string
  description: string
}

const skillMeta: Record<SupportedLocale, SkillMeta[]> = {
  'zh-CN': [
    { id: 'oxn-cli', description: '统一的 OpenXenon CLI 操作入口，把自然语言翻译成 oxn 命令并执行' },
    {
      id: 'oxn-work',
      description:
        '发起 v0.1 双层 Work（创建 work.oxn + 至少一个 tasks/<name>/task.oxn，注入 domain；并驱动 work 状态机 run/submit/status）',
    },
  ],
  en: [
    {
      id: 'oxn-cli',
      description: 'Unified OpenXenon CLI entry point — translate natural language into oxn commands',
    },
    {
      id: 'oxn-work',
      description:
        'Launch and drive v0.1 dual-layer Work (create work.oxn + at least one tasks/<name>/task.oxn with domain inject, plus run/submit/status)',
    },
  ],
}

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-cli': { instruction: zhCnOxnCli, references: [] },
    'oxn-work': {
      instruction: zhCnWork,
      references: [{ filename: 'blueprint-format.md', content: zhCnWorkBlueprintRef }],
    },
  },
  en: {
    'oxn-cli': { instruction: zhCnOxnCli, references: [] }, // en 沿用 zh-CN（v0.1 英文版废弃）
    'oxn-work': {
      instruction: zhCnWork,
      references: [{ filename: 'blueprint-format.md', content: zhCnWorkBlueprintRef }],
    },
  },
}

export function getSkillContent(skillId: string, locale: SupportedLocale): SkillContent | null {
  return skillContents[locale]?.[skillId] ?? skillContents[DEFAULT_LOCALE]?.[skillId] ?? null
}

export function getAllSkillsForLocale(locale: SupportedLocale): OpenXenonSkill[] {
  const metas = skillMeta[locale] ?? skillMeta[DEFAULT_LOCALE]
  return metas.map((meta) => {
    const content = getSkillContent(meta.id, locale)
    return {
      id: meta.id,
      description: meta.description,
      instruction: content?.instruction ?? '',
      references: content?.references,
    }
  })
}
