---
version: 0.6.2-alpha.0
date: 2026-07-26
type: alpha
status: alpha
---

# 0.6.2-alpha.0 — RFC 迁移 + 文档三情态分离 + 术语对齐

## 核心改动

### RFC 迁移（ADR + OXP → RFC）
- 48 Adopted ADR + 4 meta-RFC（grilling 决策）→ 12 RFC 文件，落盘 `docs/rfc/zh-cn/`
- 8 主题 RFC：RFC-0001 OXL/Blueprint / RFC-0002 Kernel-L0 / RFC-0003 AI 协作 / RFC-0004 Work-Asset / RFC-0005 Insight-Skill / RFC-0006 Docs-Brand / RFC-0007 Domain 词汇与 OXN 定位 / RFC-0008 命名与演进策略
- 4 meta-RFC：RFC-0009 文档三情态分离 / RFC-0010 frozen+errata / RFC-0011 内置 Asset 两层 / RFC-0012 自举种子豁免
- 72 ADR 文件物理移动到 `.openxenon/.archived/docs/adrs/`，并在 `docs/adrs/` 创建镜像供 RFC 引用
- 废除 3 条 OXP（内容合并到对应 RFC）

### 文档三情态分离
- **定义性情态（Asset）**：`.openxenon/assets/` —— 回答 "X 是什么"
- **规定性情态（RFC）**：`docs/rfc/zh-cn/` —— 回答 "为什么决定 X"
- **描述性情态（Doc）**：`docs/{product,dev}/` —— 回答 "怎么用 X"
- 跨层引用规则：docs 内部互引 ✅，docs → .openxenon ❌（严格隔离）
- 新增 `oxn-project-domain.md`（第 8 个 Domain）：RFC / Built-in Asset / Starter Asset / 三情态 / 自举种子豁免

### Engine 改动
- `OxnBuiltinRegistry` 从硬编码 mock 改为从 `src/builtin/**/*.md` 加载（mdast pipeline）
- 修复 4 probes inconsistency：4 → 15 probes + 0 → 3 blueprints
- 删除 3 phantom parts（无 .md 文件）
- 修复 stale path：`oxn-scope.ts` `.openxenon/arsenals/` → `.openxenon/assets/`

### 文档边界守门
- `scripts/check-doc-boundary.ts` 扩展：
  - B1：扫描 YAML frontmatter `related` 字段
  - B2：去除 targetPattern `^` 锚点（抓错误相对路径）
  - B3：取消 `.archived` 目标豁免
- lefthook pre-commit 启用 boundary checker

### 术语对齐
- TrustClosure → MinimumClosure
- 旧 OXP-XXXX → RFC-XXXX（编号）
- ProbeVerdict → ProbeOutcome（v0.7.3 计划，本版预对齐）

## 影响范围

- **测试**：1630 pass / 0 fail / 3 intentional skip
- **构建**：`bun run typecheck` / `bun test` / `bun run docs:build` / `bun run lint` / `bun scripts/validate-dependencies.ts` 全部通过
- **边界检查**：0 violations（真实 0，非盲区假象）

## 关联文档

- `.openxenon/drafts/rfc-migration-master-plan.md` — 迁移总计划（Phase 0-6）
- `.openxenon/drafts/rfc-migration-remediation-plan.md` — 收尾修复（Step 1-5）
- `.openxenon/drafts/version-convergence-plan.md` — 版本收敛（V1-V8）