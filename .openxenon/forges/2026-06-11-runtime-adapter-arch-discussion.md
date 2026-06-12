# Runtime 适配层架构讨论纪要（Port-Adapter vs 工厂、双接口类型决策）

> **状态**：Draft v1.0 — 架构讨论总结，已拍板，**未实现**。
>
> **讨论时间**：2026-06-11
>
> **讨论来源**：运行时适配层 v0.2 设计审查 → Q1-Q5 + 架构风格深入讨论
>
> **目标读者**：架构师 + OXN 维护者
>
> **关联文档**：
> - Runtime 适配层设计：[`2026-06-11-runtime-adapter-design.md`](./2026-06-11-runtime-adapter-design.md)
> - v0.1.0 pre-publish 设计：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md)
> - L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)

---

## 1. 背景

在 runtime 适配层 v0.2 审查中，架构师提出关键问题：**"Infra 为何不是通过契约接口 + 工厂模式（bun/node）来实现，然后 index.ts 里读取常量/配置项来注入对应的 runtime 实现者？"**

当时首次回答将该方案标记为"OOP 模式"并建议折中方案。后续深入讨论澄清了 TypeScript structural typing 与 OOP 的本质区别，重新梳理了代码库中两种接口类型的真实分布，最终做出 RuntimePort 归属决策（Q3=B）。

---

## 2. 核心澄清：接口 + 工厂 ≠ OOP

### 2.1 为什么不是 OOP

| 特征 | OOP | TypeScript Port-Adapter |
|---|---|---|
| 实例化 | `new ClassImpl()` | `const obj: T = { ... }`（字面量） |
| 多态机制 | 运行时虚表 dispatch | 编译时结构类型检查 |
| 关键字 | `class implements extends` | `interface` + `: Type` 注解 |
| 运行时开销 | 虚表指针 + vtable lookup | 零（纯编译时） |

### 2.2 代码库已有先例

```ts
// L0-Contract — 纯类型（零运行时）
export interface HashPort {
  computeHash(content: string): string
}

// L1-Infra — 纯对象字面量（零 class，零 new）
import type { HashPort } from '../kernel/index'
export const hashPort: HashPort = {
  computeHash: (content) => createHash('sha256').update(content).digest('hex'),
}
```

**结论**：接口 + 工厂/实现分离就是 `FileSystemPort` / `HashPort` 已在用的模式。之前的"OOP"标签是错误表述。

---

## 3. 代码库实际存在的两种接口类型

### 3.1 Type A — Kernel Contract（L0 定义接口，L1 实现，函数参数注入）

```
L0-Contract 定义                  L1 实现                    注入机制
───────────────────────────────────────────────────────────────────
interface HashPort{              infra/hash.ts              函数参数：
  computeHash(s): string           const hashPort: HashPort   computeContentHash(..., hashPort: HashPort)
                                 
interface FileSystemPort{        infra/file-system-port.ts   函数参数
  existsSync, mkdirSync, ...       const fileSystemPort        (kernel 签名用, 无实际消费者)
                                 
interface OsPort{                infra/boundary.ts           函数参数
  getHomedir, join, ...            const osPort                (无实际消费者)
                                 
interface PathPort{              infra/path-port.ts          函数参数
                                   const pathPort              (无实际消费者)
```

```ts
// 注入机制核心：函数参数传递（非 DI 容器）
// kernel/schemas/validators/compiled-schema.ts
export function computeContentHash(content: string, hashPort: HashPort): string {
  return hashPort.computeHash(content)
}

// L1/L2 消费者 inject
import { hashPort } from '../infra/hash'
const hash = computeContentHash(content, hashPort)
```

**关键发现**：`HashPort` 是 **唯一** 被 kernel 函数实际消费的 Port。`FileSystemPort` / `OsPort` / `PathPort` 存在但无 kernel 消费者 — 属**历史预留**。

### 3.2 Type B — Infra 自有的 API 层（L1 内部定义，直接 import）

```
L1 模块                         消费者                       注入机制
───────────────────────────────────────────────────────────────────
infra/hash.ts (export hashPort)  oxl/, work/, cli/          直接 import
infra/filesystem.ts              oxl/loader/                 直接 import
infra/probes/index.ts            oxl/, work/                 直接 import
infra/runtime/spawn.ts (提案)     infra/probes/, L2, L3      直接 import
```

**区别总结**：

| 维度 | Type A（Kernel Contract） | Type B（Infra Contract） |
|---|---|---|
| 接口定义位置 | `kernel/contracts/` | `infra/**/types.ts` 或隐式 |
| 接口消费者 | Kernel 纯函数（`computeContentHash`） | L1/L2/L3 业务代码（probe handler） |
| 注入机制 | 函数参数注入 | 直接模块 import |
| 是否经过 kernel/index re-export | ✅ | ❌ |
| 现有实例 | `HashPort` / `FileSystemPort` / `OsPort` / `PathPort` | `hashPort` / `filesystem` / `probes` |

