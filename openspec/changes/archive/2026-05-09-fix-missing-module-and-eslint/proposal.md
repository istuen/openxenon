## Why

TypeScript 类型检查失败，存在两类错误：
1. **模块路径错误**：`src/daemon/ipc/handlers/arsenal-search.ts` 中 `../../kernel` 路径不正确
2. **类型导出缺失**：`src/arsenals/loader.ts` 中 `AssetType` 未从 `infra/loader` 导出

## What Changes

### 1. 修复模块路径

**问题**：
- `src/daemon/ipc/handlers/arsenal-search.ts` 第 3 行：`import ... from '../../kernel'` 路径错误
- 应该是 `../../../kernel`

**修复**：修正导入路径

### 2. 修复类型导出

**问题**：
- `src/arsenals/loader.ts` 使用 `import('../infra/loader').AssetType`
- 但 `infra/loader.ts` 导出的是 `type AssetType`，需要用 `export type` 导出

**修复**：
- 在 `infra/loader.ts` 中添加 `export type { AssetType }`
- 或在 `arsenals/loader.ts` 中正确从 `arsenals/paths` 导入

### 3. 移除未使用导入

**问题**：`src/daemon/registry.ts` 中 `join` 和 `ARSENALS_ROOT` 未使用

**修复**：移除未使用的导入

### 4. 增强 ESLint 检测

**问题**：ESLint 配置不够完善，需要增加更多物理边界检测规则

**修复**：添加以下规则：
- 禁止 `src/daemon/**` 直接导入 `node:fs`（已有）
- 禁止 `src/kernel/**` 导入 `src/infra/**`（已有）
- 新增：禁止使用未修饰的 `@ts-ignore` 或 `// @ts-ignore`
- 新增：检查未使用的导入（TypeScript `noUnusedLocals` 已启用，但需要 ESLint 配合）

## Capabilities

### New Capabilities
- `typescript-path-correction`: 修正 TypeScript 模块导入路径

### Modified Capabilities
- 无

## Impact

- **修改文件**: `src/daemon/ipc/handlers/arsenal-search.ts`
- **修改文件**: `src/daemon/registry.ts`
- **修改文件**: `src/arsenals/loader.ts`
- **修改文件**: `.eslintrc.cjs`（可能需要调整规则）