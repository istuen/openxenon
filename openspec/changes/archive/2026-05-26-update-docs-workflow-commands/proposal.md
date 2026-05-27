## Why

OXN DSL 和 Work 流程已经完全重构，但项目文档（README、快速开始、架构文档、CLI 参考）仍使用旧的 task/explore 命令和 YAML 格式。文档与代码严重脱节，会导致用户按照文档操作失败。

## What Changes

- 更新 README.md 快速开始部分，使用新的 `oxn work` 命令
- 更新 `docs/en/guides/getting-started.md` 使用新命令
- 更新 `docs/zh-cn/guides/getting-started.md` 使用新命令
- 更新 `docs/en/guides/cli-reference.md` 的 task 命令章节
- 更新 `docs/zh-cn/guides/cli-reference.md` 的 task 命令章节
- 更新 `docs/en/architecture/features.md` 的 Task/Explore 命令示例
- 更新 `docs/zh-cn/architecture/features.md` 的 Task/Explore 命令示例
- 更新 `docs/en/architecture/lifecycle.md` 使用新命令序列
- 更新 `docs/zh-cn/architecture/lifecycle.md` 使用新命令序列
- 更新 `docs/zh-cn/guides/troubleshooting.md` 的 Q2
- 移除或标注已废弃的命令说明

## Capabilities

### New Capabilities
- `doc-workflow-commands`: 文档工作流命令同步

### Modified Capabilities
- (无 spec 级别变更，只是文档更新)

## Impact

- 文档文件：`README.md`, `docs/**/*.md`
- 无代码变更
- Skill 文档（`src/skills/locales/`）保持最新，无需更新