## ADDED Requirements

### Requirement: 目录结构规范

arsenals 资产目录 SHALL 采用分层结构：`arsenals/<type>/<asset-name>/<version-file>`，其中：
- `<type>` 是资产类型（如 blueprint, probe, proof, stage）
- `<asset-name>` 是资产名称（kebab-case）
- `<version-file>` 是版本文件，固定为 `draft.yaml` 或 `canonical.yaml`

### Requirement: 资产版本管理

系统 SHALL 支持资产的两种版本状态：
- `draft`：草稿状态，位于 `<asset-name>/draft.yaml`
- `canonical`：正式状态，位于 `<asset-name>/canonical.yaml`

### Requirement: 向后兼容读取

系统 SHALL 同时支持旧路径（`arsenals/<type>/draft/<name>.yaml`）和新路径（`arsenals/<type>/<name>/draft.yaml`）的读取操作。

### Requirement: 新资产使用新结构

系统 SHALL 将所有新创建的资产写入新目录结构（`arsenals/<type>/<name>/draft.yaml`）。

### Requirement: 路径检测与转换

读取资产时，系统 SHALL 按以下优先级查找：
1. 新路径：`arsenals/<type>/<name>/draft.yaml` 或 `arsenals/<type>/<name>/canonical.yaml`
2. 旧路径：`arsenals/<type>/draft/<name>.yaml` 或 `arsenals/<type>/canonical/<name>.yaml`

#### Scenario: 读取已迁移到新结构的资产
- **WHEN** 读取资产 `blueprint/build-init-daemon`
- **THEN** 系统从 `arsenals/blueprint/build-init-daemon/draft.yaml` 读取

#### Scenario: 读取尚未迁移的旧资产
- **WHEN** 读取资产 `blueprint/legacy-asset`（仅存在于旧路径）
- **THEN** 系统从 `arsenals/blueprint/draft/legacy-asset.yaml` 读取

#### Scenario: 写入新资产
- **WHEN** 创建新资产 `blueprint/new-asset`
- **THEN** 系统写入 `arsenals/blueprint/new-asset/draft.yaml`

### Requirement: 迁移命令

系统 SHALL 提供 `oxn arsenal migrate` 命令，用于将旧路径资产迁移到新结构。

#### Scenario: 执行迁移
- **WHEN** 用户执行 `oxn arsenal migrate`
- **THEN** 系统扫描所有旧路径资产，迁移到新路径，并输出迁移日志

#### Scenario: 保留旧文件
- **WHEN** 用户执行 `oxn arsenal migrate --keep-old`
- **THEN** 系统迁移资产到新路径，同时保留旧文件作为备份