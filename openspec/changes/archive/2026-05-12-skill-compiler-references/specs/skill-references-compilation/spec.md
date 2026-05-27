## ADDED Requirements

### Requirement: OpenXenonSkill supports references field

`src/skills/types.ts` 中定义的 `OpenXenonSkill` 接口 SHALL 支持 `references` 字段，类型为可选的 `ReferenceFile[]`。

#### Scenario: Skill with references is compiled

- **WHEN** `skill-compiler.ts` 编译包含 `references` 的 skill
- **THEN** 编译输出包含 SKILL.md 和 `references/` 目录

#### Scenario: Skill without references is compiled

- **WHEN** `skill-compiler.ts` 编译不包含 `references` 的 skill
- **THEN** 编译输出只包含 SKILL.md，不创建 `references/` 目录

### Requirement: skill-compiler generates references/ directory

`compileSkill()` 函数 SHALL 在编译时：
1. 创建 `{skillId}/` 目录（如不存在）
2. 写入 `{skillId}/SKILL.md`
3. 如果 `skill.references` 存在：
   - 创建 `{skillId}/references/` 目录
   - 遍历 `skill.references`，写入 `{skillId}/references/{filename}`

#### Scenario: Compile skill with references

- **WHEN** 调用 `compileSkill(oxnForgeSkill, ...)` 其中 `oxnForgeSkill.references` 包含 3 个文件
- **THEN** 输出 `.opencode/skills/oxn-forge/references/` 目录，包含 3 个文件

#### Scenario: Compile skill without references

- **WHEN** 调用 `compileSkill(oxnInitSkill, ...)` 其中 `oxnInitSkill.references` 为 undefined
- **THEN** 输出 `.opencode/skills/oxn-init/` 目录，只包含 SKILL.md，无 references/ 目录

### Requirement: oxn-forge has three references files

`oxn-forge` skill SHALL have 3 个 references 文件：
- `probe-format.md`：Probe 格式说明 + 正误对比 + 各类型参数速查
- `blueprint-format.md`：Blueprint 格式说明 + 正误对比 + 完整示例
- `stage-format.md`：Stage 格式说明 + 正误对比

#### Scenario: oxn-forge references content

- **WHEN** AI 调用 `skill({ name: "oxn-forge" })` 后需要查看格式细节
- **THEN** AI 能够读取 `.opencode/skills/oxn-forge/references/` 下的文件

### Requirement: oxn-task has one references file

`oxn-task` skill SHALL have 1 个 references 文件：
- `blueprint-format.md`：Blueprint 格式说明 + 命令用法

#### Scenario: oxn-task references content

- **WHEN** AI 调用 `skill({ name: "oxn-task" })` 后需要查看 Blueprint 格式
- **THEN** AI 能够读取 `.opencode/skills/oxn-task/references/blueprint-format.md`

### Requirement: CompilationReport includes references count

`CompilationReport` SHALL 包含 `referencesCreated` 字段，记录写入的 references 文件总数。

#### Scenario: Report references count

- **WHEN** `compileAllSkills()` 执行完成
- **THEN** 返回的 `CompilationReport` 中 `referencesCreated` 字段表示写入的 references 文件数量