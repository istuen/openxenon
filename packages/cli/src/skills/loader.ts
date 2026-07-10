import type { SupportedLocale } from '@openxenon/engine/infra/i18n/locale'
import { DEFAULT_LOCALE } from '@openxenon/engine/infra/i18n/locale'
import zhCnAsset from './locales/zh-CN/oxn-asset/instruction.md' with { type: 'text' }
import zhCnAssetKind from './locales/zh-CN/oxn-asset/references/asset-kind-reference.md' with { type: 'text' }
import zhCnAssetCreation from './locales/zh-CN/oxn-asset/references/asset-creation.md' with { type: 'text' }
import zhCnAssetEvolution from './locales/zh-CN/oxn-asset/references/asset-evolution.md' with { type: 'text' }
import zhCnAssetLifecycle from './locales/zh-CN/oxn-asset/references/asset-lifecycle.md' with { type: 'text' }
import zhCnAssetVsWork from './locales/zh-CN/oxn-asset/references/asset-vs-work.md' with { type: 'text' }
import zhCnAssetDomain from './locales/zh-CN/oxn-asset/assets/domain.md' with { type: 'text' }
import zhCnAssetBlueprint from './locales/zh-CN/oxn-asset/assets/blueprint.md' with { type: 'text' }
import zhCnAssetStack from './locales/zh-CN/oxn-asset/assets/stack.md' with { type: 'text' }
import zhCnAssetWorkflow from './locales/zh-CN/oxn-asset/assets/workflow.md' with { type: 'text' }
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
import enAsset from './locales/en/oxn-asset/instruction.md' with { type: 'text' }
import enAssetKind from './locales/en/oxn-asset/references/asset-kind-reference.md' with { type: 'text' }
import enAssetCreation from './locales/en/oxn-asset/references/asset-creation.md' with { type: 'text' }
import enAssetEvolution from './locales/en/oxn-asset/references/asset-evolution.md' with { type: 'text' }
import enAssetLifecycle from './locales/en/oxn-asset/references/asset-lifecycle.md' with { type: 'text' }
import enAssetVsWork from './locales/en/oxn-asset/references/asset-vs-work.md' with { type: 'text' }
import enAssetDomain from './locales/en/oxn-asset/assets/domain.md' with { type: 'text' }
import enAssetBlueprint from './locales/en/oxn-asset/assets/blueprint.md' with { type: 'text' }
import enAssetStack from './locales/en/oxn-asset/assets/stack.md' with { type: 'text' }
import enAssetWorkflow from './locales/en/oxn-asset/assets/workflow.md' with { type: 'text' }
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

// v0.6 Skill 极简：2 个 Skill
// - oxn-asset: Asset 生命周期（创建/修改/演进/删除），覆盖 5 种 AssetKind（domain/workflow/stack/blueprint/roadmap）
// - oxn-work:  Work 编排 + 执行（4 子模式 explore/develop/fix/onboarding），引用 Asset 到 Tasks
//
// v0.6.1-alpha.0: 每个 Skill = 1 SKILL.md (≤200 tokens 目标) + 5 references/* + assets/* 模板
// v0.6.1-alpha.4: 收敛 5 AssetKind；Workflow 从 Blueprint 改名；新 Blueprint 为组合模板
const skillMeta: Record<SupportedLocale, SkillMeta[]> = {
  'zh-CN': [
    {
      id: 'oxn-asset',
      description:
        'Asset 生命周期管理（v0.6.1-alpha.4）— 创建/修改/演进/删除 domain / workflow / stack / blueprint / roadmap。底层走 oxn work --type asset 模式。当用户需要建、改、删 Asset 时触发。不处理 Work 编排、任务执行、Proof 展示（那是 oxn-work）',
    },
    {
      id: 'oxn-work',
      description:
        'Work 编排 + 执行（v0.6 极简版）— 引用 Asset 到 Tasks，走 Round 多轮循环，结束展示 Proof。所有开发/修复/onboarding/explore 工作都走这里。不处理 Asset 创建/修改（那是 oxn-asset）',
    },
  ],
  en: [
    {
      id: 'oxn-asset',
      description:
        'Asset lifecycle management (v0.6.1-alpha.4) — create/modify/evolve/delete domain / workflow / stack / blueprint / roadmap. Underlying oxn work --type asset mode. Triggered when user needs to create, modify, or delete Assets. Does NOT handle Work orchestration, task execution, or Proof display (that is oxn-work)',
    },
    {
      id: 'oxn-work',
      description:
        'Work orchestration + execution (v0.6 simplified) — reference Assets in Tasks, drive Round cycles, display Proof after completion. All development/fix/onboarding/explore work goes here. Does NOT handle Asset creation/modification (that is oxn-asset)',
    },
  ],
}

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': {
    'oxn-asset': {
      instruction: zhCnAsset,
      references: [
        { filename: 'asset-kind-reference.md', content: zhCnAssetKind },
        { filename: 'asset-creation.md', content: zhCnAssetCreation },
        { filename: 'asset-evolution.md', content: zhCnAssetEvolution },
        { filename: 'asset-lifecycle.md', content: zhCnAssetLifecycle },
        { filename: 'asset-vs-work.md', content: zhCnAssetVsWork },
      ],
      assets: [
        { filename: 'domain.md', content: zhCnAssetDomain },
        { filename: 'workflow.md', content: zhCnAssetWorkflow },
        { filename: 'stack.md', content: zhCnAssetStack },
        { filename: 'blueprint.md', content: zhCnAssetBlueprint },
      ],
    },
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
    'oxn-asset': {
      instruction: enAsset,
      references: [
        { filename: 'asset-kind-reference.md', content: enAssetKind },
        { filename: 'asset-creation.md', content: enAssetCreation },
        { filename: 'asset-evolution.md', content: enAssetEvolution },
        { filename: 'asset-lifecycle.md', content: enAssetLifecycle },
        { filename: 'asset-vs-work.md', content: enAssetVsWork },
      ],
      assets: [
        { filename: 'domain.md', content: enAssetDomain },
        { filename: 'workflow.md', content: enAssetWorkflow },
        { filename: 'stack.md', content: enAssetStack },
        { filename: 'blueprint.md', content: enAssetBlueprint },
      ],
    },
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

// v0.6+: 所有 Skill 资源已确认 en + zh-CN 双 locale 就绪（oxn-asset + oxn-work 共 2 个 Skill）
