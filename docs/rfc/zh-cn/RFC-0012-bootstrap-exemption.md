---
entity: rfc
id: RFC-0012
theme: bootstrap-exemption
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - .openxenon/drafts/rfc-migration-master-plan.md
synced-at: 2026-07-26
---

# RFC-0012: 自举种子豁免——src/builtin/ Asset 手动创建不经 Work

> **类型**：RFC（OpenXenon 规范 · meta-RFC）
> **主题**：bootstrap-exemption
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **来源**：2026-07-25 grilling session #6（与 user 协作）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

OXN 项目存在"先有鸡还是先有蛋"的 bootstrapping 问题——创建第一个 Asset 必须先有 Work，但 Work 又依赖 Asset。解决方案：自举种子豁免——`src/builtin/` 内置 Asset 手动创建不经 Work 流转（self-bootstrap），存在后后续变更走 `oxn work create evolve-asset --blueprint asset-workflow` 标准流转。

## 决策要点

### D1：豁免范围

| 位置 | 创建方式 | 后续变更 |
|---|---|---|
| `src/builtin/`（OXN 仓库内） | ✅ 自举种子（手动创建） | 走 Work（`asset-workflow` Blueprint） |
| `.openxenon/assets/`（项目工作台） | ❌ 必须经 Work | 走 Work |
| `.openxenon/.archived/` | ✅ 直接物理移动（archive） | N/A（已归档） |

**关键边界**：豁免仅限 `src/builtin/`——项目工作台的 Asset 创建必须经 Work 流转。

### D2：自举种子的物理特性

`src/builtin/` 下的 Asset：
- 与 OXN 版本绑定，发布时随包分发
- `@oxn/` scope 解析（绕过文件系统，直接读内存 registry）
- 项目 override 优先（`@prj/` > `@oxn/`）

### D3：与 RFC-0011 联动

RFC-0011 确立的两层机制依赖本 RFC 的自举种子豁免：
- 没有自举豁免，OXN 仓库自身无法 bootstrap 内置 Asset
- 自举豁免仅适用 OXN 仓库本身（`src/builtin/`），不延伸到项目工作台

### D4：自举种子的 bootstrap 闭环

```
OXN 仓库初始化
    │
    ▼
src/builtin/（手动 seed 首批 probes + blueprints）
    │
    ▼ 随 OXN 版本发布
项目 init（oxn init）
    │
    ▼ 加载 builtin
@oxn/ scope 提供 fallback
    │
    ▼ 项目 override
@prj/ scope override（经 Work 流转）
```

### D5：项目工作台不享有豁免

`.openxenon/assets/` 下任何 Asset 创建必须经 `oxn work create evolve-XXX --blueprint asset-workflow`。例外：

- **archive**：已存在 Asset 物理归档到 `.archived/`（非创建，是移动）
- **deletion**：删 `.openxenon/assets/{kind}/<name>.md`（git rm，无 Work 流转）—— 后续规划是否需 Work 流转

## 影响范围

- ✅ `src/builtin/probes/*.md` + `src/builtin/blueprints/*.md` 15 + 3 文件均属自举种子
- ✅ Phase 4 Registry 重写保持自举豁免语义
- ✅ 工程师可手动调整 `src/builtin/` 内容（git commit）
- 📝 项目工作台删除流程的 Work 化（v0.8+ 探索）

## 相关术语

- [Bootstrap Seed Exemption](/product/zh-cn/concepts/glossary.html#bootstrap-seed-exemption) — 自举种子豁免
- [Built-in Asset](/product/zh-cn/concepts/glossary.html#built-in-asset) — `src/builtin/` 物理位置
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — E1 静态边界

## 相关决策

- [.openxenon/drafts/rfc-migration-master-plan.md](../../.openxenon/drafts/rfc-migration-master-plan.md) — D4 锁定自举豁免机制
- [RFC-0009](./RFC-0009-doc-three-modalities.md) — 文档三情态分离（meta）
- [RFC-0010](./RFC-0010-frozen-errata.md) — RFC frozen+errata 演进策略（meta）
- [RFC-0011](./RFC-0011-builtin-asset-two-layer.md) — 内置 Asset 两层机制（meta）

## Errata

### v1.0.1 (2026-07-26)

- **ADR 引用路径修正**：原 `## 相关决策` 段链接指向 `.openxenon/drafts/rfc/00XX-*.md`，该路径在 Phase 3 ADR 归档后已失效（72 文件已移至 `.openxenon/.archived/docs/adrs/`）。现镜像到 `docs/adrs/`，RFC 链接指向 `../../adrs/00XX-*.md`（docs/ 内部，无跨层）。frontmatter `related` 同步更新为 `docs/adrs/00XX-*.md`。
- **修复触发**：grilling #7 发现 body markdown 链接死链 + 失效 frontmatter refs；边界检查器因错误相对路径漏报。
- **符合 RFC-0009 D4**：ADR 引用现在遵循"仅 related 段可引 docs/adrs/"规则。

> 本段用于后续追加修正说明。核心决策自 RFC-0012 Accepted 起冻结。