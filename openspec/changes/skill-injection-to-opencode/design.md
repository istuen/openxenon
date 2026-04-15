## Context

Xenonix 的存在是为了防止 AI 产生"幻觉"，但如果用纯 Markdown 写 Skill，Skill 本身就成了"幻觉的温床"：

1. **类型撕裂**：Core 接口用 TypeScript 定义，但 `.md` 里手写示例容易写错字段名
2. **文档与代码不同步**：Core 接口变更，`.md` 不会自动更新
3. **无法复用**：YAML 示例在多个 `.md` 中重复

OpenSpec 的 Command Adapter System 采用 **.ts 源码 → .md 产物** 架构。Xenonix 必须采用同样设计，因为这是"将运行时约束推到编译期约束"的关键。

## Goals / Non-Goals

**Goals:**

- 实现 Skill 的 TypeScript 源码定义，直接引用 Core 类型
- 实现 XenonixSkill 接口，所有 Skill 实现该接口
- 实现 OpenCode 适配器，将 TS Skill 编译为 `.md`
- 实现 `xn api base` 动态寻址
- 编译时进行类型检查，确保指令与接口同步

**Non-Goals:**

- 本阶段不实现其他适配器（Cursor、Cline 等）
- 不实现 Skill 热重载
- 不实现远程 Skill 仓库

## Decisions

### 1. TypeScript 源码架构

**决定**：Skill 定义为 TypeScript 源码，编译时生成 `.md` 产物。

```typescript
// src/skills/xn-task.ts
import type { Playbook, TargetState } from '../core/types/manifest';
import { XenonixSkill } from './types';

export const XnTaskSkill: XenonixSkill = {
  id: 'xn-task',
  description: '发起 Xenonix 任务',
  instruction: `...`,
  examples: {
    playbook_step: {
      target_state: { type: "file_content", path: "a.ts", must_contains: "export" },
      // 类型检查确保字段正确
    }
  }
};
```

**理由**：
- 直接 `import` Core 类型，编译期检查
- 接口变更时编译报错，不会生成错误 `.md`
- Skill 成为 Core 在项目目录里的"类型安全投影"

### 2. XenonixSkill 接口

**决定**：定义统一的 Skill 接口。

```typescript
export interface XenonixSkill {
  id: string;
  description: string;
  instruction: string;
  examples?: Record<string, unknown>;
}
```

**理由**：
- 与 OpenSpec 的 CommandContent 同构
- Adapter 只需实现 `render(skill)` 方法
- 支持结构化示例，方便格式转换

### 3. 适配器接口

**决定**：适配器实现 `render()` 方法。

```typescript
export interface SkillAdapter {
  readonly toolId: string;
  render(skill: XenonixSkill): string;
  getOutputPath(skillId: string): string;
}
```

**理由**：
- 简洁：一个方法完成 TS → MD 转换
- 统一：所有适配器实现相同接口
- 可扩展：新增工具只需实现新 Adapter

### 4. OpenCode 适配器输出格式

**决定**：输出到 `.opencode/skills/<id>/SKILL.md`。

```markdown
---
name: xn-task
description: 发起 Xenonix 任务
---

<instruction content>

## Examples

```yaml
# playbook_step
{ ... }
```
```

**理由**：
- 符合 OpenCode 的 Skill 格式要求
- YAML frontmatter 包含必要元数据
- 示例以代码块形式附加

### 5. 动态寻址

**决定**：`xn api base` 命令返回 Core 实际监听地址。

```bash
$ xn api base
http://127.0.0.1:8420
```

**理由**：
- 端口可能动态调整
- 未来可能迁移到 Unix Socket
- Skill 中用 `$(xn api base)` 替代硬编码

## Risks / Trade-offs

### 风险：编译依赖

**风险**：需要 TypeScript 编译环境。

**缓解**：Bun 原生支持 TypeScript，无需额外配置。

### 风险：Core 未启动

**风险**：`xn api base` 在 Core 未运行时无法工作。

**缓解**：命令返回错误信息，Skill 中包含错误处理提示。

### 权衡：复杂度 vs 安全性

**权衡**：TS 源码比纯 MD 复杂。

**收益**：彻底消除指令与接口不同步的风险，这是 Xenonix 核心价值的延伸。

## Migration Plan

### 部署步骤

1. 创建 `src/skills/types.ts` 接口定义
2. 创建 `src/skills/xn-*.ts` 各 Skill 源码
3. 创建 `src/adapters/opencode.adapter.ts` 适配器
4. 实现 `xn api base` 命令
5. 修改 `xn init` 支持编译注入
6. 测试编译产物正确性

### 回滚策略

保留现有 `.opencode/skills/` 文件，删除新增源码即可。
