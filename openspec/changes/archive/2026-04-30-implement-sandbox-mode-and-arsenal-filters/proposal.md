## Why

OpenXenon 需要区分"生产环境"和"实验环境"，让 AI 可以在沙箱中自由探索而不担心破坏生产代码。同时需要完善资产（Arsenal）的导入导出机制，支持在项目间共享标准资产。

## What Changes

### 1. 沙箱模式 (Sandbox Mode)

- `oxn init --sandbox` 初始化沙箱项目，在 space.oxn 的 config 表写入 `('mode', 'SANDBOX')`
- 沙箱模式下：Probe 失败仅警告不删除代码，雷达静默
- 生产模式（默认）：Probe 失败触发熔断删除，雷达严格

### 2. 资产流转架构

- **Sandbox 本地 Arsenal → Project Arsenal**：`oxn arsenal promote`
- **Project Arsenal → Global Arsenal**：`oxn arsenal promote --global`
- **Project Arsenal ← 外部目录**：`oxn arsenal import`
- **Project Arsenal → 外部目录**：`oxn arsenal export`

### 3. Sandbox 执行物理行为

- AI 在 Sandbox 中**直接写当前项目工作目录**（整个项目目录即沙箱）
- 允许 Blueprint 引用当前项目 `arsenals/` 下的 `draft.md`
- Probe 失败：`WARN_AND_PRESERVE`（代码保留，不回滚）
- 逃逸检测：`SILENT`（只记日志，不杀进程）

### 4. Arsenal 导入导出

- `oxn arsenal export` 导出项目 Arsenal 到外部目录
- `oxn arsenal import <path>` 从外部目录导入到项目
- 默认只处理 canonical，支持 `--draft`/`--canonical`/`--all`/`--archive`
- 导入时已存在则跳过，`--force` 覆盖

## Capabilities

### Modified Capabilities
- `task-execution`: 根据 sandbox 配置选择不同执行策略
- `arsenal-loading`: 支持 --draft/--canonical/--all/--archive 过滤

### New Capabilities
- `sandbox-mode`: 沙箱项目初始化和配置管理（单一数据源，无 config.json）
- `arsenal-import-export`: 资产导入导出功能

## Impact

- 影响文件：`src/commands/arsenal-*.ts`、`src/core/task-*.ts`、`src/core/execution-policy.ts`
- 用户感知：AI 可以在沙箱中安全实验，资产可以在项目间自由流转