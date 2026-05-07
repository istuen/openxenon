## MODIFIED Requirements

### Requirement: 晋升前路径验证

**原文**（来自 `openspec/specs/pure-filesystem-state/spec.md`）：
> 只有位于 `draft/` 目录下的资产才能被晋升。验证必须基于文件路径，不能基于内存中的 state 字段。

**修改为**：
只有存在 `draft.yaml` 文件的资产才能被晋升。验证必须基于文件名，不能基于目录结构或内存 state 字段。

#### Scenario: 验证 draft.yaml 存在
- **WHEN** 调用 `promoteStandard()` 且 `fromPath` 指向包含 `draft.yaml` 的目录
- **THEN** 函数正常执行，执行 `renameSync()` 将 `draft.yaml` 变为 `canonical.yaml`

#### Scenario: 拒绝无 draft.yaml 的资产
- **WHEN** 调用 `promoteStandard()` 且目录下不存在 `draft.yaml`
- **THEN** 函数抛出错误：`Asset is not in draft state`

#### Scenario: CLI 检查源文件
- **WHEN** CLI 执行 `oxn arsenal promote <type>/<name>`
- **THEN** CLI 检查资产目录下是否存在 `draft.yaml`，若不存在则拒绝晋升

---

### Requirement: 状态由文件名派生

**原文**：
> `StandardAsset.state` 字段是从文件路径派生的，仅用于展示用途，不用于业务逻辑校验。

**修改为**：
`StandardAsset.state` 字段是从文件名派生的（`draft.yaml` → draft，`canonical.yaml` → canonical），仅用于展示用途。

#### Scenario: 从 draft.yaml 派生 state
- **WHEN** 调用 `loadStandardByPath(assetPath)` 且路径以 `/draft.yaml` 结尾
- **THEN** 返回的 `StandardAsset.state` 为 `'draft'`

#### Scenario: 从 canonical.yaml 派生 state
- **WHEN** 调用 `loadStandardByPath(assetPath)` 且路径以 `/canonical.yaml` 结尾
- **THEN** 返回的 `StandardAsset.state` 为 `'canonical'`

#### Scenario: state 用于展示
- **WHEN** 用户列出资产并查看详情
- **THEN** 资产信息中的 `state` 字段反映其文件名（draft.yaml → draft，canonical.yaml → canonical）
