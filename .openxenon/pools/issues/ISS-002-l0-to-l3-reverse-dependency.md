# ISS-002 · L0 → L3 反向依赖：IAPError 物理位置错位

> **状态**：✅ Fixed in `140f9f5` (2026-06-10) · 🗂 Closed (2026-07-15, pool-audit-D4)
> **严重度**：🔴 High（L0 依赖 L3，违反"内层不依赖外层"宪法）
> **发现时间**：2026-06-08
> **发现者**：L0-L3 一致性审计（commit `ab6cdce`）
> **影响文件（修复前）**：`src/kernel/probes/catalog.ts:435`

---

## 1. 现象

`scripts/validate-dependencies.ts` 报告（修复前）：

```json
{
  "from": "src/kernel/probes/catalog.ts",
  "to": "/Users/issac/pro/openxenon/src/core/errors",
  "rule": "L0-Processor cannot depend on L3-CLI",
  "line": 435
}
```

**这是 L0 Kernel → L3 CLI 的反向依赖**——内核层（最内层）反向依赖运行时（最外层），违反 L0-L3 宪法 §1.1 "内层不依赖外层"。

> **路径注**：本报告原始路径基于 v0.5 单包布局。v0.6 monorepo 重构（`5a17130`，2026-06-21）后路径变为 `packages/engine/src/kernel/verdicts/catalog.ts` + `packages/engine/src/errors/`，但**问题本质不变**——catalog.ts 仍依赖错误类型、错误类型仍在 L3 物理位置。

---

## 2. 根因

`IAPError` / `IAPAction` 是 **IAP 范式（Intent-Align-Proof）的核心数据契约**：

```typescript
// 修复前：packages/engine/src/errors/iap-error.ts（已删除）
export enum IAPAction {
  RETRY, ABORT, ESCALATE, RETRY_WITH_CONTEXT, ...
}

export interface IAPErrorContext {
  code: IAPErrorCode
  action: IAPAction
  message: string
  ...
}

export class IAPError extends Error { ... }
```

但这些类型**物理放在 `packages/engine/src/errors/`（L3-CLI）**，因为历史上 `core/errors/` 是 OXN 错误字典的统一收口地。

**L0 Kernel（`catalog.ts`）在翻译层需要这些类型**：

```typescript
// 修复前：packages/engine/src/kernel/verdicts/catalog.ts:543
// ---------------------------------------------------------------------------
// 翻译层
// ---------------------------------------------------------------------------

import { IAPError, IAPAction } from '../../errors/iap-error'  // 🐛 L0→L3
```

---

## 3. L0-L3 边界违反图（修复前）

```
┌─────────────────────────────────────────────────┐
│ L3: Runtime                                       │
│   packages/engine/src/errors/ (物理)             │
│   ├─ OXNCrash ✅ (CLI 顶层 catch)                 │
│   ├─ IAPError ❌ (IAP 范式核心，物理错位)         │
│   └─ cli-input-error ✅                           │
└─────────────────────────────────────────────────┘
              ↑ 🐛 反向依赖
┌─────────────────────────────────────────────────┐
│ L0: Kernel                                       │
│   packages/engine/src/kernel/verdicts/catalog.ts │
└─────────────────────────────────────────────────┘
```

---

## 4. 修复方案与落地

### 4.1 采用方案：物理移动 IAPError 到 L0-Contract

将 IAP 范式核心类型从 `packages/engine/src/errors/` 移到 `packages/engine/src/kernel/contracts/`：

```bash
git mv packages/engine/src/errors/iap-error.ts \
        packages/engine/src/kernel/contracts/iap-error.ts
```

### 4.2 移动后边界

| 当前位置（修复前） | 新位置（修复后） | 理由 |
|---|---|---|
| `packages/engine/src/errors/iap-error.ts` | `packages/engine/src/kernel/contracts/iap-error.ts` | IAPError 是 IAP 范式核心数据契约，物理属于 L0-Contract |
| `packages/engine/src/errors/oxn-crash.ts` | 留在原位 | OXNCrash 是 CLI 运行时崩溃，物理属于 L3 |
| `packages/engine/src/errors/cli-input-error.ts` | 留在原位 | CLI 用户输入错，物理属于 L3 |

### 4.3 实际落地（commit `140f9f5`，2026-06-10）

- `git mv src/core/errors/iap-error.ts → src/kernel/contracts/iap-error.ts`（保留文件历史）
- `src/core/errors/index.ts` 改 re-export from 新位置：L3 现有 5 个 importer（cli/socket-client.ts / cli/proof.ts / cli/domain.ts / cli/index.ts / cli/__tests__/...）全部不破，零 churn
- `src/kernel/verdicts/catalog.ts:543` 切到 L0 真身（`'../contracts/iap-error'`）
- `tests/integration/probe-catalog.test.ts` 路径同步

> **OXNCrash / cli-input-error 留 L3**（消费者是人类，不是 IAP 范式）。

---

## 5. 验证结果

驱动：v0.1.4 L0 Kernel 审计（PR-B），原报告"修复后减少 1 条违规"已落地：

```bash
bun scripts/validate-dependencies.ts
# 修复前：7 条违规（含 catalog.ts L0→L3 反向）
# 修复后：6 条违规（catalog.ts L0→L3 已消除；剩 6 条全为外层→L0/L2 已知反向，不在 PR-B 范围）

bun run typecheck  # 通过
bun run lint       # 仅剩历史 2 条 daemon→cli（与 L0 无关）
bun test           # 984/984 pass / 0 fail / 4544 expect
```

---

## 6. 修复后边界图

```
┌─────────────────────────────────────────────────────────┐
│ L0: Kernel (兰姆达真空)                                  │
│   packages/engine/src/kernel/                            │
│   ├─ contracts/iap-error.ts ✅ (IAPError / IAPAction)    │
│   ├─ contracts/*-port.ts (其他 6 个 Port 接口)           │
│   ├─ processors/ (L0 处理器)                             │
│   └─ verdicts/catalog.ts ✅ (内核翻译层)                  │
└─────────────────────────────────────────────────────────┘
                  ↑ 0 反向依赖
┌─────────────────────────────────────────────────────────┐
│ L3: Runtime                                              │
│   packages/engine/src/errors/                            │
│   ├─ OXNCrash ✅ (CLI 顶层 catch)                         │
│   └─ cli-input-error ✅ (re-export from L0 iap-error.ts) │
└─────────────────────────────────────────────────────────┘
```

---

## 7. 相关引用

- **发现 commit**：`ab6cdce`（v0.5 时期审计时发现）
- **修复 commit**：`140f9f5`（2026-06-10，`refactor(core→kernel): IAPError 物理归位 L0-Contract（V-1 架构归位）`）
- **Monorepo 迁移 commit**：`5a17130`（2026-06-21，`chore(monorepo): 迁移 kernel/oxl/infra/errors 到 packages/engine`）
- **宪法依据**：`docs/zh-cn/architecture.md`（v0.6 后路径，原 `docs/architecture/l0-l3-constitution.md` §7.4 残留 1）
- **类似问题**：[ISS-001](./ISS-001-ci-early-exit-bug.md)（✅ Fixed 已关闭）/ [ISS-003](./ISS-003-pre-existing-broken-links.md)（✅ Fixed 已关闭）

---

**标签**：`architectural-violation` `l0-to-l3` `closed` `kernel-purity` `fixed-140f9f5`
