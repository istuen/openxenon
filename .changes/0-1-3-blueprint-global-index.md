---
categories:
  - Added
---

- **Added** `src/oxn-dsl/compiler/blueprint-index-builder.ts`：全局 Blueprint slim 索引构建器（PR-X，与 `domain-index-builder` PR-1 同源对称）。
- **Added** `oxn blueprint index` 子命令（PR-X）：扫 `.openxenon/blueprints/*.oxn` → 落 `.openxenon/.cache/blueprints.json`；支持 `--emit <path>` 自定义输出、`--check` 新鲜度校验。**与 `oxn domain index` 行为完全一致**。
- **Added** `oxn blueprint list` 优先读 `.cache/blueprints.json` 索引（PR-X），缺失时降级到 dir 扫描（向后兼容）。`data.source` 字段标识来源（`index` / `dir`）。
- **Added** `oxn blueprint create` / `oxn blueprint validate` 成功后静默重建全局 slim 索引（PR-X，与 `domain create/validate` 触发点对称）。
- **Added** `oxn init` 完成报告追加 `Blueprint index: ...` 状态行（PR-X，对齐 Domain 报告）。
- **Added** `src/oxn-dsl/compiler/__tests__/blueprint-index-builder.test.ts`：35 个单元测试覆盖 scan / parse / build / write / load / 路径工具 / `toKebab` + NAME_FILE_MISMATCH 防御。
- **Added** `src/cli/__tests__/blueprint-index-e2e.test.ts`：11 个 E2E 测试覆盖 `init` / `create` / `validate` / `index --check` / `index --emit` / 未 init 报 `OXN_NO_PROJECT` / `list` 走索引 / `list` 降级 dir 扫描。
- **Added** `src/kernel/constants.ts` 新增常量 `BLUEPRINT_INDEX_JSON = 'blueprints.json'`（L0-Schema）。
- **Note** slim 字段差异（blueprint 无 term/ban/invariant，替换为 slotNames + propCount + version）；NAME_FILE_MISMATCH 防御（macOS-safe，声明 vs 文件规范化后一致才视为 ok）。
- **Note** per-work `works/<w>/blueprints.json`（PR-3）保持不变；本 PR 仅补**全局**版本。
- **Note** `blueprint.ts` 旧版 `list` 子命令的 `require('fs')` 同步 require 反模式被移除（top-level import 替代）。
