## ADDED Requirements

### Requirement: init 命令扩展

系统 SHALL 扩展 `xn init` 命令支持 Skill 编译注入。

#### Scenario: 指定适配器

- **WHEN** 用户执行 `xn init --adapter opencode`
- **THEN** 系统使用 OpenCode 适配器编译所有 Skill 并注入项目

#### Scenario: 默认行为

- **WHEN** 用户执行 `xn init` 不指定适配器
- **THEN** 系统使用 `opencode` 作为默认适配器

### Requirement: 编译流程

系统 SHALL 按固定流程编译注入 Skill。

#### Scenario: 加载 Skill 源码

- **WHEN** 开始编译
- **THEN** 从 `src/skills/index.ts` 导入所有 Skill 定义

#### Scenario: 调用适配器渲染

- **WHEN** 编译单个 Skill
- **THEN** 调用适配器的 `render()` 方法生成 Markdown 内容

#### Scenario: 写入文件

- **WHEN** 渲染完成
- **THEN** 将内容写入 `getOutputPath()` 返回的路径

### Requirement: 类型检查集成

系统 SHALL 在编译前进行 TypeScript 类型检查。

#### Scenario: 编译期检查

- **WHEN** 执行 `xn init --adapter opencode`
- **THEN** 先运行 TypeScript 类型检查，确保 Skill 与 Core 类型同步

#### Scenario: 类型错误处理

- **WHEN** 类型检查失败
- **THEN** 输出错误信息并中止编译，不生成 `.md` 文件

### Requirement: 增量编译

系统 SHALL 支持增量编译，避免重复写入。

#### Scenario: 内容比对

- **WHEN** 目标文件已存在且内容相同
- **THEN** 跳过写入操作

#### Scenario: 强制重写

- **WHEN** 用户执行 `xn init --adapter opencode --force`
- **THEN** 忽略内容比对，强制重写所有文件

### Requirement: 编译报告

系统 SHALL 输出编译操作的详细报告。

#### Scenario: 成功报告

- **WHEN** 编译完成
- **THEN** 输出每个 Skill 的编译状态（新建/更新/跳过）

#### Scenario: 汇总信息

- **WHEN** 编译完成
- **THEN** 输出总计编译数量和目标目录
