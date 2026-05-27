## Why

验证阶段已确认：
1. opencode 的 Skill 加载机制工作正常（`.opencode/skills/<name>/SKILL.md`）
2. AI 调用 `skill()` 后能正确使用 SKILL.md 内容
3. references/ 目录结构可行（手动创建的内容在测试中被正确使用）

当前 `skill-compiler.ts` 只输出 SKILL.md，不输出 references/ 目录。需要扩展以支持 references 内容生成。

## What Changes

1. **扩展 Skill 类型定义**
   - `src/skills/types.ts` 新增 `references` 字段
   - 类型：`{ filename: string; content: string }[]`

2. **为 oxn-forge 添加 references**
   - `probe-format.md`：正误对比 + 各类型参数速查
   - `blueprint-format.md`：正误对比 + 完整示例
   - `stage-format.md`：正误对比

3. **为 oxn-task 添加 references**
   - `blueprint-format.md`：格式说明 + 命令用法

4. **更新 skill-compiler.ts**
   - 编译 SKILL.md 时同时创建 references/ 目录
   - 写入所有 references 文件

5. **验证**
   - 编译后检查 `.opencode/skills/` 目录结构
   - AI 调用 skill() 后验证 references 被正确使用

## Capabilities

### New Capabilities

- `skill-references-compilation`: skill-compiler 支持输出 references/ 目录

## Impact

- 修改：`src/skills/types.ts`
- 修改：`src/skills/oxn-forge.ts`
- 修改：`src/skills/oxn-task.ts`
- 修改：`src/cli/skill-compiler.ts`
- 不修改：其他 skill 文件（init, status, resume, stop, trace 保持现状）