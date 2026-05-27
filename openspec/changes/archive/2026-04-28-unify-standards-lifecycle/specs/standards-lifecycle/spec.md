## ADDED Requirements

### Requirement: 标准资产两态生命周期

OpenXenon 的 Arsenal 中的所有标准资产（Probe、Proof、Stage、Blueprint）SHALL 采用统一的 DRAFT/CANONICAL 两态生命周期。

#### Scenario: DRAFT 状态资产
- **WHEN** AI 通过 /oxn-forge 生成新的标准资产
- **THEN** 资产被创建在 `.openxenon/standards/{type}/DRAFT/` 目录下
- **AND** 资产状态为 DRAFT

#### Scenario: CANONICAL 状态资产
- **WHEN** 工程师执行 `oxn standards promote` 命令确认 DRAFT 资产
- **THEN** 资产被物理移动到 `.openxenon/standards/{type}/CANONICAL/` 目录下
- **AND** 资产状态变为 CANONICAL

### Requirement: 标准目录结构

系统 SHALL 采用统一的目录结构存储标准资产：

```
.openxenon/standards/
├── probes/
│   ├── DRAFT/
│   └── CANONICAL/
├── proofs/
│   ├── DRAFT/
│   └── CANONICAL/
└── stages/
    ├── DRAFT/
    └── CANONICAL/
```

#### Scenario: 目录自动创建
- **WHEN** 系统首次初始化或访问标准目录时
- **THEN** Core SHALL 自动创建所需的 DRAFT 和 CANONICAL 子目录

### Requirement: CLI 命令支持

系统 SHALL 提供 `oxn standards` 命令集：

- `oxn standards list [--state DRAFT|CANONICAL]`: 列出指定状态的标准资产
- `oxn standards inspect <asset-path>`: 查看指定资产的完整内容
- `oxn standards promote <asset-path>`: 将 DRAFT 资产转正为 CANONICAL

#### Scenario: 列出所有 CANONICAL 资产
- **WHEN** 工程师执行 `oxn standards list --state CANONICAL`
- **THEN** 系统 SHALL 输出所有 CANONICAL 状态的 Probe、Proof、Stage 列表

#### Scenario: DRAFT 资产转正
- **WHEN** 工程师执行 `oxn standards promote standards/proofs/DRAFT/my-proof.yaml`
- **THEN** 系统 SHALL 将资产从 DRAFT 移动到 CANONICAL 目录
- **AND** 系统 SHALL 输出 "Asset promoted successfully"