# State Schema 参考

> OpenXenon v0.1 运行时 state.json 的完整 Schema 定义。

## 1. 概览

OpenXenon 有两类 state 文件：

| 文件 | 位置 | Schema 名 |
|---|---|---|
| Workspace state | `works/<w>/state.json` | `WorkspaceState` |
| Task state | `works/<w>/tasks/<t>/state.json` | `TaskState` |

## 2. WorkspaceState

```typescript
export const WorkspaceStateSchema = z.object({
  workName:       z.string().min(1),
  type:           z.enum(['task', 'plan', 'explore']),
  status:         z.enum(['CREATED', 'IN_PROGRESS', 'PASSED', 'FAILED']),
  blueprintNames: z.array(z.string()).default([]),
  domainNames:    z.array(z.string()).default([]),
  tasks: z.array(z.object({
    taskName:  z.string(),
    blueprint: z.string(),
    injects:   z.array(z.string()).default([]),
    status:    z.enum(['CREATED', 'RUNNING', 'PASSED', 'FAILED']),
  })).default([]),
  skillContext: z.object({
    overallGoal:   z.string().default(''),
    constraints:   z.array(z.string()).default([]),
    currentFocus:  z.string().default(''),
    maxIterations: z.number().default(3),
  }).optional(),
  partSpecs:   z.array(PartSpecSchema).optional(),
  partExecutions: z.array(PartExecutionSchema).optional(),
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
```

## 3. TaskState

```typescript
export const TaskStateSchema = z.object({
  taskName:    z.string(),
  blueprint:   z.string(),
  status:      z.enum(['CREATED', 'RUNNING', 'PASSED', 'FAILED']),
  currentPart: z.string().nullable(),
  completedParts: z.array(z.string()).default([]),
  partExecutions: z.array(PartExecutionSchema).default([]),
  objective:   z.string().optional(),
  constraints: z.array(z.string()).optional(),
  createdAt:   z.string(),
  updatedAt:   z.string(),
})
```

## 4. PartSpec / PartExecution

```typescript
export const PartSpecSchema = z.object({
  partName: z.string().min(1),
  align:    z.string(),                    // align 到的 slot 名
  ref:      z.string().optional(),         // v0.0.x 兼容
  skill: PartSkillSnapshotSchema,
})

export const PartExecutionSchema = z.object({
  partName:    z.string(),
  status:      z.enum(['pending', 'running', 'passed', 'failed']),
  startedAt:   z.string().optional(),
  completedAt: z.string().optional(),
  probeResults: z.array(ProbeResultSchema).optional(),
})

export const PartSkillSnapshotSchema = z.object({
  lifecycle:  z.string().default('code'),
  objective:  z.string().default(''),
  acceptance: z.array(z.string()).default([]),
  guidance:   z.string().optional(),
})
```

## 5. ProbeResult

```typescript
export const ProbeResultSchema = z.object({
  probeName:   z.string(),
  probeRef:    z.string().optional(),
  params:      z.record(z.string(), z.unknown()).optional(),
  passed:      z.boolean(),
  output:      z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs:  z.number().optional(),
})
```

## 6. frozen.json Schema

```typescript
export const FrozenBlueprintSchema = z.object({
  taskName:  z.string(),
  frozenAt:  z.string(),
  trace:     z.array(z.string()),           // 完成的 part 列表
  verdict:   z.enum(['PASSED', 'FAILED']),
  probes:    z.array(ProbeResultSchema),
  _xenon_meta: z.object({
    frozen_at:    z.string(),
    content_hash: z.string(),
    frozen:       z.literal(true),
  }),
})
```

## 7. Trace 日志格式

`work-trace.jsonl` / `task-trace.jsonl` 是 JSONL 格式：

```jsonl
{"event":"workspace-started","workName":"...","at":"..."}
{"event":"task-started","workName":"...","taskName":"...","at":"..."}
{"event":"task-passed","workName":"...","taskName":"...","at":"..."}
{"event":"part-started","partName":"...","at":"..."}
{"event":"probe-result","probeName":"...","passed":true,"at":"..."}
{"event":"part-passed","partName":"...","at":"..."}
{"event":"frozen","taskName":"...","frozenAt":"..."}
```

## 8. 工厂函数

```typescript
import {
  createInitialWorkspaceState,
  createInitialTaskState,
} from '@/work/dual-state'

// 初始 workspace
const ws = createInitialWorkspaceState({
  workName: 'onboarding',
  domains: ['MemberContext'],
  blueprints: ['dev-workflow'],
  tasks: [{ taskName: 'register-member', blueprint: 'dev-workflow', injects: [] }],
  maxIterations: 5,
})

// 初始 task
const ts = createInitialTaskState({
  workName: 'onboarding',
  taskName: 'register-member',
  blueprint: 'dev-workflow',
  partNames: ['build', 'test'],
  objective: '实现 Member 注册',
  constraints: ['禁用 User/Customer'],
})
```

## 9. 工具函数

```typescript
import {
  loadWorkspaceState,
  saveWorkspaceState,
  loadTaskState,
  saveTaskState,
  appendWorkspaceTrace,
  appendTaskTrace,
} from '@/work/dual-state'
```

## 10. 下一章

- [OXN DSL 参考](./oxl.md) — DSL 语法
- [CLI 命令参考](./cli-reference.md)
