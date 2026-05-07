## Context

### 背景现状

当前 `task-trace.yaml` 是一个全量 JSON 结构文件，每次状态变更（如 stage 开始、probe 执行）都触发完整的文件覆写：

```typescript
// 当前实现 (task-trace.ts:37-38)
export function writeTaskTrace(taskDir: TaskDirectory, trace: TaskTraceYaml): void {
  writeFileSync(taskDir.tracePath, JSON.stringify(trace, null, 2), 'utf-8')
}
```

这导致两个问题：

1. **竞态条件**：当 AI 进程在写 `step-manifest.json` 时，Daemon 进程可能同时覆写 `task-trace.yaml`，造成其中一处更新被覆盖
2. **时间戳不一致**：当前代码在多处生成 `new Date().toISOString()` 时间戳（task-trace.ts:15,47,104），违反了宪法第四条"时间戳唯一来源是 Daemon 内存时钟"的原则

### 约束条件

- 文件路径不变：`.openxenon/tasks/<task_id>/task-trace.yaml`
- 必须兼容已存在的 task-trace.yaml 文件（需设计迁移策略）
- 读取性能不能显著下降（当前是简单的 `JSON.parse`）
- 与 `step-manifest.json` 的 watcher 机制解耦（各自独立追加）

---

## Goals / Non-Goals

**Goals:**
- 将 `task-trace.yaml` 从全量覆写改为 append-only 追加写入
- 消除 Daemon 与 AI 进程间的文件写入竞态条件
- 时间戳统一由 Daemon 进程在 append 时注入，不允许 AI 写入时间戳
- 保持 task-trace.yaml 作为纯文本日志的可读性（`cat` 即可阅读）

**Non-Goals:**
- 不改变 `task-trace.yaml` 的文件路径
- 不实现复杂的日志压缩或滚动策略（v0.1.0 保持简单追加）
- 不改变 `step-manifest.json` 的格式（它有自己的原子写入规则）
- 不实现远程日志收集（超出 v0.1.0 范围）

---

## Decisions

### Decision 1: 换行符分隔的 JSON 行流（JSONL）格式

**选择**：每行是一个独立的 JSON 对象，appendFileSync 追加到文件末尾

**格式示例**：
```yaml
{"type":"TASK_START","taskId":"task_001","taskName":"部署 DB","timestamp":1715078400000}
{"type":"STAGE_START","taskId":"task_001","stageId":"s1","stageName":"init","timestamp":1715078410000}
{"type":"STAGE_COMPLETE","taskId":"task_001","stageId":"s1","status":"PASSED","timestamp":1715078450000}
{"type":"PROBE_RESULT","taskId":"task_001","stageId":"s1","probe":"exists","result":"PASSED","timestamp":1715078460000}
{"type":"TASK_STATUS","taskId":"task_001","status":"RUNNING","timestamp":1715078465000}
```

**理由**：
- appendFileSync 是 POSIX 原子追加操作，多进程并发追加不会导致数据交叉（每条记录完整）
- 相比 SQLite 插入，JSONL 追加无需锁机制，天然并发安全
- 人类可读，`cat task-trace.yaml | jq` 即可格式化查看
- `wc -l` 即可统计事件数量

**替代方案考虑**：
- **SQLite WAL 模式**：引入数据库复杂度，且违背宪法第一条"零数据库原则"
- **单个 JSON 对象追加**（不带换行）：无法区分记录边界，不可行
- **Binary format**（MessagePack）：不可人类阅读，否决

---

### Decision 2: 事件类型设计

| 事件 Type | 触发时机 | 携带字段 |
|-----------|---------|---------|
| `TASK_START` | task-trace.yaml 创建时 | taskId, taskName, timestamp |
| `TASK_STATUS` | 任务状态变更（RUNNING→COMPLETED/FAILED/ESCAPED） | taskId, status, timestamp |
| `STAGE_START` | Stage 开始执行 | taskId, stageId, stageName, timestamp |
| `STAGE_COMPLETE` | Stage 完成（PASSED/FAILED） | taskId, stageId, status, timestamp |
| `PROBE_RESULT` | Probe 执行结果 | taskId, stageId, probeType, result, output?, error?, timestamp |

**每条事件都携带 `timestamp`**，由 Daemon 在 append 时注入当前系统时钟（毫秒级 Unix 时间戳）。

---

### Decision 3: Reader 算法（状态重建）

读取时从第一行顺序扫描到最后一行，以最后出现的状态作为当前状态：

