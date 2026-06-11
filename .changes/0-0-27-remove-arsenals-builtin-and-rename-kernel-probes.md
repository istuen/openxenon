---
categories:
  - Removed
  - Changed
---

- **Removed** `src/arsenals/builtin.ts` 及 `src/arsenals/` 空目录。文件 0 真实消费者（BUILTIN_PROBES / BUILTIN_FORGES / BUILTIN_PARTS / BUILTIN_BLUEPRINTS 及 4 个 Builtin*Name 类型在仓库内仅在该文件内自引用）。替代实现已在 `src/oxn-dsl/scope/oxn-builtin-registry.ts`（OxnBuiltinRegistry）与 `src/kernel/verdicts/catalog.ts`（PROBE_CATALOG）落地。本次删除闭合 `docs/core/document.md §3.5` 提及的 v0.0.x Arsenal 残留。
- **Changed** `src/kernel/probes/` → `src/kernel/verdicts/`（物理重命名，连同 `src/kernel/__tests__/probes/` → `src/kernel/__tests__/verdicts/`）。关闭 `docs/architecture/l0-l3-constitution.md §7.2.2 C-10` 命名歧义偏差——L0 判定层 (`verdicts/`) 与 L1 IO 层 (`infra/probes/`) 现以 `verdicts` ↔ `probes` 命名对偶显式 L0 ⇄ L1 边界，对照阅读更明确。9 个 .ts 文件 import 路径同步更新（`src/infra/explore/collector.ts`、`src/cli/proof.ts`、`src/cli/proof-runner.ts`、`src/cli/insight.ts`、`src/cli/__tests__/probe-stats-store.test.ts`、`src/cli/__tests__/proof.test.ts`、`src/kernel/__tests__/verdicts/verdict-fs-match.test.ts`、`src/oxn-dsl/__tests__/phase2.test.ts`、`tests/integration/probe-catalog.test.ts`）。`docs/architecture/l0-l3-constitution.md §2.1` 末尾注 + §3 层级表 + §7.2.2 C-10 + §7.2.1 残留 1 行号同步刷新；`AGENTS.md` Probes 拆分说明同步。
- **Note** `src/oxn-dsl/scope/oxn-builtin-registry.ts:4` 注释中"替代 `src/arsenals/builtin.ts`"叙述保留——历史正确性，不影响行为。
- **Note** `docs/core/document.md §3.5` 表格中 `arsenals/builtin.ts` 文件名作为"被清理对象"的历史记录保留。
- **Note** i18n Phase A 漂移备忘（详见 forges/2026-06-11-i18n-version-drift.md §5.1）：本 release 未推进 i18n；36 处硬编码中文字符串未走 t()、en locale 资源缺失、i18n 模块 0 单测、version:check 失败（已在 0.0.28 PR-1 修复）
