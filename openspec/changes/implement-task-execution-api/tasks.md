## 1. 数据库操作增强

- [x] 1.1 在 `src/db/operations/steps.ts` 添加 `getStepByTaskIdAndName()` 函数
- [x] 1.2 在 `src/db/operations/steps.ts` 添加 `getNextPendingStep()` 函数

## 2. Task Submit 持久化 Steps

- [x] 2.1 修改 `src/api/handlers/task-submit.ts` 创建 steps 记录
- [x] 2.2 更新返回值包含 stepsCount

## 3. 新增 Task 执行 API

- [x] 3.1 创建 `src/api/handlers/task-start.ts` 启动任务
- [x] 3.2 创建 `src/api/handlers/task-next.ts` 获取下一步

## 4. 新增 Step 执行 API

- [x] 4.1 创建 `src/api/handlers/step-start.ts` 开始执行 step
- [x] 4.2 修改 `src/api/handlers/step-verify.ts` 支持 stepName 查询

## 5. 注册路由

- [x] 5.1 在 `src/api/handlers/index.ts` 导出并注册新处理器

## 6. 测试验证

- [ ] 6.1 手动测试：提交任务并验证 steps 已创建
- [ ] 6.2 手动测试：完整执行流程（start → next → step-start → verify）
- [ ] 6.3 手动测试：通过 stepName 验证 step
