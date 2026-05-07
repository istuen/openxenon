## ADDED Requirements

### Requirement: draft.yaml 临时状态

AI 生成的待审核资产使用 `draft.yaml` 作为临时文件名，表示尚未经过人类确权。

#### Scenario: AI 生成新资产
- **WHEN** AI 执行 `/oxn-forge` 生成新资产
- **THEN** 生成的资产文件名为 `draft.yaml`，存放在对应类型目录下

#### Scenario: draft.yaml 状态为待审核
- **WHEN** 资产目录下存在 `draft.yaml`
- **THEN** 该资产状态为 `draft`，尚未确权

#### Scenario: draft.yaml 不能被 Daemon 执行
- **WHEN** Daemon 接收到指向 `draft.yaml` 的执行请求
- **THEN** Daemon 拒绝执行，要求先晋升为 `canonical.yaml`

---

### Requirement: draft.yaml 内容格式

`draft.yaml` 内容格式与 `canonical.yaml` 完全一致，仅文件名不同。

#### Scenario: draft.yaml 结构验证
- **WHEN** 读取 `draft.yaml` 内容
- **THEN** 内容符合对应资产类型的 Schema 定义（Stage/Probe/Blueprint）

#### Scenario: draft 与 canonical Schema 相同
- **WHEN** 对比 `draft.yaml` 和 `canonical.yaml` 的结构
- **THEN** 两者使用完全相同的 Schema 定义
