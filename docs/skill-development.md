# Skill 开发指南

## 概述

Xenonix Skill 是一个 TypeScript 定义的指令模板，用于指导 AI 助手执行特定操作。Skill 采用 **.ts 源码 → .md 编译产物** 架构，确保类型安全。

## Skill 结构

每个 Skill 文件位于 `src/skills/` 目录，实现 `XenonixSkill` 接口：

```typescript
import type { XenonixSkill } from './types'

export const mySkill: XenonixSkill = {
  id: 'my-skill',              // Skill 唯一标识（kebab-case）
  description: 'Skill 描述',    // 简短描述
  instruction: `...`,          // 核心指令内容
  examples: {                  // 可选：结构化示例
    example1: { ... }
  }
}
```

## 字段说明

### id

- 类型：`string`
- 要求：kebab-case 格式（如 `xn-task`、`xn-resume`）
- 用途：作为文件名和引用标识

### description

- 类型：`string`
- 要求：简洁的一句话描述
- 用途：显示在编译报告和生成的 frontmatter 中

### instruction

- 类型：`string`
- 要求：Markdown 格式的完整指令
- 最佳实践：
  - 使用 `# /<id> — 描述` 作为标题
  - 包含明确的行为约束
  - 使用 `$(xn api base)` 进行动态寻址
  - 绝对禁止硬编码 URL 或端口

### examples

- 类型：`Record<string, unknown>`
- 要求：可选，结构化示例数据
- 用途：编译时转换为 Markdown 代码块

## 类型安全

Skill 可以引用 Core 的类型定义：

```typescript
import type { Step } from '../types/playbook'

export const xnTaskSkill: XenonixSkill = {
  id: 'xn-task',
  description: '发起任务',
  instruction: `...`,
  examples: {
    step_example: {
      id: 'step_1',
      name: '定义数据模型',
      spec: '必须使用 TypeScript',
      proof: 'fs-content-match',
    } as Step  // 类型检查确保字段正确
  }
}
```

如果 Core 接口变更，编译时会报类型错误，阻止生成错误的 `.md` 文件。

## 动态寻址

所有调用 Core API 的 Skill 必须使用 `xn api base` 命令获取地址：

```markdown
## 步骤 1：获取 Core 通信地址

\`\`\`bash
xn api base
\`\`\`

该命令会返回一个地址（如 \`http://127.0.0.1:8420\`）。
你必须在后续所有请求中使用此地址。
```

**错误示例（禁止）**：
```markdown
curl http://127.0.0.1:8420/api/v1/proofs/list  # ❌ 硬编码地址
```

**正确示例**：
```markdown
curl $(xn api base)/api/v1/proofs/list  # ✓ 动态寻址
```

## 编译流程

1. 用户执行 `xn init --adapter opencode`
2. 编译器从 `src/skills/index.ts` 加载所有 Skill
3. 调用适配器的 `render()` 方法生成 Markdown
4. 写入项目目录（如 `.opencode/skills/xn-task/SKILL.md`）

## 添加新 Skill

1. 在 `src/skills/` 创建新文件（如 `xn-new.ts`）
2. 实现 `XenonixSkill` 接口
3. 在 `src/skills/index.ts` 中导出并添加到 `allSkills` 数组
4. 运行 `pnpm typecheck` 确保类型正确
5. 运行 `xn init --adapter opencode --compile-force` 重新编译

## 最佳实践

1. **指令要具体**：避免模糊描述，给出明确的操作步骤
2. **包含错误处理**：指导 AI 如何处理异常情况
3. **使用代码块**：示例代码用 \`\`\` 包裹，指定语言
4. **分步骤**：复杂的操作分解为多个步骤
5. **禁止自由发挥**：明确告诉 AI "禁止自由发挥"
