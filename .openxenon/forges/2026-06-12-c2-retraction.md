# C2 修复点撤销: forges/ 双重身份澄清

> 日期: 2026-06-12
> 关联报告: `.openxenon/forges/2026-06-12-code-quality-pattern-and-logic.md` (C2)
> 决策: **撤销 C2 P0 修复** + 同步删除 `resolveForgeRoot` 死代码
> 状态: ✅ 已执行

## 1. 报告 C2 原描述

报告原文 (C2 章节):

> C2: `resolveForgeRoot` 返回错误路径 (`src/infra/paths.ts:28-29`)。Per AGENTS.md 明确说明 Forge 在 `.openxenon/forges/`，实际返回 `.openxenon/arsenal/drafts/`。

报告建议: 改 `resolveForgeRoot` 返回 `forges/` 目录。

## 2. 实际事实

通过 `ls .openxenon/` 与 `rg "forges"` 全仓溯源, 报告 C2 的论断基于**概念混淆**:

| 概念 | 实际身份 | 证据 |
|---|---|---|
| `.openxenon/forges/` | **设计文档目录** (跨 PR 工作笔记) | `AGENTS.md:81` + 18+ 个 `forges/2026-06-11-*.md` |
| `.openxenon/domains/` | **业务 Intent 资产** (DDD Domain) | `ls .openxenon/domains/*.oxn` 7 个 |
| `.openxenon/blueprints/` | **技术 Intent 资产** (Blueprint) | `ls .openxenon/blueprints/*.oxn` 10 个 |
| `.openxenon/arsenal/` 或 `.openxenon/arsenals/` | v0.0.x 时代已废弃的资产目录 (probes/blueprints/parts) | `src/infra/paths.ts:8` 注释 `// TODO(v1.1-path): 单点真相源` + 迁移文档 `2026-06-11-infra-v0-to-v1.1-state-diff.md` |

`.openxenon/forges/` 路径下是 **18+ 个设计文档**, 不是 `probes/blueprints/parts` 等 runtime asset。

**关键证据**:
- `src/hall/index.ts:87` `const forgesDir = join(projectRoot, 'forges')` 已经在 Hall 里扫 `forges/<type>` 探 asset — 这是**部分迁移**的过渡状态, 不是 forges/ 目录是 asset 路径的证据
- `intent-align-context.oxn:63` ban 列表含 `oxn arsenal` 旧命令, **确认 arsenal 概念已废弃**
- `2026-06-11-infra-v0-to-v1.1-state-diff.md:90` 明确说 "本轮仅记 TODO, 不抽常量（v1.1 path 单点专项处理）"

## 3. 误判原因分析

报告 C2 误判的逻辑链:
1. AGENTS.md 说 "Forge 在 .openxenon/forges/"
2. `resolveForgeRoot` 返回 `arsenal/drafts/`
3. 两者不匹配 → 推断 "C2 是路径错误"
4. 建议改 `resolveForgeRoot` 返回 `forges/`

**逻辑漏洞**:
- **步骤 1-2 的比较前提错误**: `forges/` (设计文档目录) 与 `arsenal/drafts/` (废弃 asset 目录) 是**两个不同维度的概念**, 不存在"路径错配"关系
- **步骤 4 的建议会引入回归**: 把 `resolveForgeRoot` 返回 `.openxenon/forges/` (设计文档目录) 会**混淆语义** — Hall 把"设计文档目录"当成"asset 路径"用, 是迁移中期的可接受错误, 但把同样的混淆从临时态固化为 API 行为, 是**回归**

## 4. 决策: 撤销 C2

| 决策项 | 结论 |
|---|---|
| 报告 C2 的 P0 严重级 | **撤销** (误判) |
| `resolveForgeRoot` 函数 | **删除** (0 caller 0 测试, 死代码) |
| `arsenal/` 53 处引用 | **保持现状** (v1.1 path 专项处理) |
| `forges/` 双重身份 | **保留过渡** (Hall 已部分用它扫 asset, 正式迁移留专项) |

**理由**:
- 报告 C2 把 "命名混淆" 升级为 "P0 安全/正确性 bug" 是错误的
- 实际只是**考古残留的死代码**, 删除即可, 不需要路径修复
- 全栈 `arsenal` → `forges` 重命名是已知的 v1.1 path 专项, 跨 53+ 处 + UI + 迁移命令, 不是单 PR 能搞定的

## 5. 实际执行 (commit hash 见 git log)

1. **删除死代码**: `src/infra/paths.ts:27-29` `resolveForgeRoot` 函数 (3 行)
2. **本 retraction 文档**: `.openxenon/forges/2026-06-12-c2-retraction.md` (本文件)

**验证**:
- `bun run typecheck` 0 error
- `bun test` 与 baseline 一致 (1041 pass / 5 fail, 0 回归)
- 0 个文件/调用方受影响 (函数 0 caller)

## 6. 教训 (给后续 AI Agent)

**Read AGENTS.md + `ls .openxenon/` 之前, 不要轻易把"返回路径字符串"归类为 bug**。`forges/` 在 OXN 项目里有**双重身份**:

1. **设计文档目录** (默认理解) — 跨 PR 工作笔记
2. **asset 路径过渡** (过渡态) — Hall 已部分扫这里找 probes/blueprints/parts

遇到 `forges/arsenal/arsenals` 路径混用时, 先看 `.openxenon/forges/2026-06-11-infra-v0-to-v1.1-state-diff.md` (v0→v1.1 迁移专项设计), 不要拍脑袋改路径。

## 7. 引用

- 原始报告: `.openxenon/forges/2026-06-12-code-quality-pattern-and-logic.md` (C2 章节)
- v0→v1.1 迁移设计: `.openxenon/forges/2026-06-11-infra-v0-to-v1.1-state-diff.md`
- 项目硬性规则: `AGENTS.md:81` Forge 设计笔记
- IAP ban 词: `.openxenon/domains/intent-align-context.oxn:63` (oxn arsenal 旧命令)
- Hall 部分迁移证据: `src/hall/index.ts:87-96` `forgesDir = join(projectRoot, 'forges')`
- Work 编排: `.openxenon/works/fix-p0-quality/tasks/c2-forge-path/task.oxn`
