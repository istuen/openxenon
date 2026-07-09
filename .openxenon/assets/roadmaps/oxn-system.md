---
entity: roadmap
version: 1
name: oxn-system
abstract: |
  OpenXenon 自举系统路由图：把文档层 + IAP 工作流 + Asset 生命周期映射到 19 Domain + 12 Blueprint 的导航入口。AI Agent 读这一份 Roadmap 即可定位该用哪些 Domain + Blueprint
citations: 0
---

# Roadmap: oxn-system

> 6 个路由分区 — 文档三层架构 + IAP 8 阶段工作流 + Asset 生命周期 + IAP 三轴范式 + 横切关切 + Skill 入口

## Links

### 文档三层架构 (4 links)

#### link-1: DocEngineeringContext
- target: @prj/domains/DocEngineeringContext

#### link-2: VitePressContext
- target: @prj/domains/VitePressContext

#### link-3: doc-publish
- target: @prj/blueprints/doc-publish

#### link-4: doc-promote
- target: @prj/blueprints/doc-promote

### IAP 8 阶段工作流 (10 links)

#### link-5: WorkOrchestrationContext
- target: @prj/domains/WorkOrchestrationContext

#### link-6: dev-workflow
- target: @prj/blueprints/dev-workflow

#### link-7: add-cli-subcommand
- target: @prj/blueprints/add-cli-subcommand

#### link-8: dsl-evolve
- target: @prj/blueprints/dsl-evolve

#### link-9: fix-issue
- target: @prj/blueprints/fix-issue

#### link-10: refactor-safe
- target: @prj/blueprints/refactor-safe

#### link-11: migrate-version
- target: @prj/blueprints/migrate-version

#### link-12: release-cut
- target: @prj/blueprints/release-cut

#### link-13: explore-analyze-report
- target: @prj/blueprints/explore-analyze-report

#### link-14: git-workflow
- target: @prj/blueprints/git-workflow

### Asset 生命周期 (2 links)

#### link-15: AssetModeContext
- target: @prj/domains/AssetModeContext

#### link-16: L0L3Context
- target: @prj/domains/L0L3Context

### IAP 三轴范式 (5 links)

#### link-17: intent-align-context
- target: @prj/domains/intent-align-context

#### link-18: intent-domain
- target: @prj/domains/intent-domain

#### link-19: align-domain
- target: @prj/domains/align-domain

#### link-20: proof-domain
- target: @prj/domains/proof-domain

#### link-21: iap-error-context
- target: @prj/domains/iap-error-context

### 横切关切 (8 links)

#### link-22: MonorepoContext
- target: @prj/domains/MonorepoContext

#### link-23: GrammarContext
- target: @prj/domains/GrammarContext

#### link-24: I18nContext
- target: @prj/domains/I18nContext

#### link-25: CodeQualityContext
- target: @prj/domains/CodeQualityContext

#### link-26: SecurityContext
- target: @prj/domains/SecurityContext

#### link-27: TaintContext
- target: @prj/domains/TaintContext

#### link-28: PoolContext
- target: @prj/domains/PoolContext

#### link-29: config-domain
- target: @prj/domains/config-domain

### Skill 入口 (2 links)

#### link-30: oxn-work
- target: @oxn/skills/oxn-work

#### link-31: oxn-asset
- target: @oxn/skills/oxn-asset