## ADDED Requirements

### Requirement: CLI arsenal search 命令

CLI SHALL 提供 `oxn arsenal search <query>` 命令，通过 Unix Socket 发送查询请求到 Daemon，返回匹配的 Arsenal 列表。

#### Scenario: 执行搜索查询
- **WHEN** 用户执行 `oxn arsenal search "文件存在"`
- **THEN** CLI 构造 JSON: `{ action: "arsenal_search", query: "文件存在" }`
- **AND** 通过 Socket 发送到 Daemon
- **AND** 打印返回的匹配列表

#### Scenario: 无匹配结果
- **WHEN** 用户执行搜索但没有匹配的 Arsenal
- **THEN** CLI 打印空列表 `[]`

#### Scenario: Daemon 未运行
- **WHEN** 执行 `oxn arsenal search` 但 Daemon 未运行
- **THEN** CLI 返回错误：`Daemon is not running. Start with 'oxn daemon start'`

### Requirement: 搜索结果格式

搜索结果 SHALL 以表格形式展示，每行包含：NAME、TYPE、TAGS、USEWHEN。

#### Scenario: 格式化输出
- **WHEN** Daemon 返回搜索结果
- **THEN** CLI 以表格打印：
```
NAME          TYPE       TAGS              USEWHEN
fs-exists     probes     [fs, 文件]        检查文件是否存在
fs-match      probes     [fs, 内容]        检查文件内容匹配
```

#### Scenario: JSON 输出模式
- **WHEN** 用户执行 `oxn arsenal search "fs" --json`
- **THEN** CLI 直接打印 JSON 数组，不做格式化