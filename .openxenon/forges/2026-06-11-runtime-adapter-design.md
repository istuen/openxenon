# Runtime 适配层设计（Node 18+ 兜底 + Bun 加速）

> **状态**：Draft v0.2 — **架构师审查后修订版**（修复 4 阻断 + 3 中等问题 + 4 评审答复），**未实现**。本文档**仅含架构层变更设计**，不含产品代码改动。
>
> **审查来源**：架构师 v0.1 审查（详见 §15 修订记录）
>
> **目标读者**：架构师 + OXN 维护者；**先评审，再动手**。
>
> **关联文档**：
> - v0.1.0 pre-publish 设计：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md) §4 Step 0 前置步骤
> - v0.0.27 审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)
> - L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)

## 目录

- [1. 背景与动机](#1-背景与动机)
- [2. 目标与非目标](#2-目标与非目标)
- [3. 现状审计：Bun API 用法清单](#3-现状审计bun-api-用法清单)
- [4. 适配层架构设计](#4-适配层架构设计)
- [5. `detectBun()` 三种策略](#5-detectbun-三种策略)
- [6. API 映射表（Bun → Node）](#6-api-映射表bun--node)
- [7. probe handler 改造示例](#7-probe-handler-改造示例)
- [8. 18 个 probe handler 改造工作量评估](#8-18-个-probe-handler-改造工作量评估)
- [9. 测试矩阵（双 runtime）](#9-测试矩阵双-runtime)
- [10. 与 L0-L3 宪法一致性](#10-与-l0-l3-宪法一致性)
- [11. 风险与缓解](#11-风险与缓解)
- [12. 实施 checklist](#12-实施-checklist)
- [13. 验收标准](#13-验收标准)
- [14. ADR-012：runtime 适配层正式决策](#14-adr-012runtime-适配层正式决策)
- [15. 待评审项](#15-待评审项)
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
| `Bun.file(path).text()` | `fs-exists` / `fs-not-exists` / `fs-content-match` / `fs-parseable` / `deps-resolved` | ❌ 需换 `fs.promises.readFile` |
| `Bun.file(path).exists()` | `fs-exists` | ❌ 需换 `fs.promises.access` |
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

1. **新增 5 个 runtime 适配模块**：`detect.ts` / `spawn.ts` / `file.ts` / `fetch.ts`（其实不需要）/ `glob.ts`（其实用 npm `glob`） / `which.ts`
2. **8 处 Bun.spawn / Bun.file / Bun.glob 抽象**：probe handler 内部用适配层
3. **detectBun() 3 种策略**：global 检测 / process.versions 检测 / cmdline 检测
4. **22 个新测**：双 runtime 全 probe 行为一致
5. **架构守卫 0 违规**：新增模块不破坏 L0-L3 边界
6. **零产品代码回归**：1033 测全绿 + 22 个新测全绿

### 2.2 非目标（Out-of-Scope）

| 不做 | 原因 |
|---|---|
| ❌ 弃用 Bun（移除 Bun runtime 支持） | 保留作为可选加速路径 |
| ❌ 用户配置 runtime 切换 | 自动 detect 即可 |
| ❌ Deno / Workers / etc. 适配 | v0.1.0 仅 Node + Bun |
| ❌ 完整 runtime polyfill（如 `Bun.write` / `Bun.password`） | 18 个 probe 用到的才适配 |
| ❌ 重写 probe handler 业务逻辑 | 仅替换 Bun API 调用点 |
| ❌ 删除 `Bun.*` 引用 | 保留作为 detect 内部用 |

---

## 3. 现状审计：Bun API 用法清单

### 3.1 全扫描结果

| Bun API | 调用位置 | 频次 |
|---|---|---|
| `Bun.spawn(cmd, opts)` | `shell-exec.ts` / `test-pass.ts` / `ts-compiles.ts` / `lint-check.ts` / `git-branch-exists.ts` / `git-clean.ts` / `git-status-clean.ts` / `git-merge-feasible.ts` / `file-exports.ts` | **9 处** |
| `Bun.file(path).text()` | `fs-content-match.ts` / `deps-resolved.ts` | **2 处** |
| `Bun.file(path).exists()` | `fs-exists.ts` / `fs-not-exists.ts` | **2 处** |
| `Bun.file(path).json()` | `fs-parseable.ts` | **1 处** |
| `Bun.glob(pattern)` | `fs-match.ts` | **1 处** |
| `Bun.fetch(url)` | `http-responds.ts` | **1 处**（**Node 18+ 原生 fetch 等价，零改造**） |

**总计**：15 处 Bun API 用法，需适配 14 处（fetch 除外）。

### 3.2 风险矩阵

| API | Bun 路径 | Node 路径 | 行为差异风险 |
|---|---|---|---|
| `spawn` | `Bun.spawn` 返回 `Subprocess`（Promise<exitCode>） | `child_process.spawn` 返回 `ChildProcess`（EventEmitter） | 🟡 **中**（stream API 差异最大） |
| `file.text()` | `Promise<string>` | `fs.promises.readFile(path, 'utf-8')` | 🟢 低（语义等价） |
| `file.exists()` | `Promise<boolean>` | `fs.promises.access(path)` | 🟢 低 |
| `file.json()` | `Promise<any>` | `JSON.parse(await fs.readFile(path, 'utf-8'))` | 🟢 低 |
| `glob` | `Promise<Iterable<string>>` | `glob(pattern)` npm 包（已是 OpenXenon 依赖） | 🟢 低 |
| `fetch` | globalThis.fetch | globalThis.fetch | 🟢 **零**（API 等价） |

---

## 4. 适配层架构设计

### 4.1 目录结构

> **修订**：原设计放 `src/infra/probes/runtime/` 作用域过窄，**提升到 `src/infra/runtime/` 根级别**（L1-Infra 全部模块统一消费）。

```
src/infra/runtime/
├── detect.ts        # detectBun() / isBun / getRuntimeName
├── spawn.ts         # spawn() — 替代 Bun.spawn
├── file.ts          # openFile() — 替代 Bun.file
├── glob.ts          # glob() — 替代 Bun.glob（用 npm glob）
├── which.ts         # which() — 用 npm 'which' 包（不手写）
└── __tests__/
    ├── runtime-detect.test.ts
    ├── runtime-spawn.test.ts
    ├── runtime-file.test.ts
    ├── runtime-glob.test.ts
    └── runtime-which.test.ts
```

**注**：`fetch.ts` 不需要新文件——Node 18+ 与 Bun 都内置 `globalThis.fetch`，**直接用**。

### 4.2 模块依赖图

```
detect.ts (无依赖)
  ↓
spawn.ts ──→ detect.ts
file.ts  ──→ detect.ts
glob.ts  ──→ detect.ts (异步检测)
which.ts ──→ detect.ts (同步检测) + npm 'which' 包

L1-Infra 全部模块
  ├─ src/infra/probes/*.ts (probe handler)
  ├─ src/infra/frozen/immutable.ts (frozen.json 写盘)
  ├─ src/infra/git/workspace.ts (PoC)
  └─ src/infra/filesystem.ts (现有 FileSystemPort 实现)
  ↓
spawn.ts / file.ts / glob.ts / which.ts
  ↓
node:child_process / node:fs / glob (npm 包) / which (npm 包)
```

**架构守卫**：`spawn.ts` / `file.ts` / `glob.ts` / `which.ts` 都依赖 `node:fs` / `node:child_process` / `glob` / `which`，**全部在 L1-Infra 内部**，**不跨层**。

---

## 5. `detectBun()` 三种策略

> **修订**：模块加载时**求值并缓存** `isBun`（中等问题 #5 修复），避免每次 probe handler 调用都重检。

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

**测试**：

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
    // 即便 execArgv 含 'bun'，globalThis.Bun 存在 → 走 bun
    const r = detectViaCmdline()
    expect(['bun', 'node']).toContain(r)
  })
})
```

---

## 6. API 映射表（Bun → Node）

### 6.1 spawn

> **修订**（中等问题 #6 修复）：**强制缓冲 `stdout: string`** —— 消除 Bun `ReadableStream` 与 Node `Readable` 流式差异，v0.1.0 不暴露流式 API。代价是大输出时内存稍高，对 probe 场景**完全可接受**。

| 维度 | Bun | Node 18+ 适配 |
|---|---|---|
| **入口** | `Bun.spawn({ cmd, cwd, env, stdout, stderr, stdin })` | `child_process.spawn(cmd, { cwd, env, stdio: 'pipe', timeout })` |
| **返回** | `Subprocess`（Promise<exitCode>） | `ChildProcess`（EventEmitter） |
| **stdout** | 强制 buffer 为 string（`new Response(proc.stdout).text()`） | **强制 buffer**（`stdout.on('data', ...)` 累积） |
| **stderr** | 强制 buffer 为 string | **强制 buffer** |
| **exitCode** | `await proc.exited` | `proc.on('close', code => ...)` |
| **kill** | `proc.kill('SIGKILL')`（**统一**） | `proc.kill('SIGKILL')` + `spawn({ timeout })` 兜底 |
| **超时** | 需 setTimeout 手动 kill | `spawn({ timeout })` 内置 + 兜底 SIGKILL |

**适配层返回类型**（v0.1.0 锁定）：

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

### 6.2 file

| 维度 | Bun | Node 18+ 适配 |
|---|---|---|
| **打开** | `Bun.file(path)` | `fs.promises.readFile(path)` |
| **text()** | `await file.text()` | `await fs.promises.readFile(path, 'utf-8')` |
| **exists()** | `await file.exists()` | `try { await fs.access(path); true } catch { false }` |
| **json()** | `await file.json()` | `JSON.parse(await fs.promises.readFile(path, 'utf-8'))` |
| **size** | `file.size`（同步） | `fs.statSync(path).size`（同步） |
| **write** | `await Bun.write(path, data)` | `await fs.promises.writeFile(path, data)` |

### 6.3 glob

| 维度 | Bun | Node 适配 |
|---|---|---|
| **入口** | `await Bun.glob(pattern)` | `await glob(pattern, { cwd })`（已是 npm 依赖） |

### 6.4 which

> **修订**（阻断性问题 #4 修复）：**不**手写 platform-related 路径搜索，**用 npm `which` 包**——自动处理 Windows `%PATHEXT%` / `.exe` / `.cmd` / `.ps1` / 路径分隔符差异。

| 维度 | Bun | Node 适配（npm `which` 包） |
|---|---|---|
| **入口** | `Bun.which(cmd)` | `await which(cmd, { PATH: process.env.PATH })`（npm `which`） |
| **跨平台** | ✅ 自动处理 | ✅ npm `which` 处理 Windows / macOS / Linux |
| **返回** | `string \| null` | `string \| null`（**类型一致**） |

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

### 6.5 fetch

> **评审答复**（Q1）：**不抽象**，v0.1.0 直接用 `globalThis.fetch`。理由：
> - `http-responds` 探针只用 `fetch(url)` + `res.ok` + `res.status`
> - Node 18+ 的 undici fetch 完全覆盖
> - 未来需要 HTTP/2 / 自定义 Agent 时再补 `runtime/http.ts`

| 维度 | Bun | Node 18+ |
|---|---|---|
| **入口** | `Bun.fetch(url)` | `fetch(url)`（**globalThis.fetch 等价**） |
| **超时** | `AbortController` | 同 |
| **stream** | `Response.body: ReadableStream` | 同 |

**结论**：`fetch` **零适配**。

---

## 7. probe handler 改造示例

### 7.1 `src/infra/probes/shell-exec.ts`

**改造前**（用 Bun.spawn）：

```ts
// BEFORE
import type { ProbeContext } from './index'
const proc = Bun.spawn(['sh', '-c', command], { cwd, stdout: 'pipe', stderr: 'pipe' })
const [stdout, stderr, exitCode] = await Promise.all([
  new Response(proc.stdout).text(),
  new Response(proc.stderr).text(),
  proc.exited,
])
return { passed: exitCode === 0, stdout, stderr, durationMs }
```

**改造后**（用适配层）：

```ts
// AFTER
import { spawn } from '../../runtime/spawn'         // 路径调整
import type { ProbeContext } from './index'

export async function handleShellExec(params: Record<string, unknown>, ctx: ProbeContext) {
  const command = String(params.command ?? '')
  if (!command) return { passed: false, errorMessage: 'missing command' }
  const result = await spawn(['sh', '-c', command], {
    cwd: ctx.projectRoot,
    timeout: Number(params.timeout ?? 30_000),
    env: params.env as Record<string, string> | undefined,
  })
  return {
    passed: result.exitCode === 0,
    stdout: result.stdout,                            // 已缓冲为 string
    stderr: result.stderr,                            // 已缓冲为 string
    durationMs: result.durationMs,
  }
}
```

**API 形状不变**——`ProbeHandler` 签名不动，**仅 handler 内部用 `spawn()` 适配层**。

### 7.2 `src/infra/probes/fs-exists.ts`

**改造前**：

```ts
// BEFORE
import type { ProbeContext } from './index'
const file = Bun.file(pattern)
return { passed: await file.exists() }
```

**改造后**：

```ts
// AFTER
import { openFile } from '../../runtime/file'        // 路径调整
import type { ProbeContext } from './index'

export async function handleFsExists(params: Record<string, unknown>, ctx: ProbeContext) {
  const pattern = String(params.pattern ?? params.path ?? '')
  if (!pattern) return { passed: false, errorMessage: 'missing path/pattern' }
  const file = await openFile(pattern)
  return { passed: await file.exists() }
}
```

### 7.3 `src/infra/probes/fs-match.ts`

**改造前**：

```ts
// BEFORE
import type { ProbeContext } from './index'
for await (const file of Bun.glob(pattern)) {
  matches.push(file)
}
return { passed: matches.length > 0, matches }
```

**改造后**：

```ts
// AFTER
import { glob } from '../../runtime/glob'          // 路径调整
import type { ProbeContext } from './index'

export async function handleFsMatch(params: Record<string, unknown>, ctx: ProbeContext) {
  const pattern = String(params.pattern ?? '')
  if (!pattern) return { passed: false, errorMessage: 'missing pattern' }
  const matches = await glob(pattern, { cwd: ctx.projectRoot })
  return { passed: matches.length > 0, matches }
}
```

### 7.4 `src/infra/probes/http-responds.ts`（**零改造**）

```ts
// 不变 — Node 18+ 与 Bun 都有 globalThis.fetch
const res = await fetch(url, { signal: controller.signal })
return { passed: res.ok, status: res.status }
```

---

## 8. 18 个 probe handler 改造工作量评估

| # | probe handler | 用 Bun API？ | 改造量 |
|---|---|---|---|
| 1 | `fs-exists.ts` | `Bun.file().exists()` | 改 `runtime/file.ts` |
| 2 | `fs-not-exists.ts` | 同上 | 同上 |
| 3 | `fs-content-match.ts` | `Bun.file().text()` | 改 `runtime/file.ts:text()` |
| 4 | `fs-parseable.ts` | `Bun.file().json()` | 改 `runtime/file.ts:json()` |
| 5 | `fs-match.ts` | `Bun.glob()` | 改 `runtime/glob.ts` |
| 6 | `shell-exec.ts` | `Bun.spawn()` | 改 `runtime/spawn.ts` |
| 7 | `test-pass.ts` | `Bun.spawn('bun test')` | 改 `runtime/spawn.ts` |
| 8 | `deps-resolved.ts` | `Bun.file()` | 改 `runtime/file.ts` |
| 9 | `ts-compiles.ts` | `Bun.spawn('tsc')` | 改 `runtime/spawn.ts` |
| 10 | `lint-check.ts` | `Bun.spawn('biome')` | 改 `runtime/spawn.ts` |
| 11 | `http-responds.ts` | `Bun.fetch()` | **零改造**（globalThis.fetch） |
| 12 | `file-exports.ts` | `Bun.spawn()` | 改 `runtime/spawn.ts` |
| 13 | `git-branch-exists.ts` | `Bun.spawn('git')` | 改 `runtime/spawn.ts` |
| 14 | `git-clean.ts` | 同上 | 同上 |
| 15 | `git-status-clean.ts` | 同上 | 同上 |
| 16 | `git-merge-feasible.ts` | 同上 | 同上 |
| 17 | （已废弃）`fs-match.ts` 同 #5 | — | — |
| 18 | （无） | — | — |

**真实改造**：14 个 probe handler，5 个 runtime 模块。**半天工作量**。

---

## 9. 测试矩阵（双 runtime）

> **修订**（阻断性问题 #3 修复）：原 CI 配置 `npx --yes bun test` 跑的是 **Bun test runner 在 Node 下运行**，**不能证明 OpenXenon 代码在 Node 下能跑**。改为**端到端 Node 验证**。

### 9.1 必须双跑的测试

| 测试文件 | Bun 路径 | Node 路径 | 差异风险 |
|---|---|---|---|
| `runtime-detect.test.ts` | `isBun() === true` | `isBun() === false` | 🟢 零 |
| `runtime-spawn.test.ts` | `spawnBun` 分支 | `spawnNode` 分支 | 🟡 中 |
| `runtime-file.test.ts` | `bunFileHandle` | `nodeFileHandle` | 🟢 低 |
| `runtime-glob.test.ts` | `Bun.glob` 兜底 | `glob` npm | 🟢 低 |
| `runtime-which.test.ts` | `Bun.which` 兜底 | `which` npm | 🟢 低 |
| `probes-shell-exec.test.ts` | 端到端跑 `sh -c 'echo'` | 同 | 🟡 中 |
| `probes-fs-*.test.ts` (5 个) | 端到端跑文件操作 | 同 | 🟢 低 |

### 9.2 CI 配置（GitHub Actions 矩阵 — **修订**）

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
        # 评审答复 Q3：3 组合（不测 Bun + 特定 Node 版本的交叉）
        include:
          - runtime: bun
            node-version: '20'   # 最新 LTS（开发期主用）
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

      # Bun 矩阵：跑 bun test（含 1033 + 22 适配层 + 22 T1/T2 = 1077 测）
      - name: Bun test suite
        if: matrix.verify == 'bun-test'
        run: bun test

      # Node 矩阵：跑端到端 CLI（**真的验证 OpenXenon 代码在 Node 下能跑**）
      - name: Node e2e CLI verification
        if: matrix.verify == 'cli-e2e'
        run: |
          node dist/cli.js --version
          node dist/cli.js init --help
          # 跑一个完整 proof 闭环
          cd /tmp && mkdir -p oxn-node-e2e && cd oxn-node-e2e
          node /path/to/dist/cli.js init
          node /path/to/dist/cli.js proof create e2e-test
          node /path/to/dist/cli.js proof probe add e2e-test shell-exec --input-json '{"command":"echo hello from node"}'
          node /path/to/dist/cli.js proof run e2e-test
          node /path/to/dist/cli.js proof show e2e-test
```

**关键差异**（原设计 vs 修订）：

| 维度 | 原设计 ❌ | 修订 ✅ |
|---|---|---|
| Node 矩阵验证 | `npx --yes bun test` | `node dist/cli.js` 端到端 |
| 验证目标 | "Bun test runner 能在 Node 下运行" | "**OpenXenon 代码在 Node 下能跑**" |
| 矩阵组合 | 4（bun + node20/22） | **3**（bun + node20/22，仅 2 测 cli-e2e） |

### 9.3 新增测试清单（22 个）

| 文件 | 测试数 | 内容 |
|---|---|---|
| `runtime-detect.test.ts` | 4 | isBun / 缓存一致性 / getRuntimeName / detectViaCmdline |
| `runtime-spawn.test.ts` | 5 | echo / exit 1 / timeout / cwd / env |
| `runtime-file.test.ts` | 4 | text / json / exists / write |
| `runtime-glob.test.ts` | 3 | 1 pattern / 多 pattern / cwd |
| `runtime-which.test.ts` | 2 | 找到 / 找不到 |
| `probes-shell-exec.test.ts` | 3 | success / failure / timeout |
| `probes-fs-exists.test.ts` | 2 | 命中 / 不命中 |

**合计**：22 个新测。

---

## 10. 与 L0-L3 宪法一致性

### 10.1 层归属

> **修订**（阻断 #2 修复）：runtime 适配层从 `probes/` 提升到 **Infra 根级别**。

| 新增模块 | 所属层 | 状态 |
|---|---|---|
| `src/infra/runtime/*.ts` | L1-Infra | ✅ 内部新增（**根级别**） |
| 探针 handler 改造（14 处） | L1-Infra | ✅ 内部修改 |
| `src/infra/frozen/immutable.ts` 改造 | L1-Infra | ✅ 内部修改（用 `runtime/file.ts`） |
| `src/infra/filesystem.ts` 与 `runtime/file.ts` 分工 | L1-Infra | ✅ 见 §10.3 |
| `ProbesContext` / `ProbeHandler` 签名 | L1-Infra | ✅ 不变 |
| `probes/index.ts` 导出 | L1-Infra | ✅ 不变 |

**层间违规检查**：

- `L0-Kernel`（schemas/contracts/processors/verdicts）：**无变化** ✅
- `L0-Contract`（`name-canonical.ts` 等）：**无变化** ✅
- `L1-Infra`（probes/frozen/git/...）：**内部新增 + 内部修改**，不跨层 ✅
- `L2-Builtin`：**无变化** ✅
- `L2-Work`（probe-evaluator）：调用 `probes/index.ts` 接口，**不变** ✅
- `L3-CLI`（cli/proof.ts）：调用 `probes/index.ts` 接口，**不变** ✅

**架构守卫预期**：`bun scripts/validate-dependencies.ts` 0 违规。

### 10.2 与 ESLint `no-restricted-imports` 规则

`src/infra/runtime/spawn.ts` 用 `node:child_process` / `node:fs` —— L1-Infra 内部允许，**无违规**。

### 10.3 `FileSystemPort` 与 `runtime/file.ts` 职责分工

> **评审答复**（中等问题 #7）：在 ADR-013 明确记录分工，**避免后续混淆**。

| 维度 | `FileSystemPort` (L0-Contract) | `runtime/file.ts` (L1-Infra) |
|---|---|---|
| **位置** | `src/kernel/contracts/file-system-port.ts` | `src/infra/runtime/file.ts` |
| **使用方** | **Kernel 内部**（probes/, frozen/, evaluator/） | **Probe handler** |
| **API 形状** | 同步、基础 fs 操作（`existsSync` / `mkdirSync` / `readFileSync`） | 异步、高级文件读取（`openFile()` 返回 `FileHandle`） |
| **示例** | `FileSystemPort.existsSync(path)` | `openFile(path).then(h => h.text())` |
| **runtime 适配** | ❌ 不适配（Kernel 纯函数） | ✅ 自动 detect Bun/Node |
| **职责** | Kernel 使用的同步、基础 fs 操作 | Probe 使用的异步、高级文件读取 |

**不重叠**：一个是**同步基础原语**，一个是**异步高级抽象**。两条独立路径不冲突。

---

## 11. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| spawn stream API 差异（`ReadableStream` vs `Readable`） | 高 | shell-exec / test-pass / git-* 等 9 处行为不一致 | 双 runtime 测矩阵 + 严格类型化适配层 |
| timeout 在 Node 路径下与 Bun 路径有 ms 级差异 | 中 | 测试可能 flake | 测中加 `±100ms` 容差 |
| env 变量传递在 Bun/Node 路径下大小写敏感差异 | 低 | env 解析不一致 | 适配层显式 normalize |
| `Bun.file(path).size` 同步读取在 Node 路径下需 `fs.statSync` | 中 | 同步 vs 异步 API 差异 | `size()` 文档化为 sync only |
| `Bun.which` 在 Windows 路径分隔符（`\` vs `/`） | 中 | Windows CI 跑挂 | which 适配层显式处理 `path.delimiter` |
| `Bun.glob` 性能 vs npm `glob` 差异 | 低 | 大文件树扫描慢 | 在 path 密集场景 benchmark |
| detectBun 误判（如 Bun 兼容 Node 模式） | 低 | 走错路径 | 三种策略 fallback + cmdline 兜底 |
| 双 runtime CI 时间翻倍 | 中 | CI 慢 1-2 min | 用 `matrix.runtime` 只跑关键测 |
| 探针用户期望 Bun 速度（装了 Bun） | 低 | 启动慢 200ms vs 50ms | 适配层自动 detect，**用户无需配置** |

---

## 12. 实施 checklist

### 12.1 准备阶段
- [ ] 读 `src/infra/probes/` 下 18 个 handler 当前实现
- [ ] 确认每个 Bun.spawn / Bun.file / Bun.glob 调用点
- [ ] 跑 `bun run typecheck` 0 error 基线
- [ ] 跑 `bun test` 1033 PASS 基线

### 12.2 实施阶段（12 步，按顺序）

#### Step 1：detect.ts
- [ ] 新建 `src/infra/runtime/detect.ts`
- [ ] 3 种策略：`isBun()` / `getRuntimeName()` / `detectViaCmdline()`
- [ ] `bun test` 0 error

#### Step 2：spawn.ts
- [ ] 新建 `src/infra/runtime/spawn.ts`
- [ ] `spawn()` 函数（isBun 分支）
- [ ] 类型定义 `SpawnResult` / `SpawnOptions`
- [ ] 5 个新测

#### Step 3：file.ts
- [ ] 新建 `src/infra/runtime/file.ts`
- [ ] `openFile()` / `FileHandle` 接口
- [ ] 4 个新测

#### Step 4：glob.ts
- [ ] 新建 `src/infra/runtime/glob.ts`
- [ ] `glob()` 函数（用 npm `glob` 包）
- [ ] 3 个新测

#### Step 5：which.ts
- [ ] 新建 `src/infra/runtime/which.ts`
- [ ] `which()` 函数（手写实现，10 行）
- [ ] 2 个新测

#### Step 6：probe handler 改造（14 处）
- [ ] `shell-exec.ts` 用 `spawn()`
- [ ] `test-pass.ts` 用 `spawn()`
- [ ] `ts-compiles.ts` 用 `spawn()`
- [ ] `lint-check.ts` 用 `spawn()`
- [ ] `file-exports.ts` 用 `spawn()`
- [ ] `git-branch-exists.ts` / `git-clean.ts` / `git-status-clean.ts` / `git-merge-feasible.ts` 用 `spawn()`
- [ ] `fs-exists.ts` / `fs-not-exists.ts` 用 `openFile().exists()`
- [ ] `fs-content-match.ts` / `deps-resolved.ts` 用 `openFile().text()`
- [ ] `fs-parseable.ts` 用 `openFile().json()`
- [ ] `fs-match.ts` 用 `glob()`
- [ ] `http-responds.ts` **零改造**（仅注释说明）

#### Step 7：end-to-end probe 测（5 个新测）
- [ ] `probes-shell-exec.test.ts`（success / failure / timeout）
- [ ] `probes-fs-exists.test.ts`（命中 / 不命中）

#### Step 8：CI 矩阵（GitHub Actions）
- [ ] `.github/workflows/test.yml` 加 `matrix.runtime`
- [ ] 双 runtime 测都跑

#### Step 9：架构守卫
- [ ] `bun scripts/validate-dependencies.ts` 0 违规
- [ ] `bun run lint` 0 error（如有 pre-existing daemon ↔ cli 违规，与本 PR 无关）

#### Step 10：typecheck + 全量测
- [ ] `bun run typecheck` 0 error
- [ ] `bun test` 1033 + 22 = 1055 PASS

#### Step 11：本地双 runtime 验证
- [ ] `bun test` 跑一遍（基线）
- [ ] `node --version` ≥ 18 验证后跑 `npx bun test`（模拟 CI node 路径）

#### Step 12：提交
- [ ] 14 个 commit（5 个 runtime 模块 + 8 个 probe handler + 1 个 CI）
- [ ] `.changes/0-0-28-runtime-adapter.md` 变更日志
- [ ] PR 标题：`feat(infra): runtime 适配层（Node 18+ 兜底 + Bun 加速）`

### 12.3 验证阶段
- [ ] 双 runtime 测矩阵全绿
- [ ] 1033 既有测全绿（零回归）
- [ ] 22 新测全绿
- [ ] 架构守卫 0 违规
- [ ] lefthook pre-commit / pre-push 全过

---

## 13. 验收标准

### 13.1 功能性
- [ ] 14 个 probe handler 改造完成
- [ ] 5 个 runtime 模块就位
- [ ] 22 个新测全绿
- [ ] 1033 既有测零回归
- [ ] Node 18+ 可直接 `node dist/cli.js` 跑（无 Bun API 调用）

### 13.2 质量性
- [ ] 0 typecheck error
- [ ] 0 lint error
- [ ] 0 架构违规
- [ ] 双 runtime 测矩阵全过
- [ ] 启动时间 Bun 路径 < 100ms / Node 路径 < 300ms

### 13.3 治理性
- [ ] ADR-012 落盘
- [ ] 14 commit 主题清晰
- [ ] 关联 forge 链接完整
- [ ] lefthook pre-push 全过

### 13.4 推广性
- [ ] README 同时给 `npm i -g openxenon@0.1.0` + `pnpm add -g openxenon@0.1.0` 两条命令
- [ ] 不写 `npm i -g bun` 或 `brew install bun`
- [ ] 用户零额外依赖（Node 18+ 兜底）

---

## 14. ADR-012：runtime 适配层正式决策

### 决策

在 `src/infra/runtime/` 新增 5 个 runtime 适配模块（`detect.ts` / `spawn.ts` / `file.ts` / `glob.ts` / `which.ts`），将 14 处 Bun API 用法抽象到适配层，**`engines` 改为 `node >=18.0.0`**（不再要求 Bun）。

### 理由

1. **推广便利**（核心）：Node 18+ 兜底让 npm install 0 负担（用户调研硬约束）
2. **不丢 Bun 优势**：用户装了 Bun 自动用 Bun 路径（启动 50ms vs 200ms）
3. **架构一致**：L1-Infra 内部新增，零层间违规
4. **回归保护**：双 runtime 测矩阵确保两路径行为一致
5. **未来扩展**：Deno / Workers / etc. 也能复用适配层
6. **类型不变**：`ProbeHandler` 签名不动，14 处 handler 仅替换 Bun API 调用点

### 不做

- ❌ 弃用 Bun（保留作为可选加速路径）
- ❌ runtime 切换由用户配置（自动 detect 即可）
- ❌ 全部 handler 重写为 async（现状已 async）
- ❌ 移除 `Bun.*` 引用（保留作为 detect 内部用）

### 替代方案

| 方案 | 放弃理由 |
|---|---|
| A. 全部走 Bun（engines.bun） | 用户不愿装 Bun，推广劣势 |
| B. 全部走 Node（engines.node） | 失去 Bun 启动速度优势 |
| C. 编译 binary（63MB） | 体积大、CI 慢、跨平台难 |
| D. brew/scoop（OpenCode 模式） | 仍需 brew，仍有用户门槛 |
| **E. 适配层（双 runtime）** | **✅ 选**——Node 兜底 + Bun 加速，零用户负担 |

### 决策者

架构师 + 维护者 + 用户（Q8=a / Q9=a / Q11=a）

---

## 15. 评审答复（已拍板）

> 架构师 v0.1 审查 4 个开放问题全部答复，**入文**。

### Q1: fetch 真不抽象？

**不抽象**，v0.1.0 直接用 `globalThis.fetch`。理由：
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

## 16. 修订记录（v0.1 → v0.2 增量）

| 章节 | 修订类型 | 来源 | 修复问题 |
|---|---|---|---|
| §0 元信息 | 状态更新 v0.2 | 审查 | — |
| §4.1 目录结构 | 提升到 `src/infra/runtime/` 根级别 | 审查 | **🔴 阻断 #2**（作用域太窄） |
| §5 detectBun | 缓存化（模块加载时求值） | 审查 | 🟡 中等 #5（缺缓存） |
| §6.1 spawn | 强制 `stdout: string` 缓冲 | 审查 | 🟡 中等 #6（流处理差异未设计） |
| §6.4 which | 改用 npm `which` 包（**不**手写） | 审查 | **🔴 阻断 #4**（Windows 跨平台地雷） |
| §6.5 fetch | 评审答复入文（不抽象） | 审查 | Q1 |
| §7 probe handler 改造 | 路径更新到 `../../runtime/` | 配合 §4.1 改动 | — |
| §9.2 CI 矩阵 | 3 组合 + Node 端到端 `node dist/cli.js` | 审查 | **🔴 阻断 #3**（CI 验证逻辑错） |
| §9.2 build target | 同步 `build:dist` → `--target=node` | 配合阻断 #1 | **🔴 阻断 #1**（engines 冲突） |
| §9.3 新增测试 | detect 测 +1（缓存一致性） | 配合 §5 改动 | — |
| §10.1 层归属 | runtime 提到 Infra 根 | 配合 §4.1 改动 | — |
| §10.3 职责分工 | 新增 `FileSystemPort` vs `runtime/file.ts` 分工 | 审查 | 🟡 中等 #7（职责重叠） |
| §11 风险 | 移除"手写 which 跨平台地雷"风险（已修） | 配合 §6.4 改动 | — |
| §14 ADR-012 | build target 改 `--target=node` | 配合阻断 #1 | **🔴 阻断 #1** |
| §15 评审答复 | 4 个 Q 全部入文 | 审查 | Q1-Q4 |
| §16 修订记录 | 本节 | 自我 | — |

**总工作量未变**：仍 1.5 天（1 半天 runtime 模块 + 1 半天 probe handler 改造）。

---

## 附录 A：相关链接

- v0.1.0 pre-publish 设计（已同步修订）：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md)
- v0.0.27 审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)
- L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)
- 当前 runtime API 位置：`src/infra/probes/` 18 个 handler
- 当前 `src/infra/frozen/immutable.ts`：用 `fs.promises.writeFile` + `chmodSync`（**已部分 Node 兼容**）
- npm 调研（10 个流行 CLI 工具对比）：见 chat 上下文
- AGENTS.md：[`../../AGENTS.md`](../../AGENTS.md)
- 仓库约定（不发布 `.openxenon/`）：见 AGENTS.md §"仓库约定"
