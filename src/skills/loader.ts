import type { SupportedLocale } from '../kernel/lib/project-config'
import { DEFAULT_LOCALE } from '../kernel/lib/project-config'
import zhCnArsenal from './locales/zh-CN/oxn-arsenal/instruction.md' with { type: 'text' }
import zhCnExplore from './locales/zh-CN/oxn-explore/instruction.md' with { type: 'text' }
import zhCnForge from './locales/zh-CN/oxn-forge/instruction.md' with { type: 'text' }
import zhCnForgeBlueprintRef from './locales/zh-CN/oxn-forge/references/blueprint-format.md' with { type: 'text' }
import zhCnForgePartRef from './locales/zh-CN/oxn-forge/references/part-format.md' with { type: 'text' }
import zhCnForgeProbeRef from './locales/zh-CN/oxn-forge/references/probe-format.md' with { type: 'text' }
import zhCnInit from './locales/zh-CN/oxn-init/instruction.md' with { type: 'text' }
import zhCnResume from './locales/zh-CN/oxn-resume/instruction.md' with { type: 'text' }
import zhCnStatus from './locales/zh-CN/oxn-status/instruction.md' with { type: 'text' }
import zhCnStop from './locales/zh-CN/oxn-stop/instruction.md' with { type: 'text' }
import zhCnTask from './locales/zh-CN/oxn-task/instruction.md' with { type: 'text' }
import zhCnTaskBlueprintRef from './locales/zh-CN/oxn-task/references/blueprint-format.md' with { type: 'text' }
import zhCnTrace from './locales/zh-CN/oxn-trace/instruction.md' with { type: 'text' }
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
  { id: 'oxn-init', description: '初始化项目围栏，在当前项目植入 OpenXenon 基因' },
  { id: 'oxn-task', description: '发起 OpenXenon 任务，依据 Target State 拆解并提交 Blueprint' },
  { id: 'oxn-resume', description: '恢复断点，从中止的步骤继续执行' },
  { id: 'oxn-status', description: '状态体检，通过自然语言了解项目进度' },
  { id: 'oxn-stop', description: '人工熔断，要求 AI 停止一切生成行为' },
  { id: 'oxn-trace', description: '轨迹取证，查看任务执行案卷' },
  { id: 'oxn-forge', description: '通过自然语言生成 Draft 标准资产（Blueprint/Probe/Part）' },
  { id: 'oxn-explore', description: '探索项目与任务，扫描资料、AI-工程师问答、报告归档' },
  { id: 'oxn-arsenal', description: '查看和管理 Arsenal 标准资产（查看统计、读取内容）' },
]

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-init': { instruction: zhCnInit, references: [] },
    'oxn-task': {
      instruction: zhCnTask,
      references: [{ filename: 'blueprint-format.md', content: zhCnTaskBlueprintRef }],
    },
    'oxn-resume': { instruction: zhCnResume, references: [] },
    'oxn-status': { instruction: zhCnStatus, references: [] },
    'oxn-stop': { instruction: zhCnStop, references: [] },
    'oxn-trace': { instruction: zhCnTrace, references: [] },
    'oxn-forge': {
      instruction: zhCnForge,
      references: [
        { filename: 'probe-format.md', content: zhCnForgeProbeRef },
        { filename: 'blueprint-format.md', content: zhCnForgeBlueprintRef },
        { filename: 'part-format.md', content: zhCnForgePartRef },
      ],
    },
    'oxn-explore': { instruction: zhCnExplore, references: [] },
    'oxn-arsenal': { instruction: zhCnArsenal, references: [] },
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
