# Skill Writing Guide Specification

## Overview

定义了 OXN Skill 的标准编写规范，为 AI 提供确定性执行路径。

## Variables

### Variable Placeholder Format

**格式:** `{{VARIABLE (constraint)}}`

- 约束内嵌在变量旁，AI 必须看见
- 简单约束直接内嵌: `{{TASK_ID (kebab-case)}}`
  - 复杂约束或多处复用时，可额外加 `## 变量定义` 节

**示例:**
```markdown
oxn task new --id "{{TASK_ID (kebab-case, e.g. my-task-001)}}" \
             --name "{{TASK_NAME}}" \
             --blueprint "{{BLUEPRINT_NAME}}"
```

## CLI Commands

### JSON Enforcement

**规则:** 所有 `oxn` CLI 命令必须带 `--json` 参数。

```markdown
# ❌ 错误
oxn task list

# ✅ 正确
oxn task list --json
```

## Error Handling

### Retry Strategy

**统一策略:** 失败时重试 3 次，第 4 次失败后触发熔断。

```
执行命令 --json
      │
      ▼
  ┌─────────┐
  │ 成功?   │──是──▶ 继续下一步
  └────┬────┘
       │否
       ▼
  重试 1/3 ──失败──▶ 重试 2/3 ──失败──▶ 重试 3/3 ──失败──▶ 熔断
```

### Fuse Report

**触发条件:** 同一命令连续 3 次失败

**输出位置:**
1. AI 助手端打印 Markdown 报告
2. 写入 `.openxenon/error/skills/<date>-<skill>-<step>.md`

**报告格式:**
```markdown
## OXN 执行异常报告
**当前执行的 Skill**: [Skill 名称]
**失败的步骤**: [步骤编号及描述]
**执行的命令**: `[实际执行的完整命令]`
**CLI 返回的错误 JSON**:
```json
[原样粘贴 CLI 的 --json 输出]
```
**AI 的初步分析**: [1-2 句话客观描述]
**建议工程师操作**: [具体建议]
```

## Skill Structure

每个 Skill 的 `instruction.md` 必须包含:

1. **Frontmatter**: `name`, `description`
2. **目标**: 1-2 句话说明最终目标
3. **前置条件**: 执行前必须满足的环境/文件/上下文
4. **执行步骤**: 带编号的确定性步骤，含判断逻辑
5. **熔断退出流程**: 统一模板

## Skill Layers

| Layer | Description |
|-------|-------------|
| LAYER 0 | 基础层: JSON 强制 + 变量格式 + 统一熔断 |
| LAYER 1 | 业务层: LAYER 0 + 具体执行步骤 + Skill 判断逻辑 |
| LAYER 2 | 专家层: LAYER 1 + 资产类型特定逻辑 + 复杂状态机 |

当前 MVP: 所有 Skill 达到 LAYER 0，后续按需升级。

## Directory Structure

```
Skill 文件:
  src/skills/locales/zh-CN/<skill>/instruction.md

熔断日志:
  .openxenon/error/skills/<date>-<skill>-<step>.md
  (由 oxn init 预创建)
```