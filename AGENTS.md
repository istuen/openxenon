# AGENTS.md

OpenXenon 是基于 Bun 构建的 OXO/IAP 控制引擎：`oxn` CLI + Daemon + 基于 **md-pipeline** 的 OXN DSL（0.6.x 起纯 MD）。当前版本：`0.6.3`（alpha 阶段）。包管理器 pnpm（阶段 1），构建/测试 Bun。

> **v0.7+ AI Agent 唯一入口**：本文件是 OpenXenon 仓库的 Meta 层唯一入口。CONTEXT-MAP.md 已于 RFC-0028 整体退役，Meta 层入口由本文件 §入口指针 + §AI Agent 唯一入口段 + §阅读与加载顺序统一承担。

## 裁决规则（v0.7+ 简化 · 2 档）

当同一概念/规则在多个文档中说法不同时，按以下顺序取信：

1. **定义性 SSOT**：`.openxenon/assets/domains/*.md`（`### Axiom` + `- Theorem` 结构承载术语、边界硬约束与路由引用；涵盖旧 5 级优先级 1-4 级内容）
2. **行为规则兜底**：本文件（AGENTS.md）

`docs/rfc/`、`docs/product/zh-cn/concepts/glossary.md`、`docs/` 其余文档 = **仅解释性参考**，无约束力。守门：`bun scripts/check-doc-boundary.ts` + `bun scripts/validate-dependencies.ts`。

> 详细裁决矩阵与历史沿革：RFC-0018 §D1（5 级 → 2 档简化） + RFC-0028 §D1（CONTEXT-MAP.md 退役）。

## 阅读与加载顺序（v0.7+ 唯一权威索引）

> **正文**：[`dev/knowledge-loading.md`](./dev/knowledge-loading.md) — 完整 5 层加载链 + 入口分层 + 维护约定

加载链 5 层（时序轴 · 自外而内）：

| 层 | 名称 | 触发时机 | 读取物 |
|---|---|---|---|
| **L-1** | Skill 分发（OXN 对外入口） | 其他项目接入 OXN，先装 Skill | `~/.opencode/skills/oxn-work/instruction.md` §AI Agent 接入前置 |
| **L0**  | 项目入口自动注入 | opencode 启动 | 本文件 + `README.md` |
| **L1**  | 意图路由 | 收到 goal | `oxn assetmap show --scene` → `oxn assetmap suggest --goal --scene` |
| **L2**  | 蓝图闭包 | 选定 Blueprint | Blueprint 正文（`## Use` / `## Boundaries` / `## Scope` / `## Context Template`）+ 引用的 Domain/Workflow/Stack |
| **L3**  | 按需回源 | 术语/决策/命令查询 | 术语 → `.openxenon/assets/domains/*.md`；决策 → `docs/rfc/zh-cn/` + `docs/adrs/`；命令 → `docs/product/zh-cn/reference/cli-user-guide.md` |
| **L4**  | 裁决 | 冲突 | §裁决规则 2 档 |

> 注意：`docs/concepts/_index.md` 的"阅读顺序"是 VitePress 站点人类导航，**不参与** AI Agent 加载链。

## AI Agent 唯一入口（v0.7+ RFC-0028 D4）

作为本仓库 AI Agent 协作者的唯一入口：

- **入口**：本文件（`AGENTS.md`）→ `dev/knowledge-loading.md` 正文
- **路由 5 步**：goal → `oxn assetmap suggest --goal --scene` → scene 块 → Blueprint `## Use` refs → `oxn work create --blueprint <bp>`
- **路径层级**：L-1 Skill 分发 → L0 本项目入口 → L1 路由 → L2 闭包 → L3 回源 → L4 裁决（见 §阅读与加载顺序）

## Agent 行为规则

- 不得修改 Domain 文件中的 invariants（详见 `scripts/check-doc-boundary.ts` 守门）
- 不得把 glossary / docs 当 SSOT 改——改术语走 `.openxenon/assets/domains/*.md` + 跑 `bun scripts/sync-domain-glossary.ts`
- 执行任务前必须先建 Work，禁止在 Asset 外裸奔写代码：`oxn work create <name> --blueprint <bp>`
- Proof 只记录过程，不评判质量（ADR-0066/0067）
- 读 AssetMap 是为了"找 Blueprint"，不是找 Domain 关系
- Skill 维护流：改 `packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md` → 跑 `bun run packages/cli/src/index.ts init -f` → `.opencode/skills/` 自动重建
- 跨层引用规则：RFC / Doc / Dev 不依赖 Meta 层（v0.7.0 RFC-0028 §D3 撤销 CONTEXT-MAP.md 特例豁免），守门在 pre-commit 自动跑
- **版本号中性原则**：已落地的架构真理不带版本号——RFC/ADR/Dev 文档的 H1 标题必须 versionless；版本号只放：
  - `.changes/`（changelog 历史）
  - `dev/versions/`（scheduling 后已绑版本 Roadmap；scheduling 时由 `dev/pool/` 转入并补 `version: 0.X.Y`）
  - `dev/pool/`（未绑版本规划池，`scheduled-version: ~`；工程师 mental commit 入池）
  - `dev/meta/`（meta 文档）
  - `.openxenon/drafts/`（草稿层，可临时带版本）
  - **守门**：`bun scripts/check-versioned-docs.ts`（pre-commit 钩 RFC-0020..0023 严格门 + 其他 advisory）
  - **生命周期**：pool → scheduling → versions → 版本转正 → `.archived/dev/versions/`

## 意图解析流程（4 步 · 与 SKILL 对齐）

1. 从用户话里抽 goal
2. **show scene + suggest 候选**：先 `oxn assetmap show oxn-system --scene <scene>` 列出 scene 下 Domain/Blueprint/Stack；再 `oxn assetmap suggest --goal "<goal>" --scene <scene>` 拿 jaccard 候选
3. **人机挑选**：从候选挑最相关 Blueprint（不是自动推荐；agent 主动分析后由工程师确认）
4. `oxn work create --blueprint <name>` 进入执行

## 常用命令

```bash
pnpm install --frozen-lockfile    # 装依赖
bun run build                     # 构建
bun run typecheck                 # tsc --noEmit
bun run check                     # biome check
bun run lint                      # eslint（架构守卫）
bun test                          # 跑测试
```

## 入口指针

- **项目介绍**：`README.md` + `docs/product/zh-cn/introduction.md`
- **架构**：`docs/dev/zh-cn/architecture.md` + RFC-0018 + RFC-0009
- **AI 路由数据**：`.openxenon/assets/assetmaps/oxn-system.md`（scene → Domain/Blueprint/Stack 路由）
- **术语权威**：`.openxenon/assets/domains/`（内部 9 Domain + NpmSupplyChainAdvisory 探索成果）+ `docs/product/zh-cn/concepts/glossary.md`（外部，单一权威，RFC-0017 锁定）
- **L0-L3 宪法**：`docs/dev/zh-cn/architecture.md` + `bun scripts/validate-dependencies.ts`
- **CLI 参考**：`docs/product/zh-cn/reference/cli-user-guide.md`
- **变更历史**：`.changes/`（按版本号组织）
- **历史归档**：`.changes/pre-0-6-history.md`（v0.2.x / v0.3.x 已 done 路线图）
- **AI Agent 加载链正文**：[`dev/knowledge-loading.md`](./dev/knowledge-loading.md)