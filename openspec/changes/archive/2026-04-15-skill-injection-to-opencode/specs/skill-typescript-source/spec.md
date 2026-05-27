## ADDED Requirements

### Requirement: XenonixSkill 接口定义

系统 SHALL 定义 `XenonixSkill` 接口作为所有 Skill 的类型约束。

#### Scenario: 接口结构

- **WHEN** 定义 Skill 类型
- **THEN** 接口包含 `id: string`、`description: string`、`instruction: string`、`examples?: Record<string, unknown>` 字段

#### Scenario: 类型导出

- **WHEN** 其他模块需要定义 Skill
- **THEN** 可从 `src/skills/types.ts` 导入 `XenonixSkill` 接口

### Requirement: Skill TS 源码目录

系统 SHALL 在 `src/skills/` 目录下存放 Skill 的 TypeScript 源码。

#### Scenario: 目录结构

- **WHEN** 系统 Source Code 结构
- **THEN** `src/skills/` 包含 `types.ts`、`index.ts` 及各 Skill 定义文件（如 `xn-task.ts`）

#### Scenario: 统一导出

- **WHEN** 需要获取所有 Skill
- **THEN** 从 `src/skills/index.ts` 导入 `allSkills` 数组

### Requirement: Skill 类型安全

系统 SHALL 确保 Skill 定义与 Core 类型同构。

#### Scenario: 引用 Core 类型

- **WHEN** Skill 包含示例数据（如 Playbook 结构）
- **THEN** 示例数据的类型引用 `src/types/` 中的接口定义

#### Scenario: 编译期检查

- **WHEN** Core 接口变更
- **THEN** 编译 Skill 源码时报类型错误，阻止生成错误的 `.md`

### Requirement: Skill 内置列表

系统 SHALL 提供以下内置 Skill 源码。

#### Scenario: 核心 Skill

- **WHEN** 系统源码结构
- **THEN** 包含 `xn-init.ts`、`xn-task.ts`、`xn-resume.ts`、`xn-status.ts`、`xn-stop.ts`、`xn-trace.ts`

#### Scenario: Skill 内容结构

- **WHEN** 定义单个 Skill
- **THEN** `instruction` 字段包含完整的行为指令，使用 `$(xn api base)` 进行动态寻址

### Requirement: 禁止硬编码地址

系统 SHALL 确保 Skill 源码中不硬编码 Core 地址。

#### Scenario: 使用动态寻址

- **WHEN** Skill 需要调用 Core API
- **THEN** `instruction` 中使用 `$(xn api base)` 或 `xn api base` 命令获取地址

#### Scenario: 无硬编码 URL

- **WHEN** 检查 Skill 源码
- **THEN** 不出现 `http://127.0.0.1:8420` 或特定端口号
