---
entity: blueprint
version: 0.3.0
name: doc-promote
---

# Blueprint: doc-promote

> 临时文档提升流水线（DocEngineeringContext 专用）：从 .openxenon/pools/drafts/ 收集散落文档 → 按 ADR/RFC 固定格式编写 → 格式校验 → 落盘到 .openxenon/docs/{adrs,rfcs}/

## Slots

### gather
- deps: []
- observe:
  - fs-exists
  - lint-check
- desc: 收集 .openxenon/pools/drafts/ 中与目标 ADR/RFC 相关的散落文档，列出 draft 清单

### author
- deps:
  - gather
- observe:
  - lint-check
- desc: 按 ADR/RFC 固定模板编写新文档（多对一综合：多 drafts 综合为一个 ADR/RFC）

### validate
- deps:
  - author
- observe:
  - lint-check
  - heading-skeleton-check
- desc: 校验 ADR/RFC 格式（heading skeleton + 引用完整性 + term/ban/invariant 合规）

### promote
- deps:
  - validate
- observe:
  - fs-exists
- desc: 落盘到 .openxenon/docs/adrs/ 或 .openxenon/docs/rfcs/，chmod 444（append-only 保护），更新 INDEX