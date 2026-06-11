# State 详解

> OpenXenon v0.1 引入**双层 state.json** — WorkspaceState + TaskState 独立读写，通过 workName 关联。

> **代码物理归属**：state.json 由 L2 Work（写入）与 L3 CLI（调用入口）共同维护；完整 L0-L3 分层与依赖规则见 [L0-L3 宪法](./l0-l3-constitution.md)。

## 1. 双层设计

```
.openxenon/works/<work>/
├── state.json                ← WorkspaceState（work 级）
└── tasks/
    └── <task>/
        └── state.json        ← TaskState（task 级）
```

| 层级 | 文件 | 内容 | 谁写 |
|---|---|---|---|
| **WorkspaceState** | `works/<w>/state.json` | work 全局状态：task 列表、blueprint 引用、context | `oxn work run` |
| **TaskState** | `works/<w>/tasks/<t>/state.json` | 单 task 状态：part 执行历史、probe 结果、当前 part | `oxn work submit` |

两层**独立**读写，故障时**可独立恢复**（v0.2 接入守护进程自动恢复）。

## 2. WorkspaceState Schema

```typescript
{
  workName: string
  type: 'task' | 'plan' | 'explore'           // 与 Blueprint.type 强绑定
  status: 'CREATED' | 'IN_PROGRESS' | 'PASSED' | 'FAILED'
  blueprintNames: string[]                     // Work 引用的 blueprint
  domainNames: string[]                        // Work 引用的 domain
  tasks: Array<{
    taskName: string
    blueprint: string                          // 绑定的 blueprint
    injects: string[]                          // 兼容字段（v0.1-final 中为 domain align）
    status: 'CREATED' | 'RUNNING' | 'PASSED' | 'FAILED'
  }>
  skillContext: {
    overallGoal: string
    constraints: string[]
    currentFocus: string                       // 当前执行的 task 名
    maxIterations: number
  }
  createdAt: string                            // ISO 8601
  updatedAt: string
}
```

## 3. TaskState Schema

```typescript
{
  taskName: string
  blueprint: string
  status: 'CREATED' | 'RUNNING' | 'PASSED' | 'FAILED'
  currentPart: string | null                   // 当前 part 名
  completedParts: string[]                     // 已 pass 的 part 列表
  partExecutions: Array<{                      // 每个 part 的执行记录
    partName: string
    status: 'pending' | 'running' | 'passed' | 'failed'
    startedAt?: string
    completedAt?: string
    probeResults?: Array<{                     // v0.2 接入
      probeName: string
      probeRef: string
      passed: boolean
      durationMs: number
    }>
  }>
  objective?: string
  constraints?: string[]
  createdAt: string
  updatedAt: string
}
```

## 4. 状态转换图

### Workspace 状态

```
   oxn work run
        │
        ▼
   ┌────────┐    所有 task pass     ┌────────┐
   │CREATED │ ────────────────────▶ │PASSED  │
   │        │                       └────────┘
   │        │ 部分 task 在跑
   │        │ ◀─────────┐
   │        │           │
   │        │           │       ┌────────┐
   └────────┘  ┌────────┐         │        │
        │      │IN_PROG.│ ──────▶ │FAILED  │
        │      │ RESS   │ 部分失败│        │
        │      └────────┘         └────────┘
        │
        └─▶ (work 重复 run 会被 OXN_WORK_ALREADY_EXISTS 拦截)
```

### Task 状态

```
   task 创建（oxn work add-task）
        │
        ▼
   ┌────────┐   首个 part 进入     ┌────────┐
   │CREATED │ ────────────────────▶│RUNNING │
   │        │                      │        │
   │        │                      │        │
   └────────┘                      └───┬────┘
                                       │
                            所有 part pass    某 part probe fail
                                       │              │
                                       ▼              ▼
                                  ┌────────┐    ┌────────┐
                                  │PASSED  │    │FAILED  │
                                  └────────┘    └────────┘
```

## 5. Trace 日志

每次状态变更**追加写** trace，不修改历史：

### work-trace.jsonl（Work 级）

```jsonl
{"event":"workspace-started","workName":"onboarding","blueprints":["dev-workflow"],"domains":["MemberContext","OrderContext"],"tasks":["RegisterMember","GrantWelcomeBonus"],"at":"2026-06-05T07:00:00Z"}
{"event":"task-started","workName":"onboarding","taskName":"RegisterMember","at":"2026-06-05T07:00:01Z"}
{"event":"task-passed","workName":"onboarding","taskName":"RegisterMember","at":"2026-06-05T07:00:30Z"}
```

### task-trace.jsonl（Task 级）

```jsonl
{"event":"part-started","partName":"build","at":"2026-06-05T07:00:01Z"}
{"event":"probe-result","probeName":"shell-exec","passed":true,"durationMs":1500,"at":"2026-06-05T07:00:02Z"}
{"event":"part-passed","partName":"build","at":"2026-06-05T07:00:03Z"}
```

## 6. frozen.json（判决快照）

验证通过后生成**只读**判决快照：

```json
{
  "taskName": "register-member",
  "frozenAt": "2026-06-05T07:00:30Z",
  "trace": ["build", "test"],
  "verdict": "PASSED",
  "probes": [
    {"name": "shell-exec", "passed": true, "durationMs": 1500}
  ],
  "_xenon_meta": {
    "frozen_at": "2026-06-05T07:00:30Z",
    "content_hash": "abc123...",
    "frozen": true
  }
}
```

**frozen 性质**：
- 生成后**不可修改**（仅写一次）
- 含 `_xenon_meta` 元信息（hash、时间）
- 是任务"完成"的最终证据
- 工程师审查时只需看 frozen.json

## 7. CLI 操作对照

| 操作 | 影响文件 |
|---|---|
| `oxn work run` | 写 `state.json` (workspace) + 每 task 的 `state.json` (task) |
| `oxn work submit` | 更新对应 task 的 `state.json` + 追加 trace + 完成时写 `frozen.json` |
| `oxn work status` | 读 workspace + 所有 task 的 state |
| `oxn work context` | 不写任何 state；只读 work/task 生成 CONTEXT |

## 8. v0.1 限制

- State **未加密**，可手工编辑（v0.2 引入签名验证）
- Trace **未压缩**（v0.2 引入归档）
- Workspace 状态崩溃需手工重置（v0.2 引入自动恢复）

## 9. 下一章

- [信息隐藏原则](../core/document.md#27-信息隐藏原则)
- [OXN DSL 参考](../reference/oxl.md)
