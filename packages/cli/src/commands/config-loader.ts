// src/cli/config-loader.ts (L3-CLI re-export shim)
//
// v0.6: `loadOxnRc` 真身已物理迁移到 packages/engine/src/infra/oxnrc.ts (L1-Infra)。
// 本文件 re-export 以保持 L3 CLI 内部 import 路径不破。
// v0.7+ 可删除本文件，统一改用 @openxenon/engine/infra/oxnrc。

export {
  type LeaderMode,
  VALID_LEADER_MODES,
  DEFAULT_LEADER_MODE,
  type OxnConfig,
  OXN_RC_FILENAME,
  loadOxnRc,
  normalizeLeaderMode,
  resolveLeaderMode,
  type ResolvedLeader,
} from '@openxenon/engine/infra/oxnrc'
