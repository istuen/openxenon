## ADDED Requirements

### Requirement: 模块路径正确性

所有 TypeScript 模块导入路径 MUST 是相对于当前文件位置的正确路径。

#### Scenario: Daemon IPC handlers 正确导入 Kernel
- **WHEN** `src/daemon/ipc/handlers/*.ts` 文件导入 `src/kernel/**`
- **THEN** 使用正确的相对路径 `../../../kernel`

#### Scenario: Infra 导出类型
- **WHEN** `infra/loader.ts` 定义了 `AssetType`
- **THEN** 使用 `export type { AssetType }` 导出（配合 `verbatimModuleSyntax`）

#### Scenario: 未使用的导入必须移除
- **WHEN** TypeScript 编译器报告 `noUnusedLocals` 或 `noUnusedParameters`
- **THEN** 必须移除未使用的导入或变量