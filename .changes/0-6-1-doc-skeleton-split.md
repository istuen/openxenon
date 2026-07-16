---
version: 0.6.1
date: 2026-07-16
type: patch
---

# 0.6.1 — docs/zh-cn 文档结构重构（产品手册 + 开发手册）

## 核心变化

### 1. 四层文档架构正式确立

| 层 | 路径 | 受众 |
|---|---|---|
| **产品手册** | `docs/zh-cn/product/` | 使用者 + AI 协作者 |
| **开发手册** | `docs/zh-cn/dev/` | 贡献者 / 维护者 |
| **内部手册** | `.openxenon/docs/{adrs,rfcs}/` | 维护者（SSOT · 沉淀） |
| **动态文稿** | `.openxenon/pools/{drafts,issues,journals,spikes}/` | 维护者（流动） |

### 2. 产品手册（17 个文件）

- **概念**：IAP 范式与信任链 + E1 Asset / E2 Work / E3 Proof / E4 Insight + Asset Paper
- **实战**：5 个 Recipe + 4 个端到端示例 + DDD 实战
- **用户参考**：CLI 用户指南 + 术语表 + IAP 速记卡 + 4 个 Asset 模板
- **门户页**：`docs/zh-cn/index.md`（双入口导航）

### 3. 开发手册（13 个骨架页 + 4 个 extending 子页）

- **入门**：环境搭建 + 仓库布局 + 工具链
- **架构**：Monorepo 双包 + L0-L3 宪法 + 三层文档守门
- **概念**：AI 协作工作流 + 三档 exit 分类器 + Skill 三段
- **扩展点**：自定义 Probe / Part / DSL 扩展 / Skill 编写
- **工程实践**：测试策略 + 发布流程 + 调试指南 + 代码规范

### 4. 旧 URL 兼容

18 个产品/dev 页 frontmatter 加 `redirectFrom`，VitePress 自动 301 重定向：

```
/zh-cn/core-concepts.html → /zh-cn/product/concepts/iap-paradigm.html
/zh-cn/llm-prompt.html    → /zh-cn/product/ai-entry.html
/zh-cn/cli.html           → /zh-cn/product/reference/cli-user-guide.html
/zh-cn/architecture.html  → /zh-cn/dev/architecture.html
... 等 18 个
```

### 5. 文档边界守门（新增）

新增 `scripts/check-doc-boundary.ts`，规则矩阵：

| 源 → 目标 | 允许 |
|---|---|
| product/ → dev/、`.openxenon/docs/{adrs,rfcs}/`、同 product/ | ✅ |
| dev/ → product/、`.openxenon/docs/`、`.openxenon/pools/` | ✅ |
| `.openxenon/docs/` → dev/、同层 | ✅（禁止反向 product/） |
| `.openxenon/pools/` → 同层 | ✅（禁止对外文档） |

集成 `lefthook` pre-commit（`bun scripts/check-doc-boundary.ts`）。

支持 `<!-- boundary:ignore -->` 注释豁免。

## 物理变更

### 新增（21 个）

```
docs/zh-cn/index.md                        # 门户页
docs/zh-cn/product/_index.md               # 产品手册首页
docs/zh-cn/product/concepts/_index.md      # 范式与实体首页
docs/zh-cn/product/practice/_index.md      # 实战首页
docs/zh-cn/product/reference/_index.md     # 用户参考首页
docs/zh-cn/dev/_index.md                   # 开发手册首页
docs/zh-cn/dev/getting-started.md          # 环境 + 仓库布局
docs/zh-cn/dev/monorepo.md                 # packages/cli + packages/engine
docs/zh-cn/dev/l0-l3-constitution.md       # 8 子层依赖图 + 越界解读
docs/zh-cn/dev/three-tier-docs.md          # 文档三层守门
docs/zh-cn/dev/ai-collaboration.md         # Skill 三段 + 三档 exit
docs/zh-cn/dev/extending/_index.md         # 扩展点首页
docs/zh-cn/dev/extending/custom-probe.md   # 自定义 Probe
docs/zh-cn/dev/extending/custom-part.md    # 自定义 Part
docs/zh-cn/dev/extending/dsl-extension.md  # DSL 扩展
docs/zh-cn/dev/extending/skill-authoring.md # Skill 编写
docs/zh-cn/dev/testing.md                  # Y 方案测试布局
docs/zh-cn/dev/releasing.md                # version:check/sync + .changes/
docs/zh-cn/dev/debugging.md                # frozen 异常诊断
docs/zh-cn/dev/conventions.md              # biome/eslint/commit
scripts/check-doc-boundary.ts              # 文档守门脚本
```

### Rename（30 个）

```
docs/zh-cn/_archive/2026-07-05-archive-memory-superseded.md → docs/_archive/zh-cn-archive-memory-superseded.md

14 个产品页：index.md/quickstart.md/core-concepts.md/asset.md/work.md/proof.md/insight.md/asset-paper.md/
recipes.md/ddd-in-practice.md/cli.md/glossary.md/iap-cheatsheet.md/faq.md/roadmap.md/llm-prompt.md
→ docs/zh-cn/product/{concepts,practice,reference}/...

3 个目录：examples/、asset-templates/、changelog/ → docs/zh-cn/product/{practice,reference}/changelog/

2 个 dev 页：architecture.md → docs/zh-cn/dev/architecture.md
            extending.md → docs/zh-cn/dev/extending/extending.md
```

### 修改（4 个）

- `docs/.vitepress/config.ts` — nav 改 5 项（首页/产品手册/开发手册/快速开始/AI 入口），侧边栏拆分为 product/ 和 dev/ 两组
- `package.json` — 新增 `docs:boundary` script
- `lefthook.yml` — pre-commit 新增 `doc-boundary` 命令
- 3 个 `.openxenon/pools/` 文件加 `<!-- boundary:ignore -->` 豁免历史引用

## 验收结果

| 命令 | 结果 |
|---|---|
| `bun run check` | ✅ 460 files, 0 issues |
| `bun run typecheck` | ✅ 0 errors |
| `bun run lint` | ✅ 0 errors |
| `bun scripts/check-doc-boundary.ts` | ✅ 0 violations |
| `bun run docs:build` | ✅ build complete |

## 后续排期（不阻塞本 PR）

- v0.6.2：`docs/en/` 英文站镜像重构（保留 14 个旧 redirectFrom 即可）
- v0.6.3：`product/roadmap.md` 内容刷新（仍标 v0.1.2 严重过时）
- v0.7：`dev/*` 9 个骨架页内容深化（当前每页 30-60 行，下轮可扩至 80-150 行）