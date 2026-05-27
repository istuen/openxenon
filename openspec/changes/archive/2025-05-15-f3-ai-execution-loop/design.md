## Context

当前 `taskNext` 返回完整 `proof` JSON（含 probes），AI 可以看到评分标准和约束条件。这违反了 OpenXenon 的对抗性 AI 设计原则。

`taskNext` 当前返回：
```typescript
{ stageId, name, proof: "{\"probeRefs\":[...]}", message }
```

F3 AI 执行闭环要求：
```typescript
{ taskId, stageId, target: { description, glob? }, action: { instruction?, command? } }
// spec 和 probes 对 AI 完全隐藏
```

## Goals / Non-Goals

**Goals:**
- `taskNext` 只返回 `target` + `action`，对 AI 隐藏 probes/spec
- `taskVerify` 从 `frozen.yaml` 读取 probes 执行裁决
- 验证失败时状态机阻断，`taskNext` 拒绝推进

**Non-Goals:**
- XnRadar 文件监听守护进程（P2 功能）
- BROKEN/BLOCKED 复杂状态机（简化为 FAILED 阻断）
- step-manifest.json（AI 自己报告工作量，让 probes 查验真实世界）

## Decisions

### Decision 1: `taskNext` 返回值重构

**选择**：修改 `NextResult` 接口，只保留 `target` 和 `action`

**理由**：
- 最简实现，不需要拆分 API
- AI 只需要知道"在哪个战场干什么指令"
- probes 是 Core 的私有裁决数据，AI 不应看到

```typescript
interface NextResult {
  taskId: string
  stageId: string
  target: { description: string; glob?: string }
  action: { instruction?: string; command?: string }
}
```

### Decision 2: 验证阻断机制

**选择**：简单 FAILED 阻断，不引入 BROKEN/BLOCKED 状态

**理由**：
- MVP 阶段不需要复杂状态机
- 只要 `taskVerify` 失败，`taskNext` 返回错误拒绝推进
- 工程师可选择 abort 或 retry

```typescript
// taskNext 逻辑
if (stage.status === 'FAILED') {
  throw new Error(`Stage "${stageName}" verification failed. Abort or retry.`)
}
```

### Decision 3: FrozenBlueprint 是唯一真相源

**选择**：`taskVerify` 从 `frozen.yaml` 读取 probes，不从内存传递

**理由**：
- 确保运行时数据一致性
- 物理隔离原始 Blueprint 和运行时数据
- 符合 F2 冻结协议

## Risks / Trade-offs

- [Risk] AI 可能通过其他途径猜到 probes → [Mitigation] MVP 阶段接受，重度防护在 XnRadar 实现后
- [Risk] 状态机 FAILED 后无法恢复 → [Mitigation] 提供 `taskAbort` 和 `taskRetry` 命令（后续实现）
