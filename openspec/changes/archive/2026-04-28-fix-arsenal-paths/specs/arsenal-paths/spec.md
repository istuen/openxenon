## MODIFIED Requirements

### Requirement: Arsenal 资产目录结构

Arsenal 资产 SHALL 存储在 `~/.openxenon/arsenal/` 目录下，包含 probes、proofs、stages 三种类型，每种类型支持 DRAFT 和 CANONICAL 两种状态。

#### Scenario: Arsenal 根目录
- **WHEN** 系统初始化 Arsenal 目录
- **THEN** 系统 SHALL 在 `~/.openxenon/arsenal/` 下创建以下结构
- **AND** 系统 SHALL 包含 `probes/`、`proofs/`、`stages/` 三个子目录

#### Scenario: 资产状态目录
- **WHEN** 系统需要存储 DRAFT 状态的 Probe
- **THEN** 系统 SHALL 将资产存储在 `~/.openxenon/arsenal/probes/DRAFT/` 目录

#### Scenario: CANONICAL 状态目录
- **WHEN** 系统需要存储 CANONICAL 状态的 Proof
- **THEN** 系统 SHALL 将资产存储在 `~/.openxenon/arsenal/proofs/CANONICAL/` 目录