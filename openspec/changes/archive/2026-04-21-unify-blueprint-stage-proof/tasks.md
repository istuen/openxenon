## 1. Stage 类型更新

- [x] 1.1 更新 `src/types/stage.ts` - xnProof → proof

## 2. Blueprint 类型清理

- [x] 2.1 删除 `src/types/blueprint.ts` - Step 接口定义
- [x] 2.2 更新 `src/types/blueprint.ts` - 只保留 stages

## 3. Task 类型更新

- [x] 3.1 确认 Task.blueprint 已正确

## 4. DB Schema 更新

- [x] 4.1 更新 `src/db/schema/project.ts` - playbook → blueprint

## 5. 数据库操作更新

- [x] 5.1 更新 `src/db/operations/tasks.ts` - 字段引用

## 6. 验证

- [x] 6.1 运行 typecheck
- [x] 6.2 运行测试
- [x] 6.3 更新测试文件