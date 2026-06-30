import type { SupportedLocale } from '@openxenon/engine/infra/i18n/locale'
export { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@openxenon/engine/infra/i18n/locale'
export type { SupportedLocale }

// v1.x: ProjectConfig 真身已物理迁移到 src/infra/paths.ts (L1-Infra)，
// 这样 L2-Work / L3-Daemon 也能引用而不跨越 L1→L3 边界。
// 本文件 re-export 以保持 L3 CLI 内部 import 路径不破。
export type { ProjectConfig } from '@openxenon/engine/infra/paths'

// SkillAdapterId 真身仍在 src/skills/adapters.ts (L3-Skills)，L3 内部引用
// 由本文件 re-export。L1 / L2 模块应改用 src/infra/paths 的 SkillAdapterIdLiteral
// （值集合与 SkillAdapterId 等价，inlined 避免 L1→L3 反向依赖）。
export type { SkillAdapterId } from '../../../../src/skills/adapters'
