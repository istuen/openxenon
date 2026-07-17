# ADR-0033: IAP 对外命名分歧（Intent/Align/Verify vs "出证明"）

> **来源**：`docs_tmp/refactor-1.md` (2026-06-28)
> **抽取日**：2026-07-04
> **状态**：Superseded（保持"出证明"对外命名）
> **superseded-by**：v0.6.1 命名统一（"出证明"成为正式对外命名）
> **影响层**：Brand / Docs 命名

## 决策

OXN **对外保持** "**工程师定意图，AI 跑对齐，OXN Engine 出证明**" 三段式命名（"出证明" 通俗化），**不对外**用 "Intent/Align/Verify"。

## 内部 vs 对外

| 维度 | 内部 | 对外 |
|---|---|---|
| 命名 | Intent / Align / Proof | 意图 / 对齐 / 出证明 |
| 受众 | 工程师 + AI | 工程师 + 路人 |
| 目的 | 精确语义 | 通俗易懂 |

## 反提案（已否决）

refactor-1 提出对外改为 "Intent/Align/Verify"（Proof 通俗化为 Verify）。

### 否决理由

- "出证明" 已经在 instruction.md / v0.6 RFC / 多处 docs 落地
- 改名带来 docs 全量更新成本
- "Proof" 在工程语境（法律 / 数学证明）有精确含义，不算术语壁垒

## 候选落点

- 不动现状，记录本 ADR 备查

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-28-refactor-1.md`