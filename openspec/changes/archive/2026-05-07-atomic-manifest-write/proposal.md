## Why

当前 `step-manifest.json` 使用 `writeFileSync` 直接覆写文件。当 AI 进程正在写入 manifest 时，Daemon 的 watcher 可能同时读取到不完整的 JSON 内容，导致解析失败或读取到中间状态。

根据物理架构宪法第二条（POSIX 原子操作即法律），所有涉及多进程交互的文件写入必须先写 `.tmp` 临时文件，再通过 OS 的 `rename()` 系统调用完成原子覆盖。

## What Changes

- 重构 `writeStepManifest()` 函数：先写入 `.tmp` 文件，再 `renameSync()` 到目标路径
- `step-manifest.json` 的读取仍然使用 `readFileSync`，无需变更
- 删除 `createEmptyStepManifest()` 中的 `timestamp` 字段（违反宪法第四条）
- 保持 `step-manifest.json` 位于 `.openxenon/tasks/<task_id>/step-manifest.json` 的路径不变

## Capabilities

### New Capabilities

- `atomic-manifest-write`: step-manifest.json 的原子写入能力。写入时先写入 `.tmp` 临时文件，通过 OS rename() 原子操作覆盖目标文件。

### Modified Capabilities

- 无（此变更不改变任何 spec 级别的需求，只是实现层面的重构）

## Impact

- **写入方变更**：`src/core/manifest.ts` 中 `writeStepManifest()` 函数重构
- **影响范围**：3处调用（task-submit.ts, task-start.ts, tests）
- **时间戳语义变更**：`StepManifest.timestamp` 字段的含义从"AI生成时间"变为"最后修改时间"（由 OS fs.stat 替代）
