---
categories:
  - Added
  - Fixed
---

- Proof-First 闭环基础：`oxn proof run` 完成后自动追加执行历史到 `.openxenon/.cache/probe-stats.json`
- 全局 probe stats：累计每次 proof run 的 probe type / target 统计、连续失败次数、proofRuns 历史（FIFO 上限 1000 条）
- schemaVersion: 1 Zod schema（`src/kernel/schemas/probe-stats-schema.ts`）+ 纯函数 updater（`src/kernel/probes/probe-stats-updater.ts`）
- L1-Infra 纯 IO（`src/infra/probes/probe-stats-store.ts`）：原子写（.tmp → rename），不持有业务逻辑
- 编排仅在 L3-CLI（`src/cli/proof.ts` runSubcommand），遵守宪法分层；stats 写盘失败仅 stderr warning，不影响 verdict 返回
- 新增 `getSemanticNameByInternalRef` helper（`src/kernel/probes/catalog.ts`）支持 frozen.json 的 ref → semanticName 反查
- 8 个 E2E 测试覆盖：单次 PASS/FAIL / 多次累加 / 连续失败累加 / 多 probe type / 未 init 报错 / 父目录自动创建 / 坏 stats 文件兜底
- 14 个 L0 + L1 单元测试覆盖 schema / IO / updater 纯函数