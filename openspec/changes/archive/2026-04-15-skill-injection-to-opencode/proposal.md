## Why

当前设计用纯 `.md` 文件存储 Skill 模板，存在致命问题：

1. **类型撕裂**：Core 的接口用 TypeScript 严格定义，但 `.md` 里手写的示例容易写错字段名，AI 按错误的指令拼 JSON 导致 Core 报错
2. **文档与代码不同步**：Core 接口变更后，`.md` 不会自动更新，成为"幻觉的温床"
3. **无法复用代码片段**：YAML 示例、JSON Payload 在多个 `.md` 中重复，改一处要改十处

借鉴 OpenSpec 的 Command Adapter System，采用 **.ts 源码 → .md 编译产物** 架构。Skill 定义在 TypeScript 中，直接引用 Core 的类型定义，编译时进行类型检查，确保指令与接口永远同步。

## What Changes

- 新增 `~/.xenonix/src/skills/` 目录存放 Skill 的 TypeScript 源码
- Skill 源码直接 `import` Core 的类型定义，实现端到端类型同构
- 新增 `~/.xenonix/adapters/` 目录存放适配器代码
- 新增 `xn api base` 命令返回 Core 实际通信地址
- 扩展 `xn init --adapter opencode` 编译注入 Skill 到项目
- 首批仅实现 OpenCode 适配器

## Capabilities

### New Capabilities

- `skill-typescript-source`: Skill 的 TypeScript 源码定义，与 Core 类型同构
- `skill-adapter-opencode`: OpenCode 适配器，将 TS Skill 编译为 `.md` 产物
- `api-base-command`: `xn api base` 命令，返回 Core 当前通信地址
- `skill-compilation`: Skill 编译流程，`xn init --adapter opencode` 触发

### Modified Capabilities

无（新增功能模块）

## Impact

- 新增 `src/skills/` 目录及 Skill TS 源码文件
- 新增 `src/skills/types.ts` - XenonixSkill 接口定义
- 新增 `src/adapters/opencode.adapter.ts` - OpenCode 适配器
- 新增 `src/commands/api.ts` - `xn api base` 命令
- 修改 `src/commands/init.ts` - 增加 Skill 编译注入逻辑
- 修改 `src/daemon/process.ts` - 启动时记录监听地址
