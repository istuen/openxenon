---
entity: dev-meta
type: knowledge-loading
created: 2026-08-10
status: accepted
synced-at: 2026-08-10
related:
  - AGENTS.md
  - .openxenon/assets/assetmaps/oxn-system.md
  - docs/rfc/zh-cn/RFC-0018-project-engineering-meta.md
  - docs/rfc/zh-cn/RFC-0028-context-map-deprecation.md
  - .openxenon/drafts/design-doc-reading-order-convergence-2026-08-10.md
---

# AI Agent 知识加载链（v0.7+ 唯一正文）

> **类型**：dev meta 文档（OpenXenon 维护者操作参考）
> **日期**：2026-08-10（v1.0）
> **状态**：✅ Accepted（v0.7.0 RFC-0028 §D4 配套 — AGENTS.md §AI Agent 唯一入口段统一承担）
> **来源**：2026-08-10 `/grilling` session（grill-with-docs + domain-modeling skill）
> **范围**：定义 LLM / AI Agent 在 OpenXenon 仓库内（与消费 OXN 的项目内）的完整加载链——时序轴（先读什么）+ 裁决轴（冲突听谁的）。

---

## 1. 阅读者分层

OpenXenon 的文档对**三类读者**各有入口，互不混淆：

| 读者 | 入口 | 性质 |
|---|---|---|
| **人类工程师** | `README.md` + `docs/product/zh-cn/introduction.md` | 营销 + 5min 上手 + GitHub 渲染 |
| **AI Agent（本仓库协作者）** | `AGENTS.md` | 行为规则 + 加载链索引 + 路由 5 步 |
| **AI Agent（其他项目接入 OXN）** | `~/.opencode/skills/oxn-work/SKILL.md` §AI Agent 接入前置 | OXN 对外分发的 CLI 能力包 |

> **关键区别**：本仓库的 AI Agent 工作流起点是 `AGENTS.md`（仓库级 AI 入口）；其他项目接入 OXN 的 AI Agent 起点是 Skill（OXN 对外分发的能力包，跨项目复用）。两者**先有 Skill，后有 AGENTS.md**——Skill 提供 CLI 调用，AGENTS.md 提供路由策略。

## 2. 加载链 5 层（时序轴）

| 层 | 名称 | 触发时机 | 读取物 | 读多深 |
|---|---|---|---|---|
| **L-1** | Skill 分发 | 其他项目接入 OXN，先装 Skill | `~/.opencode/skills/oxn-work/instruction.md` §AI Agent 接入前置 + §CLI 白名单 | 整段（< 100 行，含身份/白名单/输出约定） |
| **L0**  | 项目入口自动注入 | opencode 启动 | 本文件 `AGENTS.md` + `README.md` | AGENTS.md 全文（58→88 行）；README 仅 slogan + 5min 上手 |
| **L1**  | 意图路由 | 收到 goal | `oxn assetmap show <map> --scene <scene>` + `oxn assetmap suggest --goal --scene` | scene 块内文；候选 Blueprint 摘要 |
| **L2**  | 蓝图闭包 | 选定 Blueprint | Blueprint 正文 4 段 + `## Use` 引用的 Domain/Workflow/Stack | Blueprint 全文；Use refs 按需读（术语 → 章节级，不读全文） |
| **L3**  | 按需回源 | 术语/决策/命令查询 | 术语 → `.openxenon/assets/domains/*.md` §Axiom；决策 → `docs/rfc/zh-cn/`；命令 → `docs/product/zh-cn/reference/cli-user-guide.md` | 仅查相关章节（不读全文） |
| **L4**  | 裁决 | 冲突 | §3 裁决规则 | 2 档（见下） |

### 2.1 L1 路由（人机主动）

```bash
# 1. 查 scene 下的可用 Asset
oxn assetmap show oxn-system --scene <scene>      # 默认 map = oxn-system；项目消费者可新建 <project>-system

# 2. 按 goal 拿 jaccard 候选
oxn assetmap suggest --goal "<goal>" --scene <scene> --top 5

# 3. 人机挑选：从候选挑 Blueprint / Domain / Stack（agent 主动分析，工程师确认）
# 4. fork 模板或直传
oxn work create <name> --blueprint <bp> --domain <d> [--stack <s>] --goal "<goal>"
```

**注意**：`suggest` 是 jaccard 关键词排序的**候选**，不是自动推荐。Agent 必须主动分析候选 + 工程师确认才能进 L2。

### 2.2 L2 蓝图闭包

Blueprint 正文结构（v2.2.0）：

```yaml
## Use
  ### domain: <name>      # 拉入该 Domain 的 Axioms（按术语需求读章节）
  ### workflow: <name>    # 拉入该 Workflow 的 slot 拓扑
  ### stack: <name>       # 拉入该 Stack 的工具/操作

## Slot
  ### <slot-name>
    observe: [<probes>]         # OXN 跑的验证门禁
    operate: [<operations>]     # AI 可跑的操作（参照，不强制）
    refs:                       # 该 slot 引用的 domain/workflow

## Scope
  allow: [<globs>]              # Task Artifact 允许路径
  forbid: [<globs>]             # Task Artifact 禁止路径

## Context Template            # 组装 Work/Task Context 的指令
  template: |
    ...
```

**读法**：
1. 先读 `## Use` 列表 → 知道本次闭包要拉入哪些 Asset
2. 再读 `## Scope` → 知道文件边界（避免越界）
3. 按 Slot 读 `## Slot` 段 → 知道每 slot 的 observe/operate/refs
4. 最后读 `## Context Template` → 知道 context.md 怎么组装
5. Use refs 的 Asset 文件按"术语 → Axiom 段落级"读，**不读全文**（避免 token 浪费）

### 2.3 L3 回源三路

