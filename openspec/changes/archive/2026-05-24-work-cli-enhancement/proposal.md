## Why

Work CLI 当前实现与 Task CLI 存在功能不对齐，且缺少关键的生命周期操作（resume、complete）。需要完善 Work CLI 的命令体系，使其具备完整的操作能力。

## What Changes

- **重命名 `work init` → `work new`**：与 Task CLI 命名对齐（`task new`），`init` 作为通用初始化名称不够直观
- **新增 `work resume`**：恢复 Work 执行，获取下一个待处理的 Part 并展示操作指令
- **新增 `work complete`**：标记 Work 为已完成状态，更新 state.json

### Modified Capabilities

- `work-cli`：重命名 init → new，新增 resume、complete 命令

## Capabilities

### New Capabilities

- `work-new-command`：`work new` 替代 `work init`，行为保持不变
- `work-resume-command`：`work resume` 恢复挂起的 Work，继续执行
- `work-complete-command`：`work complete` 标记 Work 完成

### Modified Capabilities

- `work-cli`：重命名 init → new，新增 resume/complete 子命令

## Impact

- `src/cli/work.ts`：重命名 init 子命令，新增 resume/complete 子命令
- `src/cli/task-filesystem.ts`：可能需要共享逻辑（如果 Work 和 Task 共用底层实现）
- `src/skills/locales/zh-CN/oxn-work/instruction.md`：更新指令文档