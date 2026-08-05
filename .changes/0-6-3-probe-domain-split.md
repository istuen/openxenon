---
version: 0.6.3
prerelease: false
date: 2026-08-05
type: refactor
scope: domain-split-probe
status: shipped
---

# 0.6.3: Probe Domain 拆分 —— OxnProbeDomain 独立

## 主题

把 Probe / ProbeOutcome / InterferenceFlag / outcome / useName / probeName 从 `oxn-proof-domain.md` 抽出到独立 `oxn-probe-domain.md`。来源：2026-08-05 术语收敛探查（用户 4 轮修正反馈）。

## 决策概要

| 决策 | 选定 |
|---|---|
| 业务场景名 | `useName`（Probe 5 层命名分离） |
| Probe 本体名 | `probeName`（从 ref 派生） |
| `probes` 结构 | 保留容器 + useName 作 key（强约束唯一性） |
| aggregate 字段 | `summary` 容器包裹 outcome + 计数 |
| `outcome` 字段 | 仅 Probe 内部专用；aggregate 禁止直接用 |
| Domain 拆分 | Probe Domain 独立（oxn-probe-domain.md） |
| Schema 字段对照表 | 放 Probe Domain |
| 目标 frozen.json 结构 | 写目标结构（计划中，非当前实现） |
| 迁移路径 | 不写（后续直接删旧） |

## 范围

### 新增

**Domain 文件**：

- `.openxenon/assets/domains/oxn-probe-domain.md`（v0.1.0, 154 行）
  - 5 Term：Probe / ProbeOutcome / useName / probeName / InterferenceFlag
  - 4 Invariant：inv-26 / inv-27 / inv-28 / inv-29
  - 2 Bans：judge-words / aggregate-conflict
  - Schema Field Mapping 表（5 层命名 → 字段对照）
  - Target frozen.json Structure（计划中目标结构）

### 修改

**Domain 文件**：

- `.openxenon/assets/domains/oxn-proof-domain.md`（v0.3.0 → v0.4.0）
  - frontmatter `references` 追加 `oxn-probe-domain`
  - 删除 5 个迁移到 Probe Domain 的 Term：Probe / ProbeOutcome / outcome / Boundary Deviation / InterferenceFlag
  - `Proof` 描述收窄（去掉"5 义"列举，收窄到 Domain 概念）
  - `outcome` 描述重写为 aggregate 专用（`summary` 容器）
  - Bans 移除 Boundary Deviation（已在 Probe Domain）

**脚本**：

- `scripts/sync-domain-glossary.ts` 修复：多行 `desc: |` YAML block scalar 续行现在能正确捕获（之前只取首行 → 显示 `— |` 截断）

**Glossary（自动同步）**：

- `docs/product/zh-cn/concepts/glossary.md` 由 `scripts/sync-domain-glossary.ts` 自动重建
  - Probe / ProbeOutcome / probeName / useName / InterferenceFlag 现在 source 是 `oxn-probe-domain`
  - outcome 仍 source `oxn-proof-domain`（Proof 聚合专用）

### 新增 Invariants

| # | 内容 |
|---|---|
| inv-26 | Probe 5 层名都在 Probe Domain 内（probeName=本体名, useName=业务场景名, ref, probeType, file） |
| inv-27 | `outcome` 字段 Probe 专用；aggregate 必须用 `summary` 容器 |
| inv-28 | InterferenceFlag canonical；Taint / Boundary Deviation 永久 ban |
| inv-29 | Probe 3 态拼写分层是设计（human lowercase / json uppercase -ED / TS uppercase 无 -ED） |

### 不做（明确边界）

- ❌ 不改 `proof-schema.ts`（schema 改动 = 单独 PR）
- ❌ 不改 `proof-frozen-writer.ts`
- ❌ 不改 `outcome-writer.ts`
- ❌ 不改 `PROOF_VERDICT_MD` 别名（方案 E 独立 PR）
- ❌ 不改 `passed` 字段（legacy 兼容）
- ❌ 不清 `Taint` 注释残留（13 处，独立 PR）
- ❌ 不统一 `干扰` vs `干涉` 中文（已在 Probe Domain Ban，落地另开 PR）

## 相关资源

- **Draft**：`/Users/issac/pro/openxenon/.openxenon/drafts/design-probe-domain-split.md`
- **新 Domain**：`/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-probe-domain.md`
- **修改 Domain**：`/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md`
- **Glossary**：`/Users/issac/pro/openxenon/docs/product/zh-cn/concepts/glossary.md`

## 后续 PR（独立）

1. `proof-schema.ts` 实施目标结构（`probes` 改 object + `summary` 容器）
2. `proof-frozen-writer.ts` 写入器对应调整
3. `outcome-writer.ts` 渲染对应调整
4. 清 `Taint` 注释残留（13 处）
5. 清 `Boundary Deviation` 业务引用
6. 统一 `干扰` vs `干涉` 中文

## 守门

- `bun scripts/check-doc-boundary.ts` ✅
- `bun scripts/sync-domain-glossary.ts --write` ✅
