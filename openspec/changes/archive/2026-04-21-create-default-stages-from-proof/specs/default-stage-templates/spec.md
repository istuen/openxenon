## ADDED Requirements

### Requirement: 系统提供基于内置 fs* Proof 的默认 Stage 模板
系统 SHALL 提供预定义的默认 Stage 配置，这些 Stage 基于现有的 fs* 内置 Proof（fs_exists, fs_not_exists, fs_content_match, fs_parseable）。

#### Scenario: 查询默认 Stage 列表
- **WHEN** 用户请求获取所有默认 Stage 模板
- **THEN** 系统返回 4 个 fs* 默认 Stage，每个对应一个内置 Proof

#### Scenario: 按 Proof ID 获取默认 Stage
- **WHEN** 用户通过 Proof ID 请求特定默认 Stage（如 `default:fs_exists`）
- **THEN** 系统返回包含完整配置的 Stage 对象，包括 id、name、proof、description 和 exampleInput

### Requirement: 默认 Stage 可在 Blueprint 中引用
用户 SHALL 能够在 Blueprint 的 stages 数组中引用默认 Stage 模板。

#### Scenario: 在 Blueprint 中引用默认 Stage
- **WHEN** 用户在 Blueprint 配置中设置 `"stage": "default:fs_exists"` 并提供 input
- **THEN** 系统加载对应的默认 Stage 配置并与用户提供的 input 合并

### Requirement: 每个默认 Stage 包含完整配置
每个默认 Stage SHALL 包含以下字段：id、name、proof、description 和 exampleInput。

#### Scenario: 默认 Stage 配置完整性
- **WHEN** 系统生成默认 Stage 列表
- **THEN** 每个 Stage 包含：
  - id: 格式为 `default:<proof-id>`（如 `default:fs_exists`）
  - name: 人类可读的名称
  - proof: 对应的 Proof ID
  - description: Stage 用途说明
  - exampleInput: 该 Proof 所需的示例参数

### Requirement: 支持的默认 fs* Stage 类型
系统 SHALL 支持以下 4 种默认 fs* Stage：

| Stage ID | Proof ID | 用途 |
|----------|----------|------|
| default:fs_exists | fs_exists | 检查文件或目录是否存在 |
| default:fs_not_exists | fs_not_exists | 检查文件或目录是否不存在 |
| default:fs_content_match | fs_content_match | 检查文件内容是否包含指定文本 |
| default:fs_parseable | fs_parseable | 检查文件是否可解析为指定格式 |

#### Scenario: 每个默认 Stage 可独立使用
- **WHEN** 用户选择任意默认 Stage
- **THEN** 该 Stage 可独立执行其对应的 Proof 验证
