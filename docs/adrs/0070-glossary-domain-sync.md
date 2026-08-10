---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-22
supersedes: null
superseded-by: null
related:
  - RFC-0028
  - .openxenon/assets/domains/
  - docs/glossary/zh-cn/
  - .openxenon/assets/workflows/doc-author.md
---

# ADR-0070: Glossary ↔ Domain 同步机制

> **状态**：✅ Accepted
> **日期**：2026-07-22
> **来源**：2026-07-22 grilling session（domain-modeling skill）
> **影响层**：术语一致性 + 文档维护约定

## Context

**核心问题**：Domain 是术语 SSOT（Single Source of Truth），但 glossary 是外部手册可见表。当前两者**无同步机制**，导致：

1. ADR-0066/0067 术语精简后，Domain 文件已修正（oxn-proof-domain inv-9/inv-10 重写、Verdict 删除等），但 glossary/zh-cn/proof-terms.md 仍写 "Verdict" / "PASSED/FAILED" / "判决书"
2. Roadmap 14 个 Domain 引用全指 archived——Domain 重构后没有任何机制同步到下游
3. OXP Promote 后的 RFC（如本次首批）需要在 glossary 中体现

历史症状（2026-07-22 现状）：
- 7 个 glossary 文件全部脱节于 Domain SSOT
- doc-author.md constraints 有"词汇禁用旧词"清单但**无上游同步触发**
- CI 无 glossary 同步检查

## Decision

### D1: 双层同步原则

```
Domain（SSOT）  ──manual review──>  Glossary（外部手册可见）
     ↑                                    ↓
     └────────CI check（双向）────────────┘
```

- **Domain → Glossary**：手动 review + 工具辅助（CLI 命令）
- **Glossary → Domain**：禁止反向引用——glossary 是 Domain 的下游投影
- **CI 守卫**：双向一致性检查，drift → fail build

### D2: Domain → Glossary 同步流程

#### 流程 A：新增术语时

1. 工程师在 `.openxenon/assets/domains/oxn-*-domain.md` 新增 H3 term
2. 跑 `oxn glossary sync --from-domain` 自动生成 glossary 草稿
3. 工程师 review + 编辑（glossary 是"通俗化措辞"，可以比 Domain 更易读）
4. commit：`docs(glossary): sync from oxn-*-domain.md`

#### 流程 B：修改术语时

1. 工程师修改 Domain H3 term
2. 跑 `oxn glossary diff --domain oxn-proof-domain` 显示 glossary 漂移
3. 工程师更新 glossary 对应 term
4. commit 同上

#### 流程 C：废弃术语时

1. Domain H3 删除（标 deprecated 或直接删）
2. glossary 对应 term 删除（如果是废弃）
3. `_index.md` "词汇同步约定"段追加废弃说明（如 ADR-0066/0067 已做）

### D3: 同步工具 `oxn glossary`

新增 CLI 子命令：

```bash
# 从 Domain 生成 glossary 草稿
oxn glossary sync --from-domain [--dry-run]

# 显示 glossary 与 Domain 的漂移
oxn glossary diff --domain oxn-proof-domain

# 校验 glossary ↔ Domain 一致性（CI 用）
oxn glossary check [--strict]

# 按术语分类聚合（生成 _index.md 用）
oxn glossary aggregate
```

### D4: CI 守卫

新增 `scripts/check-glossary-sync.ts`：

```yaml
checks:
  - glossary 中每个 H3 term 必须在某个 Domain 存在
  - Domain 中每个 H3 term 必须在对应 glossary 中存在
  - 废弃术语（Domain 中标 deprecated）必须从 glossary 删除
  - 词汇禁用旧词清单必须在 glossary 中无残留

on-fail:
  - exit 1 + 提示具体漂移 term 列表
  - 不阻断 merge（warning only）——glossary 是文档，不阻断代码
```

### D5: Glossary 文档约定

`docs/glossary/zh-cn/_index.md` 顶部"词汇同步约定"段必须包含：
- 当前 Domain 版本号 + synced-at 日期
- 最近一次术语精简记录（链接 ADR）
- "词汇禁用旧词"完整清单（从 doc-author.md 同步）

每个 glossary term 文件（`{category}-terms.md`）：
- 顶部 frontmatter：`synced-at: YYYY-MM-DD` + `source: oxn-*-domain.md`
- 禁止新增 Domain 中不存在的 term
- 禁止保留 Domain 已废弃的 term

## Consequences

### 正面

- **术语一致性可验证**——CI 检查替代人工 review
- **glossary drift 可检测**——`oxn glossary diff` 显示具体漂移
- **术语精简可追溯**——ADR + _index.md "词汇同步约定" 形成审计链
- **文档先行原则落实**——glossary 用 Domain SSOT 新术语，代码后跟（ADR-0066/0067 已说明）

### 负面 / 风险

- **glossary 需要通俗化措辞**——不能机械同步，需工程师 review
- **CI 工具实现成本**——`oxn glossary` 子命令需新增 CLI 实现
- **历史 drift 一次性清理工作量大**——本次 7 个 glossary 已手动同步，但需建工具防止复发

### 衍生

<!-- allow-version -->
- **scripts/check-glossary-sync.ts** 实现 CI 守卫（v0.7.4 计划）
- **oxn glossary CLI 子命令**实现 D3（v0.7.4 计划）
- **ADR-0066/0067 同步记录**——已在 _index.md "词汇同步约定"段落地
- **oxn-vscode** Markdown 插件可集成 glossary check（v0.8 计划）
<!-- /allow-version -->

## Alternatives Considered

- **glossary 完全自动从 Domain 生成**：可行但损失通俗化措辞。否决——保留 review 步骤
- **废弃 glossary，由 Domain 直接对外**：Domain 是 SSOT 但含实现细节，不适合对外。否决
- **glossary 仅在每次 Domain 变更时手动同步**：可行但易遗忘。否决——加 CI 守卫
- **CI 严格 fail（glossary drift 阻断 merge）**：过严，可能阻断紧急 fix。否决——改为 warning only

## References

- [AGENTS.md](../../../../AGENTS.md) — 唯一 Meta 层入口（v0.7+ RFC-0028 撤销 CONTEXT-MAP.md）
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — 废弃词清单
- [ADR-0067 彻底不判贯彻](./0067-no-judgment-principle.md) — 三态改名
- [doc-author.md constraints](../../../assets/workflows/doc-author.md) — "词汇禁用旧词"清单同步源
- [oxn-proof-domain.md](../../../assets/domains/oxn-proof-domain.md) — Domain SSOT 实例