## Context

当前 oxn-init、oxn-status、oxn-stop、oxn-trace、oxn-arsenal 这 5 个技能分散在独立的目录中，每个都是独立的 Skill 文件。这些技能都是 System 操作类，功能相对简单但分散在多个入口。

## Goals / Non-Goals

**Goals:**
- 将 5 个 System 操作技能合并到 oxn-cli 的 system 子命令
- 保持所有现有 `oxn` CLI 命令的功能不变
- 提供统一的技能入口，改善用户体验

**Non-Goals:**
- 不修改 oxn-task、oxn-work、oxn-forge、oxn-explore、oxn-plan、oxn-resume 技能
- 不修改 `oxn` CLI 工具本身的实现

## Decisions

### 1. 使用 system 子命令分组
**决定**：将 init/status/stop/trace/arsenal 作为 oxn-cli 的 system 子命令。

**理由**：
- 这些都是系统级操作（初始化、状态查看、停止、跟踪取证），语义相近
- 与现有 oxn-cli 的子命令风格一致
- 单一入口便于用户记忆

### 2. 技能迁移策略
**决定**：
- 在 `src/skills/locales/zh-CN/onx-cli/instruction.md` 中追加 system 子命令内容
- 删除 `src/skills/locales/zh-CN/oxn-init/`、`oxn-status/`、`oxn-stop/`、`oxn-trace/`、`oxn-arsenal/` 目录
- 更新 `src/skills/loader.ts` 中的 skillMeta 数组

### 3. 保留旧技能目录作为备份
**决定**：暂不删除 `.opencode/skills/oxn-*/` 目录，保留备份能力。

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| 技能内容过多导致 SKILL.md 变大 | 按子命令分组，注释清晰 |
| 迁移过程中命令不可用 | 分阶段实施，先创建新技能再删除旧技能 |

## Migration Plan

1. **Phase 1**: 更新 `src/skills/locales/zh-CN/onx-cli/instruction.md`，追加 system 子命令
2. **Phase 2**: 更新 `src/skills/loader.ts`，移除 5 个 skill 的引用
3. **Phase 3**: 运行 `oxn init` 或 `bun run skill-compile` 验证
4. **Phase 4**: （可选）删除旧的 `src/skills/locales/zh-CN/oxn-*/` 目录

## Open Questions

- 是否需要保留旧的 `/oxn-init`、`/oxn-status` 等命令作为别名指向 `/oxn-cli system xxx`？