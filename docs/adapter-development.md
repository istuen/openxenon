# 适配器开发指南

## 概述

适配器负责将 Skill 的 TypeScript 定义编译成特定 AI 工具能识别的 Markdown 格式。

## 适配器接口

所有适配器必须实现 `SkillAdapter` 接口：

```typescript
import type { SkillAdapter } from './types'
import type { XenonixSkill } from '../skills/types'

export class MyAdapter implements SkillAdapter {
  readonly toolId = 'my-tool'  // 适配器唯一标识

  getOutputPath(skillId: string): string {
    // 返回编译产物的相对路径
    return `.my-tool/commands/${skillId}.md`
  }

  render(skill: XenonixSkill): string {
    // 将 Skill 对象转换为 Markdown 字符串
    let content = `# ${skill.id}\n\n`
    content += skill.instruction
    
    if (skill.examples) {
      content += '\n## Examples\n\n'
      for (const [name, example] of Object.entries(skill.examples)) {
        content += `### ${name}\n\n\`\`\`json\n`
        content += JSON.stringify(example, null, 2)
        content += '\n\`\`\`\n\n'
      }
    }
    
    return content
  }
}
```

## 方法说明

### toolId

- 类型：`string`
- 要求：唯一标识符，用于 CLI 的 `--adapter` 参数
- 示例：`opencode`、`cursor`、`cline`

### getOutputPath(skillId)

- 参数：`skillId` - Skill 的 ID
- 返回：相对于项目根目录的文件路径
- 用途：决定编译产物写入位置

### render(skill)

- 参数：`skill` - XenonixSkill 对象
- 返回：完整的 Markdown 字符串
- 用途：格式转换，添加工具特定的元数据

## 注册适配器

在 `src/adapters/index.ts` 中注册：

```typescript
import { registerAdapter } from './index'
import { MyAdapter } from './my.adapter'

registerAdapter(new MyAdapter())
```

## 输出格式示例

### OpenCode 格式

```markdown
---
name: xn-task
description: 发起 Xenonix 任务
---

# /xn-task — 发起任务

...指令内容...

## Examples

### playbook_step

\`\`\`yaml
{
  "id": "step_1",
  "name": "定义数据模型"
}
\`\`\`
```

### Cursor 格式（示例）

```markdown
---
description: 发起 Xenonix 任务
alwaysApply: false
---

...指令内容...
```

### Cline 格式（示例）

```markdown
# /xn-task

...指令内容...
```

## 注意事项

1. **路径规范**：确保 `getOutputPath()` 返回的路径符合目标工具的要求
2. **元数据格式**：不同工具要求不同的 frontmatter 格式
3. **编码一致性**：使用 UTF-8 编码
4. **换行符**：使用 `\n`（Unix 风格）

## 测试适配器

```typescript
import { MyAdapter } from './my.adapter'
import { xnTaskSkill } from '../skills/xn-task'

const adapter = new MyAdapter()

// 测试路径生成
console.log(adapter.getOutputPath('xn-task'))
// 输出: .my-tool/commands/xn-task.md

// 测试渲染
const content = adapter.render(xnTaskSkill)
console.log(content)
```

## 现有适配器

- `OpenCodeAdapter` - 输出到 `.opencode/skills/<id>/SKILL.md`
- 后续可扩展：Cursor、Cline、Windsurf 等
