---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-013: FileSystemPort (Type A) 与 runtime/file.ts (Type B) 职责分工

> **状态**：Accepted
> **日期**：2026-06-12
> **决策者**：架构师 + 维护者
> **关联文档**：
> - ADR-012（runtime 适配层）：`./012-runtime-adapter.md`
> - arch-discussion §3 (Type A/B 分类) + §6.1 (FileSystemPort 无 kernel 消费者) + §6.2 (hashPort 双重身份)
> - design v0.3 §11.3 (FileSystemPort vs runtime/file.ts 职责分工表)
> - 关联变更：v0.1.5 引入 infra/runtime/ 适配层后，probe handler 改用 runtime/file.ts；
>   sandbox-manager 保留 FileSystemPort 注入模式

## 背景

OpenXenon 有**两套**文件 IO 抽象：

1. **`FileSystemPort`** (L0-Contract, Type A) — 同步基础 fs 操作
2. **`runtime/file.ts`** (L1-Infra, Type B) — 异步高级文件读取

v0.1.5 引入 runtime 适配层后，**probe handler 改走 runtime/file.ts**（`openFile().text()` 等）。但 sandbox-manager 仍然用 `FileSystemPort`（同步基础原语）。

两者是否冲突？哪些应该用哪个？这是 ADR-013 要回答的问题。

## 决策

### 1. 两套抽象**不重叠**，按使用场景选

| 维度 | `FileSystemPort` (Type A) | `runtime/file.ts` (Type B) |
|---|---|---|
| **位置** | `src/kernel/contracts/file-system-port.ts` | `src/infra/runtime/file.ts` |
| **使用方** | **L0-Kernel 内部** + **L2-Work sandbox-manager** | **L1-Infra probe handler** |
| **API 形状** | **同步**、基础 fs 操作 | **异步**、高级文件读取 |
| **方法** | `existsSync` / `mkdirSync` / `copyFileSync` / `readFileSync` / `writeFileSync` | `openFile(path).text() / .json() / .exists()` / `runtime.spawn` |
| **runtime 适配** | ❌ 不适配（Kernel 纯函数；L2 同步原语） | ✅ 自动 detect Bun/Node |
| **设计意图** | Kernel 使用的同步、基础 fs 操作 | Probe 使用的异步、高级文件读取 |
| **注入方式** | 函数参数（Type A 模式）| 模块 import + 工厂（Type B 模式）|

### 2. 选型决策树

```
问: 这个调用方是 Kernel 纯函数 / L2 同步逻辑吗？
├─ 是 → 用 FileSystemPort (Type A, 同步, 函数参数注入)
└─ 否 → 问: 它是 probe handler 吗？
    ├─ 是 → 用 runtime/file.ts (Type B, 异步, 工厂)
    └─ 否 → 默认用 Node fs (但 v0.1.6 强约束 probe handler 必须走 runtime)
```

### 3. 当前实际消费方（v0.1.6）

| 模块 | 层 | 用什么 | 理由 |
|---|---|---|---|
| `src/infra/probes/*.ts` | L1-Infra | `runtime/file.ts` (openFile) | 异步 IO + runtime 适配 |
| `src/infra/frozen/immutable.ts` | L1-Infra | `runtime/file.ts` (openFile) | 异步 IO + runtime 适配 |
| `src/infra/git/workspace.ts` | L1-Infra | `child_process.execFile` | exec 隔离，自治 |
| `src/work/sandbox/sandbox-manager.ts` | L2-Work | `FileSystemPort` (函数参数) | **同步基础原语**，符合 Type A 注入模式 |
| `src/infra/boundary.ts` | L1-Infra | `OsPort` (Type A) | 同步 OS 抽象 |
| `src/infra/path-port.ts` | L1-Infra | `PathPort` (Type A) | 同步 path 抽象 |
| Kernel 内部 | L0-Kernel | **无**（arch-discussion §6.1 拍板）| Kernel 兰姆达真空 |

**重点观察**：
- **Type A 接口确实有非 kernel 消费者**（sandbox-manager / boundary / path-port 都是 L1/L2）
- arch-discussion §6.1 当时拍板"无 kernel 消费者"是**真实状态**（v0.1.5 之前）；v0.1.6 sandbox-manager 引入后变成"L0-Kernel 无但 L1/L2 有"
- 但**核心 Type A 定义不变**：仍以"函数参数注入"为消费方式

