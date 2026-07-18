# dev/ — OpenXenon 开发者操作指南

> **本目录是 OpenXenon 维护者 + 贡献者写给开发者看的操作手册，不是产品文档。**
>
> 完整的三层文档架构见 [AGENTS.md](../AGENTS.md) 「文档三层架构（v0.7 重构）」段：
>
> - **L1 对外** — `docs/{product,dev,rfc}/{zh-cn,en}/` — 用户/贡献者 SSOT
> - **L2 对内-沉淀** — `docs/rfc/{zh-cn,en}/` — append-only 决策记录（OXP）
> - **L3 对内-探索** — `.openxenon/drafts/{*,rfc}/` — 流动探索
> - **L4 运行时** — `.openxenon/{works,proofs,.cache}/` — IAP 执行产物
>
> 本目录是 **L1 和 L2 之外的入口**——为"新贡献者入门"、"本地开发流程"、"发布流程"等"做事"类内容留位置。

---

## 1. 当前内容

| 文件 | 用途 |
|---|---|
| `README.md`（本文件） | 开发者操作指南入口 |

## 2. 待建文档（贡献者可加）

| 主题 | 预期文件 | 触发时机 |
|---|---|---|
| 新贡献者入门 | `getting-started-dev.md` | 新人第一次 clone 仓库 |
| 本地开发流程 | `dev-workflow.md` | 多人协作时统一约定 |
| 发布流程 | `release-process.md` | v0.7+ 发版时落地 |
| 调试指南 | `debugging.md` | 排查常见 issue 时落地 |
| AI Agent 协作 | `ai-collaboration.md` | 跨多人 + AI 时补充 |

> **新文件创建方式**：
> 1. 用 `oxn work create <work-name> --type doc --blueprint doc-prod-workflow` 走 IAP
> 2. 落地后 `git add dev/<filename> && git commit -m "docs(dev): add <title>"`
> 3. 更新本 README「当前内容」表

## 3. 跨层引用规则（强约束，v0.7）

```
L1 docs/                  ──→  L2 docs/rfc/      ✅ 允许（同 docs/ 树内）
L1 docs/                  ──→  L3 .openxenon/    ❌ 禁止（严格隔离）
L2 docs/rfc/              ──→  L1 docs/product   ✅ 允许
L2 docs/rfc/              ──→  L3 .openxenon/drafts/  ✅ 允许（引用探索稿）
L3 .openxenon/drafts/     ──→  L1 docs/          ✅ 允许（仅通过 promote workflow）
L3 .openxenon/drafts/     ──→  L2 docs/rfc/      ✅ 允许（待审视 OXP）
dev/                      ──→  L1/L2/L3          ✅ 允许（开发者手册引用 SSOT）
L1/L2/L3                  ──→  dev/              ⚠️ 谨慎（SSOT 不应反向引用操作指南）
```

> **写入规则**：
> - dev/ 内容应独立可读（被 SSOT 引用时 dev/ 文件也可被读到）
> - dev/ 不应被 `bun run docs:build` 构建（仅作工程内部手册）
> - dev/ 内容的 SSOT 仍由 `docs/` + `.openxenon/drafts/` 提供

## 4. 与 dev-workflow Blueprint 的关系

`dev-workflow` 是 OXN Asset 系统中技术流程 Blueprint（slot DAG），dev/ 目录是其"人类可读"对应物。dev/ 文档可被 Blueprint slot 引用作为说明文字，但 Blueprint slot DAG 才是机器可执行的真值源。

## 5. 相关 SSOT

- 文档三层架构：[AGENTS.md](../AGENTS.md) 「文档三层架构（v0.7 重构）」
- OXP 生命周期 + Promote 工作流：[AGENTS.md](../AGENTS.md) 「OXP 生命周期」「4 条 Promote 工作流」
- .openxenon/drafts/ 待审视索引：[`.openxenon/drafts/rfc/INDEX.md`](../.openxenon/drafts/rfc/INDEX.md)

## 6. 版本

| 字段 | 值 |
|---|---|
| 创建 | 2026-07-09（最初 v0.6 落地） |
| 重构 | 2026-07-09（从「L2 独立开发文档区」收敛为「开发者操作指南专用入口」） |
| v0.7 适配 | 2026-07-18（三层架构重构：docs/rfc/ 新增、pools/ 删除、drafts/ 重组） |
| 关联 PR | feat/doc-three-tier-arch |
