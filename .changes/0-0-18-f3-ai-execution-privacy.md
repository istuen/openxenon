---
categories:
  - Added
  - Changed
  - Removed
---

- F3 AI 执行循环 - 隐私隔离
- HTML 渲染器用于 task-trace 报告和 Blueprint DAG 预览

### Changed
- 移除 proof 概念，扁平化 stage 结构
- 合并 proof 到 stage，统一 probe/definition 调用 schema
- 统一所有命令使用集中式输出模块

### Removed
- 弃用的 CLI 命令（draft、force-pass、rollback、inspect、trace、api、proof-list）