```text
术语 / 边界约束    →  .openxenon/assets/domains/<domain>.md#<axiom-id>
决策 / 规范        →  docs/rfc/zh-cn/RFC-XXXX-<theme>.md
命令用法           →  docs/product/zh-cn/reference/cli-user-guide.md
```

**回源优先级**：术语冲突 → Domain（裁决档 1）；规范疑问 → RFC（仅解释）；CLI 用法 → cli-user-guide。

## 3. 裁决规则（2 档）

### 档 1 · 定义性 SSOT

`.openxenon/assets/domains/*.md`

- 结构：`## Group → ### Axiom → - Theorem`
- 承载：术语定义、边界硬约束、路由引用
- 涵盖：旧 5 级优先级 1-4 级内容
- 改术语：直接修 Domain 文件 Axiom；不通过 glossary/docs 间接改

### 档 2 · 行为规则兜底

`AGENTS.md`

- 承载：Agent 行为规则、加载链索引、入口指针、意图解析流程
- 改规则：直接修本文件；走 PR review

### 仅解释性参考（无约束力）

- `docs/rfc/zh-cn/`（规定性讨论）
- `docs/product/zh-cn/concepts/glossary.md`（术语对外镜像）
- `docs/` 其余

> docs/ 改不改术语都行，但**真改术语必须同步 Domain**（`bun scripts/sync-domain-glossary.ts`）。

### 裁决示例

- "ProbeOutcome 三态是哪些？" → 查 `oxn-proof-domain.md §ProbeOutcomeThreeStates`（档 1）
- "CLI `oxn work inject` 怎么用？" → 查 cli-user-guide（仅解释，档外）
- "Work lock 后能不能改 context.md？" → 查 `AGENTS.md §Agent 行为规则`（档 2）+ `oxn-asset-domain.md §PlanLockFiveHash`（档 1）

## 4. 文档场域定位

| 场域 | 路径 | 加载链角色 |
|---|---|---|
| **Meta 层** | `AGENTS.md` / `README.md` / `.changes/` / `dev/` | L0 入口 |
| **Asset 定义层** | `.openxenon/assets/{domains,workflows,stacks,blueprints,assetmaps}` | L1 路由 + L2 闭包 + L3 术语 |
| **Skill SSOT** | `packages/cli/src/skills/locales/` | L-1 分发（编译到 `.opencode/skills/`） |
| **RFC 规范** | `docs/rfc/zh-cn/RFC-XXXX-<theme>.md` | L3 决策（仅解释） |
| **产品手册（外部）** | `docs/product/{zh-cn,en}/` | 外部参考（未来独立 repo → URL 引用） |
| **开发手册（内部）** | `docs/dev/{zh-cn,en}/` | 仓库内部手册（不进 VitePress 构建，参考用） |
| **ADR 历史** | `docs/adrs/` | 决策历史溯源（仅考古） |
| **Draft 流动层** | `.openxenon/drafts/` | 探索稿 / 设计稿 / 调研报告 |
| **运行时数据** | `.openxenon/{works,proofs,.cache}/` | gitignore；非加载 |

> **docs/ 独立化**：本仓库 `docs/` 已于 v0.7.0 拆为 Monorepo 下的独立文档包（`docs/package.json` + pnpm workspace 纳入）。未来 docs 独立成 repo 时，本文件 §2 加载链 L3 回源的 docs 引用从相对路径改为 URL。

## 5. 不参与加载链的文档

- `docs/concepts/_index.md` §阅读顺序 → 人类 VitePress 站点导航，**不参与** AI Agent 加载链
- `docs/product/zh-cn/_index.md` §阅读路径 → 人类 VitePress 站点导航
- `.openxenon/drafts/` 内文档 → 探索性稿；除非当前任务明确引用，否则不读
- `docs/adrs/` → 决策历史溯源（考古用），不是当前规范

## 6. 维护约定

1. **AGENTS.md 是 Meta 入口**——改加载链骨架必须先改本文件 §阅读与加载顺序段
2. **Domain 是术语 SSOT**——改术语必须先改 Domain；`bun scripts/sync-domain-glossary.ts` 自动同步 glossary
3. **dev/knowledge-loading.md 是加载链唯一正文**——变更需 PR review；历史改动登 `.changes/<version>-knowledge-loading.md`
4. **不要在 docs/product/ 写 AI Agent 接入内容**——docs 是对外正式手册；AI 入口由 Skill + AGENTS.md 承载
5. **Skill 是 OXN 对外入口**——改 Skill 走 `packages/cli/src/skills/locales/` SSOT → `bun run init -f` 编译
6. **RFC 是仅解释层**——不修改其他层；改裁决走 Domain / AGENTS.md
7. **本文件版本号中性**——本仓库规则不带版本号（已在 AGENTS.md §Agent 行为规则锁定）

---

## 附：版本沿革

| 版本 | 状态 | 变更 |
|---|---|---|
| v0.6.x | superseded | 4 套互不统一的"阅读顺序"（AGENTS.md 意图解析 / ai-entry.md / concepts/_index.md / SKILL AssetMap-driven）；5 级语义优先级含 CONTEXT-MAP |
| v0.7.0 | **current** | RFC-0028 §D1 撤销 CONTEXT-MAP.md；RFC-0018 §D1 简化为 2 档裁决；本文件建立唯一加载链正文 |

> 详细沿革见：[`RFC-0018 §D1`](../../docs/rfc/zh-cn/RFC-0018-project-engineering-meta.html#d1) + [`RFC-0028`](../../docs/rfc/zh-cn/RFC-0028-context-map-deprecation.html) + [`.openxenon/drafts/design-doc-reading-order-convergence-2026-08-10.md`](../../.openxenon/drafts/design-doc-reading-order-convergence-2026-08-10.md)