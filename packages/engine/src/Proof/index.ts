/**
 * Proof module — DDD unified entry (v0.6 阶段4: 导出链完成)
 *
 * E3 Engine · Proof 阶段。
 * v0.6 清理: 只 re-export 4 个 CLI 实际使用的子模块
 *   - proof-frozen-writer: buildFrozenProof/writeFrozenProof/...
 *   - proof-manager: renderProbeDescribeHuman/renderOutcomeHuman (RFC-0015 D1.1 verdict → outcome 名实一致)
 *   - runner: executeProbe
 *   - outcome-writer: writeOutcomeMd/readOutcomeMd/buildOutcomeMd (RFC-0015 D1.1 verdict-writer 重命名)
 *
 * D3.2 补: probe-lint.ts 3-way consistency check
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
// RFC-0015 D3.2: 3-way consistency check
export { assertRegistryConsistency, PROBE_REGISTRY_DRIFT } from './probe-lint'
