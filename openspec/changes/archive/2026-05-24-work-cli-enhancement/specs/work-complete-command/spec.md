## ADDED Requirements

### Requirement: work complete 标记 Work 完成

work complete 命令 SHALL 更新 Work 状态为 completed。

#### Scenario: 成功完成 Work
- **WHEN** 用户执行 `oxn work complete <work-id>`
- **THEN** 系统更新 state.json 中 status 为 "completed"
- **THEN** 返回 "Work <work-id> 已完成"

#### Scenario: Work 不存在
- **WHEN** 用户执行 `oxn work complete nonexistent`
- **THEN** 系统抛出错误 "Work not found"

#### Scenario: Work 已完成
- **WHEN** 用户执行 `oxn work complete <work-id>` 且 status 已为 completed
- **THEN** 系统提示 "Work 已处于 completed 状态"