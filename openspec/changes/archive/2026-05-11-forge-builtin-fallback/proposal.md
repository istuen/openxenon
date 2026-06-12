## Why

新项目执行 `oxn forge probe` 返回"元Forge 'probe' 不存在"——因为 `loadMetaForge` 只查项目级 `.openxenon/arsenals/` 目录，找不到就返回 null，没有回退到内置资产。内置的 meta-forge 资产（meta-probe、meta-proof、meta-stage、meta-blueprint）虽然已经存在于 `src/arsenals/forges/` 下，但查找链断裂导致无法使用。

同样的问题影响 `oxn arsenal list/inspect`——在新项目里返回"No standard assets found."，因为 `arsenalListStandards` 的 fallback 链只到全局级，没有包含内置级。

此外，Skills 还在引用 `oxn daemon` 命令，但 daemon 在编译后不可用（硬编码 `./src/server.ts` 路径），且自举闭环不需要 daemon。

## What Changes

1. **loadMetaForge 三级 fallback**：`src/cli/forge.ts` 的 `loadMetaForge` 函数增加项目级 → 全局级 → 内置级三级查找顺序
2. **arsenalListStandards 内置级 fallback**：`src/arsenals/loader.ts` 增加内置级 `src/arsenals/` 作为第三级 fallback
3. **构建时复制内置资产**：`package.json` 的 `build` 脚本增加 `cp -r src/arsenals dist/arsenals`，确保编译后产物包含内置资产
4. **Skills 去 daemon 引用**：`src/skills/oxn-task.ts` 改用 `oxn arsenal list` 替代 `oxn arsenal search`（search 依赖 daemon，list 不依赖）

## Capabilities

### New Capabilities

- `builtin-asset-fallback`: 内置资产的 fallback 查找机制。内置资产（`src/arsenals/` 下的 forges、probes、proofs 等）在项目级和全局级都找不到时，作为最后兜底被查找。查找优先级为：项目级 → 全局级 → 内置级。

### Modified Capabilities

- `forge-command`: `loadMetaForge` 的行为变更——从只查项目级改为三级 fallback。不影响用户可见的 CLI 接口，只影响内部查找逻辑。
- `arsenal-list-command`: `arsenalListStandards` 的行为变更——增加内置级 fallback。命令接口不变。

## Impact

- **影响的文件**：`src/cli/forge.ts`、`src/arsenals/loader.ts`、`package.json`、`src/skills/oxn-task.ts`
- **影响的功能**：`oxn forge probe/all` 命令、`oxn arsenal list/inspect` 命令、Skills 的自举流程
- **不包含**：daemon 打包问题的修复（已知缺陷 P2）