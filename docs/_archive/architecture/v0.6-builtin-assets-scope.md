# Builtin Assets Scope (v0.6)

> Status: 📌 v0.6 决策，v0.7+ 重审

## 资产分布

| 路径 | 类型 | 消费方 | 用途 |
|---|---|---|---|
| `src/builtin/blueprints/*.oxn` | 启动蓝图（git-workflow 等） | `src/cli/install-skill`、`work-git-workspace-e2e` | `oxn init` 时 copy 到 `.openxenon/blueprints/` |
| `src/builtin/probes/*.oxn` | 探针模板 | 文档 + 模板参考 | `oxn probe add` 参考样板 |
| `packages/engine/src/oxl/builtin/blueprints/migrated-blueprints.oxn` | 迁移测试 fixture | engine `phase4.test.ts` | Core Migration (Task 4.4) 单元测试 fixture |
| `packages/engine/src/oxl/builtin/parts/builtin-parts.oxn` | part 测试 fixture | engine `phase2.test.ts` | Builtin OXN Assets (Task 2.5) 单元测试 fixture |
| `packages/engine/src/oxl/builtin/probes/*` | 探针模板（含 scheme 字段） | engine `probe-templates.test.ts` | T10 OXL 1.3 scheme 验证 fixture |

## 边界规则

- **L3 CLI** (src/cli/, src/daemon/, src/hall/, src/watcher/) 引用 **L1 Infra** (`@openxenon/engine/...`) 或 **L3 内部** (相对 `../cli/`, `../daemon/`)
- **L3 CLI** 不应直接 import `packages/engine/src/oxl/builtin/...`，应通过 `@openxenon/engine` 间接访问
- **L1 Engine** 的 `oxl/builtin/` 是 engine 自身测试的 fixture，不应作为产品资产被 L3 引用
- **`.oxn` 资产演进**：src/builtin/ → engine → tests/architectural 的反向路径仅在测试代码中允许

## v0.7+ 重审

- 是否合并 src/builtin/ 与 packages/engine/src/oxl/builtin/？取决于 v0.7 builtin-asset 包化策略
- 当前 split 满足 L0-L3 边界，无需 v0.6 合并
