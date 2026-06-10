// =============================================================================
// src/skills/loader.ts — OpenCode Skill 唯一权威加载器
//
// ⚠️  本文件是 OpenXenon 内置 Skill 的 **唯一权威源**。
//
//   - 编辑：把 instruction.md 放在 src/skills/locales/<locale>/<id>/ 下，
//     并在本文件顶部 import + 在 skillMeta[locale] 注册 id+description。
//   - 输出：oxn init 通过 src/cli/skill-compiler.ts:compileAllSkills
//     调用本文件的 getAllSkillsForLocale()，把内容编译到项目的
//     .opencode/skills/<id>/SKILL.md（**这是 init 产物，不是源**）。
//   - OpenCode 在 .opencode/skills/ 下发现这些 skill 并自动加载。
//
// 任何「手动改 .opencode/skills/ 下的 SKILL.md」都会被下次 oxn init 覆盖。
// 新增 skill 必须改本文件 + 在 src/skills/locales/ 加文件，**绝不能**仅写
// .opencode/skills/<id>/SKILL.md（OpenCode 看到 init 没编译的目录 = 隐式 bug）。
//
// v0.1.3 移除了 oxn install-skill 命令（不再写用户 home）；Skill 加载
// 严格保持项目级。
// =============================================================================
import type { SupportedLocale } from '../cli/project-config'
import { DEFAULT_LOCALE } from '../cli/project-config'
import zhCnOxnCli from './locales/zh-CN/oxn-cli/instruction.md' with { type: 'text' }
import zhCnWork from './locales/zh-CN/oxn-work/instruction.md' with { type: 'text' }
import zhCnWorkBlueprintRef from './locales/zh-CN/oxn-work/references/blueprint-format.md' with { type: 'text' }
import zhCnProof from './locales/zh-CN/oxn-proof/instruction.md' with { type: 'text' }
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
        'Launch and drive v0.1 dual-layer Work (create work.oxn + at least one tasks/<name>/task.oxn with domain inject, plus run/submit/status)',
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
    'oxn-cli': { instruction: zhCnOxnCli, references: [] }, // en 沿用 zh-CN（v0.1 英文版废弃）
    'oxn-work': {
      instruction: zhCnWork,
      references: [{ filename: 'blueprint-format.md', content: zhCnWorkBlueprintRef }],
    },
    'oxn-proof': { instruction: zhCnProof, references: [] },
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
