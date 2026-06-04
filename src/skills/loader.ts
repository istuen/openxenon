import type { SupportedLocale } from '../cli/project-config'
import { DEFAULT_LOCALE } from '../cli/project-config'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
import zhCnLeader from './locales/zh-CN/oxn-leader/instruction.md' with { type: 'text' }
import zhCnLeaderBlueprintRef from './locales/zh-CN/oxn-leader/references/blueprint-creation.md' with { type: 'text' }
// en 路径下暂无 oxn-cli/instruction.md (项目未翻译)，en 路径 oxn-cli 沿用 zh-CN
import enWork from './locales/en/oxn-work/instruction.md' with { type: 'text' }
import enLeader from './locales/en/oxn-leader/instruction.md' with { type: 'text' }
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
      description: '发起 v0.1 双层 Work（创建 work.oxn + 至少一个 tasks/<name>/task.oxn，注入 domain）',
    },
    {
      id: 'oxn-leader',
      description: '驱动 v0.1 四阶段 task 粒度状态机（prepare→run→act→submit）',
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
        'Launch v0.1 dual-layer Work (create work.oxn + at least one tasks/<name>/task.oxn with domain inject)',
    },
    {
      id: 'oxn-leader',
      description: 'Drive v0.1 four-phase task-granular state machine (prepare→run→act→submit)',
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
    'oxn-leader': {
      instruction: zhCnLeader,
      references: [{ filename: 'blueprint-creation.md', content: zhCnLeaderBlueprintRef }],
    },
  },
  en: {
    'oxn-cli': { instruction: zhCnOxnCli, references: [] }, // 沿用 zh-CN 直到 en 版 oxn-cli 写就
    'oxn-work': { instruction: enWork, references: [] },
    'oxn-leader': { instruction: enLeader, references: [] },
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
