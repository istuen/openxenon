## Why

当前代码中存在 `Playbook` 和 `Blueprint` 两个概念，它们功能重叠。根据 OpenXenon 术语规范，`Blueprint` 是任务执行的正式定义，应该统一使用 `Blueprint` 替代 `Playbook`。

## What Changes

- 将 `Playbook` 接口重命名为 `Blueprint`
- 更新所有引用 `Playbook` 的代码，改用 `Blueprint`
- 更新 `src/types/playbook.ts` 改名为 `src/types/blueprint.ts`（已存在需合并）
- 更新数据库操作、API handlers、skills 等所有引用

## Capabilities

### New Capabilities
（无）

### Modified Capabilities
- `blueprint-replacement`: 将现有 Playbook 概念统一替换为 Blueprint

## Impact

- `src/types/playbook.ts` → 重命名为 `src/types/blueprint.ts`
- `src/types/task.ts` - 更新导入和类型引用
- `src/db/operations/tasks.ts` - 更新数据库操作
- `src/api/handlers/task-submit.ts` - 更新 API 处理
- `src/skills/xn-task.ts`, `src/skills/xn-resume.ts` - 更新文档和注释
- `tests/` - 更新所有测试文件
