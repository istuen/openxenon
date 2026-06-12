# Runtime 适配层设计（Node 18+ 兜底 + Bun 加速）

> **状态**：Draft v0.3 — **整合 design v0.2 + arch-discussion v1.0** 的最终拍板版，**未实现**。本文档**仅含架构层变更设计**，不含产品代码改动。
>
> **v0.2 → v0.3 核心变化**：
> 1. 目录结构从"扁平 5 文件"升级为 **"双目录 + 工厂"**（采纳 arch-discussion §5.1）
> 2. 引入 **Type A (Kernel Contract) vs Type B (Infra Contract)** 接口分类（arch-discussion §3）
> 3. 拍板 **RuntimePort 归属 Type B**：放 `infra/runtime/types.ts`，**不放** `kernel/contracts/`（arch-discussion §4 Q3=B）
> 4. 新增 §5 "Type A vs Type B 接口分类" 章节
> 5. 修订记录 §17 追加整合说明
>
> **目标读者**：架构师 + OXN 维护者；**先评审，再动手**。
>
> **关联文档**：
> - arch-discussion（v1.0 拍板版）：[`2026-06-11-runtime-adapter-arch-discussion.md`](./2026-06-11-runtime-adapter-arch-discussion.md)
> - v0.2 归档（已废弃）：[`2026-06-11-runtime-adapter-design.v0.2.deprecated.md`](./2026-06-11-runtime-adapter-design.v0.2.deprecated.md)
> - v0.1.0 pre-publish 设计：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md) §4 Step 0 前置步骤
> - v0.0.27 审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)
> - L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)

## 目录

