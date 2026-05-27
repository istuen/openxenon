## Why

Meta Forge Blueprint 定义了生成 Arsenal 资产的约束规则，是 OpenXenon 的"元语法"。当前这些约束以 TypeScript 硬编码形式存在，应该作为内置 Forge 资产独立管理。

## What Changes

1. **将 meta-forge 拆分为独立 Forge 资产**
   - `src/forges/meta-probe/` - Probe 资产约束
   - `src/forges/meta-stage/` - Stage 资产约束
   - `src/forges/meta-proof/` - Proof 资产约束
   - `src/forges/meta-blueprint/` - Blueprint 资产约束

2. **oxn init 时复制内置 Forge 到项目**
   - 初始化项目时复制 `src/forges/meta-*` 到 `.openxenon/forges/meta-*`

3. **修改 oxn-forge 加载机制**
   - 从 `.openxenon/forges/` 加载，而非 TypeScript 硬编码
   - 保留 fallback 机制确保向后兼容

4. **删除 src/core/blueprints/meta-forge.ts**
   - 约束已迁移到独立 Forge，原始文件冗余

## Capabilities

### Modified Capabilities
- `oxn-forge`: 加载约束从 TypeScript 硬编码改为 `.openxenon/forges/` 路径
- `oxn-init`: 初始化时复制内置 Forge 到项目目录

## Impact

- 影响 `src/skills/oxn-forge.ts` 加载逻辑
- 影响 `src/commands/forge.ts` 约束获取
- 影响 `src/commands/init.ts` 初始化逻辑
- 新增 `src/forges/` 目录结构
