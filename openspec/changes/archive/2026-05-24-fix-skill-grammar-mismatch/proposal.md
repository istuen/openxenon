## Why

当前 Skill 文档（oxn-forge、oxn-task、oxn-work、oxn-plan）与实际 Grammar 定义存在多处不一致，导致：
1. 用户按照 Skill 文档编写 OXN 代码会解析失败
2. oxn-task skill 使用了不存在的 `task` 关键字（实际应为 `work`）
3. Blueprint 语法缺少必需的 `type` 字段
4. PartSlot 语法使用 `part slot` 而实际应为 `part slot[]`

这些问题阻碍了新版 OXN DSL 流程的正确执行，需要统一修复。

## What Changes

- **修改 oxn-forge skill**：更新 blueprint-format.md，添加 `type` 字段，修正 `part slot[]` 语法
- **修改 oxn-task skill**：替换 `task` 为 `work`，`use` 为 `ref`
- **修改 oxn-plan skill**：更新 Blueprint 格式，修正 plan-flow 相关内容
- **修改 migrated-blueprints.oxn**：为所有 Blueprint 添加 `type` 字段
- **验证流程**：确保所有内置 Blueprint 可被正确解析

## Capabilities

### New Capabilities
- `skill-grammar-sync`：Skill 文档与 Grammar 定义的同步规范（本次修复的具体内容）

### Modified Capabilities
- `work-declaration`：更新文档中的语法示例，与实际 Grammar 保持一致
- `blueprint-type-system`：更新文档以反映 type 字段的正确用法

## Impact

**受影响的文件：**
- `src/skills/locales/zh-CN/oxn-forge/references/blueprint-format.md`
- `src/skills/locales/zh-CN/oxn-task/instruction.md`
- `src/skills/locales/zh-CN/oxn-task/references/blueprint-format.md`
- `src/skills/locales/zh-CN/oxn-plan/instruction.md`
- `src/oxn-dsl/builtin/blueprints/migrated-blueprints.oxn`

**验证方式：**
- 运行 OXN DSL 测试确保解析器正常工作
- 手动验证 Skill 文档中的示例代码可被正确解析