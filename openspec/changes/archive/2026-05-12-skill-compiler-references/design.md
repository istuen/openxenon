## Context

`skill-compiler.ts` 当前只输出 SKILL.md 文件，不支持 references/ 目录。验证阶段已确认 references/ 结构可行（手动创建的内容被 AI 正确使用），现在需要扩展 compiler 以自动生成 references 内容。

当前 compiler 工作流程：
```typescript
compileSkill(skill) → SKILL.md
compileAllSkills() → 所有 SKILL.md
```

目标 workflow：
```typescript
compileSkill(skill) → SKILL.md + references/*.(如果 skill 有 references 数据)
compileAllSkills() → 所有 SKILL.md + 所有 references/
```

## Goals / Non-Goals

**Goals:**
- skill-compiler.ts 支持输出 references/ 目录
- oxn-forge 有 3 个 references 文件（probe-format.md, blueprint-format.md, stage-format.md）
- oxn-task 有 1 个 references 文件（blueprint-format.md）
- 其他 skill 保持现状（无 references）

**Non-Goals:**
- 不修改其他 skill 的 SKILL.md 内容
- 不实现 registry.md（验证阶段已确认不需要）
- 不实现 L1 目录层（opencode 自动发现 skills，不需要索引）

## Decisions

### 决策 1：references 字段类型

**选择：**
```typescript
interface ReferenceFile {
  filename: string  // 例如 "probe-format.md"
  content: string   // Markdown 内容
}

interface OpenXenonSkill {
  id: string
  description: string
  instruction: string
  examples?: Record<string, unknown>
  references?: ReferenceFile[]  // 新增
}
```

**理由：**
- 简单直接，不需要额外的目录结构定义
- 每个 skill 自己管理自己的 references
- 编译时直接写入 `{skillId}/references/{filename}`

### 决策 2：references 内容格式

**选择：Markdown（正误对比）**

**理由：**
- 验证阶段确认：AI 从"正误对比"学得比从 schema 声明快得多
- 一个 reference 文件 = 一个完整知识单元
- 不需要嵌套结构，扁平 Markdown 即可

### 决策 3：compiler 目录创建逻辑

**选择：** 编译 SKILL.md 时同时创建 `references/` 目录，写入所有 references 文件

```typescript
// compileSkill 流程
1. 创建 {skillId}/ 目录（如不存在）
2. 写入 {skillId}/SKILL.md
3. 如果 skill.references 存在：
   a. 创建 {skillId}/references/ 目录
   b. 遍历 skill.references，写入每个文件
4. 返回 CompilationResult
```

### 决策 4：references 内容来源

**选择：** 在 skill 源文件（oxn-forge.ts, oxn-task.ts）中定义 references 数组

```typescript
export const oxnForgeSkill: OpenXenonSkill = {
  id: 'oxn-forge',
  description: '...',
  instruction: '...',
  references: [
    {
      filename: 'probe-format.md',
      content: '# Probe 格式参考\n\n## Forge 格式 vs Blueprint...'
    },
    // ...
  ]
}
```

**理由：**
- 符合当前 skill 定义方式（所有内容在 TypeScript 文件中）
- 便于版本控制
- 不需要额外的配置文件

## Risks / Trade-offs

| 风险 | Mitigation |
|------|------------|
| references 内容与 SKILL.md 重复 | SKILL.md 保留核心指令，references 放补充细节 |
| AI 不读取 references/ | 在 SKILL.md 中添加引导："需要详细格式时读取 references/{file}" |
| references 内容膨胀 | 一个 skill 不超过 3 个 references 文件，每个不超过 200 行 |

## Migration Plan

1. 修改 `src/skills/types.ts` - 添加 `references` 字段
2. 修改 `src/skills/oxn-forge.ts` - 添加 3 个 references
3. 修改 `src/skills/oxn-task.ts` - 添加 1 个 references
4. 修改 `src/cli/skill-compiler.ts` - 支持编译 references/
5. 运行 `oxn init` 重新编译
6. 检查 `.opencode/skills/` 目录结构
7. 验证 AI 调用 skill() 后能使用 references

## Open Questions

- 无

## 文件变更清单

```
src/skills/types.ts        ← 新增 references 字段
src/skills/oxn-forge.ts    ← 新增 3 个 references 定义
src/skills/oxn-task.ts     ← 新增 1 个 references 定义
src/cli/skill-compiler.ts   ← 扩展 compileSkill 支持 references/
```