## Context

OXN Skill 是 AI 与 OpenXenon 系统交互的唯一通道。当前各 Skill 编写风格不统一，AI 执行行为存在不确定性。

**当前问题:**

```
CURRENT SKILL STATES
═══════════════════════════════════════════════════════════════

Skill          变量格式          JSON强制    熔断机制    重试
────────────────────────────────────────────────────────────────
oxn-cli        <placeholder>     ❌          ❌          ❌
oxn-task       <placeholder>    ❌          ❌          ❌
oxn-work       <placeholder>     ❌          ❌          ❌
oxn-forge      部分提及          (partial)     ✗          ✗
oxn-explore    无CLI命令         N/A         N/A         N/A
```

**目标状态:**
- 所有 Skill 使用统一的确定性执行规范
- AI 只能做填空题，不允许自由发挥
- 错误处理有明确的熔断点

---

## Decisions

### Decision 1: 变量占位符格式

**采用格式:** `{{VARIABLE (constraint)}}`

**理由:**
- 约束内嵌在变量旁，AI 必须看见
- 比分离的变量定义节更直接，不依赖 AI 记住额外章节
- 比 `<placeholder>` 更程序化，杜绝自由拼装

**示例:**
```
# ❌ 错误: 允许 AI 自由拼装
oxn task new <task-id> --name <name>

# ✅ 正确: 约束内嵌，AI 必须填空
oxn task new --id "{{TASK_ID (kebab-case, e.g. my-task-001)}}" \
             --name "{{TASK_NAME}}" \
             --blueprint "{{BLUEPRINT_NAME}}"
```

**适用场景:**
- 简单约束: `{{TASK_ID (kebab-case)}}`
- 中等约束: `{{EMAIL (valid email format)}}`
  - 复杂约束或多处复用时，可额外在末尾加 `## 变量定义` 节说明

---

### Decision 2: 强制 --json

**规则:** 所有 `oxn` CLI 命令必须带 `--json` 参数

**理由:**
- AI 解析人类可读终端输出（表格、颜色、进度条）是主要错误来源
- JSON 保证结构化输出，供 Skill 逻辑判断
- `--json` 是 OXN CLI 的契约承诺，不会因终端渲染变化而失效

**示例:**
```
# ❌ 错误: 可能解析失败
oxn task list

# ✅ 正确: 强制 JSON
oxn task list --json
```

---

### Decision 3: 统一重试策略

**策略:** 失败时重试 3 次，第 4 次失败后触发熔断

**理由:**
- MVP 阶段简化决策：所有错误统一处理
- 3 次重试足以覆盖瞬时网络抖动
- 超过 3 次继续重试会浪费 token 且可能死循环

**流程:**
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

**注意:** 当前不考虑区分错误类型（网络 vs 逻辑），统一重试。后续可升级。

---

### Decision 4: 统一熔断报告

**触发条件:** 同一命令连续 3 次失败

**报告内容:**
```markdown
## OXN 执行异常报告

**当前执行的 Skill**: [Skill 名称]
**失败的步骤**: [步骤编号及描述]
**执行的命令**: `[实际执行的完整命令]`
**CLI 返回的错误 JSON**:
```json
[原样粘贴 CLI 的 --json 输出，禁止省略或总结]
```
**AI 的初步分析**: [基于错误信息，1-2 句话客观描述]
**建议工程师操作**: [具体建议，如检查配置/核对网络/手动执行]
```

**输出位置:**
1. **AI 助手端打印**: 熔断时直接输出上述 Markdown 报告
2. **写入日志文件**: `.openxenon/error/skills/<date>-<skill>-<step>.md`
   - 命名格式: `2025-05-27-oxn-task-step-2.md`
   - 目录由 `oxn init` 预创建

**理由:**
- 结构化报告让工程师能快速定位问题
- 日志文件便于后续排查，不依赖 AI 对话历史
- 禁止 AI 自然语言总结，避免失真

---

### Decision 5: Skill 分层策略

**LAYER 0: 基础层 (所有 Skill 默认)**

- 强制 `--json`
- `{{VARIABLE (constraint)}}` 变量格式
- 统一熔断 + 报告

**LAYER 1: 业务层 (如 oxn-work/task)**

- LAYER 0 全部继承
- + 具体执行步骤流
- + Skill 特定的判断逻辑

**LAYER 2: 专家层 (如 oxn-forge)**

- LAYER 1 全部继承
- + 资产类型特定逻辑
- + 复杂状态机

**当前决策:** 先实现所有 Skill 达到 LAYER 0 基础规范，后续按需升级。

---

### Decision 6: 日志目录处理

**决策:** `.openxenon/error/skills/` 目录由 `oxn init` 预创建

**理由:**
- Skill 执行时不应该关心目录是否存在
- 如果目录不存在就创建，会导致 AI 行为不一致
- 统一由 `oxn init` 保证环境就绪

---

## Standard SKILL.md Template

每个 OXN Skill 的 `instruction.md` 应严格遵循以下结构:

```markdown
---
name: {{SKILL_ID}}
description: {{SKILL_DESCRIPTION}}
---
# /{{SKILL_ID}} — {{SKILL_SHORT_DESCRIPTION}}

## 目标
[用 1-2 句话说明这个 Skill 给 AI 设定的最终目标]

## 前置条件
- [列出执行前必须满足的环境、文件状态或上下文]

## 执行步骤

### 步骤 1: [动作描述]
执行命令: `{{CLI_COMMAND}} --json`

- **判断逻辑:**
  - 如果 [JSON字段条件A]: 进入步骤 2
  - 如果 [JSON字段条件B]: [执行具体的恢复动作]
  - 其他或命令报错: 重试 (1/3)
  - 重试 3 次仍失败: 进入【熔断退出流程】

### 步骤 2: [动作描述]
...

## 熔断退出流程
如果你在任何步骤被要求"熔断退出":
1. 立即停止执行任何 `oxn` 命令
2. 写入错误日志: `.openxenon/error/skills/<date>-<skill>-<step>.md`
3. 严格按照以下格式输出报告:

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

4. 询问工程师:"是否需要我尝试其他操作，还是您将手动介入?"
```

---

## Open Questions

1. **Skill 调用路由**: 目前假设 Skill 通过显式 `/oxn-task` 命令调用，是否需要考虑自动路由？
2. **Skill 间依赖**: 当前不考虑依赖，是否在将来引入 sub-Skill 调用？
3. **熔断后恢复**: 熔断后 AI 是否应该支持"重新执行 Skill"命令？

这些问题待后续解决，当前聚焦于 LAYER 0 基础规范。