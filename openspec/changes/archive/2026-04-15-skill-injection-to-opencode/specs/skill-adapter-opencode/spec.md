## ADDED Requirements

### Requirement: OpenCode 适配器接口

系统 SHALL 实现 OpenCode 适配器，遵循 `SkillAdapter` 接口。

#### Scenario: 适配器标识

- **WHEN** 查询适配器信息
- **THEN** `toolId` 返回 `"opencode"`

#### Scenario: render 方法

- **WHEN** 调用 `adapter.render(skill)`
- **THEN** 返回符合 OpenCode 格式的 Markdown 字符串

#### Scenario: getOutputPath 方法

- **WHEN** 调用 `adapter.getOutputPath('xn-task')`
- **THEN** 返回 `.opencode/skills/xn-task/SKILL.md`

### Requirement: OpenCode 输出格式

系统 SHALL 生成符合 OpenCode 要求的 Skill 文件格式。

#### Scenario: YAML frontmatter

- **WHEN** 渲染 Skill
- **THEN** 文件开头包含 YAML frontmatter，含 `name` 和 `description` 字段

#### Scenario: 指令内容

- **WHEN** 渲染 Skill
- **THEN** frontmatter 后为 `instruction` 字段的完整内容

#### Scenario: 示例代码块

- **WHEN** Skill 包含 `examples`
- **THEN** 示例以 Markdown 代码块形式附加在指令内容后

### Requirement: OpenCode 输出路径

系统 SHALL 将编译产物写入 `.opencode/skills/<id>/SKILL.md`。

#### Scenario: 目录结构

- **WHEN** 编译 `xn-task` Skill
- **THEN** 创建 `.opencode/skills/xn-task/` 目录并写入 `SKILL.md`

#### Scenario: 多 Skill 输出

- **WHEN** 编译所有 Skill
- **THEN** 每个 Skill 有独立子目录

### Requirement: 适配器注册

系统 SHALL 将 OpenCode 适配器注册到适配器注册中心。

#### Scenario: 获取适配器

- **WHEN** 调用 `getAdapter('opencode')`
- **THEN** 返回 OpenCode 适配器实例

#### Scenario: 列出可用适配器

- **WHEN** 调用 `listAdapters()`
- **THEN** 返回包含 `"opencode"` 的数组
