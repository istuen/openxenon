---
entity: work
version: 0.1.0
name: explore-dsl
---

# Work: explore-dsl

> 探索 OXL 语法结构，生成分析报告

## Context

### primary
- goal: 探索 OXL 语法结构，生成分析报告
- constraints:
  - 使用 oxn 命令而非直接读源码
- max_iterations: 3

## Tasks

### explore
- blueprint: explore-analyze-report
- domain: DSLContext
- part: explore
  - skill_context: 探索 grammar/schema/validator/compiler 四个子模块
