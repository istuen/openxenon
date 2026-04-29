## Why

当前 `oxn arsenal` 系列指令（`inspect`、`list`、`promote`）和 `oxn-forge` 在处理项目级/全局级资产时存在设计不一致：

1. **没有作用域标志** - 所有指令默认同时扫描项目级和全局级，没有 `--global` 标志位
2. **没有优先级逻辑** - 项目级和全局级简单合并，没有"项目优先，fallback 全局"的语义
3. **`oxn standard show` 未实现** - 需要实现"先查项目，未命中则 fallback 全局"的逻辑
4. **`oxn-forge` 只能创建项目级** - 没有 `--global` 选项

## What Changes

1. **CLI 作用域标志设计**
   - 添加 `--global` / `-g` 标志到所有 arsenal 指令
   - 默认行为：项目级
   - `--global`：全局级

2. **Arsenal Loader 重构**
   - `scanArsenalsDirectory` 增加 `scope` 参数
   - 支持三种模式：`project` | `global` | `fallback`

3. **实现 `oxn standard show`**
   - 先查项目级，存在则返回
   - 项目级未命中，fallback 查全局级
   - 都未命中则报错

4. **扩展 `oxn-forge` 支持 `--global`**
   - 默认创建项目级资产
   - `--global` 创建全局级资产

## Capabilities

### Modified Capabilities
- `arsenal-loading`: 扩展支持作用域过滤
- `standards-api`: 新增 `standard show` 命令

### New Capabilities
- `global-scope`: CLI 全局作用域穿透能力

## Impact

- 影响文件：`src/core/arsenals-loader.ts`、`src/commands/arsenal-*.ts`、`src/skills/oxn-forge.ts`
- 用户感知：CLI 指令行为更一致，符合"项目优先"的设计哲学