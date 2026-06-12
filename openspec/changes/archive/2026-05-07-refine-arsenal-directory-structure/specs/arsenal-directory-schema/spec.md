## ADDED Requirements

### Requirement: Arsenal 资产目录结构

每个 Arsenal 资产位于独立目录下，目录结构为：
- `README.md`：人类/AI 可读的说明文档
- `canonical.yaml`：已确权的资产标准契约

#### Scenario: Stage 类型资产结构
- **WHEN** 查看 `.openxenon/arsenals/stages/create-user/` 目录
- **THEN** 目录下包含 `README.md` 和 `canonical.yaml`

#### Scenario: Probe 类型资产结构
- **WHEN** 查看 `.openxenon/arsenals/probes/fs-exists/` 目录
- **THEN** 目录下包含 `README.md` 和 `canonical.yaml`

#### Scenario: Blueprint 类型资产结构
- **WHEN** 查看 `.openxenon/arsenals/blueprints/user-auth/` 目录
- **THEN** 目录下包含 `README.md` 和 `canonical.yaml`

---

### Requirement: README.md 内容规范

`README.md` 是资产的产品说明书，帮助 AI 判断该资产是否匹配当前 Task。

#### Scenario: README 包含资产描述
- **WHEN** AI 读取 Arsenal 资产目录
- **THEN** `README.md` 包含该资产的用途、约束条件、使用场景说明

#### Scenario: README 用于资产匹配
- **WHEN** AI 执行 Task 时寻找合适的资产
- **THEN** AI 阅读 `README.md` 内容判断该资产是否适用
