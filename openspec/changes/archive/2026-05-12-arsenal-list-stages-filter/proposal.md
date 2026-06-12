## Why

`oxn arsenal list` 无法显示 stages 资产，且不支持按类型过滤。当前实现存在两个问题：1）stages 目录结构与 loader 路径逻辑重叠导致扫描被跳过；2）用户无法按类型（probe/proof/stage/blueprint）筛选资产列表。

## What Changes

1. **修复 stages 资产显示**：`oxn arsenal list` 能正确显示 stages 目录下的资产
2. **增加 `--type` 过滤参数**：支持 `--type probe`、`--type proof`、`--type stage`、`--type blueprint` 按类型过滤
3. **增加 `--scope` 参数**：`--scope project`、`--scope global`、`--scope builtin` 按来源过滤

## Capabilities

### New Capabilities

- `arsenal-list-command`: 列出标准资产的 CLI 命令。增强 `oxn arsenal list` 支持 stages 和类型过滤。
  - 新增 `--type <type>` 参数：过滤特定类型的资产（probe/proof/stage/blueprint）
  - 新增 `--scope <scope>` 参数：过滤资产来源（project/global/builtin）
  - 修复 stages 目录扫描逻辑

### Modified Capabilities

- `arsenal-registry`: 资产注册表的行为不变，但 loader 路径逻辑需要调整以正确扫描 stages

## Impact

- **影响文件**：`src/cli/arsenal-list.ts`、`src/infra/loader.ts`
- **影响命令**：`oxn arsenal list`
- **向后兼容**：现有参数不变，新增可选参数