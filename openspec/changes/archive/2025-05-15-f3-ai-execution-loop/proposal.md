## Why

当前 `taskNext` 向 AI 暴露了 `probes` 和 `spec` 字段，违反了 OpenXenon 的对抗性 AI 设计原则。如果 AI 知道了评分标准（probes）和详细约束（spec），它会迎合而不是解决业务问题。

同时，F3 AI 执行闭环尚未完整实现：AI 不知道只应该看到 `target` + `action`，`taskVerify` 也没有形成完整的裁决闭环。

## What Changes

- **修改 `taskNext` 返回值**：只返回 `target`（战场范围）和 `action`（行动指令），隐藏 `spec` 和 `probes`
- **实现 F3 裁决闭环**：`taskVerify` 从 `frozen.yaml` 读取 probes，在真实文件系统上执行校验
- **添加 FAILED 阻断**：如果 `taskVerify` 失败，状态机卡死，`taskNext` 拒绝推进
- **状态机修正**：Stage 状态增加 `EXECUTING`（AI 干活中），`taskNext` 不再返回 `proof` JSON

## Capabilities

### New Capabilities

- `f3-ai-execution-loop`: AI 执行闭环的核心协议。定义 AI 与 Core 的交互边界：AI 只收到 `target` + `action`，Core 通过 probes 在真实世界裁决。

### Modified Capabilities

- `task-execution`: 修改 `taskNext` 的响应格式（移除 spec/proof），添加验证阻断逻辑

## Impact

- `src/cli/task-filesystem.ts`: `taskNext` 返回值重构
- `src/kernel/compiler/blueprint-compiler.ts`: FrozenBlueprint 格式确认
- CLI task 命令行为变更（next 不再返回 proof）
