# ADR-0027: Domain 作为 SSOT 的工程化治理

> **来源**：`docs_tmp/ssot-domain-1.md` (2026-06-17)
> **抽取日**：2026-07-04
> **状态**：Partially Adopted
> **影响层**：E1 Asset / Docs

## 决策

Domain 不只是 DSL 资产，也是 **SSOT（Single Source of Truth）**：领域知识 / 业务术语 / 不变规则的唯一权威来源。

### 治理要点

1. **文档强制标注 `domain:` frontmatter** — `docs/zh-cn/<page>.md` 必须声明所属 Domain
2. **新 Domain 创建走 Work 流程** — 不允许直接 `mkdir`
3. **覆盖率统计** — Domain 文档覆盖的所有 term / invariant 数量可度量
4. **冲突检测** — 同一 term 在不同 Domain 中定义不一致时，OXN 编译告警

## 当前状态

- ✅ Skill 三分（ADR-0026）
- ⚠️ 文档 frontmatter 强制未落实（当前仅建议）
- ⚠️ Domain 冲突检测未实现
- ⚠️ 覆盖率统计未实现

## 候选落地

- `docs/zh-cn/core-concepts.md` §Domain 作为 SSOT 段落
- v0.7-emergence RFC：Anchor/Slot 文档绑定机制

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-17-ssot-domain-1.md`