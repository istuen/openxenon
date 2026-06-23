---
entity: task
version: 0.3.0
name: build_module
---

# Task: build_module

> 打包并检查产物

## Parts

### compile
- skill_context: 编译 TypeScript + 打包

### check_size
- skill_context: 检查产物大小

## Probes

### test_pass_rate
- scheme: shell
- expect: pass_rate > 0.9
