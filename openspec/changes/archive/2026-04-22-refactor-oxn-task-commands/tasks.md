## 1. 创建 Zod Schema

- [x] 1.1 创建 `src/types/schemas/stage.schema.ts` - Stage Schema
- [x] 1.2 创建 `src/types/schemas/blueprint.schema.ts` - Blueprint Schema
- [x] 1.3 创建 `src/types/schemas/task.schema.ts` - Task Schema（包含 blueprints 数组）
- [x] 1.4 创建 `src/types/schemas/index.ts` - 统一导出

## 2. 创建 task new 命令

- [x] 2.1 创建 `src/commands/api/task-new.ts`
- [x] 2.2 输出 Task JSON 模板（含 blueprints 数组）
- [x] 2.3 更新 `src/commands/task.ts` 将 submit 改为 new

## 3. 创建 task list 命令

- [x] 3.1 创建 `src/commands/api/task-list.ts`
- [x] 3.2 实现任务列表查询
- [x] 3.3 添加 `--json` 支持
- [x] 3.4 在 `src/commands/task.ts` 中注册 list 命令

## 4. 测试

- [x] 4.1 测试 `xn task new` 输出模板
- [x] 4.2 测试 `xn task list` 列出任务
- [x] 4.3 测试 `xn task list --json` JSON 输出