---
title: Skill 编写
---

# Skill 编写

> SSOT → 编译产物 → 分发。为 AI Agent 定制协作流程。

## Skill 工作流

```
1. SSOT（源）
   packages/cli/src/skills/locales/{zh-CN,en}/<skill>/
   ├── instruction.md    ← AI 读的指令文档
   ├── assets/           ← 静态资源
   └── references/       ← 参考文档

2. 编译（自动）
   oxn init -f           ← 触发 compileAllSkills
   → .opencode/skills/<skill>/SKILL.md

3. 分发（手动）
   oxn install-skill     ← 拷贝到目标 AI 助手
   → ~/.opencode/skills/<skill>/SKILL.md
   → ~/.claude/skills/<skill>/SKILL.md
```

## 现有 Skill

| Skill | 职责 |
|---|---|
| `oxn-asset` | Asset 生命周期（创建/修改/删除） |
| `oxn-work` | Work 编排 + 执行（IAP 三阶段 + Round） |
| `oxn-proof` | Proof-First 入口（create/probe/add/run） |

## 编写新 Skill

1. 在 `packages/cli/src/skills/locales/zh-CN/` 下新建目录
2. 编写 `instruction.md`（AI 读的指令）
3. 可选：`assets/`、`references/`
4. 运行 `oxn init -f` 编译
5. 运行 `oxn install-skill` 分发

## 参考

- [AGENTS.md §Skill 工作流](../../../AGENTS.md#仓库约定) — 完整链路
- [AGENTS.md §Skill 源位置](../../../AGENTS.md#仓库约定) — locales/ → .opencode/skills/
