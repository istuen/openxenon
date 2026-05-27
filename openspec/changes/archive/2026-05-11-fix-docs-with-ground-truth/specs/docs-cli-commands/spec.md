## ADDED Requirements

### Requirement: README CLI 速查表只包含实际存在的命令

README.md 的 CLI 速查表 SHALL 只包含 src/cli/index.ts 中实际定义的命令。

#### Scenario: oxn init 命令存在于速查表
- **WHEN** 检查 README.md CLI 速查表
- **THEN** 包含 `oxn init` 命令说明

#### Scenario: oxn daemon 子命令存在于速查表
- **WHEN** 检查 README.md CLI 速查表
- **THEN** 包含 `oxn daemon start/stop/status` 命令说明

#### Scenario: oxn task 子命令存在于速查表
- **WHEN** 检查 README.md CLI 速查表
- **THEN** 包含 `oxn task submit/next/verify/status` 命令说明
- **THEN** 不包含 `oxn task new/list/show/start/stop/trace` 等不存在的命令

#### Scenario: oxn arsenal 子命令存在于速查表
- **WHEN** 检查 README.md CLI 速查表
- **THEN** 包含 `oxn arsenal list/inspect/promote` 命令说明

#### Scenario: oxn forge 命令存在于速查表
- **WHEN** 检查 README.md CLI 速查表
- **THEN** 包含 `oxn forge [type] --save --name` 命令说明

### Requirement: 04-cli-ref.md 只包含实际存在的命令

docs/manual/04-cli-ref.md SHALL 只列出 src/cli/ 中实现的命令。

#### Scenario: oxn init 文档存在且参数正确
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn init
- **THEN** 包含正确的命令格式：`oxn init`
- **THEN** 无需参数

#### Scenario: oxn task submit 文档存在且参数正确
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn task submit
- **THEN** 包含正确格式：`oxn task submit --blueprint <file>`
- **THEN** 参数为 `--blueprint`（非 `-b` 或其他）

#### Scenario: oxn task next 文档存在且参数正确
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn task next
- **THEN** 包含正确格式：`oxn task next --task-id <id>`

#### Scenario: oxn task verify 文档存在且参数正确
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn task verify
- **THEN** 包含正确格式：`oxn task verify --task-id <id> --stage-id <id>`

#### Scenario: oxn arsenal list 文档存在
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn arsenal list
- **THEN** 包含正确格式：`oxn arsenal list [DRAFT|CANONICAL]`

#### Scenario: oxn arsenal promote 文档存在且参数正确
- **WHEN** 检查 docs/manual/04-cli-ref.md 中的 oxn arsenal promote
- **THEN** 包含正确格式：`oxn arsenal promote <asset-path>`

#### Scenario: 不存在的命令不在文档中
- **WHEN** 检查 docs/manual/04-cli-ref.md
- **THEN** 不包含 `oxn prove`
- **THEN** 不包含 `oxn proof-list`
- **THEN** 不包含 `oxn trace`
- **THEN** 不包含 `oxn inspect`
- **THEN** 不包含 `oxn force-pass`
- **THEN** 不包含 `oxn rollback`
- **THEN** 不包含 `oxn migrate`（standalone）
- **THEN** 不包含 `oxn task new/list/show/start/stop/trace`

### Requirement: 05-arsenal.md Probe 示例使用 Definition 格式

docs/manual/05-arsenal.md 中的 Probe 示例 SHALL 使用 ProbeDefinitionSchema 格式。

#### Scenario: Probe 示例使用 definition 格式
- **WHEN** 检查 docs/manual/05-arsenal.md 中的 Probe YAML 示例
- **THEN** 使用 `type` + `description` + `parameters` 格式
- **THEN** 不使用 `params` 格式

#### Scenario: Probe parameters 包含 description
- **WHEN** 检查 Probe 示例中的 parameters
- **THEN** 每个 parameter 包含 `name`、`type`、`description` 字段
- **THEN** `description` 字段是 required

### Requirement: 06-troubleshooting.md 使用正确的命令名

docs/manual/06-troubleshooting.md SHALL 使用 `oxn arsenal` 而非 `oxn standards`。

#### Scenario: standards 命令替换为 arsenal
- **WHEN** 检查 docs/manual/06-troubleshooting.md
- **THEN** 不包含 `oxn standards list`
- **THEN** 不包含 `oxn standards inspect`
- **THEN** 不包含 `oxn standards promote`
- **THEN** 使用 `oxn arsenal list/inspect/promote` 替代