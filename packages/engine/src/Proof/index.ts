/**
 * Proof module — DDD unified entry (v0.6 阶段4: 导出链完成)
 *
 * E3 Engine · Proof 阶段（Engine 通用信任服务）。
 * v0.6.1: 新增 evidence-collector + verdict-builder（Work 级 Proof 证据收集 + verdict.md 构建）
 *   - 被 Work finalize 和独立 Proof 轴的 oxn proof run 共用
 *
 * 子模块：
 *   - proof-frozen-writer: writeFrozenImmutable（chmod 0o444 + SHA-256）
 *   - runner: executeProbe（Probe 执行 + Kernel.judge）
 *   - verdict-writer: 独立 Proof 轴 verdict.md
 *   - evidence-collector: 🆕 WorkEvidence 收集（5 个信任链节点）
 *   - verdict-builder: 🆕 Work 级 verdict.md
 *   - proof-manager: CLI 辅助
 */

export {
  buildFrozenProof,
  isFrozenFileReadOnly,
  readFrozenProof,
  writeFrozenProof,
} from './proof-frozen-writer'
export { renderProbeDescribeHuman, renderVerdictHuman } from './proof-manager'
export { executeProbe } from './runner'
export { writeVerdictMd, readVerdictMd } from './verdict-writer'
export { collectEvidence, type WorkEvidence } from './evidence-collector'
export { buildWorkVerdictMd, writeWorkVerdictMd } from './verdict-builder'
