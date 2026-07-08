---
entity: roadmap
version: 0.1.0
name: NAME
abstract: |
  TODO: 一句话描述本 Roadmap 的导航目的（哪些 Asset 优先读取、按什么顺序）。
  TODO: 维护策略（手工 vs 自动更新，v0.6.1-alpha.1 阶段是手工）。
references: []
citations: 0
---

# Roadmap: NAME

> TODO: 一句话描述本 Roadmap 的导航目的

## Core

- `domain/core.oxn` — 项目核心领域边界
- `stack/nodejs.oxn` — 运行时环境约束

## OnDemand

- `blueprint/dev-workflow.oxn` — 标准开发流程
- `library/axios-docs.oxn` — Axios 文档聚合

## Recent

- `domain/payment-core` 从 v1.0 → v1.1（新增幂等性约束），影响所有付款相关 Blueprint
- `library/axios-docs` 从 v1.0 → v1.1（升级 axios 1.7.0 API），影响所有 HTTP 相关 Work
