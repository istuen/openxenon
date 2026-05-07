## Why

当前 `task-trace.yaml` 使用 `writeFileSync` 全量覆盖写入，在 AI 进程与 Daemon 进程并发访问时存在竞态条件风险。当 AI 正在写入 step-manifest.json 时，Daemon 可能在同一时刻覆写 task-trace.yaml，导致其中一处更新丢失。

根据物理架构宪法第二条（POSIX 原子操作即法律）和第四条（内存时钟与纯文本溯源），task-trace.yaml 必须改为 append-only 追加写入模式，使其成为一个不可篡改的操作日志。

## What Changes

- 重构 `task-trace.yaml` 存储格式：从全量 JSON 覆盖 → 每行一个 JSON 对象的追加日志
- `writeTaskTrace()` 废弃，改为 `appendTraceEvent()` 追加事件
- `readTaskTrace()` 重构为从首行顺序读到末行，根据最后一条记录推导当前状态
- 删除所有 `new Date().toISOString()` 时间戳生成，改为由 Daemon 进程在 append 时注入系统时间戳
- 保持 `task-trace.yaml` 位于 `.openxenon/tasks/<task_id>/task-trace.yaml` 的路径不变

## Capabilities

### New Capabilities

- `append-only-trace`: Task 执行轨迹的不可变追加日志。所有状态变更都作为带时间戳的事件顺序追加到文件末尾，读取时从第一行扫描到最后一行，以最后出现的状态作为当前状态。

### Modified Capabilities

- `task-execution`: 当前 task-execution spec 中描述的是数据库写入行为（steps table, escape_logs table）。需要改为文件系统追加写入的行为描述。此 Capability 的需求发生了实质性变更（从 DB 模式 → Append-only 文件模式）。

## Impact

- **写入方变更**：`src/lib/task-trace.ts` 中 5 个写入函数全部重构
- **读取方变更**：所有调用 `readTaskTrace()` 的 24 处代码需要适配新格式
- **时间戳来源变更**：不再允许 AI 在 manifest 或 trace 中生成时间戳，时间戳唯一来源是 Daemon 内存时钟或操作系统 `fs.stat`
- **与 manifest 的协调**：`step-manifest.json` 记录 AI 的心跳，`task-trace.yaml` 记录 Daemon 的判决，两者独立追加，无交叉写入
