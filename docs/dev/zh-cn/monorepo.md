---
title: Monorepo 双包
---

# Monorepo 双包

> `packages/cli` + `packages/engine` 双包协作。CLI 是薄组合调用层，Engine 承载全部业务实现。

## 双包结构

| 包 | 层级 | 职责 | 导出 |
|---|---|---|---|
| `@openxenon/cli` | L3 | 用户/Agent 交互入口 | `bin: oxn` |
| `@openxenon/engine` | L0-L2 | 业务实现（kernel + oxl + infra + DDD 模块） | 多子路径 export |

## Engine 子路径 Export

```json
{
  ".": "./src/index.ts",
  "./kernel/*": "./src/kernel/*",
  "./oxl/*": "./src/oxl/*",
  "./infra/*": "./src/infra/*",
  "./Asset": "./src/Asset/index.ts",
  "./Intent": "./src/Intent/index.ts",
  "./Align": "./src/Align/index.ts",
  "./Proof": "./src/Proof/index.ts",
  "./Insight": "./src/Insight/index.ts",
  "./Pool": "./src/Pool/index.ts"
}
```

## CLI 调用 Engine 的方式

```ts
// packages/cli/src/commands/work.ts
import { createWork } from '@openxenon/engine/Intent'
import { runWork } from '@openxenon/engine/Align'
import { finalizeWork } from '@openxenon/engine/Proof'
```

## Bun Workspaces

```json
// package.json
{ "workspaces": ["packages/*"] }
```

- 锁文件：`bun.lock`（不用 pnpm）
- 构建：`bun build --target=node --outdir dist`
- CLI 产物：`dist/cli.js`（单文件可执行，含 shebang）

## 参考

- [AGENTS.md §CLI 架构](../../../AGENTS.md#cli-架构oxn) — 三档退出分类器
- [AGENTS.md §Monorepo](../../../AGENTS.md#硬性规则l0l3-宪法) — 依赖方向 + ESLint 守卫
