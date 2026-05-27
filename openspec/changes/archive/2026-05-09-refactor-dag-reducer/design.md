## DAG 验证器设计（纯函数化）

### 当前问题代码

```typescript
// src/kernel/schemas/dag-validator.ts (当前 - 有副作用)

export async function validateDAG(
  tasks: Task[],
  dependencies: Map<string, string[]>
): Promise<DAGValidationResult> {
  // Promise 依赖 = 副作用
  // ...
}
```

### 修正后

```typescript
// src/kernel/schemas/dag-validator.ts (修正后 - 纯函数)

export function validateDAG(
  tasks: Task[],
  dependencies: Map<string, string[]>
): DAGValidationResult {
  const errors: DAGValidationError[] = []

  // 纯函数式验证逻辑
  // 1. 检测循环依赖
  // 2. 检测孤立节点
  // 3. 检测缺失依赖

  return {
    valid: errors.length === 0,
    errors
  }
}
```

### 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| 函数是同步的 | `grep -n "async function" src/kernel/schemas/dag-validator.ts` 返回空 |
| 返回类型不含 Promise | `grep -n "Promise<" src/kernel/schemas/dag-validator.ts` 返回空 |
| 无 fs/path 等 I/O 导入 | `grep -n "from 'fs'" src/kernel/schemas/dag-validator.ts` 返回空 |