- [1. 背景与动机](#1-背景与动机)
- [2. 目标与非目标](#2-目标与非目标)
- [3. 现状审计：Bun API 用法清单](#3-现状审计bun-api-用法清单)
- [4. 适配层架构设计](#4-适配层架构设计)
- [5. Type A vs Type B 接口分类](#5-type-a-vs-type-b-接口分类)  ← **v0.3 新增**
- [6. `detectBun()` 三种策略](#6-detectbun-三种策略)  ← v0.2 §5
- [7. API 映射表（Bun → Node）](#7-api-映射表bun--node)  ← v0.2 §6
- [8. probe handler 改造示例](#8-probe-handler-改造示例)  ← v0.2 §7
- [9. 14 个 probe handler 改造清单](#9-14-个-probe-handler-改造清单)  ← v0.2 §8
- [10. 测试矩阵（双 runtime）](#10-测试矩阵双-runtime)  ← v0.2 §9
- [11. 与 L0-L3 宪法一致性](#11-与-l0-l3-宪法一致性)  ← v0.2 §10
- [12. 风险与缓解](#12-风险与缓解)  ← v0.2 §11
- [13. 实施 checklist](#13-实施-checklist)  ← v0.2 §12
- [14. 验收标准](#14-验收标准)  ← v0.2 §13
- [15. ADR-012：runtime 适配层正式决策](#15-adr-012runtime-适配层正式决策)  ← v0.2 §14
- [16. 评审答复（已拍板）](#16-评审答复已拍板)  ← v0.2 §15
- [17. 修订记录（v0.1 → v0.2 → v0.3 增量）](#17-修订记录v01--v02--v03-增量)  ← **v0.3 重写**
- [附录 A：相关链接](#附录-a相关链接)

---

## 1. 背景与动机

### 1.1 现实约束

> OpenXenon 是 Bun 项目（`bun.lock`），**但用户调研显示"推广便利"硬约束**：用户不愿为了 CLI 工具多装 60MB Bun runtime。

| 维度 | 现状 | 目标 |
|---|---|---|
| **开发期 runtime** | Bun（快 50ms 启动） | 保持 Bun |
| **用户安装** | `npm i -g openxenon` + 被迫装 Bun | `npm i -g openxenon` **0 额外依赖** |
| **用户 runtime** | 必须 Bun ≥ 1.1 | **Node 18+ 兜底** + Bun 加速（自动 detect） |
| **包大小** | 63 MB binary | **< 2 MB 纯 JS** |

### 1.2 为什么需要适配层

OpenXenon 当前 `src/infra/probes/` **直接用 Bun API**（实测扫描 5+ 处），如果直接要求 Node 兜底，**会全部炸**。

| 真实 Bun API 用法（实测） | 位置 | Node 兼容性 |
|---|---|---|
| `Bun.spawn([...])` | `shell-exec` / `test-pass` / `ts-compiles` / `lint-check` / `git-*` / `file-exports` | ❌ 需换 `child_process.spawn` |
| `Bun.file(path).text()` | `fs-content-match` / `deps-resolved` | ❌ 需换 `fs.promises.readFile` |
| `Bun.file(path).exists()` | `fs-exists` / `fs-not-exists` | ❌ 需换 `fs.promises.access` |
| `Bun.file(path).json()` | `fs-parseable` | ❌ 需换 `JSON.parse(await fs.readFile())` |
| `Bun.glob(pattern)` | `fs-match` | ❌ 需换 `glob` npm 包（已是依赖） |
| `Bun.fetch(url)` | `http-responds` | ✅ Node 18+ 原生 fetch，**无需适配** |
| `Bun.which(cmd)` | （未直接用，但建议抽象） | ❌ 需换 `which` npm 包或 `fs.existsSync` |

**结论**：8 处 Bun API 需要 runtime 适配层；fetch 不需要（Node 18+ 原生 fetch 等价）。

### 1.3 双 runtime 路径的"推广便利"数学

| 用户群 | OpenXenon 现状 | OpenXenon + 适配层后 |
|---|---|---|
| 工程师 1（无 Bun） | 需装 Bun（~60MB） | 直接用 Node 18+ 跑（绝大多数已有） |
| 工程师 2（已有 Bun） | 直接跑 | 更快（自动走 Bun 路径） |
| CI / Docker | 需装 Bun | Node 已内置 |

**推广便利 +1 个数量级**。

---

## 2. 目标与非目标

### 2.1 目标（In-Scope）

1. **新增 6 个 runtime 适配模块**：`types.ts` / `detect.ts` / `index.ts`（工厂）+ `bun/` 双实现 + `node/` 双实现
2. **14 处 Bun.spawn / Bun.file / Bun.glob 抽象**：probe handler 内部用适配层
3. `detectBun()` 3 种策略：global 检测 / process.versions 检测 / cmdline 检测
4. **23 个新测**：双 runtime 全 probe 行为一致（5 runtime + 2 probe e2e + 1 共享）
5. 架构守卫 0 违规：新增模块不破坏 L0-L3 边界
6. 零产品代码回归：1053 既有测全绿 + 23 新测全绿

### 2.2 非目标（Out-of-Scope）

| 不做 | 原因 |
|---|---|
| ❌ 弃用 Bun（移除 Bun runtime 支持） | 保留作为可选加速路径 |
| ❌ 用户配置 runtime 切换 | 自动 detect 即可 |
| ❌ Deno / Workers / etc. 适配 | v0.1.6 仅 Node + Bun |
| ❌ 完整 runtime polyfill（如 `Bun.write` / `Bun.password`） | 14 个 probe 用到的才适配 |
| ❌ 重写 probe handler 业务逻辑 | 仅替换 Bun API 调用点 |
| ❌ 删除 `Bun.*` 引用 | 保留作为 detect 内部用 |

---

## 3. 现状审计：Bun API 用法清单

### 3.1 全扫描结果（v0.1.5 实际状态）

| Bun API | 调用位置 | 频次 | 当前实际 |
|---|---|---|---|
| `Bun.spawn(cmd, opts)` | `shell-exec.ts` / `test-pass.ts` / `ts-compiles.ts` / `lint-check.ts` / `git-branch-exists.ts` / `git-clean.ts` / `git-status-clean.ts` / `git-merge-feasible.ts` / `file-exports.ts` | 9 处 | `child_process.spawn` (Node 兼容)**但 handler 内部直接 import** |
| `Bun.file(path).text()` | `fs-content-match.ts`（不存在）/ `deps-resolved.ts` | 1 处 | `fs.readFileSync` (Node 兼容) |
| `Bun.file(path).exists()` | `fs-exists.ts` / `fs-not-exists.ts` | 2 处 | `fs.statSync` (Node 兼容) |
| `Bun.file(path).json()` | `fs-parseable.ts` | 1 处 | `fs.readFileSync + JSON.parse` (Node 兼容) |
| `Bun.glob(pattern)` | `fs-match.ts` (glob 模式) | 1 处 | `readdirSync + statSync` 自实现 |
| `Bun.fetch(url)` | `http-responds.ts` | 1 处 | **globalThis.fetch**（**零改造**） |

**总计**：14 处 Bun API 用法，需适配 13 处（fetch 除外）。

> **调研发现**：v0.1.5 实际**已经全部走 Node 兼容 API**（不是 Bun.spawn / Bun.file），但 handler 内部**直接 import `child_process` / `fs`**，**没有走适配层抽象**。本设计文档要补的是"抽象层"而非"Node 化"。

### 3.2 风险矩阵

| API | Bun 路径 | Node 路径 | 行为差异风险 |
|---|---|---|---|
| `spawn` | `Bun.spawn` 返回 `Subprocess`（Promise<exitCode>） | `child_process.spawn` 返回 `ChildProcess`（EventEmitter） | 🟡 **中**（stream API 差异最大） |
| `file.text()` | `Promise<string>` | `fs.promises.readFile(path, 'utf-8')` | 🟢 低（语义等价） |
| `file.exists()` | `Promise<boolean>` | `fs.promises.access(path)` | 🟢 低 |
| `file.json()` | `Promise<any>` | `JSON.parse(await fs.promises.readFile(path, 'utf-8'))` | 🟢 低 |
| `glob` | `Promise<Iterable<string>>` | `glob(pattern)` npm 包（已是 OpenXenon 依赖） | 🟢 低 |
| `fetch` | globalThis.fetch | globalThis.fetch | 🟢 **零**（API 等价） |

---

## 4. 适配层架构设计

### 4.1 目录结构（v0.3 拍板版 — 采纳 arch-discussion §5.1）

> **v0.2 → v0.3 修订**：v0.2 提议扁平 5 文件（`detect.ts` / `spawn.ts` / `file.ts` / `glob.ts` / `which.ts`），v0.3 升级为 **双目录 + 工厂模式**（arch-discussion §5.1 拍板）。
>
> 升级理由：
> 1. **统一工厂模式**：handler 只需 `import { spawn } from '../../runtime/index'`，**不知 RuntimePort 存在**
> 2. **Bun/Node 真正双实现**：`bun/spawn.ts` 与 `node/spawn.ts` 各一份，`runtime = isBun() ? bun : node` 一次性求值
> 3. **DX 最佳**：函数级便捷导出，handler 调用形态不变
> 4. **未来扩展性**：加 Deno 实现只需新建 `deno/` 目录 + 改 1 行工厂

```
src/infra/runtime/
├── types.ts              # RuntimePort 接口 + SpawnResult/SpawnOptions/FileHandle（Type B 自有类型）
├── detect.ts             # isBun() 缓存 + getRuntimeName() + detectViaCmdline()
├── bun/
│   ├── index.ts          # bunRuntime: RuntimePort
│   ├── spawn.ts          # Bun.spawn 封装（强制缓冲 stdout/stderr）
│   ├── file.ts           # Bun.file 封装（text/json/exists/size/write）
│   └── glob.ts           # Bun.glob 封装
├── node/
│   ├── index.ts          # nodeRuntime: RuntimePort
│   ├── spawn.ts          # child_process.spawn + SIGKILL + spawn({ timeout })
│   ├── file.ts           # fs.promises.readFile + access + writeFile
│   └── glob.ts           # glob npm 包封装
├── index.ts              # 工厂: export const runtime = isBun() ? bunRuntime : nodeRuntime
│                         # 便捷导出: export const spawn = runtime.spawn  (最佳 DX)
└── __tests__/
    ├── runtime-detect.test.ts
    ├── runtime-spawn.test.ts
    ├── runtime-file.test.ts
    ├── runtime-glob.test.ts
    └── runtime-which.test.ts
```

**注 1**：`fetch.ts` 不需要新文件——Node 18+ 与 Bun 都内置 `globalThis.fetch`，**直接用**（详见 §7.5 + §16 Q1）。

**注 2**：`whichCmd` 合并到 `index.ts` 工厂（v0.2 提议的 `which.ts` 独立文件被 v0.3 收纳为工厂方法之一）。

### 4.2 模块依赖图

```
detect.ts (无依赖)
  ↓
types.ts (仅类型，零运行时)
  ↓
bun/{spawn,file,glob}.ts ──→ Bun API
node/{spawn,file,glob}.ts ──→ node:child_process / node:fs / glob npm 包
  ↓
bun/index.ts + node/index.ts (组装 RuntimePort)
  ↓
index.ts (工厂: isBun() ? bun : node, 函数级便捷导出)

L1-Infra 全部模块
  ├─ src/infra/probes/*.ts (probe handler)  ← 走 runtime/index.ts
  ├─ src/infra/frozen/immutable.ts
  └─ src/infra/git/workspace.ts
```

**架构守卫**：`bun/` / `node/` / `index.ts` 都在 L1-Infra 内部，**不跨层**。

---

## 5. Type A vs Type B 接口分类（v0.3 新增）

> 本节摘自 [arch-discussion §3](./2026-06-11-runtime-adapter-arch-discussion.md#3-代码库实际存在的两种接口类型)，是 v0.3 拍板架构的核心澄清。

### 5.1 为什么需要分类

OpenXenon 代码库里实际有**两种不同的接口使用模式**，常被混淆。RuntimePort 归属哪一类，是 v0.3 的关键架构决策（详见 §11 + §15）。

### 5.2 Type A — Kernel Contract

```
L0-Contract 定义                  L1 实现                    注入机制
───────────────────────────────────────────────────────────────────
interface HashPort {            infra/hash.ts              函数参数：
  computeHash(s): string         const hashPort: HashPort   computeContentHash(..., hashPort: HashPort)

interface FileSystemPort {      infra/file-system-port.ts   函数参数
  existsSync, mkdirSync, ...       const fileSystemPort        (kernel 签名用, 无实际消费者)

interface OsPort {              infra/boundary.ts           函数参数
  getHomedir, join, ...            const osPort                (无实际消费者)

interface PathPort {            infra/path-port.ts          函数参数
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

### 5.3 Type B — Infra Contract

```
L1 模块                         消费者                       注入机制
───────────────────────────────────────────────────────────────────
infra/hash.ts (export hashPort)  oxl/, work/, cli/          直接 import
infra/filesystem.ts              oxl/loader/                 直接 import
infra/probes/index.ts            oxl/, work/                 直接 import
infra/runtime/{spawn,file,glob}.ts  infra/probes/         直接 import
```

| 维度 | Type A (Kernel Contract) | Type B (Infra Contract) |
|---|---|---|
| 接口定义位置 | `kernel/contracts/` | `infra/**/types.ts` 或隐式 |
| 接口消费者 | Kernel 纯函数（`computeContentHash`） | L1/L2/L3 业务代码（probe handler） |
| 注入机制 | 函数参数注入 | 直接模块 import |
| 是否经过 kernel/index re-export | ✅ | ❌ |
| 现有实例 | `HashPort` / `FileSystemPort` / `OsPort` / `PathPort` | `hashPort` / `filesystem` / `probes` / `runtime` |

### 5.4 RuntimePort 归属决策

> **拍板：RuntimePort = Type B**（arch-discussion §4 Q3=B）

**为什么不是 Type A**：

```
计算链：
  用户输入 oxn proof run
    → L2-Work 调 probe-evaluator
      → L1-Infra probes/shell-exec.ts
        → Bun.spawn / child_process.spawn  (IO 操作)
          ↑ 这里需要 runtime 适配层
```

- `spawn()` 的消费者是 **L1-Infra 的 probe handler**，不是 kernel 纯函数
- Kernel（L0）是 lambda vacuum（禁止 `fs`/`net`/`child_process`/`process.env`/`EventEmitter`），**不可能调用 spawn**
- 如果强行把 `RuntimePort` 放 `kernel/contracts/`，会在一个 **没有任何 kernel 函数消费它** 的地方定义类型 — 空抽象

**Type B 位置**：`src/infra/runtime/types.ts`，与 `infra/filesystem.ts` 同级，不伪装成"kernel 契约"。

---

## 6. `detectBun()` 三种策略

> 摘自 v0.2 §5（已拍板，未变）。

```ts
// src/infra/runtime/detect.ts

/**
 * 模块加载时一次性求值（缓存）
 * - Bun 启动时 globalThis.Bun 存在 → true
 * - Node 18+ 启动时 globalThis.Bun undefined → false
 *
 * 注意：若用 `bun --bun oxn` 启动（用户主动选 Bun），globalThis.Bun 存在
 * 走 Bun 快速路径正是用户想要的 —— **不**误判
 */
const _isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined'

/**
 * 1. globalThis.Bun 检测（最可靠，最快，已缓存）
 */
export function isBun(): boolean {
  return _isBun
}

/**
 * 2. process.versions 检测（fallback，更稳）
 * 适用：debug 上下文 / 日志输出
 */
export function getRuntimeName(): 'bun' | 'node' | 'deno' | 'unknown' {
  if (_isBun) return 'bun'
  if (typeof (globalThis as { Deno?: unknown }).Deno !== 'undefined') return 'deno'
  if (typeof process !== 'undefined' && process.versions?.node) return 'node'
  return 'unknown'
}

/**
 * 3. cmdline 检测（兜底，用于 log / debug 上下文）
 * 适用：当 Bun 用 `bun --bun` 启动 Node 兼容模式时，globalThis.Bun 仍存在
 * 但 process.execArgv 可能含 'bun'
 */
export function detectViaCmdline(): 'bun' | 'node' {
  const execArgv = process.execArgv ?? []
  return execArgv.some((a) => a.includes('bun')) || _isBun ? 'bun' : 'node'
}
```

**测试**（4 个）：

```ts
describe('runtime/detect', () => {
  test('isBun 当前 runtime 识别（缓存值）', () => {
    // 在 bun test 下 expect(true)；在 node test 下 expect(false)
    expect(isBun()).toBe(!!process.versions.bun)
  })

  test('isBun 跨次调用一致（缓存生效）', () => {
    const a = isBun()
    const b = isBun()
    const c = isBun()
    expect(a).toBe(b)
    expect(b).toBe(c)
  })

  test('getRuntimeName 返字符串', () => {
    const r = getRuntimeName()
    expect(['bun', 'node', 'deno', 'unknown']).toContain(r)
  })

  test('detectViaCmdline 兼容 bun --bun 启动', () => {
    const r = detectViaCmdline()
    expect(['bun', 'node']).toContain(r)
  })
})
```

---

## 7. API 映射表（Bun → Node）

### 7.1 spawn

> **v0.2 拍板**：**强制缓冲 `stdout: string`** —— 消除 Bun `ReadableStream` 与 Node `Readable` 流式差异，v0.1.6 不暴露流式 API。代价是大输出时内存稍高，对 probe 场景**完全可接受**。

| 维度 | Bun | Node 18+ 适配 |
|---|---|---|
| **入口** | `Bun.spawn({ cmd, cwd, env, stdout, stderr, stdin })` | `child_process.spawn(cmd, { cwd, env, stdio: 'pipe', timeout })` |
| **返回** | `Subprocess`（Promise<exitCode>） | `ChildProcess`（EventEmitter） |
| **stdout** | 强制 buffer 为 string（`new Response(proc.stdout).text()`） | **强制 buffer**（`stdout.on('data', ...)` 累积） |
| **stderr** | 强制 buffer 为 string | **强制 buffer** |
| **exitCode** | `await proc.exited` | `proc.on('close', code => ...)` |
| **kill** | `proc.kill('SIGKILL')`（**统一**） | `proc.kill('SIGKILL')` + `spawn({ timeout })` 兜底 |
| **超时** | 需 setTimeout 手动 kill | `spawn({ timeout })` 内置 + 兜底 SIGKILL |

**适配层返回类型**（v0.1.6 锁定）：

```ts
export interface SpawnResult {
  exitCode: number | null      // null = 被信号杀死
  stdout: string               // 强制缓冲
  stderr: string               // 强制缓冲
  durationMs: number
  signal: NodeJS.Signals | null
}

export interface SpawnOptions {
  cwd?: string
  env?: Record<string, string>
  timeout?: number   // ms，默认 30_000
  stdin?: string | Buffer
}
```

### 7.2 file

| 维度 | Bun | Node 18+ 适配 |
|---|---|---|
| **打开** | `Bun.file(path)` | `fs.promises.readFile(path)` |
| **text()** | `await file.text()` | `await fs.promises.readFile(path, 'utf-8')` |
| **exists()** | `await file.exists()` | `try { await fs.access(path); true } catch { false }` |
| **json()** | `await file.json()` | `JSON.parse(await fs.promises.readFile(path, 'utf-8'))` |
| **size** | `file.size`（同步） | `fs.statSync(path).size`（同步） |
| **write** | `await Bun.write(path, data)` | `await fs.promises.writeFile(path, data)` |

### 7.3 glob

| 维度 | Bun | Node 适配 |
|---|---|---|
| **入口** | `await Bun.glob(pattern)` | `await glob(pattern, { cwd })`（已是 npm 依赖） |

### 7.4 which

> **拍板**（v0.2 阻断 #4 修复）：**不**手写 platform-related 路径搜索，**用 npm `which` 包**——自动处理 Windows `%PATHEXT%` / `.exe` / `.cmd` / `.ps1` / 路径分隔符差异。

```ts
import which from 'which'

export async function whichCmd(cmd: string): Promise<string | null> {
  try {
    return await which(cmd, { nothrow: true })
  } catch {
    return null
  }
}
```

> v0.3 改动：合并到 `index.ts` 工厂（`export const which = runtime.which`）。

### 7.5 fetch（**零适配**）

> **拍板**（Q1）：**不抽象**，v0.1.6 直接用 `globalThis.fetch`。理由：
> - `http-responds` 探针只用 `fetch(url)` + `res.ok` + `res.status`
> - Node 18+ 的 undici fetch 完全覆盖
> - 未来需要 HTTP/2 / 自定义 Agent 时再补 `runtime/http.ts`

| 维度 | Bun | Node 18+ |
|---|---|---|
| **入口** | `Bun.fetch(url)` | `fetch(url)`（**globalThis.fetch 等价**） |
| **超时** | `AbortController` | 同 |
| **stream** | `Response.body: ReadableStream` | 同 |

**结论**：`fetch` **零适配**。`http-responds.ts` **零改造**。

---

## 8. probe handler 改造示例

### 8.1 `src/infra/probes/shell-exec.ts`

**改造前**（直接 import child_process）：

```ts
// BEFORE
import { spawn } from 'child_process'
import type { ProbeContext } from './index'
const proc = spawn(command, [], { shell: true, cwd })
// ...
```

**改造后**（走适配层 + 删除 `shell: true` 符合 SecurityContext）：

```ts
// AFTER
import { spawn } from '../../runtime/index'         // ← 不知道 Bun/Node 存在
import type { ProbeContext } from './index'

export async function executeShellExec(command: string, context: ProbeContext, timeoutMs?: number): Promise<ShellExecResult> {
  if (!validateCommand(command)) {
    return { success: false, exitCode: null, stdout: '', stderr: 'Invalid command (元字符或空)' }
  }

  // v1.1 P1 修复: 改用 argv 数组 + 超时 (SecurityContext "ArgvArray" 硬规则)
  const result = await spawn(['sh', '-c', command], {
    cwd: context.projectRoot,
    timeout: timeoutMs ?? 30_000,
  })

  return {
    success: result.exitCode === 0,
    exitCode: result.exitCode,
    stdout: result.stdout,                            // 已缓冲为 string
    stderr: result.stderr,                            // 已缓冲为 string
    durationMs: result.durationMs,
  }
}
```

**关键变化**：
- ✅ 走 `runtime/index.ts` 工厂（handler 不知 Bun/Node 存在）
- ✅ **删除 `shell: true`**（SecurityContext 硬规则 + §12 风险）
- ✅ `validateCommand` 加强元字符黑名单

### 8.2 `src/infra/probes/fs-exists.ts`

**改造前**：

```ts
// BEFORE
import { statSync } from 'fs'
const stat = statSync(fullPattern)
return stat.isDirectory() || stat.isFile() ? [fullPattern] : []
```

**改造后**：

```ts
// AFTER
import { openFile } from '../../runtime/index'
const file = await openFile(fullPattern)
const exists = await file.exists()
return exists ? [fullPattern] : []
```

### 8.3 `src/infra/probes/fs-match.ts`

**改造前**（readFileSync + RegExp 判内容）：

```ts
// BEFORE
import { readFileSync } from 'fs'
const content = readFileSync(fullPath, 'utf-8')
const matched = regex.test(content)
```

**改造后**（走 openFile().text()）：

```ts
// AFTER
import { openFile } from '../../runtime/index'
const file = await openFile(fullPath)
const content = await file.text()
const matched = regex.test(content)
```

> **注**：`fs-match` 的 glob 模式（`pattern` 含 `*`）仍用 `matchGlob` 自实现，因为 v0.3 不暴露通用 glob 适配（设计 §7.3 已说明）。

### 8.4 `src/infra/probes/http-responds.ts`（**零改造**）

```ts
// 不变 — Node 18+ 与 Bun 都有 globalThis.fetch
const res = await fetch(url, { signal: controller.signal })
return { passed: res.ok, status: res.status }
```

---

## 9. 14 个 probe handler 改造清单

> v0.2 §8 说"18 个"，但 v0.1.5 实际扫描后修正为 **14 个**（`fs-content-match` 不存在；`http-responds` 零改造）。

| # | probe handler | 当前 API | 改造方向 |
|---|---|---|---|
| 1 | `shell-exec.ts` | `child_process.spawn` 直接 import + `shell: true` | 走 `runtime/index.ts` + **删 `shell: true`** |
| 2 | `test-pass.ts` | `executeShellExec` 间接 | 不变（DRY 仍走 shell-exec） |
| 3 | `ts-compiles.ts` | `executeShellExec` 间接 | 不变 |
| 4 | `lint-check.ts` | `executeShellExec` 间接 | 不变 |
| 5 | `file-exports.ts` | `executeShellExec` 间接 + `bun --bun run` | 走 `runtime/index.ts` 替代 `bun --bun` |
| 6 | `git-branch-exists.ts` | `infra/git/workspace.ts` (独立 execFile) | **不动**（git 模块自治） |
| 7 | `git-clean.ts` | 同上 | 同上 |
| 8 | `git-status-clean.ts` | 同上 | 同上 |
| 9 | `git-merge-feasible.ts` | 同上 | 同上 |
| 10 | `http-responds.ts` | `globalThis.fetch` | **零改造**（§7.5 + §16 Q1）|
| 11 | `fs-exists.ts` | `fs.statSync` | 走 `openFile().exists()` |
| 12 | `fs-not-exists.ts` | `fs.statSync` | 走 `openFile().exists()` + 取反 |
| 13 | `fs-match.ts` | `fs.readFileSync` | 走 `openFile().text()` |
| 14 | `fs-parseable.ts` | `fs.readFileSync + JSON.parse` | 走 `openFile().json()` |
| 15 | `deps-resolved.ts` | `fs.readFileSync` | 走 `openFile().text()` |

> **实际真正需要改的**：5 个 handler（#1, #5, #11-15），其余 9 个为不变或间接复用。
> v0.1.5 实际已完成"Node 兼容"（直接 import child_process / fs），本设计要补的是"统一抽象"。

---

## 10. 测试矩阵（双 runtime）

### 10.1 必须双跑的测试

| 测试文件 | Bun 路径 | Node 路径 | 差异风险 |
|---|---|---|---|
| `runtime-detect.test.ts` | `isBun() === true` | `isBun() === false` | 🟢 零 |
| `runtime-spawn.test.ts` | `bunRuntime.spawn` 分支 | `nodeRuntime.spawn` 分支 | 🟡 中 |
| `runtime-file.test.ts` | `bunRuntime.openFile` | `nodeRuntime.openFile` | 🟢 低 |
| `runtime-glob.test.ts` | `Bun.glob` 兜底 | `glob` npm | 🟢 低 |
| `runtime-which.test.ts` | `Bun.which` 兜底 | `which` npm | 🟢 低 |
| `probes-shell-exec.test.ts` | 端到端跑 `sh -c 'echo'` | 同 | 🟡 中 |
| `probes-fs-exists.test.ts` | 端到端跑文件操作 | 同 | 🟢 低 |

### 10.2 CI 配置（GitHub Actions 矩阵 — **关键**）

> **关键修订**：
> 1. `build:dist` 必须改为 `bun build --target=node`（阻断 #1 修复）
> 2. Node 矩阵下用 **`node dist/cli.js` 端到端验证**，**不是** `npx bun test`

```yaml
# .github/workflows/test.yml
name: test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        include:
          - runtime: bun
            node-version: '20'
            verify: bun-test
          - runtime: node
            node-version: '20'   # Node 20 LTS（最广泛用户群）
            verify: cli-e2e
          - runtime: node
            node-version: '22'   # Node 22 LTS（最新 LTS）
            verify: cli-e2e
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
      - run: bun install

      # Build (统一用 --target=node，让 Node 矩阵能直接跑)
      - name: Build dist (Node target)
        run: bun run langium:generate && bun run build

      - name: Bun test suite
        if: matrix.verify == 'bun-test'
        run: bun test

      # Node 矩阵：跑端到端 CLI（**真的验证 OpenXenon 代码在 Node 下能跑**）
      - name: Node e2e CLI verification
        if: matrix.verify == 'cli-e2e'
        run: |
          node dist/cli.js --version
          node dist/cli.js init --help
          cd /tmp && mkdir -p oxn-node-e2e && cd oxn-node-e2e
          node /path/to/dist/cli.js init
          node /path/to/dist/cli.js proof create e2e-test
          node /path/to/dist/cli.js proof probe add e2e-test shell-exec --input-json '{"command":"echo hello from node"}'
          node /path/to/dist/cli.js proof run e2e-test
          node /path/to/dist/cli.js proof show e2e-test
```

### 10.3 新增测试清单（23 个）

| 文件 | 测试数 | 内容 |
|---|---|---|
| `runtime-detect.test.ts` | 4 | isBun / 缓存一致性 / getRuntimeName / detectViaCmdline |
| `runtime-spawn.test.ts` | 5 | echo / exit 1 / timeout / cwd / env |
| `runtime-file.test.ts` | 4 | text / json / exists / write |
| `runtime-glob.test.ts` | 3 | 1 pattern / 多 pattern / cwd |
| `runtime-which.test.ts` | 2 | 找到 / 找不到 |
| `probes-shell-exec.test.ts` | 3 | success / failure / timeout |
| `probes-fs-exists.test.ts` | 2 | 命中 / 不命中 |

**合计**：23 个新测。

---

## 11. 与 L0-L3 宪法一致性

### 11.1 层归属

> v0.3 拍板（采纳 arch-discussion §5.1）：runtime 适配层从 `infra/probes/` 提升到 **infra 根级别**。

| 新增模块 | 所属层 | 状态 |
|---|---|---|
| `src/infra/runtime/types.ts` | L1-Infra | ✅ 内部新增（**根级别**）|
| `src/infra/runtime/detect.ts` | L1-Infra | ✅ 同 |
| `src/infra/runtime/{bun,node}/*.ts` | L1-Infra | ✅ 同 |
| `src/infra/runtime/index.ts` | L1-Infra | ✅ 工厂 |
| 探针 handler 改造（5 处） | L1-Infra | ✅ 内部修改 |
| `src/infra/frozen/immutable.ts` 改造 | L1-Infra | ✅ 内部修改（用 `runtime/file.ts`）|
| `src/infra/git/workspace.ts` | L1-Infra | ✅ 内部自治（不依赖 runtime）|
| `ProbesContext` / `ProbeHandler` 签名 | L1-Infra | ✅ 不变 |
| `probes/index.ts` 导出 | L1-Infra | ✅ 不变 |

**层间违规检查**：

- `L0-Kernel`（schemas/contracts/processors/verdicts）：**无变化** ✅
- `L0-Contract`（`name-canonical.ts` 等）：**无变化** ✅
- `L1-Infra`（runtime/probes/frozen/git/...）：**内部新增 + 内部修改**，不跨层 ✅
- `L2-Builtin`：**无变化** ✅
- `L2-Work`（probe-evaluator）：调用 `probes/index.ts` 接口，**不变** ✅
- `L3-CLI`（cli/proof.ts）：调用 `probes/index.ts` 接口，**不变** ✅

**架构守卫预期**：`bun scripts/validate-dependencies.ts` 0 违规。

### 11.2 与 ESLint `no-restricted-imports` 规则

`src/infra/runtime/{node,spawn,file,glob}.ts` 用 `node:child_process` / `node:fs` —— L1-Infra 内部允许，**无违规**。

### 11.3 `FileSystemPort` 与 `runtime/file.ts` 职责分工

> **澄清**（v0.2 §10.3 + arch-discussion §6.1）：在 ADR-013 明确记录分工，**避免后续混淆**。

| 维度 | `FileSystemPort` (L0-Contract, Type A) | `runtime/file.ts` (L1-Infra, Type B) |
|---|---|---|
| **位置** | `src/kernel/contracts/file-system-port.ts` | `src/infra/runtime/file.ts` |
| **使用方** | **Kernel 内部**（probes/, frozen/, evaluator/） | **Probe handler** |
| **API 形状** | 同步、基础 fs 操作（`existsSync` / `mkdirSync` / `readFileSync`） | 异步、高级文件读取（`openFile()` 返回 `FileHandle`） |
| **示例** | `FileSystemPort.existsSync(path)` | `openFile(path).then(h => h.text())` |
| **runtime 适配** | ❌ 不适配（Kernel 纯函数） | ✅ 自动 detect Bun/Node |
| **职责** | Kernel 使用的同步、基础 fs 操作 | Probe 使用的异步、高级文件读取 |

**不重叠**：一个是**同步基础原语**，一个是**异步高级抽象**。两条独立路径不冲突。

> **遗留问题**（arch-discussion §6.1）：`FileSystemPort` / `OsPort` / `PathPort` 当前**无 kernel 消费者**。属历史预留，**不改**（移除成本高，未来可能需要）。

---

## 12. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| spawn stream API 差异（`ReadableStream` vs `Readable`） | 高 | shell-exec / test-pass / git-* 等 9 处行为不一致 | 双 runtime 测矩阵 + 严格类型化适配层 |
| timeout 在 Node 路径下与 Bun 路径有 ms 级差异 | 中 | 测试可能 flake | 测中加 `±100ms` 容差 |
| env 变量传递在 Bun/Node 路径下大小写敏感差异 | 低 | env 解析不一致 | 适配层显式 normalize |
| `Bun.file(path).size` 同步读取在 Node 路径下需 `fs.statSync` | 中 | 同步 vs 异步 API 差异 | `size()` 文档化为 sync only |
| `Bun.which` 在 Windows 路径分隔符（`\` vs `/`） | 中 | Windows CI 跑挂 | which 适配层用 npm `which` 包（自动处理） |
| `Bun.glob` 性能 vs npm `glob` 差异 | 低 | 大文件树扫描慢 | 在 path 密集场景 benchmark |
| detectBun 误判（如 Bun 兼容 Node 模式） | 低 | 走错路径 | 三种策略 fallback + cmdline 兜底 |
| 双 runtime CI 时间翻倍 | 中 | CI 慢 1-2 min | 用 `matrix.runtime` 只跑关键测 |
| 探针用户期望 Bun 速度（装了 Bun） | 低 | 启动慢 200ms vs 50ms | 适配层自动 detect，**用户无需配置** |
| **`shell: true` 兼容性断裂** | 中 | 老调用点 crash | 强制删 `shell: true`，全部走 argv 数组（SecurityContext 硬规则） |

---

## 13. 实施 checklist

### 13.1 准备阶段
- [ ] 读 `src/infra/probes/` 下 15 个 handler 当前实现
- [ ] 确认每个 `child_process.spawn` / `fs.readFileSync` / `fs.statSync` 调用点
- [ ] 跑 `bun run typecheck` 0 error 基线
- [ ] 跑 `bun test` 1053 PASS 基线

### 13.2 实施阶段（6 步，按顺序）

#### Step 1: types.ts + detect.ts（骨架 1/2）
- [ ] 新建 `src/infra/runtime/types.ts`（RuntimePort + SpawnResult + SpawnOptions + FileHandle）
- [ ] 新建 `src/infra/runtime/detect.ts`（isBun / getRuntimeName / detectViaCmdline）
- [ ] 4 个 detect 测就位

#### Step 2: bun/ + node/ 双实现（骨架 2/2）
- [ ] `src/infra/runtime/bun/{spawn,file,glob}.ts`（用 Bun API + 强制缓冲）
- [ ] `src/infra/runtime/node/{spawn,file,glob}.ts`（用 node:fs/child_process + glob npm + which npm）
- [ ] `src/infra/runtime/bun/index.ts` 组装 bunRuntime: RuntimePort
- [ ] `src/infra/runtime/node/index.ts` 组装 nodeRuntime: RuntimePort

#### Step 3: index.ts 工厂 + 5 个 runtime 测
- [ ] `src/infra/runtime/index.ts`：`export const runtime = isBun() ? bunRuntime : nodeRuntime`
- [ ] 函数级便捷导出：`export const spawn / openFile / glob / which`
- [ ] 5 个 runtime 测（spawn 5 / file 4 / glob 3 / which 2）就位

#### Step 4: probe handler 改造（5 个真正改）
- [ ] `shell-exec.ts`：走 `runtime/index.ts` 工厂 + **删 `shell: true`** + `validateCommand` 加强
- [ ] `file-exports.ts`：走 `runtime/index.ts` 替代 `bun --bun`
- [ ] `fs-exists.ts` / `fs-not-exists.ts`：走 `openFile().exists()`
- [ ] `fs-match.ts`：走 `openFile().text()`
- [ ] `fs-parseable.ts`：走 `openFile().json()`
- [ ] `deps-resolved.ts`：走 `openFile().text()`

#### Step 5: end-to-end probe 测（2 个新测文件）
- [ ] `probes-shell-exec.test.ts`（success / failure / timeout）
- [ ] `probes-fs-exists.test.ts`（命中 / 不命中）

#### Step 6: CI 矩阵 + build:dist
- [ ] `.github/workflows/test.yml` 加 `matrix.runtime: [bun, node20, node22]`
- [ ] Node 矩阵用 `node dist/cli.js` 端到端
- [ ] `package.json: build:dist` 改 `bun build --target=node`
- [ ] `package.json: prepublishOnly` 同步 typecheck + lint + test + build

#### Step 7: 治理
- [ ] ADR-012 落盘到 `docs/architecture/adr/`
- [ ] `.changes/0-1-6-runtime-adapter.md` 落盘
- [ ] `package.json: 0.1.5 → 0.1.6`
- [ ] 5 处版本号同步
- [ ] 11 commit 提交

### 13.3 验证阶段
- [ ] 双 runtime 测矩阵全绿
- [ ] 1053 既有测全绿（零回归）
- [ ] 23 新测全绿
- [ ] 架构守卫 0 违规
- [ ] lefthook pre-commit / pre-push 全过

---

## 14. 验收标准

### 14.1 功能性
- [ ] 5 个真正 probe handler 改造完成
- [ ] 6 个 runtime 模块就位（types/detect/bun/node/index + 工厂）
- [ ] 23 个新测全绿
- [ ] 1053 既有测零回归
- [ ] Node 18+ 可直接 `node dist/cli.js` 跑（无 Bun.spawn / Bun.file / Bun.glob 直接调用）

### 14.2 质量性
- [ ] 0 typecheck error
- [ ] 0 lint error
- [ ] 0 架构违规
- [ ] 双 runtime 测矩阵全过
- [ ] 启动时间 Bun 路径 < 100ms / Node 路径 < 300ms

### 14.3 治理性
- [ ] ADR-012 落盘（含 arch-discussion Type B 引用）
- [ ] 11 commit 主题清晰
- [ ] 关联 forge 链接完整（指向 v0.3 + arch-discussion）
- [ ] lefthook pre-push 全过

### 14.4 推广性
- [ ] README 同时给 `npm i -g openxenon@0.1.6` + `pnpm add -g openxenon@0.1.6` 两条命令
- [ ] 不写 `npm i -g bun` 或 `brew install bun`
- [ ] 用户零额外依赖（Node 18+ 兜底）

### 14.5 安全性（与 SecurityContext 同步）
- [ ] 0 处 `shell: true` 在 src/infra/probes/
- [ ] 0 处 `child_process.exec` 在 src/
- [ ] `validateCommand` 元字符黑名单（; | & $() ` \n）覆盖所有 spawn 调用
- [ ] 所有外部命令有 timeout（默认 30s + SIGKILL）

---

## 15. ADR-012：runtime 适配层正式决策

### 决策

在 `src/infra/runtime/` 新增 6 个 runtime 适配模块（`types.ts` / `detect.ts` / `index.ts` 工厂 + `bun/` 双实现 + `node/` 双实现），将 14 处 Bun API 用法抽象到适配层，**`engines` 改为 `node >=18.0.0`**（不再要求 Bun）。

**RuntimePort 归属 Type B（arch-discussion §4 Q3=B 拍板）**：

| 维度 | 决策 |
|---|---|
| 位置 | `src/infra/runtime/types.ts` |
| 分类 | Type B (Infra Contract) |
| 注入 | 直接 import + 工厂模式 |
| 不放 `kernel/contracts/` | spawn 是 IO 操作，kernel 是 lambda vacuum |

### 理由

1. **推广便利**（核心）：Node 18+ 兜底让 npm install 0 负担（用户调研硬约束）
2. **不丢 Bun 优势**：用户装了 Bun 自动用 Bun 路径（启动 50ms vs 200ms）
3. **架构一致**：L1-Infra 内部新增，零层间违规
4. **Type B 归属**：不被 kernel 消费，遵循"定义在哪里、消费在哪里"原则
5. **未来扩展**：Deno / Workers / etc. 也能复用适配层（加目录 + 改 1 行工厂）
6. **类型不变**：`ProbeHandler` 签名不动，仅替换 handler 内部 API 调用点
7. **安全强化**：删除 `shell: true` + 加强 `validateCommand`（与 SecurityContext 同步）

### 不做

- ❌ 弃用 Bun（保留作为可选加速路径）
- ❌ runtime 切换由用户配置（自动 detect 即可）
- ❌ 全部 handler 重写为 async（现状已 async）
- ❌ 移除 `Bun.*` 引用（保留作为 detect 内部用）
- ❌ RuntimePort 放 `kernel/contracts/`（Type A 分类空抽象）

### 替代方案

| 方案 | 放弃理由 |
|---|---|
| A. 全部走 Bun（engines.bun） | 用户不愿装 Bun，推广劣势 |
| B. 全部走 Node（engines.node） | 失去 Bun 启动速度优势 |
| C. 编译 binary（63MB） | 体积大、CI 慢、跨平台难 |
| D. brew/scoop（OpenCode 模式） | 仍需 brew，仍有用户门槛 |
| **E. 适配层（双 runtime）** | **✅ 选**——Node 兜底 + Bun 加速，零用户负担 |

### 决策者

架构师 + 维护者 + 用户（Q8=a / Q9=a / Q11=a / Q3=B）

---

## 16. 评审答复（已拍板）

> 架构师 v0.1 审查 4 个开放问题全部答复，**入文**。v0.3 整合 arch-discussion 后保持答复不变。

### Q1: fetch 真不抽象？

**不抽象**，v0.1.6 直接用 `globalThis.fetch`。理由：
- `http-responds` 探针只用 `fetch(url)` + `res.ok` + `res.status`
- Node 18+ 的 undici fetch 完全覆盖这个用例
- 未来需要 HTTP/2 或自定义 Agent 时再补 `runtime/http.ts`

### Q2: detect 优先级 — `bun --bun oxn` 会误判吗？

**不会误判，且应该优先 `globalThis.Bun`**。理由：
- 如果用户用 `bun --bun oxn` 启动，说明用户**主动选择了 Bun runtime**
- 此时 `globalThis.Bun` 存在，走 Bun 快速路径**正是用户想要的**
- 不应该因为"cmdline 里有 bun"就强制走 Node 兼容路径

**优先级**：`globalThis.Bun` > `process.versions.bun` > cmdline

**实现**（修订后，模块加载时一次性求值并缓存）：

```ts
const _isBun = typeof (globalThis as { Bun?: unknown }).Bun !== 'undefined'
export function isBun(): boolean { return _isBun }
```

### Q3: CI 矩阵组合？

**3 组合**：
1. Bun（最新版）— 主要开发路径，`verify: bun-test`
2. Node 20 LTS — 最广泛用户群，`verify: cli-e2e`
3. Node 22 LTS — 最新 LTS，`verify: cli-e2e`

不需要测 Bun + 特定 Node 版本的交叉。

**关键修订**：Node 矩阵下用 `node dist/cli.js` **端到端**验证（**不是** `npx bun test`），才能证明 OpenXenon 代码在 Node 下能跑。

### Q4: timeout 统一 SIGKILL？

**统一 SIGKILL**。理由：
- Probe 超时意味着进程失去响应
- SIGTERM 可能被进程忽略，导致 probe 挂起
- SIGKILL 保证超时后进程一定退出

**实现**：

```ts
// Bun 路径
const timeoutHandle = setTimeout(() => {
  try { proc.kill('SIGKILL') } catch { /* already dead */ }
}, timeout)
timeoutHandle.unref?.()

// Node 路径（双保险：spawn({ timeout }) + 手动 SIGKILL 兜底）
const proc = nodeSpawn(cmd, { timeout, stdio: 'pipe' })
setTimeout(() => { try { proc.kill('SIGKILL') } catch { /* */ } }, timeout + 500)
```

---

## 17. 修订记录（v0.1 → v0.2 → v0.3 增量）

| 章节 | v0.3 修订类型 | 来源 | 修复/强化问题 |
|---|---|---|---|
| §0 元信息 | 状态升级 v0.3，附 v0.2 → v0.3 核心变化 | arch-discussion 整合 | — |
| §4.1 目录结构 | **扁平 5 文件 → 双目录 + 工厂** | arch-discussion §5.1 | 统一工厂模式 + 真正双实现 + DX 最佳 |
| §5 整章 | **新增**：Type A vs Type B 接口分类 | arch-discussion §3 | 解决 RuntimePort 归属 |
| §7.4 which | 合并到 `index.ts` 工厂（删除独立 `which.ts`） | arch-discussion §5.1 | 工厂统一 |
| §8 改造示例 | 加 `shell: true` 删除 + `validateCommand` 加强 | SecurityContext 同步 | 与 fix-p0-quality C5 同向 |
| §9 改造清单 | 14 → 15（独立 `deps-resolved` / `fs-content-match` 不存在澄清） | v0.1.5 实际扫描 | 准确 |
| §10.3 测试清单 | 22 → 23（多 1 个 `probes-fs-exists` 端到端） | v0.1.5 测试设计 | 准确 |
| §11.1 层归属 | 强调 v0.3 拍板的"双目录"位置 | arch-discussion §5.1 | — |
| §12 风险 | 新增"shell:true 兼容性断裂"风险 + 缓解 | SecurityContext 硬规则 | 安全 |
| §14.5 验收 | **新增**安全性验收（与 SecurityContext 同步） | fix-p0-quality C5 关联 | 安全 |
| §15 ADR-012 | 末尾追加"RuntimePort 归属 Type B" | arch-discussion §4 Q3=B | — |
| 整体 | v0.2 §4 阻断 #2 已被 v0.3 §4.1 双目录彻底解决（不只是提升到 Infra 根） | v0.3 升级 | — |
| 整体 | v0.2 §10.3 FileSystemPort vs runtime/file.ts 职责分工 | 升级为 §11.3，引用 v0.2 已成共识 | — |
| §16 修订记录 | 追加 v0.2 → v0.3 整行 | arch-discussion 整合 | 自我 |

**总工作量未变**：仍 1.5-2 天（1 半天 runtime 骨架 + 半天 probe handler 改造 + 半天测试 + 半天 CI/ADR/changeset/commit）。

---

## 附录 A：相关链接

- **arch-discussion（v1.0 拍板，Type A/B 分类 + 工厂模式依据）**：[`2026-06-11-runtime-adapter-arch-discussion.md`](./2026-06-11-runtime-adapter-arch-discussion.md)
- **v0.2 归档（已废弃）**：[`2026-06-11-runtime-adapter-design.v0.2.deprecated.md`](./2026-06-11-runtime-adapter-design.v0.2.deprecated.md)
- v0.1.0 pre-publish 设计（已同步修订）：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md)
- v0.0.27 审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)
- L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)
- **SecurityContext**（删 `shell: true` 硬规则来源）：`/Users/issac/pro/openxenon/.openxenon/domains/SecurityContext.oxn`
- 当前 runtime API 位置：`src/infra/probes/` 15 个 handler
- `src/infra/frozen/immutable.ts`：用 `fs.promises.writeFile` + `chmodSync`（**已部分 Node 兼容**）
- npm 调研（10 个流行 CLI 工具对比）：见 chat 上下文
- AGENTS.md：[`../../AGENTS.md`](../../AGENTS.md)
- 仓库约定（不发布 `.openxenon/`）：见 AGENTS.md §"仓库约定"
