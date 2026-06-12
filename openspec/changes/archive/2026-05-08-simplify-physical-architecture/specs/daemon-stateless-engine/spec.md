## ADDED Requirements

### Requirement: Daemon 无状态裁决

Daemon SHALL 是无状态裁决引擎，接收 JSON 对象、执行探针、写入 trace，不做任何持久化。

#### Scenario: 接收任务提交
- **WHEN** Daemon 接收 `TASK_SUBMIT` 消息
- **THEN** Daemon SHALL 解析 JSON payload
- **THEN** Daemon SHALL 创建 task-trace.yaml 文件
- **THEN** Daemon SHALL NOT 写入任何其他状态

### Requirement: 案卷唯一落盘

Daemon SHALL 通过 appendFileSync 写入 task-trace.yaml 作为唯一落盘操作。

#### Scenario: 写入 trace 事件
- **WHEN** Stage 执行完成时
- **THEN** Daemon SHALL append trace 事件到 task-trace.yaml

### Requirement: 探针执行

Daemon SHALL 通过 daemon/probes/ 目录下的探针实现来验证 Stage。

#### Scenario: 执行 fs-exists 探针
- **WHEN** Stage 需要验证文件存在性时
- **THEN** Daemon SHALL 调用 fs-exists.probe.ts
- **THEN** Daemon SHALL 记录探针结果到 trace

### Requirement: DAG 调度

Daemon SHALL 按照 Blueprint 中定义的 DAG 拓扑顺序执行 Stage。

#### Scenario: 按拓扑顺序执行
- **WHEN** Stage 有依赖的前置 Stage 时
- **THEN** Daemon SHALL 仅在前置 Stage 完成后执行该 Stage