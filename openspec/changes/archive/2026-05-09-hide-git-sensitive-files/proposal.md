## Why

以下文件/目录不应该被推送到远程仓库：
1. `.kilocode/` - Kilocode IDE 配置
2. `.opencode/` - OpenCode 配置
3. `openspec/` - OpenSpec 工作流文件
4. `OpenXenon (修订版).md` - 修订版文档
5. `README-v2.md` - v2 版自述文件

这些文件可能包含：
- 本地开发环境配置
- 工作流元数据
- 重复或过时的文档
- 不应公开的内部信息

## What Changes

1. 修改项目根目录的 `.gitignore` 添加这些规则
2. 对于已经跟踪的文件，需要先移除再忽略
3. 可选：删除远程仓库中已存在的这些文件

## Impact

- 远程仓库更干净
- 不会暴露本地配置和内部文档

## High Risk

- 修改 .gitignore 可能影响已跟踪文件的追踪状态
- 需要从远程仓库移除已推送的文件