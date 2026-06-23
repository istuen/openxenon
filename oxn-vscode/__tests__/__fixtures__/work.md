---
entity: work
version: 0.3.0
name: refactor-auth
---

# Work: refactor-auth

## Context

### main
- goal: 重构 auth 模块
- max_iterations: 3
- constraints:
  - 不修改 src/cli 目录
  - 必须保留 1 个旧测试

## Tasks

### step1
- blueprint: ci-pipeline
- domain: CoreDomain
- part: build_module
  - skill_context: 打包并检查
  - probe: check_artifact_size
    - scheme: fs
    - expect: exists=true
