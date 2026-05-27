## Context

当前 `oxn task` 命令依赖 daemon 运行才能工作——`task submit`、`task next`、`task verify` 都需要 daemon 接收 Socket JSON 并执行验证。但自举场景下 daemon 尚未实现，导致 CLI 完全不可用。

根据 ARCHITECTURE.md v1.1 三层架构：
- CLI 是"一次性扳机"，只负责编排
- Daemon 是"裁决容器"，负责协调 Kernel + Infra
- Kernel 是"兰姆达真空"，只做符号归约
- Infra 是"图灵机边界"，唯一触碰物理硬件

当前问题：CLI 的 task 命令与 Daemon 耦合过紧，无法独立运行。

## Goals / Non-Goals

**Goals:**
- CLI task 命令直接操作文件系统，不依赖 daemon
- task 状态机（submit → next → verify → status）完整可用
- Probe 执行通过 Infra 实现（物理观测），Kernel 实现评判（纯函数）
- trace.yaml 追加审计日志，step-manifest.json 记录步骤级状态
- 为未来 daemon 监控模式留有扩展接口

**Non-Goals:**
- 不实现 daemon 的 Socket IPC 机制
- 不改变 Kernel/Infra 的纯函数/物理边界职责
- 不修改 ProbeDefinition/ProbeInvocation 等现有 schema
- 不实现 timeout/escape 检测（daemon 未来功能）

## Decisions

### 1. CLI 直接操作文件系统，不通过 daemon

**决定**：CLI 直接读写 `.openxenon/tasks/<task-id>/` 下的文件。

**理由**：
- 自举路径必须 CLI 可独立运行，不能依赖未实现的 daemon
- "谁执行，谁记录"——CLI 执行 verify，写入 trace.yaml
- 文件系统作为 EventBus（符合 ARCHITECTURE.md 6.3 节）

**替代方案考虑**：
- 替代方案 A：CLI 通过 Unix Socket 发 JSON 给 daemon → 依赖 daemon，未采纳
- 替代方案 B：CLI 直接文件操作 → 采纳，符合物理边界原则

### 2. 四个文件分工

| 文件 | 写入时机 | 写入者 | 内容 |
|------|---------|--------|------|
| `blueprint.yaml` | submit | CLI | 原始 Blueprint，只读 |
| `state.json` | next, verify | CLI | Stage 级状态机 |
| `trace.yaml` | verify | CLI | 追加审计日志 |
| `step-manifest.json` | verify | CLI | 步骤级状态明细 |

### 3. Probe 执行路径

```
verify --stage-id <id>
  │
  ├─ 读取 blueprint.yaml，找到该 Stage 的 Proof
  ├─ 读取 .openxenon/arsenal/probes/<type>/canonical.yaml
  ├─ Infra 执行物理观测（fs.exists, shell.exec）
  ├─ Kernel 纯函数归约（passed/failed）
  ├─ CLI 追加 trace.yaml
  └─ CLI 更新 state.json
```

### 4. Stage 状态机

```
PENDING → RUNNING → PASSED
                → FAILED
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| CLI 和 daemon 同时操作同一文件 | 文件锁（未来），当前约定不并发 |
| trace.yaml 无限增长 | 定期归档机制（未来），当前append |
| BlueprintSchema 未定义，无法校验 | 用 YAML 解析 + Zod 基础校验，P3 补全 |