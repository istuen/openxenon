## 架构拓扑（修正后）

```
┌─────────────────────────────────────────────────────────────────┐
│                  Kernel 纯函数化后的调用链                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [现有] kernel/lib/task-trace.ts (辐射狗)                        │
│         │                                                       │
│         │ appendFileSync() ◄── 副作用泄漏!                       │
│         ▼                                                       │
│  [修正后]                                                       │
│                                                                  │
│  kernel/lib/task-trace.ts (纯函数)                               │
│  ├─ buildTraceEvent(): TraceEntry[]  ◄── 只返回数据             │
│  ├─ reduceTraceEvents(): TaskTraceState  ◄── 纯归约              │
│  └─ computeNextStage(): StageState | null  ◄── 纯计算           │
│                                                                  │
│  daemon/trace/writer.ts (唯一写入点)                             │
│  └─ appendTrace(): void  ◄── 调用 Infra/fs.appendFileSync       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 具体修改方案

### 1. kernel/lib/task-trace.ts 斩首

**现有代码问题**：
```typescript
// 当前：欺骗性纯函数
export function createTaskTrace(taskDir, taskId, taskName): TaskTraceState {
  appendEvent(...)  // ◄── 副作用！
  return { ... }
}
```

**修正后**：
```typescript
// kernel/lib/task-trace.ts

// 纯函数：构建 trace 事件
export function buildTraceEvent(
  type: TraceEventType,
  taskId: string,
  payload: Record<string, unknown>,
  timestamp: number = Date.now()
): TraceEvent {
  return { type, taskId, timestamp, ...payload }
}

// 纯函数：归约事件到状态
export function reduceTraceEvents(
  events: TraceEvent[]
): TaskTraceState {
  // 纯函数计算，无任何 I/O
  // 返回新的不可变状态
}

// 纯函数：计算下一个待执行 stage
export function computeNextStage(
  dag: DAGGraph,
  currentState: TaskTraceState
): StageState | null {
  // 纯图论计算
}
```

### 2. daemon/trace/writer.ts 新建

**职责**：
- 接收 Kernel 返回的 `TraceEvent[]`
- 调用 `Infra/fs.appendFileSync()` 写入文件系统
- 是 `task-trace.yaml` 的**唯一写入点**

```typescript
// daemon/trace/writer.ts
import { kernel } from '../kernel'
import { infra } from '../infra'

export function appendTrace(
  taskDir: TaskDirectory,
  events: TraceEvent[]
): void {
  // 纯数据转换
  const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n'

  // 唯一的副作用引爆点
  infra/fs.appendOnly(taskDir.tracePath, lines)
}
```

### 3. kernel/probes/executor.ts → evaluator.ts

**现有代码问题**：
```typescript
// 当前：硬编码路由
switch (type) {
  case 'fs_exists': return fsExistsHandler()
  case 'fs_not_exists': return fsNotExistsHandler()
  // 每加一个新探针都要改代码!
}
```

**修正后**：

```typescript
// kernel/probes/evaluator.ts (纯函数)

interface ProbeDefinition {
  type: string
  params: Record<string, unknown>
  expected?: unknown
}

// 纯函数：评判探针结果
export function evaluateProbe(
  definition: ProbeDefinition,
  actualResult: ProbeResult
): ProbeVerdict {
  // 纯逻辑归约
  // 不理解"文件"或"命令"，只比较 passed/failed
}

// 纯函数：归约多个探针结果
export function reduceProbeResults(
  results: ProbeResult[],
  policy: 'AND' | 'OR'
): ProbeVerdict {
  if (policy === 'AND') {
    return results.every(r => r.passed) ? 'PASSED' : 'FAILED'
  }
  return results.some(r => r.passed) ? 'PASSED' : 'FAILED'
}
```

### 4. 探针能力层 (infra/probes/*.ts)

```typescript
// infra/probes/fs-exists.ts
export async function executeFsExists(
  pattern: string,
  context: ProbeContext
): Promise<string[]> {
  // 真正触碰文件系统
  return await glob(pattern, { cwd: context.projectRoot })
}

// infra/probes/index.ts
// 运行时路由表
export const probeHandlers: Record<string, ProbeHandler> = {
  fs_exists: executeFsExists,
  fs_not_exists: executeFsNotExists,
  fs_match: executeFsMatch,
  shell_exec: executeShellExec
}
```

### 5. infra/staging/staging-manager.ts 修正

**现有代码问题**：
```typescript
// 当前：反向依赖
import { getTaskPath } from '../../kernel'  // ◄── 违规!
```

**修正后**：
```typescript
// 修正后：接收原始参数
export class StagingManager {
  constructor(
    private taskPath: string  // ◄── 原始路径，不引用 Kernel
  ) {}

  private get stagingPath(): string {
    return join(this.taskPath, 'staging')  // 自己计算
  }
}
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| Kernel 无 I/O | `grep -r "import.*fs" src/kernel/` 应返回空 |
| Kernel 无 process | `grep -r "import.*process" src/kernel/` 应返回空 |
| 纯函数签名 | 所有 Kernel 函数有明确输入/输出 |
| 唯一写入点 | 只有 `daemon/trace/writer.ts` 可写 `task-trace.yaml` |
| typecheck 通过 | `pnpm run typecheck` 无错误 |