```typescript
export function readTaskTrace(taskDir: TaskDirectory): TaskTraceState {
  const events = readLines(taskDir.tracePath)

  let state: TaskTraceState = {
    taskId: '',
    taskName: '',
    status: 'NOT_FOUND',
    startedAt: 0,
    completedAt: undefined,
    stages: new Map()
  }

  for (const event of events) {
    switch (event.type) {
      case 'TASK_START':
        state.taskId = event.taskId
        state.taskName = event.taskName
        state.startedAt = event.timestamp
        state.status = 'RUNNING'
        break
      case 'TASK_STATUS':
        state.status = event.status
        if (event.status !== 'RUNNING') {
          state.completedAt = event.timestamp
        }
        break
      case 'STAGE_START':
        state.stages.set(event.stageId, {
          stageId: event.stageId,
          stageName: event.stageName,
          status: 'PENDING',
          probes: [],
          startedAt: event.timestamp
        })
        break
      case 'STAGE_COMPLETE':
        const stage = state.stages.get(event.stageId)
        if (stage) {
          stage.status = event.status
          stage.completedAt = event.timestamp
        }
        break
      case 'PROBE_RESULT':
        const s = state.stages.get(event.stageId)
        if (s) {
          s.probes.push({
            probeType: event.probeType,
            result: event.result,
            output: event.output,
            error: event.error,
            executedAt: event.timestamp
          })
        }
        break
    }
  }

  return state
}
```

**性能考量**：
- 文件行数 = 事件数量，v0.1.0 预期单 task 不超过 1000 行
- 顺序扫描 1000 行 JSON < 10ms（Bun 的 JSON.parse 极快）
- 如未来性能不足，可缓存最后读取状态，但 v0.1.0 暂不需要

---

### Decision 4: 时间戳来源

**规则**：时间戳由 Daemon 进程的内存时钟生成，格式为 Unix 毫秒时间戳。

```typescript
// 在 appendTraceEvent 中注入时间戳
function appendTraceEvent(taskDir: TaskDirectory, event: TraceEvent): void {
  const eventWithTimestamp = {
    ...event,
    timestamp: Date.now()  // Daemon 内存时钟，操作系统级别精度
  }
  const line = JSON.stringify(eventWithTimestamp) + '\n'
  appendFileSync(taskDir.tracePath, line, 'utf-8')
}
```

**禁止项**：
- AI 禁止在 step-manifest.json 中写入时间戳
- AI 禁止在 task-trace.yaml 中写入时间戳（AI 不直接写此文件）
- task-trace.ts 中的 `createProbeResult()` 等函数不再接收时间戳参数

---

### Decision 5: 迁移策略

**已存在的 task-trace.yaml 文件**（旧格式：全量 JSON）：
1. 检测文件第一行是否以 `{` 开头（JSON 对象而非事件行）
2. 如果是，尝试解析为旧格式 `TaskTraceYaml`
3. 将旧格式的每个 stage/probe 转换为对应的追加事件
4. 追加 `TASK_STATUS` 事件反映当前状态
5. 迁移完成后，文件变为新格式

```typescript
export function migrateIfNeeded(taskDir: TaskDirectory): void {
  if (!existsSync(taskDir.tracePath)) return

  const firstLine = readFileSync(taskDir.tracePath, 'utf-8').split('\n')[0]
  if (!firstLine.trim().startsWith('{')) return  // 已经是新格式

  // 旧格式迁移逻辑...
}
```

**迁移时机**：Daemon 进程启动扫描 `.openxenon/tasks/*/task-trace.yaml` 时自动触发（宪法第四条"秒级重建"机制）。

---

## Risks / Trade-offs

| Risk | 描述 | Mitigation |
|------|------|------------|
| **文件无限增长** | 长时间运行的任务，task-trace.yaml 可能变得很大 | v0.1.0 暂不处理，未来可追加 "归档" 事件标记旧事件可归档 |
| **读取性能退化** | 如果 task 有 10000+ 行事件，顺序扫描可能变慢 | v0.1.0 限制 task 最大 1000 行；未来可缓存最后状态到内存 |
| **格式迁移失败** | 如果旧格式 task-trace.yaml 损坏，可能迁移失败 | 迁移前先备份，失败则保留原文件并记录错误 |
| **行被截断** | 如果 appendFileSync 被中断，可能出现不完整的行 | Reader 跳过解析失败的行（graceful degradation） |

---

## Open Questions

1. **回放语义**：如果需要"重新执行"一个 task，是追加新的事件还是清空重建？
   - 当前设计：追加新事件。旧的 TASK_START 事件会被新的覆盖。
   - 需要确认是否需要 `TASK_RESTART` 事件类型。

2. **事件溯源 vs 状态快照**：当前设计是纯 append-only 事件日志。
   - 是否需要保留"当前状态快照"的快速查询能力（如每 100 事件写一行 SNAPSHOT）？
   - v0.1.0 暂不需要，未来可扩展。

3. **与 step-manifest.json 的关系**：
   - step-manifest.json 记录 AI 的 PENDING/RUNNING/PASSED 状态
   - task-trace.yaml 记录 Daemon 的 STAGE_COMPLETE/PROBE_RESULT 状态
   - 两者独立写入，是否需要相互引用？目前设计为完全解耦。
