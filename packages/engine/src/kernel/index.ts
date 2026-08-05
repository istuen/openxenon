// =============================================================================
// Kernel 公开面 (v0.1.4 PR-K)
//
// 宪法 §3 修订后，L0 Kernel 的对外接口 = 本文件。L1/L2/L3 只能：
//   import { ... } from '.../kernel/index'
// 或：
//   import { ... } from '.../kernel'  (本文件)
//
// 禁止直接走子层路径：
//   import { ... } from '.../kernel/contracts/xxx'   ← 黑名单
//   import { ... } from '.../kernel/verdicts/xxx'    ← 黑名单
//   ...
//
// L0 内部 4 子层（contracts/ schemas/ processors/ verdicts/）是"内部职责
// 分工"，对外透明；包内组织详见宪法 §3。
//
// 设计哲学（与 PR-K 决策记录对齐）：
//   - Port 契约（FileSystemPort / HashPort / ...）  → 外层实现，被 L2 持有
//   - 计算契约（topologicalSortGeneric / evaluatePredicate / judge / ...）
//     → Kernel 自带实现，被 L2/L3 直接调用
//   - 数据契约（BlueprintSchema / FrozenProofSchema / ...） → L0 提供强类型
//   - 错误契约（IAPError / IAPAction） → IAP 范式异常体系
//
// R-1 / R-2 / R-3 / R-5 / C-12 / R-（保留 R-4/R-6）相关条目见
// docs/architecture/l0-l3-constitution.md §7.4 偏差表。
// =============================================================================

// ───────── 协议层：Port 接口（外层实现，被 L2 持有）─────────
export type { FileSystemPort } from './contracts/file-system-port'
export type { HashPort } from './contracts/hash-port'
export type { LoggerPort, LogEntry, LogLevel } from './contracts/logger-port'
export type { OsPort } from './contracts/os-port'
export type { PartPort } from './contracts/part-port'
export type {
  ProbeHandler,
  ProbeObservation,
  ProbeResult,
  ProbeContextBase,
  ProbeStrategy,
  ProbeOutcome,
  ProbeDefinition,
  StackToolInfo,
} from './contracts/probe-port'

// ───────── 协议层：错误契约（IAP 范式异常体系）─────────
export { IAPError, isIAPError } from './contracts/iap-error'
export { IAPAction } from './contracts/iap-error'
export type { IAPAxis, IAPErrorCode, IAPErrorContext } from './contracts/iap-error'

// ───────── 数据层：核心 schema (强类型契约) ─────────
export { FrozenProofSchema, validateFrozenProof, safeValidateFrozenProof } from './schemas/proof-schema'
export type { FrozenProof, FrozenProofProbeResult, FrozenProofXenonMeta, FrozenProofBody } from './schemas/proof-schema'

export { ProbeStatsSchema, emptyProbeStats, safeValidateProbeStats } from './schemas/probe-stats-schema'
export type { ProbeStats, ProbeTypeStats, ProbeTargetStats, ProbeRunRecord } from './schemas/probe-stats-schema'

export { InsightSchema, safeValidateInsight } from './schemas/insight-schema'
export type {
  Insight,
  Evidence,
  EmergentPattern,
  ProbeStatsView,
  ProbeTypeStatsView,
} from './schemas/insight-schema'

export {
  CrossProofInsightSchema,
  TrendMatrixEntrySchema,
  CorrelationPairSchema,
  TrendTypeSchema,
  TrendSignalSchema,
  ProbeBehaviorPatternSchema,
  safeValidateCrossProofInsight,
} from './schemas/cross-proof-insight-schema'
export type {
  CrossProofInsight,
  TrendMatrixEntry,
  CorrelationPair,
  TrendType,
  TrendSignal,
  ProbeBehaviorPattern,
} from './schemas/cross-proof-insight-schema'

export {
  PipelineInsightSchema,
  InvariantEffectivenessSchema,
  IntentCoverageGapSchema,
  WorkProofTraceSchema,
  safeValidatePipelineInsight,
} from './schemas/pipeline-insight-schema'
export type {
  PipelineInsight,
  InvariantEffectiveness,
  IntentCoverageGap,
  WorkProofTrace,
} from './schemas/pipeline-insight-schema'

