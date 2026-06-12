## ADDED Requirements

### Requirement: work resume 恢复 Work 执行

work resume 命令 SHALL 读取 Work 状态，返回下一个待处理 Part 的操作指令。

#### Scenario: 成功恢复 Work
- **WHEN** 用户执行 `oxn work resume <work-id>`
- **THEN** 系统读取对应 Work 的 state.json
- **THEN** 返回下一个待处理 Part 的 slot 名称和 deps 状态

#### Scenario: Work 不存在
- **WHEN** 用户执行 `oxn work resume nonexistent`
- **THEN** 系统抛出错误 "Work not found"

#### Scenario: 所有 Part 已完成
- **WHEN** 用户执行 `oxn work resume <work-id>` 且所有 Part 已完成
- **THEN** 系统提示 "所有 Part 已完成，可以使用 work complete 结束"