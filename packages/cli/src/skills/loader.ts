import type { SupportedLocale } from '@openxenon/engine/infra/i18n/locale'
import { DEFAULT_LOCALE } from '@openxenon/engine/infra/i18n/locale'
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
import enWork from './locales/en/oxn-work/instruction.md' with { type: 'text' }
import enWorkBlueprintRef from './locales/en/oxn-work/references/blueprint-format.md' with { type: 'text' }
import type { OpenXenonSkill, ReferenceFile } from './types'

export interface SkillContent {
  instruction: string
  references: ReferenceFile[]
}

interface SkillMeta {
  id: string
  description: string
}

// v0.6 Skill 极简：唯一 Skill 为 oxn-work（IAP 范式统一入口）
// 原 oxn-cli / oxn-proof 已删除 — 按 v0.6 RFC "Skill 极简" 决策
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
      references: [{ filename: 'blueprint-format.md', content: zhCnWorkBlueprintRef }],
    },
  },
  en: {
    'oxn-work': {
      instruction: enWork,
      references: [{ filename: 'blueprint-format.md', content: enWorkBlueprintRef }],
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
    }
  })
}

// v0.6+: 所有 Skill 资源已确认 en + zh-CN 双 locale 就绪（oxn-work 为唯一 Skill）
