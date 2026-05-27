## Why

当前 Arsenal 的物理目录结构与架构设计存在偏差：
- `forges/` 和 `arsenals/` 是平行顶级目录，违反"统一入口"原则
- `loadStandardByName` 会返回 draft 状态的资产，导致 Task 实例化可能意外使用草稿
- 目录命名使用单数 `draft/` 而非复数 `drafts/`，与架构文档不一致

这个重构是"架构宪法 v2.0"确立的 L2 Arsenal 物理边界定义的落地基础。

## What Changes

1. **统一 Arsenal 物理入口** — 将 `forges/` 和 `arsenals/` 合并到 `arsenal/` 下
   - Blueprint 草稿：`arsenal/blueprints/drafts/<name>/draft.oxn`
   - Blueprint 正式：`arsenal/blueprints/<name>/canonical.oxn`
   - Part/Probe 草稿：`arsenal/parts/drafts/<name>.oxn`
   - Part/Probe 正式：`arsenal/parts/<name>.oxn`

2. **修改 `loadStandardByName`** — 添加 state 过滤参数，默认只返回 canonical 状态

3. **更新路径常量** — `infra/paths.ts` 和 `arsenals/paths.ts` 移除 `GLOBAL_FORGES_ROOT`

4. **迁移存量资产** — 提供迁移脚本将现有 `forges/` 下资产迁移到新结构

5. **BREAKING** — 所有引用 `forges/` 路径的代码需要更新

## Capabilities

### New Capabilities

- `arsenal-directory-unification`: 统一 Arsenal 物理目录结构，合并 forge 和 arsenal 状态到单一入口

### Modified Capabilities

- `arsenal-registry`: 配合新目录结构，调整资产寻址逻辑

## Impact

- **核心改动**：`infra/paths.ts`、`arsenals/paths.ts`、`arsenals/forge.ts`、`arsenals/promoter.ts`、`infra/loader.ts`
- **CLI 改动**：`cli/arsenal-promote.ts`、`cli/global-arsenal-promote.ts`
- **迁移脚本**：`cli/arsenal-migrate.ts` 需要更新
- **影响范围**：所有依赖 `loadStandardByName` 的模块（Task、Work、PartResolver）