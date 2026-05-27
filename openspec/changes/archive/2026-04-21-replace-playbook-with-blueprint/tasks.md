## 代码迁移

- [x] 1.1 更新 `src/types/task.ts` 导入（Playbook → Blueprint）
- [x] 1.2 更新 Task 接口属性名（playbook → blueprint）

## 数据库层

- [x] 2.1 更新 `src/db/operations/tasks.ts` 导入和引用

## API 层

- [x] 3.1 更新 `src/api/handlers/task-submit.ts` 导入和引用

## Skills 文档

- [x] 4.1 更新 `src/skills/xn-task.ts` 文档注释
- [x] 4.2 更新 `src/skills/xn-resume.ts` 文档注释

## 测试文件

- [x] 5.1 更新 `tests/api/task-execution.test.ts`
- [x] 5.2 更新 `tests/db/operations.test.ts`

## 清理

- [x] 6.1 运行 typecheck 验证
- [x] 6.2 运行测试验证
- [x] 6.3 删除 `src/types/playbook.ts`（确认无遗漏后）