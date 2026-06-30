import type { SupportedLocale } from '@openxenon/engine/infra/i18n/locale'
import { DEFAULT_LOCALE } from '@openxenon/engine/infra/i18n/locale'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
import zhCnProof from './locales/zh-CN/oxn-proof/instruction.md' with { type: 'text' }
import enOxnCli from './locales/en/oxn-cli/instruction.md' with { type: 'text' }
import enWork from './locales/en/oxn-work/instruction.md' with { type: 'text' }
import enWorkBlueprintRef from './locales/en/oxn-work/references/blueprint-format.md' with { type: 'text' }
import enProof from './locales/en/oxn-proof/instruction.md' with { type: 'text' }
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
        '发起 + 驱动 OpenXenon Work v1.1（创建 work.oxn + tasks/<name>/task.oxn，注入 domain；含 v1.1 8 阶段流程：init→migrate→create→add-task→validate→lock→run→submit/status，强制 lock 边界守卫 .work.planLock）',
    },
    {
      id: 'oxn-proof',
      description:
        'v0.1.2 Proof-First 入口：5 命令闭环（create / probe add / run / list / show），用 Probe 声明验收标准，OXN 产出不可篡改的 frozen.json',
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
        'Launch and drive OpenXenon Work v1.1 (create work.oxn + tasks/<name>/task.oxn with domain inject; v1.1 8-phase flow: init→migrate→create→add-task→validate→lock→run→submit/status, enforced by .work.planLock lock-boundary guard)',
    },
    {
      id: 'oxn-proof',
      description:
        'v0.1.2 Proof-First: 5-command loop (create / probe add / run / list / show), declare acceptance with Probes, OXN produces immutable frozen.json',
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
    'oxn-proof': { instruction: zhCnProof, references: [] },
  },
  en: {
    'oxn-cli': { instruction: enOxnCli, references: [] },
    'oxn-work': {
      instruction: enWork,
      references: [{ filename: 'blueprint-format.md', content: enWorkBlueprintRef }],
    },
    'oxn-proof': { instruction: enProof, references: [] },
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

// TODO: v0.1.0+ 推 en skill 翻译 — 迁移 checklist:
//   - 确保 en 目录存在 `src/skills/locales/en/<skill>/instruction.md`
//   - loader.ts 的 en 分支导入 en 资源（当前已就绪）
//   - 端到端验证：oxn init --locale en → .opencode/skills/*.md 内容为英文
