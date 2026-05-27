## Why

Skill 编译时抛出"技能必须提供名称"错误，且 `oxn init -f` 不是真正的强制覆盖而是部分跳过。需要修复 Skill 编译器的 name 校验逻辑，以及 `oxn init -f` 的强制覆盖行为。

## What Changes

1. **Skill 编译器 name 校验修复**
   - 定位"技能必须提供名称"错误的来源
   - 修复 `skill-compiler.ts` 中的 name 校验逻辑
   - 确保所有 Skill 有有效 id 时不报错

2. **`oxn init -f` 强制覆盖实现**
   - 当前 `oxn init` 在项目已存在时只更新 mode，跳过部分初始化
   - 添加 `-f/--force` 参数实现真正的强制覆盖
   - force 时应重新拷贝 meta、重新编译 Skills

## Capabilities

### New Capabilities
- `init-force-flag`: `oxn init -f` 实现强制覆盖，重新初始化项目围栏

### Modified Capabilities
- `skill-compilation`: 修复 Skill 编译器的 name 校验逻辑，消除"技能必须提供名称"错误

## Impact

- **涉及的代码**:
  - `src/cli/skill-compiler.ts`: 修复 name 校验逻辑
  - `src/cli/init.ts`: 实现 `-f/--force` 参数
- **影响的系统**:
  - Skill 编译流程
  - 项目初始化流程
