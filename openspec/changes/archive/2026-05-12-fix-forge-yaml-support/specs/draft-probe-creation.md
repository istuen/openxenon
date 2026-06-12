## MODIFIED Requirements

### Requirement: Draft Probe Creation
系统 SHALL 支持通过 `oxn forge probe -s` 保存 Probe 定义。输入内容可以是 JSON 或 YAML 格式。

#### Scenario: JSON 格式输入
- **WHEN** 用户输入 `oxn forge probe -s '{"type":"fs_exists","description":"检查文件","parameters":[...]}'`
- **THEN** 系统直接解析 JSON 并保存

#### Scenario: YAML 格式输入
- **WHEN** 用户输入 `oxn forge probe -s 'type: fs_exists\ndescription: 检查文件'`
- **THEN** JSON 解析失败后，系统尝试 YAML 解析，成功后保存

#### Scenario: 无效格式输入
- **WHEN** 输入既不是有效 JSON 也不是有效 YAML
- **THEN** 系统返回 "Invalid probe structure" 错误
