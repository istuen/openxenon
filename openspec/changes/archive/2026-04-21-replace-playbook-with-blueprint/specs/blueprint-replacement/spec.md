## MODIFIED Requirements

### Requirement: Task 包含 Blueprint 定义
**FROM**: Task 包含 Playbook 定义
**TO**: Task 包含 Blueprint 定义

#### Scenario: 创建任务时关联 Blueprint
- ** WHEN ** 用户创建任务并提供 Blueprint
- ** THEN ** 系统保存 Blueprint 引用到任务中

#### Scenario: 查询任务时返回 Blueprint
- ** WHEN ** 查询任务详情
- ** THEN ** 返回关联的 Blueprint 数据