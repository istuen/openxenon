import type { SupportedLocale } from '../kernel/lib/project-config'
import { DEFAULT_LOCALE } from '../kernel/lib/project-config'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnExplore from './locales/zh-CN/oxn-explore/instruction.md' with { type: 'text' }
import zhCnForge from './locales/zh-CN/oxn-forge/instruction.md' with { type: 'text' }
import zhCnForgeBlueprintRef from './locales/zh-CN/oxn-forge/references/blueprint-format.md' with { type: 'text' }
import zhCnForgePartRef from './locales/zh-CN/oxn-forge/references/part-format.md' with { type: 'text' }
import zhCnForgeProbeRef from './locales/zh-CN/oxn-forge/references/probe-format.md' with { type: 'text' }
import zhCnTask from './locales/zh-CN/oxn-task/instruction.md' with { type: 'text' }
import zhCnTaskBlueprintRef from './locales/zh-CN/oxn-task/references/blueprint-format.md' with { type: 'text' }
import zhCnPlan from './locales/zh-CN/oxn-plan/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
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
  { id: 'oxn-cli', description: '统一的 OpenXenon CLI 操作入口，整合 Arsenal/Task/Work/Forge/System 所有功能' },
  { id: 'oxn-task', description: '发起 OpenXenon 任务，依据 Target State 拆解并提交 Blueprint' },
  { id: 'oxn-work', description: '发起 OpenXenon Work，执行具体工作单元' },
  { id: 'oxn-forge', description: '通过自然语言生成 Draft 标准资产（Blueprint/Probe/Part）' },
  { id: 'oxn-explore', description: '探索项目与任务，扫描资料、AI-工程师问答、报告归档' },
  { id: 'oxn-plan', description: '规划模式，分析、设计、估算、评审' },
]

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-cli': { instruction: zhCnOxnCli, references: [] },
    'oxn-task': {
      instruction: zhCnTask,
      references: [{ filename: 'blueprint-format.md', content: zhCnTaskBlueprintRef }],
    },
    'oxn-forge': {
      instruction: zhCnForge,
      references: [
        { filename: 'probe-format.md', content: zhCnForgeProbeRef },
        { filename: 'blueprint-format.md', content: zhCnForgeBlueprintRef },
        { filename: 'part-format.md', content: zhCnForgePartRef },
      ],
    },
    'oxn-explore': { instruction: zhCnExplore, references: [] },
    'oxn-plan': { instruction: zhCnPlan, references: [] },
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
