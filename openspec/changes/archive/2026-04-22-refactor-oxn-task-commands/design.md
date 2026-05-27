## Context

OpenXenon 需要一个极简、扁平、可演化的数据结构。核心原则：
- Task 和 Blueprint 是扁平独立结构
- 1 个 Task 对应 N 个 Blueprint
- Stage 的 spec/target/action 是自然语言字符串
- 使用 Zod 进行运行时校验

## Zod Schema 设计

```typescript
// Stage：原子工序节点
const StageSchema = z.object({
  id: z.string(),
  name: z.string(),
  deps: z.array(z.string()).default([]),
  target: z.string(),
  spec: z.string(),
  action: z.string().optional(),
  proof: z.union([z.string(), z.array(z.string())]),
});

// Blueprint：拓扑蓝图
const BlueprintSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  name: z.string(),
  status: z.enum(['DRAFT', 'CANONICAL', 'SAMPLE']),
  stages: z.array(StageSchema),
});

// Task：宏观任务（1 对 N Blueprint）
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'ESCAPED', 'TERMINATED']),
  activeBlueprintId: z.string().optional(),
  createdAt: z.string().datetime(),
  blueprints: z.array(BlueprintSchema),
});
```

## Task JSON 模板

```json
{
  "id": "task_xxx",
  "name": "任务名称",
  "status": "PENDING",
  "activeBlueprintId": null,
  "createdAt": "2026-04-21T12:00:00.000Z",
  "blueprints": [
    {
      "id": "bp_xxx",
      "taskId": "task_xxx",
      "name": "蓝图名称",
      "status": "DRAFT",
      "stages": [
        {
          "id": "stage_1",
          "name": "步骤名称",
          "deps": [],
          "target": "预期终态描述",
          "spec": "执行规范描述",
          "action": "方法论约束（可选）",
          "proof": "proof_name"
        }
      ]
    }
  ]
}
```

## 决策说明

1. **blueprints 复数结构**：一个 Task 可以有多个 Blueprint（演化流）
2. **spec/target/action 是 string**：自然语言给 LLM，机械校验由 proof 探针完成
3. **使用 Zod 而非 JSON Schema**：Zod.parse 就是 Proof

## Risks / Trade-offs

- [风险] Zod 体积影响 bundle → 缓解：使用 tree-shaking
