---
title: L0-L3 宪法
---

# L0-L3 宪法

> 8 子层的依赖方向是 OXN 的"宪法"——不可反向，不可越界。由 `validate-dependencies.ts` + ESLint `no-restricted-imports` 双守卫强制执行。

## 层级 → 目录映射

| 层级 | 物理位置（v0.6） | 禁止导入 |
|---|---|---|
| **L0-Schema** | `packages/engine/src/kernel/schemas/` | 其他所有层 |
| **L0-Contract** | `packages/engine/src/kernel/contracts/` | L0-Processor、L1、L2、L3 |
| **L0-Processor** | `packages/engine/src/kernel/{processors,verdicts}/` | L1+（禁止 fs/net/child_process/process.env/EventEmitter） |
| **L1-Infra** | `packages/engine/src/infra/` | L0-Processor、L2-Work、L3 |
| **L1-OXL** | `packages/engine/src/oxl/` | L0-Processor、L2、L3 |
| **L2-Builtin** | `src/builtin/`（残留，待迁入 engine） | L2-Work、L3 |
| **L2-Work** | `packages/engine/src/{Work,Asset,Intent,Align,Proof,Insight,Pool}/` | L3 |
| **L3** | `packages/cli/src/{commands,skills}/` + `src/{daemon,watcher}/` | — |

## 依赖方向

```
L3 → L2 → L1 → L0（单向，不可反向）
```

## ESLint 还阻止的相邻关系

| 禁止 | 原因 |
|---|---|
| `kernel ↔ infra` | Kernel 是 Lambda 真空，Infra 是 IO 层 |
| `daemon ↔ cli` | 仅 socket 通信 |
| `cli ↔ daemon` | 仅 socket 通信 |
| `infra ↔ {daemon, cli}` | Infra 不直接暴露给应用层 |
| `daemon` 不允许 `import fs` | 必须走 Infra |

## 守卫命令

```bash
# 纯 ESM 依赖图检查（跨 8 子层）
bun scripts/validate-dependencies.ts

# ESLint 架构守卫（按目录 no-restricted-imports）
bun run lint
```

## ESLint 输出解读

ESLint 架构规则的错误信息是**中文**（"🚨 宪法违规…"），会指明违反的边界。常见违规：

| 错误信息 | 含义 | 修复 |
|---|---|---|
| "L0-Processor 不可导入 L1-Infra" | Kernel 层引用了 IO 层 | 抽接口到 Contract 层 |
| "L3 不可导入 L0-Kernel" | CLI 直接引用了 Kernel | 改为通过 Engine 子路径 import |
| "kernel ↔ infra 隔离" | Kernel 和 Infra 互相引用 | 抽接口到 Contract 层 |

## 参考

- [AGENTS.md §硬性规则](../../../AGENTS.md#硬性规则l0l3-宪法) — 完整守卫矩阵
- [ADR-0006 三相模型](../../../.openxenon/docs/adrs/0006-three-phase-model.md) — 层级设计哲学
- [ADR-0009 Trace-before-State](../../../.openxenon/docs/adrs/0009-architectural-guard-tests-trace-before-state.md) — 写入顺序守则
