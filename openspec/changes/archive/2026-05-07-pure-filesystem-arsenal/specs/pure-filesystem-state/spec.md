## ADDED Requirements

### Requirement: 晋升前路径验证

只有位于 `draft/` 目录下的资产才能被晋升。验证必须基于文件路径，不能基于内存中的 state 字段。

#### Scenario: 验证 draft 目录下的资产
- **WHEN** 调用 `promoteStandard()` 且 `fromPath` 包含 `/draft/`
- **THEN** 函数正常执行，执行 `renameSync()` 将文件移入 `canonical/` 目录

#### Scenario: 拒绝非 draft 目录的资产
- **WHEN** 调用 `promoteStandard()` 且 `fromPath` 不包含 `/draft/`
- **THEN** 函数抛出错误：`Asset is not in draft state`

#### Scenario: CLI 检查源路径
- **WHEN** CLI 执行 `oxn arsenal promote <type>/<name>`
- **THEN** CLI 检查资产路径是否包含 `/draft/`，如果不在 draft 目录则拒绝晋升

---

### Requirement: 状态由路径派生

`StandardAsset.state` 字段是从文件路径派生的，仅用于展示用途，不用于业务逻辑校验。

#### Scenario: 加载资产时派生 state
- **WHEN** 调用 `loadStandardByPath(assetPath)` 且 `assetPath` 包含 `/draft/`
- **THEN** 返回的 `StandardAsset.state` 为 `'draft'`

#### Scenario: 加载资产时派生 canonical state
- **WHEN** 调用 `loadStandardByPath(assetPath)` 且 `assetPath` 包含 `/canonical/`
- **THEN** 返回的 `StandardAsset.state` 为 `'canonical'`

#### Scenario: state 用于展示
- **WHEN** 用户列出资产并查看详情
- **THEN** 资产信息中的 `state` 字段反映其物理位置（draft/canonical）
