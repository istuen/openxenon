## ADDED Requirements

### Requirement: /oxn-forge 指令

工程师 SHALL 能够通过 `/oxn-forge` 指令使用自然语言描述生成标准资产（Probe/Proof/Stage）。

#### Scenario: 生成 Probe
- **WHEN** 工程师输入 `/oxn-forge "帮我写一个检查 Laravel 安装成功的 Probe"`
- **THEN** AI 模型 SHALL 生成符合 Probe Schema 的 YAML 文件
- **AND** 文件 SHALL 被保存到 `.openxenon/standards/probes/DRAFT/` 目录

#### Scenario: 生成 Proof
- **WHEN** 工程师输入 `/oxn-forge "帮我写一个验证 Laravel 安装的 Proof，引用已有的 Probe"`
- **THEN** AI 模型 SHALL 生成符合 Proof Schema 的 YAML 文件
- **AND** 文件 SHALL 被保存到 `.openxenon/standards/proofs/DRAFT/` 目录

#### Scenario: 生成 Stage
- **WHEN** 工程师输入 `/oxn-forge "帮我写一个安装 Laravel 的 Stage"`
- **THEN** AI 模型 SHALL 生成符合 Stage Schema 的 YAML 文件
- **AND** 文件 SHALL 被保存到 `.openxenon/standards/stages/DRAFT/` 目录

### Requirement: Draft 资产只做结构校验

Core 引擎 SHALL 对 Draft 资产只进行 Zod Schema 校验，禁止实际执行任何探针逻辑。

#### Scenario: 校验通过
- **WHEN** AI 生成的 Draft YAML 通过 Zod Schema 校验
- **THEN** 资产 SHALL 被物理保存到 DRAFT 目录
- **AND** Core SHALL 输出 "Draft asset created successfully"

#### Scenario: 校验失败
- **WHEN** AI 生成的 Draft YAML 不符合 Schema
- **THEN** Core SHALL 拒绝保存资产
- **AND** Core SHALL 输出 "Invalid asset structure: [error details]"
- **AND** 工程师 SHALL 被要求重新生成

### Requirement: 强制人类确权流程

AI 生成 Draft 资产后 SHALL 强制暂停，等待工程师确权。

#### Scenario: AI 输出审查提示
- **WHEN** AI 完成 Draft 资产生成
- **THEN** AI SHALL 输出 "已生成 Draft 资产，等待审查。请使用 `oxn standards inspect` 查看内容，确认后使用 `oxn standards promote` 转正。"

#### Scenario: 工程师 promote 资产
- **WHEN** 工程师执行 `oxn standards promote <asset-path>`
- **THEN** 资产 SHALL 被移动到 CANONICAL 目录
- **AND** 资产状态变为 CANONICAL

### Requirement: Probe 原子化设计

Probe SHALL 采用原子化设计，每个 Probe 只执行单一类型的检查。

#### Scenario: fs_exists Probe
- **WHEN** Probe 类型为 `fs_exists`
- **THEN** 它 SHALL 只检查指定路径的文件是否存在

#### Scenario: file_contains Probe
- **WHEN** Probe 类型为 `file_contains`
- **THEN** 它 SHALL 只检查指定文件是否包含指定内容

#### Scenario: exec_exit_zero Probe
- **WHEN** Probe 类型为 `exec_exit_zero`
- **THEN** 它 SHALL 只检查命令退出码是否为 0