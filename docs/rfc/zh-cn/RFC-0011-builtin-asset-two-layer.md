---
entity: rfc
id: RFC-0011
theme: builtin-asset-two-layer
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - .openxenon/drafts/rfc-migration-master-plan.md
  - F1/F2/F3: OxnBuiltinRegistry 三 SSOT 不一致 + scope 绕过 + stale path
synced-at: 2026-07-26
landing-reason: declarative
---

# RFC-0011: 内置 Asset 两层机制——`@oxn/` fallback + `@prj/` override

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：builtin-asset-two-layer
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-25 grilling session #6（与 user 协作）+ 探索发现
> **批次**：2026-07-26 RFC 首批 promote（Phase 2）

## 摘要

<!-- allow-version -->
Builtin Asset（`@oxn/` scope，编译时内置）与 Project Asset（`@prj/` scope，`.openxenon/assets/`）两层覆盖——后者优先。v0.6.1 发现 `OxnBuiltinRegistry` mock（4 probes + 3 phantom parts）与 `src/builtin/probes/*.md`（15 文件）+ `catalog.ts`（15 probes）三 SSOT 不一致，Phase 4 收窄修复范围（仅 probes + blueprints）。D18 延后 domains + workflows builtin 落地。
<!-- /allow-version -->

## 决策要点

### D1：两层覆盖机制

| 层 | scope | 物理位置 | 创建方式 | 优先级 |
|---|---|---|---|---|
| **Built-in Asset** | `@oxn/` | `packages/engine/src/builtin/`（engine 包内） | 自举种子（手动创建） | 低（fallback） |
| **Project Asset** | `@prj/` | `.openxenon/assets/`（项目工作台） | 走 Work 流转 | 高（override） |

> **ADR-0090 修订**：builtin 物理位置从 `src/builtin/`（OXN 仓库根）迁移到 `packages/engine/src/builtin/`（engine 包内）。原因为：① `bunx oxn` 安装场景下仓库根路径不存在；② builtin 是 engine 包固有职责，不该跟仓库布局耦合；③ engine npm 包携带 builtin .md 一起发布。

解析顺序：`@prj/` override > `@oxn/` fallback。项目可 fork builtin 到 project 层变可编辑。

### D2：`OxnBuiltinRegistry` 重写（Phase 4 范围收窄 + ADR-0090 D18 解除）

<!-- allow-version -->
v0.6.1 三 SSOT 不一致（catalog.ts 15 probes + .md 15 probes + Registry mock 4 probes + 3 phantom parts）。Phase 4 修复：
<!-- /allow-version -->

- `_initProbes()` 改为从 `packages/engine/src/builtin/probes/*.md` 加载（mdast pipeline）
- `_initBlueprints()` 改为从 `packages/engine/src/builtin/blueprints/*.md` 加载
- 删除 3 phantom parts（无 .md 文件）
- 补齐 11 个缺失 probes（`ts-compiles`, `lint-check`, `git-branch-exists`, `http-responds`, `git-clean`, `deps-resolved`, `file-exports`, `fs-parseable`, `git-merge-feasible`, `test-pass`, `git-status-clean`）

ADR-0090 解除 D18 延后：

- `_initDomains()` / `_initWorkflows()` / `_initStacks()` / `_initAssetmaps()` 新增
- 5 类 builtin 全部加载；`readBuiltinAsset(kind, name)` 5 类填齐
- `getDomain / getWorkflow / getStack / getRoadmap` 4 个新查询接口
- `IBuiltinRegistry` 接口扩展（向后兼容，旧 4 接口保留）

### D3：D18 延后范围

| 范围 | Phase 4 处理 | ADR-0090 状态 |
|---|---|---|
| probes | ✅ 修复 | ✅ 维持 |
| blueprints | ✅ 修复 | ✅ 维持 + md-author（ADR-0089）|
| domains | ❌ 延后 | ✅ 解除（doc-md, ADR-0089） |
| workflows | ❌ 延后 | ✅ 解除（md-author, ADR-0089） |
| stacks | ❌ 延后 | ✅ 解除（md-stack, ADR-0089） |
| roadmaps | ❌ 延后 | ✅ 解除（md-system, ADR-0089，目录 `assetmaps/`）|

`oxn init --starter` flag（拷贝 builtin 到 `.openxenon/assets/`）通过 `oxn onboard --new`（ADR-0089 D2）落地。

### D4：`@oxn/` scope 行为

`@oxn/` scope 绕过文件系统——`getScopeRoot('oxn')` 返回 null，只查内存 registry。这意味着：

- builtin 资产编译时打包进 OXN 二进制，不读硬盘
- 解析 `@oxn/probe/ts-compiles` 直接命中内存 registry
- 项目 override `@prj/probe/ts-compiles` 优先

### D5：Stale path 修复（Phase 4 顺手）

<!-- allow-version -->
`oxn-scope.ts` 内 `.openxenon/arsenals/` 路径 stale（实际是 `.openxenon/assets/`，有 `TODO(v1.1-path)` 标记）——Phase 4 一并修复。
<!-- /allow-version -->

## 影响范围

- ✅ 19 个 builtin probes+blueprints 修复（4→15 probes + 0→3 blueprints）
- ✅ 3 phantom parts 删除
- ✅ `builtin-assets-md.test.ts` 测试守卫扩展
- 📝 domains + workflows builtin 延后（已被 ADR-0090 解除）
- 📝 `oxn init --starter` flag 延后
- 📝 `oxn-scope.ts` stale path 顺手修复

## 相关术语

- [Built-in Asset](/product/zh-cn/concepts/glossary.html#built-in-asset) — `@oxn/` scope 解析目标
- [Starter Asset](/product/zh-cn/concepts/glossary.html#starter-asset) — `--starter` flag 拷贝产物
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界
- [Probe](/product/zh-cn/concepts/glossary.html#probe) — 内置 15 个

## 相关决策

- [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md) — D8 + D14 + D18 锁定本机制
- [RFC-0009](./RFC-0009-doc-three-modalities.md) — 文档三情态分离（meta）
- [RFC-0010](./RFC-0010-frozen-errata.md) — RFC frozen+errata 演进策略（meta）
- [RFC-0012](./RFC-0012-bootstrap-exemption.md) — 自举种子豁免（meta）
- Phase 4 工作：`packages/engine/src/oxl/scope/oxn-builtin-registry.ts` 重写

## Errata

<!-- allow-version -->
### v1.0.1 (2026-07-26)
<!-- /allow-version -->

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

> 本段用于后续追加修正说明。核心决策自 RFC-0011 Accepted 起冻结。
