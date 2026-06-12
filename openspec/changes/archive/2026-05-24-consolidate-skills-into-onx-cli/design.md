## Context

当前 OpenXenon 有 11 个独立的 oxn-* 技能分散在 `.opencode/skills/` 目录下。这些技能都围绕 `oxn` CLI 工具操作，但缺乏统一入口：
- oxn-arsenal、oxn-explore、oxn-forge、oxn-init、oxn-plan、oxn-resume、oxn-status、oxn-stop、oxn-task、oxn-trace、oxn-work

每个技能都是独立目录 + SKILL.md 结构，技能之间无关联，用户需要记住多个命令入口。

## Goals / Non-Goals

**Goals:**
- 将 11 个 oxn-* 技能的功能整合到一个 `onx-cli` 技能中
- 保持所有现有 `oxn` CLI 命令的功能不变
- 提供统一的技能入口，改善用户体验
- 降低维护成本（单一 Skill 文件而非 11 个目录）

**Non-Goals:**
- 不修改 `oxn` CLI 工具本身的实现
- 不修改 openspec-* 系列技能（保持 OpenSpec 工作流独立）
- 不改变现有 `oxn` 命令的输出格式

## Decisions

### 1. 采用单一 Skill 文件结构
**决定**：创建 `.opencode/skills/onx-cli/SKILL.md` 单一文件，整合所有功能。

**理由**：
- OpenCode skill 系统支持单个 SKILL.md 提供多命令路由
- 避免多目录结构的复杂性
- 便于集中维护和更新

**替代方案考虑**：
- 保留多文件结构：用技能路由器分发到子技能 → 放弃，过于复杂
- 保留现有分散结构 → 放弃，用户体验差

### 2. 技能命令路由模式
**决定**：使用子命令模式（类似 git），通过 `--subcommand` 参数区分不同操作。

**理由**：
- 与现有 `oxn` CLI 的子命令风格一致（oxn task, oxn work, oxn arsenal 等）
- 单一入口便于用户记忆
- OpenCode 的 skill 机制支持参数解析

### 3. 功能分组
**决定**：按操作领域将功能分组为 4 个主要子命令：
- `onx-cli task` - 任务管理（task/plan/explore 的通用工作流）
- `onx-cli arsenal` - Arsenal 资产管理
- `onx-cli forge` - 资产生成
- `onx-cli system` - 系统操作（init/stop/status/trace/resume）

## Risks / Trade-offs

| 风险 | 缓解措施 |
|------|----------|
| Skill 文件变大难以维护 | 按子命令分组，注释清晰，模块化组织 |
| 单文件故障影响所有功能 | 结构清晰，易于调试和回滚 |
| 用户习惯旧命令 | 保持 `/oxn-*` 别名或重定向（可选） |