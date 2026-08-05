---
entity: roadmap
version: 0.1.0
name: md-system
abstract: |
  MD 文档系统 4 场景路由：integrate / extend / collaborate / upgrade。
  OXN 项目消费者 onboarding 5 起手 Asset 之一（ADR-0089 D1）。
  与 OXN 自身 oxn-system 6 scene 路由对齐（doc / dev / debug / test / release / onboard）。
  区别：oxn-system 面向 OXN 自身贡献者；md-system 面向项目消费者文档协作场景。
references: []
citations: 0
synced-at: 2026-08-04
---

# Roadmap: md-system

> MD 文档系统 4 场景路由。OXN 内置 5 起手 Asset 之一。
> AI Agent 可用 `oxn assetmap suggest --goal "<goal>" --scene <scene>` 排序匹配相关 Asset。
> 与 OXN 自身 [oxn-system](../../../../.openxenon/assets/assetmaps/oxn-system.md) 6 scene 路由区别：
> oxn-system 面向 OXN 自身贡献者；md-system 面向项目消费者文档协作场景。

## Scenes

### scene: integrate
> Scenario: 首次接入 OXN；完成 onboarding 5 Asset bootstrap。

| kind | name | description |
|---|---|---|
| domain | doc-md-domain | MD 文档编写术语 + 路径约束 |
| workflow | md-author-workflow | MD 文档编写 6 slot 流水线 |
| stack | md-stack | MD 工具链（md-pipeline + markdownlint + link-check） |
| blueprint | md-author-blueprint | MD 文档编写组合模板（4 part） |
| roadmap | md-system | 本 AssetMap（场景路由） |

### scene: extend
> Scenario: 扩展项目专属 Asset（Domain / Workflow / Stack / Blueprint）。

| kind | name | description |
|---|---|---|
| domain | doc-md-domain | 项目术语扩展基线 |
| workflow | md-author-workflow | 复用 6 slot 骨架，扩展项目专属 part |
| stack | md-stack | 工具链扩展点（新增项目专属工具） |
| blueprint | md-author-blueprint | 4 part 边界内新增项目专属 part |

### scene: collaborate
> Scenario: AI Agent 协作执行文档撰写 Work（IAP 闭环）。

| kind | name | description |
|---|---|---|
| domain | doc-md-domain | 词汇边界（AI 不能超出） |
| workflow | md-author-workflow | execute 边界（AI 走 6 slot） |
| stack | md-stack | 工具链（Probe 验证对象） |
| blueprint | md-author-blueprint | Task 编排入口 |

### scene: upgrade
> Scenario: md-stack 工具链升级（md-pipeline / markdownlint 版本变更）。

| kind | name | description |
|---|---|---|
| domain | doc-md-domain | 术语不变（升级不影响词汇） |
| workflow | md-author-workflow | slot 不变（升级不影响流程） |
| stack | md-stack | 工具链版本变更（升级主战场） |
| blueprint | md-author-blueprint | Boundary 不变（升级不影响边界） |

---

## Usage

```bash
# List all AssetMaps
oxn assetmap list

# View this AssetMap
oxn assetmap show md-system

# View single scene
oxn assetmap show md-system --scene integrate

# AI Agent: suggest in a scene
oxn assetmap suggest --goal "Add a new doc authoring tool" --scene extend --top 3

# After Asset change: detect dangling links (dry-run by default)
oxn assetmap sync md-system --scene extend --dry-run
```

## Scene quick-reference

| Goal keywords | scene |
|---|---|
| on-board / bootstrap / init / first-time / setup | `integrate` |
| extend / add / new asset / new tool / customize | `extend` |
| collaborate / work / task / ai / execute / run | `collaborate` |
| upgrade / bump / version / toolchain / dependency | `upgrade` |
