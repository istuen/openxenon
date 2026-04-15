## ADDED Requirements

### Requirement: 自定义探针文件存储

系统 SHALL 支持在项目级 `.xenonix/proofs/` 和全局级 `~/.xenonix/custom-proofs/` 目录下存储自定义探针的 `.ts` 文件。

#### Scenario: 项目级自定义探针存储
- **WHEN** 工程师在项目的 `.xenonix/proofs/` 目录下创建探针 `.ts` 文件
- **THEN** 系统 SHALL 识别并注册该探针为项目级自定义探针

#### Scenario: 全局级自定义探针存储
- **WHEN** 工程师在全局 `~/.xenonix/custom-proofs/` 目录下创建探针 `.ts` 文件
- **THEN** 系统 SHALL 识别并注册该探针为全局级自定义探针

### Requirement: 自定义探针隔离执行

系统 SHALL 通过 `Bun.spawn` 拉起隔离子进程执行自定义探针，参数通过 stdin 喂入，仅收割进程退出码。

#### Scenario: 隔离子进程执行
- **WHEN** Core 调用自定义探针
- **THEN** 系统 SHALL 使用 `Bun.spawn` 创建独立子进程执行探针脚本，而非直接 `require`

#### Scenario: 参数通过 stdin 传递
- **WHEN** 调用自定义探针并传入参数
- **THEN** 系统 SHALL 将参数通过 stdin 传递给子进程

#### Scenario: 仅收割退出码
- **WHEN** 自定义探针执行完成
- **THEN** 系统 SHALL 仅根据进程退出码（0 或 1）判定探针结果，不解析 stdout 或 stderr

### Requirement: 自定义探针视为不可信外部契约

系统 SHALL 将所有自定义探针视为不可信的外部契约，绝不直接在 Core 进程中执行。

#### Scenario: 拒绝直接 require 自定义探针
- **WHEN** Core 尝试加载自定义探针
- **THEN** 系统 SHALL 确保不使用 `require` 或 `import` 直接导入探针代码

#### Scenario: 隔离环境执行
- **WHEN** 自定义探针执行失败或崩溃
- **THEN** 系统 SHALL 确保不影响 Core 主进程的稳定性

### Requirement: 自定义探针参数格式

系统 SHALL 定义自定义探针的标准参数格式，支持文件路径、正则表达式、命令等常见参数类型。

#### Scenario: 传递文件路径参数
- **WHEN** 调用自定义探针并传入文件路径参数
- **THEN** 系统 SHALL 将文件路径参数以 JSON 格式通过 stdin 传递给探针

#### Scenario: 传递正则表达式参数
- **WHEN** 调用自定义探针并传入正则表达式参数
- **THEN** 系统 SHALL 将正则表达式参数以 JSON 格式通过 stdin 传递给探针

#### Scenario: 传递命令参数
- **WHEN** 调用自定义探针并传入命令参数
- **THEN** 系统 SHALL 将命令参数以 JSON 格式通过 stdin 传递给探针
