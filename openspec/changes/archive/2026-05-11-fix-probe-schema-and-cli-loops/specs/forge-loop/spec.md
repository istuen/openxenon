## ADDED Requirements

### Requirement: Forge Save Command
`oxn forge <type> --save '<yaml>' --name <asset-name>` SHALL 支持保存 YAML 内容为 Draft 资产，其中 `<type>` 可选 `probe`、`proof`、`stage`、`blueprint`。

### Requirement: Forge Global Flag
`--global` 参数 SHALL 将资产保存到全局 Arsenal (`~/.openxenon/arsenals/`)，不加 `--global` 则保存到项目 Arsenal。

### Requirement: Forge Loop Closure
Forge 循环 SHALL 实现完整链路：
1. AI 执行 `oxn forge <type>` 获取约束
2. AI 根据约束生成 YAML
3. AI 执行 `oxn forge <type> --save '<yaml>' --name <name>` 保存 Draft
4. 系统返回 `{ ok: true, data: { path: "..." } }`

### Requirement: Forge Constraint Display
`oxn forge <type>` (无 --save) SHALL 显示对应类型的元 Forge 约束信息。

#### Scenario: Save Probe Draft Successfully
- **WHEN** AI 执行 `oxn forge probe --save 'type: fs_exists
description: "test"
parameters:
  - name: pattern
    type: string' --name test-probe`
- **THEN** 系统返回 `{ ok: true, data: { path: ".openxenon/arsenals/probes/test-probe/draft.yaml" } }`

#### Scenario: Save Probe Draft with Missing Required Field
- **WHEN** AI 执行 `oxn forge probe --save 'type: fs_exists' --name test`
- **THEN** 系统返回 `{ ok: false, error: { code: "OXN_FORGE_SAVE_FAILED", message: "Invalid probe structure" } }`

#### Scenario: Save Global Probe
- **WHEN** AI 执行 `oxn forge probe --save '<yaml>' --name global-probe --global`
- **THEN** 资产保存到 `~/.openxenon/arsenals/probes/global-probe/draft.yaml`
