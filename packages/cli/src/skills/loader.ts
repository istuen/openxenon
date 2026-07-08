import type { SupportedLocale } from '@openxenon/engine/infra/i18n/locale'
import { DEFAULT_LOCALE } from '@openxenon/engine/infra/i18n/locale'
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWork8Phase from './locales/zh-CN/oxn-work/references/8-phase-detail.md' with { type: 'text' }
import zhCnWorkErrors from './locales/zh-CN/oxn-work/references/error-codes.md' with { type: 'text' }
import zhCnWorkAnti from './locales/zh-CN/oxn-work/references/anti-patterns.md' with { type: 'text' }
import zhCnWorkV0V1 from './locales/zh-CN/oxn-work/references/v0-v1-migration.md' with { type: 'text' }
import zhCnWorkGit from './locales/zh-CN/oxn-work/references/git-workspace.md' with { type: 'text' }
import zhCnWorkExplore from './locales/zh-CN/oxn-work/assets/work-explore.md' with { type: 'text' }
import zhCnWorkDevelop from './locales/zh-CN/oxn-work/assets/work-develop.md' with { type: 'text' }
import zhCnWorkFix from './locales/zh-CN/oxn-work/assets/work-fix.md' with { type: 'text' }
import zhCnWorkOnboarding from './locales/zh-CN/oxn-work/assets/work-onboarding.md' with { type: 'text' }
import enWork from './locales/en/oxn-work/instruction.md' with { type: 'text' }
import enWork8Phase from './locales/en/oxn-work/references/8-phase-detail.md' with { type: 'text' }
import enWorkErrors from './locales/en/oxn-work/references/error-codes.md' with { type: 'text' }
import enWorkAnti from './locales/en/oxn-work/references/anti-patterns.md' with { type: 'text' }
import enWorkV0V1 from './locales/en/oxn-work/references/v0-v1-migration.md' with { type: 'text' }
import enWorkGit from './locales/en/oxn-work/references/git-workspace.md' with { type: 'text' }
import enWorkExplore from './locales/en/oxn-work/assets/work-explore.md' with { type: 'text' }
import enWorkDevelop from './locales/en/oxn-work/assets/work-develop.md' with { type: 'text' }
import enWorkFix from './locales/en/oxn-work/assets/work-fix.md' with { type: 'text' }
import enWorkOnboarding from './locales/en/oxn-work/assets/work-onboarding.md' with { type: 'text' }
import type { OpenXenonSkill, ReferenceFile } from './types'

export interface SkillContent {
  instruction: string
  references: ReferenceFile[]
  assets: ReferenceFile[]
}

interface SkillMeta {
  id: string
  description: string
}

// v0.6 Skill 极简：唯一 Skill 为 oxn-work（IAP 范式统一入口）
// 原 oxn-cli / oxn-proof 已删除 — 按 v0.6 RFC "Skill 极简" 决策
//
// v0.6.1-alpha.0: instruction.md 拆为 1 SKILL.md (≤200 tokens 目标) + 5 references/* + 4 assets/* (work-* 模板)
//   - references/: 8-phase-detail / error-codes / anti-patterns / v0-v1-migration / git-workspace
//   - assets/: work-{explore,develop,fix,onboarding}.md  (4 大 work.oxn 模式模板 — .md 格式含 OXN 代码块)
const skillMeta: Record<SupportedLocale, SkillMeta[]> = {
  'zh-CN': [
    {
      id: 'oxn-work',
      description:
        'IAP 范式统一入口（v0.6 极简版）— 创建 work + 走 Intent→Align→Proof 三阶段 + Round 多轮循环。work = IAP 范式的最小完整单元，所有工作（建资产/开发/跑验收）都内聚到 3 大 Work 模式',
    },
  ],
  en: [
    {
      id: 'oxn-work',
      description:
        'IAP paradigm unified entry point (v0.6 simplified) — create a work and drive Intent→Align→Proof three-stage + Round multi-cycle loop. Work = the minimal complete unit of the IAP paradigm, all work (asset building / development / running acceptance) converges into 3 Work modes',
    },
  ],
}

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-work': {
      instruction: zhCnWork,
      references: [
        { filename: '8-phase-detail.md', content: zhCnWork8Phase },
        { filename: 'error-codes.md', content: zhCnWorkErrors },
        { filename: 'anti-patterns.md', content: zhCnWorkAnti },
        { filename: 'v0-v1-migration.md', content: zhCnWorkV0V1 },
        { filename: 'git-workspace.md', content: zhCnWorkGit },
      ],
      assets: [
        { filename: 'work-explore.md', content: zhCnWorkExplore },
        { filename: 'work-develop.md', content: zhCnWorkDevelop },
        { filename: 'work-fix.md', content: zhCnWorkFix },
        { filename: 'work-onboarding.md', content: zhCnWorkOnboarding },
      ],
    },
  },
  en: {
    'oxn-work': {
      instruction: enWork,
      references: [
        { filename: '8-phase-detail.md', content: enWork8Phase },
        { filename: 'error-codes.md', content: enWorkErrors },
        { filename: 'anti-patterns.md', content: enWorkAnti },
        { filename: 'v0-v1-migration.md', content: enWorkV0V1 },
        { filename: 'git-workspace.md', content: enWorkGit },
      ],
      assets: [
        { filename: 'work-explore.md', content: enWorkExplore },
        { filename: 'work-develop.md', content: enWorkDevelop },
        { filename: 'work-fix.md', content: enWorkFix },
        { filename: 'work-onboarding.md', content: enWorkOnboarding },
      ],
    },
  },
}

export function getSkillContent(skillId: string, locale: SupportedLocale): SkillContent | null {
  if (locale !== DEFAULT_LOCALE && !skillContents[locale]?.[skillId] && skillContents[DEFAULT_LOCALE]?.[skillId]) {
    // v0.1.0+: 非默认 locale 资源缺失但 zh-CN 存在时 throw，阻止静默降级
    throw new Error(`OXN_SKILL_NOT_TRANSLATED: skill "${skillId}" has no "${locale}" translation`)
  }
  return skillContents[locale]?.[skillId] ?? null
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
      assets: content?.assets,
    }
  })
}

// v0.6+: 所有 Skill 资源已确认 en + zh-CN 双 locale 就绪（oxn-work 为唯一 Skill）
