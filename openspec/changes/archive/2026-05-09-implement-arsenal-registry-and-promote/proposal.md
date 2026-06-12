## Why

大法官裁决（见 history-1.md）：
1. Arsenal Registry 必须在 **Daemon**（CLI 无状态，无法持有内存索引）
2. Promote 必须是 **CLI 命令触发**（需要验证+裁决+记录三步，不能只靠文件操作）

当前系统缺少这两个机制，导致 AI 无法高效查询和挑选 Arsenal，资产演化也无法追溯。

## What Changes

### Arsenal Registry（Daemon 内存索引）
- Daemon 启动时扫描全局 + 项目 arsenals 目录，构建内存索引
- CLI 提供 `oxn arsenal search <query>` 命令，通过 Unix Socket 查询 Daemon 的 Registry
- Registry 数据结构包含：type, name, description, semantics (intent/tags)

### CLI Promote 命令
- `oxn arsenal promote <asset>` 命令触发完整链路：验证 → 裁决 → 记录
- Daemon 校验 draft.yaml 结构，通过后执行文件重命名，更新 Registry，追加 trace

### 语义标注（Arsenal canonical.yaml）
- 所有 Arsenal 的 canonical.yaml 增加 `semantics` 字段
- 结构：`{ intent: string, tags: string[], useWhen: string, relatedAssets: string[] }`

## Capabilities

### New Capabilities
- `arsenal-registry`: Daemon 内存中的 Arsenal 索引，包含语义标注
- `arsenal-search-command`: CLI 搜索命令，通过 Socket 查询 Daemon Registry
- `arsenal-promote-command`: CLI promote 命令，触发验证+裁决+记录链路

### Modified Capabilities
- 无（此为纯新增能力）

## Impact

- **新增文件**: `src/daemon/registry.ts`（内存索引）
- **修改文件**: `src/cli/commands/arsenal.ts`（新增 search/promote 命令）
- **修改文件**: `src/daemon/ipc/receiver.ts`（新增 handler）
- **规范变更**: 所有 Arsenal canonical.yaml 需包含 `semantics` 字段