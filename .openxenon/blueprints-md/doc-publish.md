---
entity: blueprint
version: 1
name: doc-publish
oxn-source-sha: ca25c5399ba0536dbdcf1b3aa06b71953d21f2132525ee09b65da9cef3c8d349
synced-at: 2026-06-26T01:19:20.329Z
---

# Blueprint: doc-publish

> OpenXenon 产品文档站点发布流水线：VitePress 站点结构 → 内容写入 → 静态构建 → GitHub Pages 部署

## Slots

### structure
- deps: []
- observe: []

### content
- deps:
  - structure
- observe: []

### build
- deps:
  - content
- observe: []

### deploy
- deps:
  - build
- observe: []
