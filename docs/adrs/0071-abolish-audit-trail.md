---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-23
supersedes:
  - ADR-0051
superseded-by: null
related:
  - .openxenon/drafts/rfc/0051-asset-paper-citation-network.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - .openxenon/drafts/rfc/0066-terminology-simplification.md
---

# ADR-0071: 废除 auditTrail 字段——Asset Paper 从 4 字段降为 3 字段

> **状态**：✅ Accepted
> **日期**：2026-07-23
> **来源**：2026-07-23 术语精简立法（P1 phase audit）
> **影响层**：L1-Infra（Asset IO）+ L2-Engine（Asset schema 校验）+ Domain SSOT

## Context

**核心问题**：ADR-0051 定义了 Asset Paper 4 字段结构（`abstract` + `references` + `citations` + `auditTrail`）。审计发现 `auditTrail` 字段在实际代码中是 **fail-open 设计**——只 warn 不阻断，且无任何消费者读取它。

**审计发现**（2026-07-23）：

1. **fail-open 语义**：`auditTrail` 缺失时代码只发 warn，不阻断 Asset 创建/演进——等于"建议字段"而非"必填字段"
2. **无消费者**：全代码库没有任何代码读取 `auditTrail` 字段做决策（无渲染、无校验、无索引）
3. **26/29 文件没有它**：29 个 Asset 文件中仅 3 个手动写了 `auditTrail`，其余 26 个均缺失——说明它从未被强制执行
4. **git 已提供版本历史**：`auditTrail` 的语义（"谁、何时、改了什么"）完全由 git log + commit message 覆盖，Asset 文件内重复记录是冗余
5. **ADR-0066 术语精简**已废弃 `AuditChain` / `Taint` 等叙事层冗余术语，`auditTrail` 是该精简运动的遗留

**当前状态**：
- Domain `oxn-asset-domain.md` inv-4 已从 "4 字段必填" 降为 "3 字段必填"
- Domain bans 列表已删除 `missingAuditTrail`
- `AssetPaper` Term desc 已改为 "3 字段不变量"
- `AssetFrontmatter` Term desc 已删除 `auditTrail`

## Decision

### D1: 废除 `auditTrail` 字段

Asset Paper schema 从 4 字段降为 **3 字段**：

```
# Before (ADR-0051)
abstract + references + citations + auditTrail

# After (ADR-0071)
abstract + references + citations
```

`auditTrail` 不再是 Asset schema 的合法字段。

### D2: 版本历史职责归 git

Asset 的版本演进记录由 **git log + commit message** 承担：
- `git log --oneline -- .openxenon/assets/{kind}/{name}.md` 查看变更历史
- `git blame .openxenon/assets/{kind}/{name}.md` 查看逐行作者
- commit message 约定 `docs(asset): evolve {name} — {reason}` 提供变更原因

OXN 不在 Asset 文件内重复记录版本历史。

### D3: ADR-0051 标记为 Superseded

ADR-0051 中关于 `auditTrail` 的部分（§决策第 4 条 + §学术论文↔Asset 映射表第 6 行 + §Asset Paper 模板 `auditTrail:` 段）被本 ADR 取代。ADR-0051 的其余部分（`abstract` + `references` + `citations` + DAG 校验 + 引用计数算法）仍然有效。

### D4: 代码 fail-open 降级为 noop

<!-- allow-version -->
现有 `auditTrail` 相关代码（warn 逻辑）改为 noop——不读、不写、不 warn。v0.8.0 可物理删除残留代码路径。
<!-- /allow-version -->

### D5: 不做数据迁移

现有 3 个 Asset 文件中的 `auditTrail` 字段不主动删除（YAGNI）：
- 解析器忽略未知 frontmatter 字段（已有行为）
- 下次 Asset 演进时自然清除
- 强制迁移的成本 > 收益

## Consequences

### 正面

- **Schema 更简洁**——3 字段比 4 字段更易记忆和维护
- **单一职责**——版本历史归 git（工具原生），Asset 文件只承载语义边界
- **消除 fail-open 矛盾**——不再有"声明必填但实际不强制"的字段
- **与术语精简一致**——`auditTrail` 是 ADR-0066 废弃的 `AuditChain` 概念的残留字段

### 负面 / 风险

- **ADR-0051 部分失效**——需读者知道 4→3 字段的演进
- **离线场景丢失版本历史**——无 git 环境时无法查看 Asset 变更记录（可接受：OXN 项目天然是 git 仓库）

### 衍生

<!-- allow-version -->
- v0.8.0 可物理删除 `auditTrail` 解析代码路径
<!-- /allow-version -->
- `oxn asset check` CLI（ADR-0069）实现时应校验 3 字段而非 4 字段
- Asset 模板文件（`assets/{kind}.md` 模板）应移除 `auditTrail` 示例

## Alternatives Considered

- **保留 auditTrail 但强制必填**：成本高（需补全 26 个文件的缺失数据），收益低（git 已覆盖语义）。否决
- **保留 auditTrail 作为可选字段**：维持 fail-open 现状，但 schema 中"可选字段"模糊了 Paper 结构的严肃性。否决
- **用 OXN 自己的 commit log 替代 git log**：重复造轮子。否决——git 是 SSOT

## References

- [ADR-0051 Asset Paper 引用网络](./0051-asset-paper-citation-network.md) — 原始 4 字段定义（被本 ADR 部分取代）
- [ADR-0066 术语精简](./0066-terminology-simplification.md) — 废弃 `AuditChain` 等叙事层术语
- [oxn-asset-domain.md](../../assets/domains/oxn-asset-domain.md) — inv-4 已降为 3 字段
- [ADR-0069 Asset 自举完整性](./0069-asset-bootstrap-completeness.md) — `oxn asset check` 守卫应基于 3 字段
