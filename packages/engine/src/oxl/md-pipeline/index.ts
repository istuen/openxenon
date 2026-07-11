/**
 * md-pipeline/index.ts — v0.4 PR-C1/C2/C3 unified-native 统一出口
 *
 * 角色：unified pipeline 编排 (把 md 字符串 → mdast → 处理 → 序列化)
 *   取代 src/oxl/md-bridge/pipeline.ts (hybrid unified + 自研)
 *
 * 关键不变量：
 *   - 不感知 fs (只接收 content 字符串)
 *   - 不感知 OpenXenon Kernel (只输出 mdast)
 *   - 失败抛 E_MD_INVALID_SYNTAX 错误 (与 v0.3.4 兼容)
 *
 * L0–L3 兼容性：
 *   - L1-OXL 层
 *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
 *
 * 迁移路径 (RFC §4 PR-C 序列)：
 *   - PR-C1: 基建 + utils.ts + utility functions ✓
 *   - PR-C2: 5 EntityCompilers → 5 unified transformer plugins ✓
 *   - PR-C3: mdast-validator → remark-canonical plugin ✓
 *   - PR-C4: 收口 — 删 driver-registry / extract-* / 切到 work.md ✓
 */

// --- utils (PR-C1) ---
export {
  collectHeadings,
  findFirstHeading,
  collectHeadingContexts,
  collectListFields,
  parseMarkdown,
  stringifyMarkdown,
  countNodes,
  extractYamlFromTree,
  // compat aliases (PR-C4 兼容 md-bridge 自研层 5 compilers)
  extractHeadingContexts,
  findH1,
  extractListFields,
  type CollectedHeading,
  type HeadingContext,
  type ListField,
} from './utils'

// --- transformers (PR-C2) ---
export {
  extractDomainIR,
  extractBlueprintIR,
  extractWorkIR,
  extractTaskIR,
  extractProofIR,
  remarkDomainExtractor,
  remarkBlueprintExtractor,
  remarkWorkExtractor,
  remarkTaskExtractor,
  remarkProofExtractor,
  DOMAIN_CATEGORIES,
  BLUEPRINT_CATEGORIES,
  WORK_CATEGORIES,
  TASK_CATEGORIES,
  type DomainCategory,
  type DomainIR,
  type DomainTerm,
  type DomainBan,
  type DomainInvariant,
  type DomainStackEntry,
  type BlueprintCategory,
  type BlueprintIR,
  type BlueprintProp,
  type BlueprintSlot,
  type WorkCategory,
  type WorkIR,
  type WorkContext,
  type WorkRef,
  type WorkTaskIR,
  type WorkPart,
  type TaskCategory,
  type TaskIR,
  type TaskPart,
  type TaskProbe,
  type ProofIR,
  type ProofProbeIR,
} from './transformers'

// --- plugins (PR-C3) ---
export {
  remarkCanonical,
  validateCanonical,
  ENTITY_H2_WHITELIST,
  VALID_ENTITIES,
  VALID_STATUS,
  type CanonicalErrorCode,
  type CanonicalIssue,
  type CanonicalResult,
  type RemarkCanonicalOptions,
} from './plugins/remark-canonical'

// --- sync-hash (v0.4 Phase 1: .oxn ↔ .md 同步元数据) ---
export {
  computeSha256,
  readSyncMetadata,
  writeSyncMetadata,
  composeSyncContent,
  readCacheSha,
  writeCacheSha,
  getCachePath,
  getCacheMdPath,
  type SyncMetadata,
} from './sync-hash'

// --- oxn-serializer (v0.4 Phase 2: IR → .oxn 反向编译, deprecated in v0.7) ---
// export { serializeDomainToOxn, serializeBlueprintToOxn, serializeWorkToOxn } from './oxn-serializer'
