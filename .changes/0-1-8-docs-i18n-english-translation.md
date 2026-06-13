# 0.1.8 — 文档站 i18n 化 + 英文全量翻译

> Docs site: VitePress native i18n (symmetric prefix) + 16 主文档 + 4 examples 英文全量翻译 + 安装路径重写到 npm/pnpm/bun 全局安装。

## 变更

### docs 站点结构（v0.1.0 起步，迭代到 0.1.8）
- 新增 `docs/zh-cn/` 目录（中文 SSOT，15 章 + index.md + examples/）
- 新增 `docs/en/` 目录（英文镜像，16 章 + index.md + examples/）
- 新增 `docs/.vitepress/config.ts`（VitePress 对称 prefix i18n：locale key 用小写 `'zh-cn'`、保留 `lang: 'zh-CN'` 满足 HTML lang 规范；en 走独立 prefix）
- 新增 `docs/index.md`（根路径 = 中文 Introduction 内容，VitePress 默认 locale 提升）
- 新增 `docs/zh-cn/index.md`（补 /zh-cn/ 路径 404 + 修相对链接）
- 旧 `docs/{core,architecture,reference,guides,design,horizon,changelog}/` 备份到 `_archive/`
- 旧 `docs/_archive/changelog/{zhcn-legacy,en-legacy}/` 保留

### docs 英文翻译（替换原占位 "v0.1.0 ships Chinese only"）
- `docs/en/index.md`                    — Introduction
- `docs/en/quickstart.md`               — Quickstart
- `docs/en/core-concepts.md`            — Core Concepts
- `docs/en/intent.md`                   — Intent axis
- `docs/en/align.md`                    — Align axis
- `docs/en/proof.md`                    — Proof axis
- `docs/en/recipes.md`                  — Recipes
- `docs/en/ddd-in-practice.md`          — DDD in Practice
- `docs/en/cli.md`                      — CLI Reference
- `docs/en/architecture.md`             — Architecture
- `docs/en/extending.md`                — Extending
- `docs/en/roadmap.md`                  — Roadmap
- `docs/en/glossary.md`                 — Glossary
- `docs/en/iap-cheatsheet.md`           — IAP Cheatsheet
- `docs/en/faq.md`                      — FAQ
- `docs/en/llm-prompt.md`               — AI Collaborator Entry
- `docs/en/examples/{onboarding,develop-member,fix-issue,explore-dsl}/README.md`

### 安装路径重写（out-of-the-box 原则）
- `docs/{zh-cn,en}/quickstart.md` 第 1 步：
  - 之前：`git clone + bun install + bun run build` + `./dist/oxn`
  - 之后：`npm/pnpm/bun install -g @istuen/openxenon` 三选一 + `oxn` 直接用
- `README.md` "5 分钟 Quick Start" 同步重写
- 全文 `./dist/oxn` → `oxn`（zh-cn 5 处、en 5 处、README 9 处）

### CLI tagline 重写
- `src/infra/i18n/zh-CN.json` `cli.description`：
  - 之前：`OpenXenon CLI - 面向大语言模型的工程化控制引擎`
  - 之后：`OpenXenon CLI — 工程师与 AI 协作工作台入口`
- `src/infra/i18n/en.json` 同步：`OpenXenon CLI — Engineer + AI collaboration workbench entry`

### 站点部署
- `.github/workflows/docs.yml`（triggers: dev + feat/saturn；deploy 守卫仅 dev）
- 新增 `.openxenon/domains/DocContext.oxn`（VitePress i18n + GitHub Pages 业务上下文，9 terms / 9 banned / 11 invariants）
- 新增 `.openxenon/blueprints/doc-publish.oxn`（4 阶段：structure → content → build → deploy）
- 新增 `.openxenon/works/docs-site-v1/`（OXN v1.1 8 阶段 work，4 tasks）

### 修复
- `docs/zh-cn/llm-prompt.md` 误写 `[./zh-cn/llm-prompt.md]` → 改为 `[./llm-prompt.md]`（从 `/zh-cn/index.md` 看是相对路径）
- VitePress locale key 大小写敏感（key 改 `'zh-cn'` 与 URL prefix 一致；保留 `lang: 'zh-CN'` 满足 HTML lang）
- 移除 `docs/.vitepress/public/index.html`（VitePress 默认 locale 提升已覆盖根路径）

## 影响
- npm 包本身无 API 变化，纯文档 + 文案 → **patch bump**
- 站点：https://istuen.github.io/openxenon/
- npm：https://www.npmjs.com/package/@istuen/openxenon (即将到 0.1.8)