export {
  ImprovementSuggestionSchema,
  ImprovementSuggestionMetaSchema,
  SuggestionStatusSchema,
  SuggestionKindSchema,
  ApprovalRecordSchema,
  RejectionRecordSchema,
  safeValidateImprovementSuggestion,
} from './schemas/improvement-suggestion-schema'
export type {
  ImprovementSuggestion,
  ImprovementSuggestionMeta,
  SuggestionStatus,
  SuggestionKind,
  ApprovalRecord,
  RejectionRecord,
} from './schemas/improvement-suggestion-schema'

export { TokenRecordSchema, safeValidateTokenRecord } from './schemas/token-record.schema'
export type { TokenRecord } from './schemas/token-record.schema'

export {
  BlueprintSchema,
  SlotDefinitionSchema,
  PartInvocationSchema,
  parseBlueprint,
  safeParseBlueprint,
  extractTemplateVariables,
  validatePartTemplates,
  ALLOWED_VARIABLE_SCOPES,
} from './schemas/validators/blueprint.schema'
export type {
  Blueprint,
  SlotInvocation,
  SlotDefinition,
  Part,
  Probe as BlueprintProbe,
  TemplateVariableScope,
} from './schemas/validators/blueprint.schema'
export type { Probe as SchemaProbe } from './schemas/validators/probe'

export {
  CompiledBlueprintSchema,
  CompiledPartSchema,
  CompiledProbeSchema,
  validateCompiledBlueprint,
  validateFrozenBlueprint,
  FrozenBlueprintSchema,
  FrozenPartSchema,
  FrozenProbeSchema,
} from './schemas/validators/compiled-schema'
export type {
  CompiledBlueprint,
  CompiledPart,
  CompiledProbe,
  FrozenBlueprint,
  FrozenPart,
  FrozenProbe,
  XenonMeta,
} from './schemas/validators/compiled-schema'

export { PartDefinitionSchema, validatePartAsset } from './schemas/validators/part-asset'
export type {
  PartDefinition as PartDefinitionAsset,
  PartAsset,
  SemanticsSchema as PartSemanticsSchema,
} from './schemas/validators/part-asset'

export { validatePartDefinition, validatePartInvocation, validatePart } from './schemas/validators/part'
export type { PartDefinition, PartInvocation } from './schemas/validators/part'

export {
  ProbeTypeSchema,
  ProbeParamsSchema,
  ProbeInvocationSchema,
  ProbeDefinitionSchema,
  isValidProbeType,
  validateProbe,
  validateProbeInvocation,
  validateProbeDefinition,
} from './schemas/validators/probe'
export type { ProbeType as ProbeTypeName, ProbeInvocation, ProbeParams } from './schemas/validators/probe'

export { computeContentHash, createXenonMeta } from './schemas/validators/compiled-schema'

// ───────── 数据层：探索 / 任务 / 策略 types ─────────
export type {
  Finding,
  ExplorationResult,
  ExplorationRule,
  ProjectDir,
  ProbeInfo,
  BlueprintProbeRef,
  TraceSummary,
  ExplorationContext,
  ExplorationAsset,
} from './schemas/explore.types'
export type {
  TaskTraceYaml,
  PartTrace,
  TraceEventType,
  TaskStartEvent,
  TaskStatusEvent,
  PartStartEvent,
  PartCompleteEvent,
  ProbeResultEvent,
  TraceEvent,
  TaskTraceState,
  PartState,
} from './schemas/types/task-trace'
export type { Artifact } from './schemas/types/artifact'
export type { ExecutionPolicy, ExecutionContext } from './schemas/types/policy'
export { Action } from './schemas/types/policy'