### 4. 为什么不合并成一个？

**不合并**，理由：
1. **同步 vs 异步** — Type A 是同步基础原语，Type B 是异步高级抽象。强行合并要么失去同步（影响 sandbox-manager 性能），要么失去 runtime 适配（影响 probe handler 双 runtime）
2. **层间隔离** — Type A 在 L0-Contract，Type B 在 L1-Infra。L0-Kernel 永远是兰姆达真空（不能用 IO），所以"同步基础原语"需要 Type A 单独存在以供 L1/L2 复用
3. **依赖方向** — Type A 不依赖 Type B（FileSystemPort 不知道 openFile），Type B 也不依赖 Type A（runtime 不 import FileSystemPort）。两条独立路径不冲突

## 架构守卫

- ✅ FileSystemPort 在 L0-Contract，被 L1/L2 消费（函数参数）—— 符合 Type A 模式
- ✅ runtime/file.ts 在 L1-Infra，被 L1 probe handler 消费（模块 import）—— 符合 Type B 模式
- ✅ 两者不互相依赖（`bun scripts/validate-dependencies.ts` 0 违规）
- ✅ sandbox-manager.ts 的 `fs?: FileSystemPort` 注入模式保持兼容（不改 API）

## 与 ADR-012 的关系

ADR-012 拍板"RuntimePort 放 Type B 而非 Type A"。**ADR-013 是其推论**：

- ADR-012 解决了**新模块**（runtime/）的归属
- ADR-013 解决**新老模块共存**（FileSystemPort 已存在 + runtime/file.ts 新增）—— 用 **API 形状差异**（同步 vs 异步）做**自动分类**

## 副作用 / 副作用清单

### 强制项
- ❌ **禁止**：把 FileSystemPort 改成异步（破坏 sandbox-manager 同步语义）
- ❌ **禁止**：把 runtime/file.ts 改成同步（破坏 Bun/Node 双 runtime 抽象）

### 允许
- ✅ L1-Infra / L2-Work 选用 FileSystemPort（同步场景）
- ✅ L1-Infra probe handler 选用 runtime/file.ts（异步 + 双 runtime 场景）

### 不做

- ❌ **不**移除 FileSystemPort / OsPort / PathPort（arch-discussion §6.1 历史预留，移除成本高）
- ❌ **不**把 FileSystemPort 移到 L1-Infra（会破坏 L0-Contract 边界）
- ❌ **不**让 runtime/file.ts 走 Type A 模式（破坏 Type B 工厂注入）

## 遗留问题

### arch-discussion §6.1 的"无 kernel 消费者"陈述已过时

v0.1.5 之前，FileSystemPort / OsPort / PathPort 确实**没消费者**。v0.1.6 引入 sandbox-manager 之后，FileSystemPort 有了 sandbox-manager 消费者（L2-Work）。OsPort / PathPort 仍然**没消费者**。

**判断**：
- FileSystemPort 现状有 1 个 L2-Work 消费者 — **类型分类仍 Type A**（函数参数注入）
- OsPort / PathPort 仍无消费者 — **保持历史预留**（arch-discussion §6.1 立场）

未来若 kernel 纯函数需要 fs 操作（Type A 真实消费），移除 OsPort/PathPort 即可；不需要修改任何当前消费者。

## 验证

- ✅ `bun scripts/validate-dependencies.ts` — 0 违规
- ✅ FileSystemPort 与 runtime/file.ts 在 L0-Contract vs L1-Infra 物理隔离
- ✅ sandbox-manager 的 `fs?: FileSystemPort` 注入在 v0.1.6 仍工作
- ✅ 5 个 probe handler 改走 runtime/file.ts 后 1091 测 pass

## 未来扩展

如未来需要：
- **HTTP 抽象**：arch-discussion §6.1 + design v0.3 §7.5 留了口。届时建 `src/infra/runtime/http.ts` 走 Type B 模式
- **OsPort 真实使用**：kernel 纯函数真需要 OS 抽象时，可移 OsPort 实现到 `src/infra/os/`，保留 kernel/contracts 抽象
