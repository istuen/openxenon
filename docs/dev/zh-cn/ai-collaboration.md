---
title: AI 协作工作流
---

# AI 协作工作流

> Skill 三段分工 + 三档 exit 分类器 + AI CLI 白名单。

## Skill 三段分工

| Skill | 职责 | 位置 |
|---|---|---|
| `oxn-asset` | Asset 生命周期（创建/修改/删除 Domain/Blueprint/Stack） | `packages/cli/src/skills/locales/` |
| `oxn-work` | Work 编排 + 执行（IAP 三阶段 + Round） | `packages/cli/src/skills/locales/` |
| `oxn-proof` | Proof-First 入口（create/probe/add/run/list/show） | `packages/cli/src/skills/locales/` |

## Skill 工作流（SSOT → 编译产物）

```
SSOT：packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md
  ↓ oxn init（自动编译 compileAllSkills）
编译产物：.opencode/skills/<skill>/SKILL.md + ~/.opencode/skills/<skill>/SKILL.md
  ↓ oxn install-skill（分发到目标 AI 助手）
目标路径：~/.opencode/skills/ 或 ~/.claude/skills/
```

**正确维护流**：修改 `instruction.md` → 跑 `oxn init -f` → `.opencode/skills/` 自动重建。

## 三档 Exit 分类器

`packages/cli/src/index.ts` 顶部定义 3 档退出：

| 分类器 | 退出码 | 输出到 | 用途 |
|---|---|---|---|
| `IAPError` | 1 | stdout (JSON) | AI 消费的业务错误 |
| `OXNCrash` | 2 | stderr | 人类消费的崩溃 |
| `isCliInputError` | 1 | stdout (JSON) | 用户输入错误 |

## AI CLI 白名单

**允许**：
- `oxn proof create|probe add|run|list|show`
- `oxn work context|create|add-task|run|submit|status|validate|list-tasks|task-status|task-edit|lock|unlock|migrate`
- `oxn blueprint create|validate|list`
- `oxn domain create|validate|list`

**禁止**：
- 直接读/写 `frozen.json` / `state.json`
- 修改 Domain 术语或 Blueprint 规则
- 使用 `--force` 绕过 Proof
- lock 后修改任何 `.md` 资产

## 参考

- [AGENTS.md §CLI 架构](../../../AGENTS.md#cli-架构oxn) — 三档 exit 完整逻辑
- [AGENTS.md §Skill 工作流](../../../AGENTS.md#仓库约定) — SSOT → 编译 → 分发完整链路
- [ADR-0012 Main/Sub Agent 审计链](../../../.openxenon/drafts/rfc/0012-main-sub-agent-audit-chain.md)
