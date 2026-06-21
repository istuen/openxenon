---
name: req-md-ssot
version: 0.3.0
type: requirement
status: current
author: opencode
date: 2026-06-20
---

# Requirement: v0.3.0 MD-SSOT 体系

> **版本**：v0.3.0
> **状态**：current
> **目的**：定义 v0.3.0 阶段要解决的需求
> **关联**：[`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) | [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) | [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md) | [`product-md-ssot-overview-v0.3.0.md`](./product-md-ssot-overview-v0.3.0.md)

---

## 1. 背景

v0.2.0 冻结时（commit `5b81e8d` + tag `v0.2.0`）暴露三个核心问题：

1. **OXL 强结构保护丢失风险**：当前 OXL 是 Langium DSL，LLM 写自定义语法出错率高
2. **文档系统碎片化**：8 个 CHANGELOG、4 类目录（forges/docs/.changes/openspec）、2 个版本管理 scripts
3. **设计文档无归宿**：51 个 forges/ 文档需迁出，但无明确目标位置

详细背景：`.openxenon/pools/design/md-ssot-system.md` §0 摘要。

---

## 2. v0.3.0 核心需求（5 个）

### R1. mdast 替代 Langium（核心）

**现状**：OXL 是 Langium DSL，AI 学习成本高，错误率高
**目标**：
- 全部 IAP 实体（Domain/Blueprint/Work/Task/Proof）用 MD 表达
- `unified + remark + mdast` 全栈替代 Langium 解析器
- 5 类 `E_MD_xxx` 错误校验保留 Langium 强结构保护
- 双轨期过渡（.oxn + .md 并存），保证 v0.2 兼容性

**验收标准**：
- [ ] `src/oxl/md-bridge/remark-to-kernel.ts` 实现
- [ ] 14 builtin probe 全部读 mdast（渐进替换）
- [ ] 现有 1393 测试全绿
- [ ] 5 类 E_MD_xxx 校验覆盖 v0.2 全部错误场景
- [ ] `:::intent` Container Directives 语法在 Notion/GitHub 部分支持

### R2. pools/ 5 池内容填充（业务）

**现状**：5 个池目录（research/design/issue/audit/journal）已建但内容为空
**目标**：
- 51 forges/ 文档全部迁移到 `pools/<type>/<doc>.md`
- 现有 14 个 .oxn 资产（domains/） MD 化（部分）
- 现有 5 个 .oxn 资产（blueprints/） MD 化（部分）
- 现有 9+ 个 work MD 化（部分）
- 现有 3+ 个 proof verdict MD 化

**验收标准**：
- [ ] forges/ 物理删除（保留 `_archive/2026-06-forges/` 备份）
- [ ] pools/ 下 5 池至少各 5 个 entry
- [ ] `oxn pool create` 流程验证（v0.2.0 已有 CLI）
- [ ] `oxn pool list` 输出全部 5 池 + 总数
- [ ] `scripts/migrate-forges.ts` 自动化脚本

### R3. version:aggregate/release 自动化（流程）

**现状**：8 个 CHANGELOG.md + 60 个 .changes/ 片段，无自动聚合
**目标**：
- `scripts/version-aggregate.ts`：从 `.openxenon/**` 自动聚合 CHANGELOG
- `scripts/version-release.ts`：5 步原子化（check + aggregate + release + tag + archive）
- `scripts/audit-completeness.ts`：每个 work 的 4 层 IAP 完整性审计
- `scripts/check-naming.ts`：命名规范校验

**验收标准**：
- [ ] `version:aggregate` 从 5 类目录聚合，生成 `design/changelog/v0.X.md`
- [ ] `version:release` 一键发版（5 步原子化）
- [ ] `version:check` 验证 package.json vs `.openxenon/**` 一致
- [ ] `audit:completeness` 输出每个 work 缺失项报告
- [ ] 现有 60 .changes/ 片段重组为 pools/audit/ 历史归档

### R4. forges/ 物理删除（清理）

**现状**：forges/ 51 文档 + 20 sprints/ 在物理目录，gitignored
**目标**：
- 阶段 5 物理删除 `forges/` 目录
- 保留 `_archive/2026-06-forges/` 永久备份
- 调整 .gitignore（删除 `forges/` 行）
- openspec/ 物理删除（如有遗留）

**验收标准**：
- [ ] forges/ 目录已 `rm -rf`
- [ ] _archive/2026-06-forges/ 备份完整
- [ ] .gitignore 不再含 `forges/` 行
- [ ] git log 中 forges/ 历史完整
- [ ] lefthook 移除 forges/ 相关守卫

### R5. oxn-md CLI 完整化（端到端）

**现状**：`oxn domain/blueprint/work/proof/pool create` 5 类 CLI 已实施
**目标**：
- 所有 `--md` flag：domain/blueprint/work/proof/pool 创建 MD 格式资产
- `oxn-md` 独立子命令族：domain --md / blueprint --md / work --md / proof --md / pool --md
- `oxn-md-renderer`：把 `:::intent` 块渲染为 Notion/GitHub 友好 HTML
- oxn-vscode 扩展基于 remark 重建（替代 Langium LSP）

**验收标准**：
- [ ] `oxn domain --md` 创建 `*.md`（不是 `.oxn`）
- [ ] `oxn-md-renderer` 转换 `:::intent` 为可视化
- [ ] oxn-vscode 扩展（基于 remark）发布到 marketplace
- [ ] GitHub 渲染 `:::intent` 块（不破坏 MD）

---

## 3. 非功能需求

| 维度 | 需求 |
|---|---|
| **性能** | 1MB MD 文件扫描 + 解析 < 500ms（aggregate）|
| **兼容性** | 现有 1393 测试全绿；T10/T11/T12 done 任务无回归 |
| **可读性** | AI + 人类都能读 + 写（MD 通用格式）|
| **可维护** | .gitignore / lefthook / scripts 完整 |
| **国际化** | 现有双语支持保留（zh-CN + en）|

---

## 4. 范围外（v0.3 不做）

- ❌ 跨平台 binary 矩阵（v0.1.0 决策为 0）
- ❌ 三方集成（GitHub Issues / Linear / Jira）
- ❌ Multi-language 资产（除 zh/en 外）
- ❌ `oxn-intent` 新 skill（v0.4 议题）
- ❌ oxn-md-renderer 完整版（v0.3 仅基础）

---

## 5. 风险

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Langium 删除导致 IDE 体验降级 | 中 | 高 | 阶段 4 重建基于 remark 的 LSP |
| `:::intent` 不被 GitHub/Notion 渲染 | 高 | 中 | 阶段 6 写 oxn-md-renderer |
| 14 probe 重写回归 | 中 | 高 | 阶段 2 双轨期 + 1393 测试守住 |
| 5 类 E_MD_xxx 不覆盖所有 Langium 保护 | 低 | 高 | 阶段 4 全量测试覆盖 |
| forges/ 迁移遗漏 | 中 | 中 | 阶段 3 强校验 + 备份 _archive/ |
| v0.2.0 未发版到 npm | 中 | 中 | v0.2.1 patch 立即发版 |

---

## 6. 验收 checklist（跨阶段）

- [ ] R1 阶段 1 验收：mdast 解析器 + 5 类 E_MD_xxx
- [ ] R2 阶段 3 验收：pools/ 5 池至少各 5 entry
- [ ] R3 阶段 4 验收：5 个 scripts + lefthook 集成
- [ ] R4 阶段 5 验收：forges/ 物理删除
- [ ] R5 阶段 6 验收：oxn-md CLI 完整化

---

**关联文档**：
- [`arch-md-ssot-v0.3.0.md`](./arch-md-ssot-v0.3.0.md) — 架构设计
- [`dev-design-md-ssot-v0.3.0.md`](./dev-design-md-ssot-v0.3.0.md) — 实施路径
- [`test-design-md-ssot-v0.3.0.md`](./test-design-md-ssot-v0.3.0.md) — 测试设计
- [`product-md-ssot-overview-v0.3.0.md`](./product-md-ssot-overview-v0.3.0.md) — 产品视角
- [`v0.3.0-roadmap.md`](../v0.3.0-roadmap.md) — 路线图