// ───────── 计算层：通用算法（跨域纯函数）─────────
export { topologicalSortGeneric } from './processors/dag'
export type { TopologySortResult } from './processors/dag'
export type { GraphNode, GraphEdge, DagNode, DagValidationResult } from './processors/graph'
export { evaluatePredicate, validateSchemaGeneric, transformData } from './processors/evaluate-predicate'
export type {
  Operator,
  PredicateResult,
  ValidationResult,
  TransformRule,
  TransformMapping,
} from './processors/evaluate-predicate'
export { toKebab, assertNameFileConsistent, assertDirNameConsistent } from './contracts/name-canonical'

// ───────── 计算层：Proof 轴算法（verdicts/ 全部）─────────
export { judge, getVerdictStrategy, PROBE_VERDICT_STRATEGIES, PROBE_VERDICT_ALIASES } from './verdicts/verdict'
export {
  PROBE_CATALOG,
  listProbesSummary,
  describeProbe,
  getCatalogEntry,
  getSemanticNameByInternalRef,
  translateProbeInputs,
  assertCatalogConsistency,
} from './verdicts/catalog'
export type {
  ProbeInputType,
  ProbeInputDef,
  ProbeExample,
  ProbeCatalogEntry,
  TranslatedProbe,
} from './verdicts/catalog'
export {
  evidenceChainFromFrozen,
  buildProbeStatsView,
  detectEmergentPatterns,
  computeInsightFromInputs,
} from './verdicts/insight-compute'
export {
  computeCrossProofInsightFromInputs,
  type CrossProofFilter,
} from './verdicts/cross-proof-compute'
export { computePipelineInsightFromInputs } from './verdicts/pipeline-compute'
export type {
  PipelineInput,
  DomainInput,
  BlueprintInput,
  WorkInput,
} from './verdicts/pipeline-compute'
export { updateProbeStats, initProbeStatsFromFrozen } from './verdicts/probe-stats-updater'

// ───────── 枚举 + 常量（Kernel 自身）─────────
export type {
  TaskStatus,
  StepStatus,
  BlueprintStatus,
  ArtifactType as ArtifactTypeEnum,
  ProofType,
  ProjectStatus,
  ProbeType as ProbeTypeEnum,
} from './schemas/enums'
export type { Task, StepManifest } from './schemas/types/task'
export type { Stage, LegacyStage } from './schemas/types/part'
export type { Sample } from './schemas/types/sample'
export type { Spec } from './schemas/types/spec'

export {
  BOUNDARY_DIR,
  TASKS_DIR,
  WORK_DIR,
  DOMAINS_DIR,
  PROOFS_DIR,
  CACHE_DIR,
  DOMAIN_INDEX_JSON,
  BLUEPRINT_INDEX_JSON,
  BLUEPRINT_FILE,
  BLUEPRINT_OXN_FILE,
  FROZEN_BLUEPRINT_JSON,
  ASSEMBLY_JSON,
  TASK_FILE,
  TASK_OXN_FILE,
  WORK_FILE_ENTRY,
  WORK_OXN_FILE,
  TASK_TRACE_FILE,
  CONFIG_FILE,
  CANONICAL_FILE,
  PROOF_FILE,
  PROOF_OXN_FILE,
  PROOF_FROZEN_JSON,
  PROOF_OUTCOME_MD,
  PROOF_VERDICT_MD,
  PROOF_WORK_SNAPSHOT_FILE,
  PROOF_MD_FILE,
  PROOF_RUNNING_JSON,
  PROOF_WORK_HASH_FILE,
  PROBE_STATS_JSON,
  MAX_PROOF_RUNS,
  WORK_FILE,
  RUN_DIR,
  WORK_RUN_STATE_JSON,
  WORK_RUN_TRACE_JSONL,
  WORK_RUN_FROZEN_JSON,
  WORK_DOMAINS_JSON,
  WORK_BLUEPRINTS_JSON,
  RUN_TASKS_SUBDIR,
  TASK_RUN_STATE_JSON,
  TASK_RUN_TRACE_JSONL,
  TASK_RUN_FROZEN_JSON,
  DEBUG_LOG_FILE,
  DAEMON_SOCK_FILENAME,
  DAEMON_PID_FILENAME,
  DAEMON_LOG_FILENAME,
} from './constants'
