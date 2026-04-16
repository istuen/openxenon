## Context

当前任务提交流程：
1. 用户调用 `POST /api/v1/task/submit` 提交 Playbook
2. `createTask()` 仅将 Playbook JSON 存储到 `tasks.playbook` 字段
3. Steps 未写入 `steps` 表
4. 后续 API 调用失败，因为无法找到 step 记录

当前数据库表结构：
- `tasks`: 存储 task 记录和完整的 playbook JSON
- `steps`: 预留的 steps 表，但未被填充

需要的执行流程：
```
submit → start → next → step-start → verify → next → ...
```

## Goals / Non-Goals

**Goals:**

- 任务提交时自动创建 steps 记录
- 提供完整的任务执行流程 API
- 支持通过 taskId + stepName 定位 step（更直观）
- 支持顺序执行 steps（当前阶段）

**Non-Goals:**

- 不实现并行 step 执行
- 不实现 step 依赖图
- 不实现自动重试机制

## Decisions

### 1. Steps 持久化时机

**决定**：在 `task-submit` 处理器中，创建 task 后立即创建 steps。

```typescript
// task-submit.ts
const task = createTask(db, playbook.task, playbook)

for (const [index, step] of playbook.steps.entries()) {
  const stepId = `${task.id}-${index + 1}`  // step-1, step-2, ...
  createStep(db, stepId, task.id, step.name, step.spec, step.proof)
}
```

**理由**：
- 保持 task 和 steps 的原子性
- Step ID 使用 `{taskId}-{序号}` 格式，便于定位
- 避免需要事务支持

### 2. Step 定位方式

**决定**：支持两种定位方式：
1. 通过 `stepId` 直接定位
2. 通过 `taskId` + `stepName` 组合定位

```typescript
// step-verify.ts
if (body.stepId) {
  step = getStepById(db, body.stepId)
} else if (body.taskId && body.stepName) {
  step = getStepByTaskIdAndName(db, body.taskId, body.stepName)
}
```

**理由**：
- Step ID 不直观，用户难以记忆
- Task ID + Step Name 更易于使用
- 保持向后兼容

### 3. 任务执行流程

**决定**：采用显式 API 调用流程，不自动推进。

```
POST /api/v1/task/start     → 将 task 状态改为 running
GET  /api/v1/task/next      → 返回下一个 pending step
POST /api/v1/step/start     → 将 step 状态改为 running
POST /api/v1/step/verify    → 验证 step，更新状态
GET  /api/v1/task/next      → 循环获取下一步
```

**理由**：
- 允许外部系统控制执行节奏
- 便于调试和日志记录
- 未来可扩展为 Skill 驱动的自动执行

### 4. Step ID 格式

**决定**：使用 `{taskId}-{序号}` 格式。

```
taskId: 75eecb82-4dfb-46a9-bf41-123942d6a12c
stepId: 75eecb82-4dfb-46a9-bf41-123942d6a12c-1
stepId: 75eecb82-4dfb-46a9-bf41-123942d6a12c-2
```

**理由**：
- 无需额外生成 UUID
- 从 stepId 可直接看出所属 task
- 序号便于理解执行顺序

## Risks / Trade-offs

### 风险：Step Name 重复

**风险**：Playbook 中可能存在同名 step。

**缓解**：使用序号定位，stepName 仅作为辅助标识。如需严格区分，使用 stepId。

### 风险：并发执行

**风险**：多个客户端同时调用 `/task/next` 可能获取相同的 step。

**缓解**：当前不支持并发执行，后续可通过加锁机制解决。
