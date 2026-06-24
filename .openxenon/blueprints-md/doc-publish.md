---
entity: blueprint
version: 1
name: doc-publish
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
