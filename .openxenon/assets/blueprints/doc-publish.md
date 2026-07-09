---
entity: blueprint
version: 0.3.0
name: doc-publish
---

# Blueprint: doc-publish

> OpenXenon 产品文档站点发布流水线（VitePressContext 专用）：站点结构 → 内容写入 → 静态构建 → GitHub Pages 部署

## Slots

### structure
- deps: []
- observe:
  - fs-exists
- desc: 验证 docs/{zh-cn,en}/ 目录结构符合 VitePressContext invariant（i18n 对称 prefix、sidebar 6 桶）

### content
- deps:
  - structure
- observe:
  - lint-check
- desc: 校验文档内容完整性（章内统一模板 What→Why→How→参考、AI 入口 llm-prompt.md 存在）

### build
- deps:
  - content
- observe:
  - docs-build
- desc: 运行 bun run docs:build 验证 VitePress 静态构建通过 + 无死链

### deploy
- deps:
  - build
- observe:
  - fs-exists
- desc: 验证 GitHub Pages 部署守卫（仅 dev 分支或 workflow_dispatch 触发）