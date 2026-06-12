## 1. 扩展 Skill 类型定义

- [x] 1.1 修改 `src/skills/types.ts`，添加 `references` 字段

## 2. 为 oxn-forge 添加 references

- [x] 2.1 修改 `src/skills/oxn-forge.ts`，添加 3 个 references
  - `probe-format.md`：Probe 格式说明 + 正误对比 + 各类型参数速查
  - `blueprint-format.md`：Blueprint 格式说明 + 正误对比 + 完整示例
  - `stage-format.md`：Stage 格式说明 + 正误对比

## 3. 为 oxn-task 添加 references

- [x] 3.1 修改 `src/skills/oxn-task.ts`，添加 1 个 references
  - `blueprint-format.md`：Blueprint 格式说明 + 命令用法

## 4. 更新 skill-compiler.ts

- [x] 4.1 修改 `compileSkill()` 函数，支持编译 references/
  - 创建 `{skillId}/references/` 目录
  - 写入所有 references 文件

- [x] 4.2 修改 `CompilationReport` 接口，添加 `referencesCreated` 字段

- [x] 4.3 修改 `formatCompilationReport()` 显示 references 数量

## 5. 验证

- [x] 5.1 运行 `bun run src/cli.ts init --force` 重新编译 skills

- [x] 5.2 检查 `.opencode/skills/oxn-forge/references/` 目录结构
  - 确认有 3 个文件：probe-format.md, blueprint-format.md, stage-format.md

- [x] 5.3 检查 `.opencode/skills/oxn-task/references/` 目录结构
  - 确认有 1 个文件：blueprint-format.md

- [x] 5.4 检查其他 skill（oxn-init 等）无 references/ 目录

- [x] 5.5 验证 AI 调用 `skill({ name: "oxn-forge" })` 后能读取 references/