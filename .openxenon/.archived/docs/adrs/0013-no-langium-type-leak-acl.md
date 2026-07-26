# ADR-0013: L1 contracts 不允许 Langium 类型泄露（ACL 守则）

> **来源**：`docs_tmp/dsl-index-export-1.md`, `dsl-index-export-2.md`, `dsl-index-export-3.md` (2026-05-28)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L1-OXL 边界

## 决策

`src/oxl/index.ts` **不导出 Langium 类型**。OXL 对外只暴露：

```ts
export { createOxnCompiler, type OxnCompiler } from './compiler.js'
export type { OxnIR, OxnValidationResult } from './ir-types.js'
// ❌ 禁止 export { AstNode, ... } from 'langium'
```

### 实现要点

- **接口**放 `src/oxl/contracts/`（L1 内部）
- **类实现**通过 `createOxnCompiler()` 工厂函数返回，**不 export 类本身**
- **Langium types** 仅在 `src/oxl/generated/` 内（被 .gitignore 排除构建产物）

## 原因

- L0 / L1 调用方不能 import Langium（避免依赖外部包）
- 未来替换 Langium 时，只改工厂内部实现
- TypeScript 类型边界清晰

## 后果

- ✅ L1-OXL 可在 L0 Kernel / L2 Builtin 中安全使用
- ✅ Langium 升级不影响下游
- ✅ Mock 测试友好（接口注入即可）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-28-dsl-index-export-1.md`