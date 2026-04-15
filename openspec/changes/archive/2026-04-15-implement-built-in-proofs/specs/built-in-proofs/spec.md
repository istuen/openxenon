## ADDED Requirements

### Requirement: L1 文件系统层探针支持

系统 SHALL 提供 L1 文件系统层的四个原子探针：`fs_exists`、`fs_not_exists`、`fs_content_match`、`fs_parseable`。

#### Scenario: 文件存在性探测
- **WHEN** AI 在 Playbook 中请求 `fs_exists` 探针并传入文件路径
- **THEN** 系统 SHALL 通过操作系统的 stat 命令检查文件是否存在，返回 true 或 false

#### Scenario: 文件不存在性探测
- **WHEN** AI 在 Playbook 中请求 `fs_not_exists` 探针并传入文件路径
- **THEN** 系统 SHALL 通过操作系统的 stat 命令检查文件是否不存在，返回 true 或 false

#### Scenario: 内容正则匹配探测
- **WHEN** AI 在 Playbook 中请求 `fs_content_match` 探针并传入文件路径和正则表达式
- **THEN** 系统 SHALL 将文件读入内存，执行纯字符串算法匹配，返回匹配结果（true 或 false）

#### Scenario: 语法可解析探测
- **WHEN** AI 在 Playbook 中请求 `fs_parseable` 探针并传入文件路径和解析器类型
- **THEN** 系统 SHALL 调用语言原生的语法检查器，若解析不抛异常则返回 true，否则返回 false

### Requirement: L2 进程执行层探针支持

系统 SHALL 提供 L2 进程执行层的两个原子探针：`exec_exit_zero`、`exec_stdout_match`。

#### Scenario: 进程零退出码探测
- **WHEN** AI 在 Playbook 中请求 `exec_exit_zero` 探针并传入命令
- **THEN** 系统 SHALL 执行该命令，仅检查 Unix 进程的退出码，若为 0 则返回 true，否则返回 false

#### Scenario: 标准输出匹配探测
- **WHEN** AI 在 Playbook 中请求 `exec_stdout_match` 探针并传入命令和正则表达式
- **THEN** 系统 SHALL 执行该命令，捕获 stdout 的字节流进行正则匹配，返回匹配结果（true 或 false）

### Requirement: L3 运行时状态层探针支持

系统 SHALL 提供 L3 运行时状态层的两个原子探针：`db_query_bool`、`env_exists`。

#### Scenario: 数据库标量查询探测
- **WHEN** AI 在 Playbook 中请求 `db_query_bool` 探针并传入数据库连接和 SQL 查询
- **THEN** 系统 SHALL 直接走底层数据库驱动执行 SQL，拿回第一行第一列的值，转为布尔值返回

#### Scenario: 环境变量探测
- **WHEN** AI 在 Playbook 中请求 `env_exists` 探针并传入环境变量键名
- **THEN** 系统 SHALL 读取 process.env 或 .env 文件，检查环境变量是否存在，返回 true 或 false

### Requirement: L4 网络拓扑层探针支持

系统 SHALL 提供 L4 网络拓扑层的原子探针：`http_status`。

#### Scenario: HTTP 状态码探测
- **WHEN** AI 在 Playbook 中请求 `http_status` 探针并传入 URL、方法和期望状态码
- **THEN** 系统 SHALL 发起一次底层的 TCP/HTTP 握手，若返回状态码与期望匹配则返回 true，否则返回 false

### Requirement: 内置探针物理封印

系统 SHALL 将所有内置探针硬编码在 Core 的 TypeScript 源码中，并在编译时利用 Bun 的打包能力熔铸进单一二进制文件内部。

#### Scenario: 内置探针不可寻址
- **WHEN** 用户或 AI 尝试在文件系统中查找内置探针的源码文件
- **THEN** 系统 SHALL 确保内置探针不存在于任何可编辑的文件系统路径中

#### Scenario: 内置探针直接内存执行
- **WHEN** AI 请求内置探针
- **THEN** 系统 SHALL 直接在二进制内存中调用底层引擎执行，无文件 IO 操作

### Requirement: 探针结果为绝对布尔值

所有探针的输出 MUST 是绝对的布尔值（0 或 1，PASS 或 FAIL），无灰度评分。

#### Scenario: 探针返回布尔值
- **WHEN** 任何探针执行完成
- **THEN** 系统 SHALL 仅返回 true（PASS）或 false（FAIL），无中间状态

### Requirement: 禁止伪格探针

系统 SHALL 绝对禁止以下类型的探针：`llm_judge`（大模型评判）、`complex_business_logic_check`（复杂业务逻辑校验）、`code_style_score`（代码风格评分）。

#### Scenario: 拒绝 LLM 评判探针
- **WHEN** AI 请求创建或使用 `llm_judge` 类型的探针
- **THEN** 系统 SHALL 拒绝该请求并返回错误信息

#### Scenario: 拒绝复杂业务逻辑探针
- **WHEN** AI 请求创建或使用 `complex_business_logic_check` 类型的探针
- **THEN** 系统 SHALL 拒绝该请求并返回错误信息

#### Scenario: 拒绝模糊评分探针
- **WHEN** AI 请求创建或使用 `code_style_score` 类型的探针
- **THEN** 系统 SHALL 拒绝该请求并返回错误信息
