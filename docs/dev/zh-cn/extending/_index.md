---
title: 扩展点
---

# 扩展点

> 自定义 Probe、Part、DSL 扩展点、Skill 编写。OpenXenon 的扩展体系分为三个层级。

## 扩展层级

| 层级 | 扩展点 | 难度 | 何时用 |
|---|---|---|---|
| [自定义 Probe](./custom-probe) | 新增验证量具 | 低 | 内置 Probe 不够用 |
| [自定义 Part](./custom-part) | 新增执行构件 | 中 | 需要特定的工具集成 |
| [DSL 扩展](./dsl-extension) | 修改 OXL 语法 | 高 | 需要新的资产类型或语法结构 |
| [Skill 编写](./skill-authoring) | AI Agent 工作流模板 | 中 | 为 AI Agent 定制协作流程 |

## 深入阅读

- [AGENTS.md §Skill 工作流](../../../AGENTS.md#仓库约定) — SSOT → 编译 → 分发
- [AGENTS.md §CLI 架构](../../../AGENTS.md#cli-架构oxn) — 三档 exit 分类器
