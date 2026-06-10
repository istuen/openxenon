// src/skills/adapters.ts
//
// 描述每个目标 AI 助手如何"消费"编译出的 Skill。
//
// 适配背景（2026-Q2 多 AI 助手适配）：
//   - OpenCode 优先读 `.opencode/skills/`，并把 `.claude/skills/` 与 `.agents/skills/` 视为
//     兼容别名（opencode.ai/docs/skills 文档）。
//   - Claude Code 只认 `.claude/skills/`（不读 `.agents/skills/`，code.claude.com/docs/en/skills）。
//   - Cursor / OpenAI Codex / Goose / Gemini CLI 共享 `.agents/skills/` 互操作路径。
//
// 因此一份 SSOT（src/skills/locales/）需要分发到 3 个互不重叠的目录；用户可通过
// `oxn init --tools ...` 或 `.openxenon/config.json` 的 `tools.{enabled,disabled}` 收敛。

export const DEFAULT_ADAPTERS = ['opencode', 'claude', 'agents'] as const

export type SkillAdapterId = (typeof DEFAULT_ADAPTERS)[number]

export function isSkillAdapterId(value: unknown): value is SkillAdapterId {
  return typeof value === 'string' && (DEFAULT_ADAPTERS as readonly string[]).includes(value)
}

export interface SkillAdapter {
  id: SkillAdapterId
  /** 写入时使用的根目录（绝对或相对 projectPath） */
  root: (projectPath: string) => string
  /** 兼容的扫描根（用于 init 时清理 stale 目录） */
  pruneRoot: (projectPath: string) => string
  /** 适配器的人类可读标签 */
  label: string
}

export const SKILL_ADAPTERS: Record<SkillAdapterId, SkillAdapter> = {
  opencode: {
    id: 'opencode',
    root: (p) => `${p}/.opencode/skills`,
    pruneRoot: (p) => `${p}/.opencode/skills`,
    label: 'OpenCode',
  },
  claude: {
    id: 'claude',
    root: (p) => `${p}/.claude/skills`,
    pruneRoot: (p) => `${p}/.claude/skills`,
    label: 'Claude Code',
  },
  agents: {
    id: 'agents',
    root: (p) => `${p}/.agents/skills`,
    pruneRoot: (p) => `${p}/.agents/skills`,
    label: 'Cursor / Codex / Goose (agents 互操作路径)',
  },
}

export function listAdapterIds(): SkillAdapterId[] {
  return [...DEFAULT_ADAPTERS]
}
