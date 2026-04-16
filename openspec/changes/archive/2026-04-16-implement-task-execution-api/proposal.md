## Why

任务提交后，Playbook 中的 steps 未持久化到数据库，导致无法执行任务。用户提交任务后，`steps` 表为空，`/api/v1/step/verify` 端点因缺少 stepId 无法使用。缺少任务推进相关的 API 端点。

## What Changes

- 任务提交时，将 Playbook 中的 steps 写入 `steps` 表
- 新增 `/api/v1/task/start` 端点启动任务执行
- 新增 `/api/v1/task/next` 端点获取下一个待执行的 step
- 新增 `/api/v1/step/start` 端点标记 step 开始执行
- 修改 `/api/v1/step/verify` 端点支持通过 taskId + stepName 定位 step

## Capabilities

### New Capabilities

- `task-execution`: 任务执行流程 API，包括启动任务、获取下一步、验证 step 等

### Modified Capabilities

- `http-api`: 修改 task submit 端点以持久化 steps，新增执行相关端点

## Impact

- 修改 `src/api/handlers/task-submit.ts` - 持久化 steps
- 新增 `src/api/handlers/task-start.ts` - 启动任务
- 新增 `src/api/handlers/task-next.ts` - 获取下一步
- 新增 `src/api/handlers/step-start.ts` - 开始执行 step
- 修改 `src/api/handlers/step-verify.ts` - 支持 stepName 查询
- 修改 `src/api/handlers/index.ts` - 注册新路由
