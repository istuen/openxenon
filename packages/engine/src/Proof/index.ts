/**
 * Proof module — DDD unified entry (v0.6 阶段4: 导出链完成)
 *
 * E3 Engine · Proof 阶段。
 * v0.6 清理: 只 re-export 4 个 CLI 实际使用的子模块
 *   - proof-frozen-writer: buildFrozenProof/writeFrozenProof/...
 *   - proof-manager: renderProbeDescribeHuman/renderOutcomeHuman (RFC-0015 D1.1 由 renderVerdictHuman 重命名)
 *   - runner: executeProbe
 *   - outcome-writer (RFC-0015 D1.1 由 verdict-writer 重命名): writeOutcomeMd/readOutcomeMd/buildOutcomeMd
 *
 * 旧名（如 renderVerdictHuman / writeVerdictMd）在每个子模块的源头以 @deprecated alias 形式
 * 保留 1 个大版本（v0.8.x 兼容窗），v0.9.0 删除。本 barrel 仅导出**新**名。
 */

export {
  buildFrozenProof,
  isFrozenFileReadOnly,
  readFrozenProof,
  writeFrozenProof,
} from './proof-frozen-writer'
export { renderProbeDescribeHuman, renderOutcomeHuman } from './proof-manager'
export { executeProbe } from './runner'
export { writeOutcomeMd, readOutcomeMd, buildOutcomeMd } from './outcome-writer'
