---
entity: rfc
id: RFC-0005
theme: insight-skill
version: 1.0.0
status: Accepted
date: 2026-07-26
supersedes: []
superseded-by: ~
related:
  - ADR-0018: .openxenon/drafts/rfc/0018-lsp-readonly-fork-atomic-cli-proxy.md
  - ADR-0074: .openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md
synced-at: 2026-07-26
---

# RFC-0005: Insight 原料提供者非推理引擎 + Skill 三分发

> **类型**：RFC（OpenXenon 规范）
> **主题**：insight-skill
> **状态**：✅ Accepted（核心冻结，仅可追加 errata 段）
> **批次**：2026-07-26 v0.7 RFC 首批 promote（Phase 2）

## 摘要

Insight（E4 涌现层）的架构边界：OXN Engine 提供统计原料（确定性 floor），AI Agent 主动请求原料并自己推理（ceiling 不限）。OXN 不做推理、不做 critic、不做 learning element。学习在 OXN 系统里是分布式的——AI transient / 工程师持久 / OXN 桥接。同时确立 Skill 三分发（oxn-intent / oxn-align / oxn-proof）的 LSP readonly `@glo/` + Fork-to-Local + atomic-index + CLI proxy 四原则。

## 决策要点

### D1：Insight 推理主体是 AI，不是 OXN

OXN Engine 不做推理 / critic / learning element。OXN 提供跨 Work 的 pattern 数据、Probe 历史统计、Citation 网络等原料；AI Agent 主动请求 `oxn insight` 并自己推理出建议。

| 模型 | OXN 做什么 | AI 做什么 |
|---|---|---|
| ❌ 错误（越界） | 统计学习 + 推理建议 | 读建议 |
| ✅ 正确（本 RFC） | 提供统计原料（确定性数据） | 请求原料 + 自己推理建议 |

**机制**：AI Agent 请求 `oxn insight` 获取不同方式的信息，再做推理建议。推理能力随 LLM 能力升级而升级，OXN 只保证原料确定。

### D2：四判据验证

| 判据 | Insight 设计 | 通过？ |
|---|---|---|
| 1. 补偿方向 | OXN 提供确定数据（补偿 agent 非确定） | ✅ |
| 2. agent 级别 | OXN 不做 utility 推理（不进 type 4） | ✅ |
| 3. floor/ceiling | OXN 提供统计 floor，AI 推理是 ceiling 不限 | ✅ |
| 4. 路径判据 | OXN 提供数据不评价路径好坏 | ✅ |

### D3：分布式学习模型

| 主体 | 学习形态 | 特性 |
|---|---|---|
| AI Agent | 上下文内 transient 学习 | 学快但忘快（窗口外就忘） |
| 工程师 | 持久学习（沉淀 Asset） | 学慢但持久（Asset 冻结可累积） |
| OXN Engine | 桥接层（不学习） | 提供统计原料把 AI transient 模式转成工程师可读 pattern |

OXN 不学习（确定性程序，不更新自身逻辑）。

### D4：双向闭环

Asset 是双向枢纽：
- **正向**（学习链）：工程师经验 → Asset → Work context → AI 执行 → Insight 统计 → 工程师学习
- **反向**（赋能链）：工程师沉淀 Asset → AI 从 Asset 获取更优边界 → AI 推理效能提升

### D5：Skill LSP 四原则（ADR-0018）

1. **readonly `@glo/`**：`~/.openxenon/arsenals/` 下的全局 builtin / 用户全局资产在 LSP 视角下是只读；用户修改需 "Fork to Local"（复制到 `@prj/` 变可编辑）
2. **CLI Proxy 模式**：`VS Code → oxn lsp → spawn 纯 Node lsp-server.js（不依赖 Bun）`——LSP server 必须能在 Bun 之外独立启动
3. **Atomic Index**：资产索引（completion / hover / definition 数据）必须原子替换——写 tmp 文件 + rename，禁止 in-place mutate
4. **降级启动**：LSP 启动时如遇解析失败，不阻断，只对该文件标记为 `unresolved`，其余功能正常

### D6：实现约束

Insight 具体统计算法 / ML 模型 / 查询接口待 v0.7+ 探索——**任何让 OXN 自己做推理 / 评判 / 学习的实现都越界**（实现边界已定，具体实现待探索）。

## 影响范围

- ✅ ADR-0018（2026-05-21 落地）+ ADR-0074（2026-07-23 落地）Accept
- ✅ LSP readonly + atomic-index + CLI proxy 已在 L3 CLI 实现
- ✅ Insight 原料接口设计是关键（v0.7+ Insight RFC 核心工作）
- 📝 Skill 三分发（oxn-intent / oxn-align / oxn-proof）由 ADR-0026 单独定义（属 RFC-0004）

## 相关术语

- [Insight](/glossary/zh-cn/insight-terms.html#insight) — E4 涌现层
- [Asset](/glossary/zh-cn/asset-terms.html#asset) — 双向枢纽
- [Work](/glossary/zh-cn/work-terms.html#work) — AI 执行入口
- [Probe](/glossary/zh-cn/proof-terms.html#probe) — 统计原料来源之一
- [Skill](/glossary/zh-cn/cli-terms.html#skill) — OXN 内置给 AI 助手的技能

## 相关决策

- [ADR-0018](../../.openxenon/drafts/rfc/0018-lsp-readonly-fork-atomic-cli-proxy.md) — LSP 四原则（2026-05-21）
- [ADR-0074](../../.openxenon/drafts/rfc/0074-insight-ingredient-not-reasoner.md) — Insight 架构边界（2026-07-23）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0005 Accepted 起冻结。