## ADDED Requirements

### Requirement: proof-list CLI 指令

系统 SHALL 提供 `xn proof-list` CLI 指令，用于列出所有可用探针的名称。

#### Scenario: 执行 proof-list 指令
- **WHEN** 用户执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 输出所有可用探针的名称列表

### Requirement: 探针分类标记

系统 SHALL 在 `xn proof-list` 输出中标记探针的类型：`[built-in]`（内置）、`[project]`（项目级自定义）、`[global]`（全局级自定义）。

#### Scenario: 显示内置探针
- **WHEN** 用户执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 列出所有内置探针并标记为 `[built-in]`

#### Scenario: 显示项目级自定义探针
- **WHEN** 用户在包含自定义探针的项目中执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 列出项目级 `.xenonix/proofs/` 目录下的所有探针并标记为 `[project]`

#### Scenario: 显示全局级自定义探针
- **WHEN** 用户执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 列出全局 `~/.xenonix/custom-proofs/` 目录下的所有探针并标记为 `[global]`

### Requirement: 探针列表排序

系统 SHALL 按照优先级顺序输出探针列表：内置探针、项目级自定义探针、全局级自定义探针。

#### Scenario: 按优先级排序输出
- **WHEN** 用户执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 先输出内置探针，再输出项目级自定义探针，最后输出全局级自定义探针

### Requirement: 空项目或全局目录处理

系统 SHALL 正确处理项目级或全局级自定义探针目录不存在或为空的情况。

#### Scenario: 项目级目录不存在
- **WHEN** 用户在未创建 `.xenonix/proofs/` 目录的项目中执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 仅输出内置探针和全局级自定义探针（若存在）

#### Scenario: 全局级目录不存在
- **WHEN** 用户在全局 `~/.xenonix/custom-proofs/` 目录不存在时执行 `xn proof-list` 命令
- **THEN** 系统 SHALL 仅输出内置探针和项目级自定义探针（若存在）

#### Scenario: 无自定义探针
- **WHEN** 项目级和全局级自定义探针目录均为空或不存在
- **THEN** 系统 SHALL 仅输出内置探针列表
