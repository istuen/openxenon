## Why

在实现 Arsenal Registry 功能时，开发者为了"方便"绕过了三权分立的编排链路，引入了三个物理倒灌违规。这些违规如果不修复，会持续侵蚀架构的物理边界，导致 Kernel 不再"真空"、Infra 不再是唯一物理出口。

## What Changes

### 1. 修复 `daemon/registry.ts` 直接导入 `fs`

**违规**：`daemon/registry.ts` 第 1 行直接 `import { existsSync, readdirSync, readFileSync } from 'fs'`

**修复**：
- 改为调用 `infra/loader.ts` 的 `listStandards()` 获取资产列表
- 调用 Kernel 的纯函数解析 semantics JSON
- Daemon Registry 只做内存索引，不碰文件系统

### 2. 修复 `kernel/lib/custom-proofs-scanner.ts` 导入 `infra/scanner`

**违规**：Kernel 模块导入 Infra，破坏兰姆达真空

**修复**：
- 从 `kernel/index.ts` 删除 `scanProjectProofs`, `scanGlobalProofs`, `getAllCustomProofs`, `findCustomProof` 导出
- 将 `scanProjectProofsSync`, `scanGlobalProofsSync` 移到 `infra/scanner.ts`（已经是 I/O 函数）
- `kernel/custom-proofs-resolver.ts` 只保留纯函数 `resolveCustomProofsRecursive()`

### 3. 修复 `kernel/index.ts` 导出 `scan*` 函数

**违规**：Kernel 公共 API 出现 `scan` 动词，暗示 I/O 操作

**修复**：
- 将路径函数 `getGlobalProofsPath`, `getProjectProofsPath` 移到 `infra/scanner.ts`
- `kernel/index.ts` 只导出纯函数（`resolve*`, `evaluate*`, `reduce*`, `validate*`, `parse*`）

### 4. 强化 ESLint 规则

在 `.eslintrc.cjs` 中添加新规则：
- 禁止 `src/daemon/**` 直接导入 `fs` 或 `node:fs`
- 禁止 `src/kernel/**` 导入 `src/infra/**`

## Capabilities

### New Capabilities
- `daemon-no-direct-fs`: ESLint 规则，禁止 Daemon 直接导入 fs
- `kernel-no-infra-import`: ESLint 规则，禁止 Kernel 导入 Infra

### Modified Capabilities
- `pure-filesystem-state`: 需要澄清 I/O 操作的合法调用路径

## Impact

- **修改文件**: `src/daemon/registry.ts`（重构为调用 Infra）
- **修改文件**: `src/kernel/lib/custom-proofs-scanner.ts`（删除 I/O 函数）
- **修改文件**: `src/kernel/index.ts`（删除 scan* 导出）
- **修改文件**: `.eslintrc.cjs`（新增两条规则）
- **无破坏性变更**：只是把 I/O 逻辑移到正确位置