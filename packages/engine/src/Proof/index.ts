/**
 * Proof module — DDD unified entry (v0.6 阶段4: 导出链完成)
 *
 * E3 Engine · Proof 阶段。
 * v0.6 清理: 只 re-export 4 个 CLI 实际使用的子模块
 *   - proof-frozen-writer: buildFrozenProof/writeFrozenProof/...
 *   - proof-manager: renderProbeDescribeHuman/renderVerdictHuman
 *   - runner: executeProbe
 *   - verdict-writer: writeVerdictMd/readVerdictMd
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
