## ADDED Requirements

### Requirement: promote 执行文件 mv

`oxn arsenal promote` 命令执行 `mv draft.yaml canonical.yaml`，物理消灭 draft 文件。

#### Scenario: 晋升合法 draft.yaml
- **WHEN** 执行 `oxn arsenal promote stages/create-user`
- **AND** 目录下存在 `draft.yaml`
- **THEN** 系统执行 `mv draft.yaml canonical.yaml`
- **AND** `draft.yaml` 文件物理消失

#### Scenario: 拒绝晋升不存在的 draft
- **WHEN** 执行 `oxn arsenal promote stages/create-user`
- **AND** 目录下不存在 `draft.yaml`
- **THEN** 系统抛出错误：`No draft.yaml found`

#### Scenario: 晋升后生成 README
- **WHEN** 执行晋升操作
- **THEN** 确保资产目录下存在 `README.md`（可选，若不存在则跳过）

---

### Requirement: promote 原子性

晋升操作必须是原子的，要么成功（draft 变为 canonical），要么失败（draft 保持不变）。

#### Scenario: mv 成功则晋升成功
- **WHEN** `mv draft.yaml canonical.yaml` 返回成功
- **THEN** 资产状态更新为 `canonical`

#### Scenario: mv 失败则状态不变
- **WHEN** `mv draft.yaml canonical.yaml` 抛出异常
- **THEN** `draft.yaml` 保持不变，资产仍为 `draft` 状态
