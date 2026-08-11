---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0005: LSP/Monorepo/北极星 战略纠偏（运行期隔离宪法）

> **来源**：`docs_tmp/oxn-dsl-1.md` (2026-05-21)
> **抽取日**：2026-07-04
> **状态**：Adopted（部分已修订）
> **影响层**：L0-L3 整体

## 决策

### 三大战略纠偏

<!-- allow-version -->
1. **LSP 推迟到 Phase 3+**：v0.2 之前不实现 LSP，专注跑通 MVP
2. **Monorepo 折中**：v0.6 实际采用 `packages/{cli,engine}` 双包拆分（早期主张不分包，事实层面已修订）
<!-- /allow-version -->
3. **唯一北极星**：跑通一个真实 `task.oxn → frozen.json → Engine` 闭环

### 运行期隔离宪法（核心遗产）

Engine / Kernel 严禁感知：
- 源文件格式（YAML / OXN / MD）
- LSP / 编辑器
- CLI / Daemon

Engine 只看 `frozen.json`，这是不可妥协的架构边界。

## 后果

- ✅ 早期避免过早抽象
- ✅ MVP 阶段不被 LSP 拖累
<!-- allow-version -->
- ⚠️ Monorepo 拆分决策被 v0.6 RFC 修订（packages/cli + packages/engine）
<!-- /allow-version -->
- 🔗 当前 `bun build --compile` + `packages/` monorepo 已落地

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-21-oxn-dsl-1.md`
<!-- allow-version -->
- v0.6 RFC：`.openxenon/pools/drafts/v0.6-monorepo-packages.md`
<!-- /allow-version -->