### 3.3 为什么 RuntimePort 不属于 Type A

```
计算链：
  用户输入 oxn proof run
    → L2-Work 调 probe-evaluator
      → L1-Infra probes/shell-exec.ts
        → Bun.spawn / child_process.spawn  (IO 操作)
          ↑ 这里需要 runtime 适配层
```

- `spawn()` 的消费者是 **L1-Infra 的 probe handler**，不是 kernel 纯函数
- Kernel（L0）是 lambda vacuum（禁止 `fs`/`net`/`child_process`/`process.env`/`EventEmitter`），不可能调用 spawn
- 如果强行把 `RuntimePort` 放 `kernel/contracts/`，会在一个 **没有任何 kernel 函数消费它** 的地方定义类型 — 空抽象

---

## 4. 最终决策（Q3=B）

### 4.1 决策

**RuntimePort 放在 `infra/runtime/types.ts`，不放在 `kernel/contracts/`。**

### 4.2 理由

1. **不被 kernel 消费** — spawn 是纯 IO 操作，kernel 是 lambda vacuum
2. **遵循实际依赖方向** — 定义在哪里、消费在哪里，不制造"跨层空类型"
3. **诚实反映架构** — 与 `infra/filesystem.ts` 同级，不伪装成"kernel 契约"
4. **未来重构不被动** — 如果将来真的需要 kernel 调用 spawn，随时可以升格到 kernel/contracts/

### 4.3 不做

- ❌ 放在 `kernel/contracts/runtime-port.ts`
- ❌ 用 DI 容器 / 全局注册
- ❌ 消费者在调用时选择 runtime 实现

---

## 5. 最终架构（拍板版）

### 5.1 目录结构

```
src/infra/runtime/
├── types.ts              # RuntimePort 接口 + SpawnResult/SpawnOptions（Type B 自有类型）
├── detect.ts             # isBun() 缓存
├── bun/
│   ├── index.ts          # bunRuntime: RuntimePort
│   ├── spawn.ts
│   ├── file.ts
│   └── glob.ts
├── node/
│   ├── index.ts          # nodeRuntime: RuntimePort
│   ├── spawn.ts
│   ├── file.ts
│   └── glob.ts
├── index.ts              # 工厂: export const runtime = isBun() ? bun : node
│                          #         export const spawn = runtime.spawn  (便捷导出)
└── __tests__/
```

### 5.2 工厂注入机制

```ts
// src/infra/runtime/index.ts
import type { RuntimePort } from './types'
import { isBun } from './detect'
import { bunRuntime } from './bun/index'
import { nodeRuntime } from './node/index'

// 模块加载时一次性求值
export const runtime: RuntimePort = isBun() ? bunRuntime : nodeRuntime

// 函数级便捷导出（最佳 DX — 消费者只需 import 函数，不知 RuntimePort 存在）
export const spawn = runtime.spawn
```

### 5.3 消费者调用

```ts
// src/infra/probes/shell-exec.ts
import { spawn } from '../../runtime/index'        // ← 不知道 Bun/Node 存在

export async function handleShellExec(params, ctx) {
  const result = await spawn(['sh', '-c', cmd], { cwd: ctx.projectRoot })
  return { passed: result.exitCode === 0, stdout: result.stdout, durationMs: result.durationMs }
}
```

### 5.4 双接口类型对应关系（修正后）

| 类型 | 位置 | 示例 | 消费者 | 注入方式 |
|---|---|---|---|---|
| Type A (Kernel Contract) | `kernel/contracts/*-port.ts` | `HashPort` | kernel 纯函数 | 函数参数 |
| Type B (Infra Contract) | `infra/runtime/types.ts` | `RuntimePort` | probe handler, work, cli | 直接 import |

---

## 6. 遗留问题（不改）

### 6.1 FileSystemPort / OsPort / PathPort 无 kernel 消费者

现状：三个 Port 定义在 `kernel/contracts/`，实现于 `infra/`，但没有任何 kernel 函数以参数形式接收它们。

**不改**。原因：
- 移除它们需要改动 kernel/index.ts 导出 + 多个文件 import
- 属于**历史预留**，未来 kernel 纯函数可能需要
- 不影响当前架构安全性

### 6.2 `infra/hash.ts` 同时属 Type A 和 Type B

`hashPort` 既是 `HashPort` 的 L1 实现（Type A），又被 L1-OXL / L2-Work 直接 `import { hashPort }` 使用（Type B 消费方式）。

这是**合法的双重身份** — 同一个实现对象，既是 Kernel Contract 的实现，也是 Infra API 层的导出。不归类错误。
