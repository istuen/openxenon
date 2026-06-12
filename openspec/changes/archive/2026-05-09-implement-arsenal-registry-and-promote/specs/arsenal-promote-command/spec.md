## ADDED Requirements

### Requirement: CLI arsenal promote 命令

CLI SHALL 提供 `oxn arsenal promote <asset>` 命令，触发完整链路：验证 → 裁决 → 记录。

#### Scenario: 执行 promote
- **WHEN** 用户执行 `oxn arsenal promote http-check`
- **THEN** CLI 构造 JSON: `{ action: "arsenal_promote", asset: "http-check", assetType: "probes" }`
- **AND** 通过 Socket 发送到 Daemon
- **AND** 打印晋升结果

#### Scenario: 资产不在 draft 状态
- **WHEN** 用户尝试 promote 一个不是 draft 的资产
- **THEN** Daemon 返回错误：`Asset is not in draft state`
- **AND** CLI 打印错误信息

#### Scenario: 资产不存在
- **WHEN** 用户执行 `oxn arsenal promote nonexistent`
- **THEN** Daemon 返回错误：`Asset not found`
- **AND** CLI 打印错误信息

### Requirement: Daemon 验证 + 裁决

Daemon SHALL 在执行 promote 前验证 draft.yaml 的结构合法性，通过后执行文件重命名并更新 Registry。

#### Scenario: 校验失败
- **WHEN** Daemon 收到 `arsenal_promote` 请求
- **AND** draft.yaml 结构不合法
- **THEN** 返回错误：`Schema validation failed: <details>`
- **AND** 不执行文件操作

#### Scenario: 校验成功
- **WHEN** Daemon 收到 `arsenal_promote` 请求
- **AND** draft.yaml 结构合法
- **THEN** 执行 `renameSync(draft.yaml, canonical.yaml)`
- **AND** 更新 Registry 内存中的状态
- **AND** 调用 trace/writer 记录 PROMOTE 事件

### Requirement: 记录晋升事件

Daemon SHALL 在 task-trace.yaml 中追加 PROMOTE 事件，包含时间戳、资产名、资产类型。

#### Scenario: 追加 trace 记录
- **WHEN** promote 执行成功
- **THEN** trace/writer 追加：
```yaml
- timestamp: "2026-05-09T12:00:00Z"
  type: PROMOTE
  asset: http-check
  assetType: probes
  fromPath: ".openxenon/arsenals/probes/http-check/draft.yaml"
  toPath: ".openxenon/arsenals/probes/http-check/canonical.yaml"
```