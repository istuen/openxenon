# 代码质量检测报告:软件模式 + 代码逻辑

> 日期: 2026-06-12
> 检测范围: `/Users/issac/pro/openxenon` (225 源文件 + 73 测试文件)
> 检测方式: 双 Agent 并行分析 (Pattern Quality + Logic Quality)
> 用途: PR 前 / 重构前的质量基线参考

## 总览评分

| 维度 | 分数 | 评级 |
|---|---|---|
| 软件模式质量 | **7.5 / 10** | 良好 |
| 代码逻辑质量 | **5.5 / 10** | 需关注 |
| 架构守卫 (L0–L3) | **10 / 10** | 优秀 (唯一满分项) |

---

# 第一部分:软件模式质量 (7.5/10)

## 优秀模式 (Good Patterns)

### 1. Strategy 模式 — 教科书级应用

**位置**: `src/kernel/verdicts/verdict.ts:502-521`

Probe verdict 评估采用教科书级 Strategy 模式:

- `PROBE_VERDICT_STRATEGIES` 注册表: `string -> ProbeStrategy` (纯函数)
- `judge()` 函数: 委托到 `getVerdictStrategy()` 分派 (line 542-553)
- IO 端独立: `src/infra/probes/index.ts:21-221` 的 `probeHandlers` 注册表

**正交分离**: 同一资产同时分离了"怎么观测" (Infra handlers) 与"怎么评判" (Kernel verdicts)。

### 2. Port & Adapter (六边形架构)

**Port 位置**:
- `src/kernel/contracts/file-system-port.ts:1-7`
- `src/kernel/contracts/probe-port.ts:1-65`
- `src/kernel/contracts/hash-port.ts`
- `src/kernel/contracts/os-port.ts`
- `src/kernel/contracts/path-port.ts`

**Adapter 位置**:
- `src/infra/boundary.ts:11-15` — `OsPort` 实现
- `src/infra/filesystem.ts:79-132` — 包装 Node `fs` 模块
- `src/work/adapters/frozen-to-blueprint-adapter.ts:1-40` — FrozenBlueprint ↔ Blueprint 适配

**评估**: DDD 对齐的六边形架构, 依赖反转应用正确, L0 零 IO 依赖。

### 3. 4 层错误分类体系

**位置**: `src/cli/index.ts:42-61` (`classifyError`) + 4 个 handler (line 70-138)

| 层 | 类型 | 出口 | 消费者 |
|---|---|---|---|
| 1 | IAPError | exit 1, stdout JSON | AI agent |
| 2 | OXNCrash | exit 2, stderr stack | 人类工程师 |
| 3 | CliInput | exit 1, stdout JSON | AI + 人类 |
| 4 | 未知 | exit 2, stderr | 人类工程师 |

**评估**: 注释清晰展示设计哲学 (line 1-21), 严格的分层错误处理。

### 4. State Machine 模式

- `src/work/dual-state.ts:30-64` — `WorkspaceStateSchema`: `pending → running → passed | failed | error`
- `src/work/dual-state.ts:133-155` — `TaskStateSchema` 同样状态机 + `currentPart` 推进
- `src/daemon/circuit-breaker.ts:25-132` — 经典 `CLOSED → OPEN → HALF_OPEN → CLOSED`

### 5. Registry 模式

- `src/infra/probes/index.ts:223-296` — `ProbeRegistry` 类 (register / get / has / addAlias)
- `src/kernel/verdicts/catalog.ts:58-492` — `PROBE_CATALOG` 单一事实源
- `src/kernel/verdicts/verdict.ts:502-534` — 双胞胎注册表 (strategies + aliases)

**价值**: OCP 合规, 添加新 probe 类型无需修改既有代码。

### 6. Schema 验证 (Zod)

- `src/work/state.ts:12-144` + `src/work/dual-state.ts:17-205` — Zod schemas + `.safeParse()`
- `src/kernel/schemas/proof-schema.ts:25` — `_xenon_meta.content_hash` SHA-256 正则强制

### 7. 原子写 (Atomic Write)

- `src/infra/filesystem.ts:24-38` — `atomicWrite()`: 写 `.tmp` → `renameSync()`
- 在 `src/work/dual-state-io.ts:109-112` + `dual-state-exec.ts:352-354` 复用

### 8. DAG 拓扑排序 (Kahn 算法)

**位置**: `src/kernel/processors/dag.ts:9-73`

- 环检测 (line 69)
- 缺失节点依赖检测 (line 39-45)
- 纯函数实现,边界条件处理完整

### 9. 懒加载 CLI 子命令

**位置**: `src/cli/index.ts:150-169`

所有子命令懒加载: `work: () => import('./work').then(m => m.default)`。优势: 编译后二进制启动快。

## 问题模式 (Problematic Patterns)

### P1. 重复 Verdict 策略实现 ⚠️ **HIGH**

**位置**:
- 规范实现: `src/kernel/verdicts/verdict.ts:44-499`
- 重复实现: `src/work/probe-evaluator.ts:6-94`

**差异证据**:

| 策略 | kernel 版判定 | work 版判定 |
|---|---|---|
| `shell_exec` | `observation.exitCode === 0` (line 118-130) | 同逻辑但消息格式不同 (line 48-59) |
| `fs_match` | `matched && !observation.error` (line 103) | `obs.error === undefined` (line 37) |
| `exec_exit_zero` | (无 — 已删除) | 存在 (line 62-74) |
| `exec_output_match` | (无 — 已删除) | 存在 (line 76-94) |

**风险**: 同一 probe 类型在不同 evaluator 下产出不同 verdict。违反 L0-L3 架构意图 (verdict 逻辑应只在 L0-Kernel 存在)。

### P2. 两套并行的状态 Schema ⚠️ **HIGH**

**Schema A**: `src/work/state.ts:93-109` — `WorkStateSchema` (含 `partExecutions[]`, `gitWorkspace`)
**Schema B**: `src/work/dual-state.ts:30-64 + 133-155` — `WorkspaceStateSchema` + `TaskStateSchema`

**Factory 函数重复**:
- `createInitialState()` (state.ts:122) — 位置参数
- `createInitialWorkspaceState()` + `createInitialTaskState()` (dual-state.ts:70, 161) — 命名参数对象

**风险**: 维护者必须同时理解两套 schema, 参数风格不统一。

### P3. ExecError 绕过 4 层错误分类 ⚠️ **HIGH**

**位置**: `src/work/dual-state-exec.ts:41-55`

```typescript
class ExecError extends Error {
  // 7 个自定义代码, 全部既非 IAPError 也非 OXNCrash
}
```

**后果**: 若在 CLI 上下文抛出,会落入 "Tier 4: Crash" (exit 2 + stderr),即使实际是可恢复的用户错误 (如 `OXN_TASK_NOT_FOUND`)。

### P4. require() 在 ESM 项目中 ⚠️ **MEDIUM**

tsconfig 启用 `verbatimModuleSyntax: true`, 却有 `require()` 调用:

| 文件 | 行 | 代码 |
|---|---|---|
| `src/daemon/supervisor.ts` | 88 | `const { spawn } = require('child_process')` |
| `src/work/sandbox/sandbox-manager.ts` | 58 | `const { parse: parseYaml } = require('yaml')` |
| `src/infra/compile-cache.ts` | 6 | `const { createHash } = require('crypto')` |
| `src/cli/install-skill.ts` | 131 | `const { readdirSync } = require('fs')` |

**影响**: 绕过 TypeScript 类型检查; Node.js (非 Bun) 运行时将失败; `yaml` 在 `require()` 下无类型。

### P5. `as any` / `as` 类型断言过度使用 ⚠️ **MEDIUM**

- `src/work/adapters/frozen-to-blueprint-adapter.ts:9,21` — `(frozen as any)._version`
- `src/cli/oxn-dual-track.ts:177,181,185` — `(s as any).deps`
- `src/infra/probes/index.ts:29,44,...` — 多次 `as ProbeObservation`

**评估**: 削弱了 TypeScript 的价值主张,应该用 Builder 模式或正确类型。

### P6. 重复 DAG 拓扑排序实现 ⚠️ **MEDIUM**

- 规范: `src/kernel/processors/dag.ts:9-73` (有错误处理)
- 重复: `src/daemon/engine/executor.ts:128-163` (无环检测、无缺失节点校验)

**风险**: 行为不一致 — 一处修复,另一处不受益。

### P7. 单例过度使用 ⚠️ **LOW-MEDIUM**

| 文件 | 行 | 单例 |
|---|---|---|
| `src/daemon/hall.ts` | 130 | `hallEmitter` |
| `src/daemon/supervisor.ts` | 191 | `daemonSupervisor` |
| `src/daemon/circuit-breaker.ts` | 134 | `taskCircuitBreaker` |
| `src/daemon/recovery.ts` | 217 | `recoveryManager` |
| `src/daemon/process-manager.ts` | 125 | `processManager` |
| `src/infra/probes/index.ts` | 298 | `probeRegistry` |

**风险**: 单元测试困难 (状态泄漏); 阻碍多实现替换。**正面**: `recovery.ts:219` 提供 `createRecoveryManager()` 工厂作为备选。

### P8. 长函数违反 SRP ⚠️ **MEDIUM**

- `src/work/work-migrator.ts:210-413` — 203 行, 13 个返回字段, 混合布局检测/备份/删除/路径重映射/正则解析/重新索引/出生证/诊断
- `src/work/dual-state-exec.ts` — 446 行, 混合状态创建/IO/追踪/校验

**建议**: 拆为 3-4 个职责单一的子函数。

## 缺失模式 (Missing Patterns)

| 缺失项 | 影响 | 建议 |
|---|---|---|
| CLI 子命令无形式化接口 | 无编译期保证 subcommand 形状 | `interface CliCommand { meta, args, run }` |
| 无形式化 DI 容器 | 依赖传递 ad-hoc 或从单例拉取 | 统一构造函数注入规范 |
| 无形式化验证管道 | 校验散落 (Zod / 手动 / 正则) | 统一 ValidationMiddleware |
| 无 Builder 模式 | 复杂对象用 `as` 断言直构 | `ProbeObservationBuilder` 等 |
| 无 Async Error Boundary | 4 层分类仅在 CLI 入口应用 | 中间层函数包裹分类 |

## SOLID 评分

| 原则 | 分数 | 评估 |
|---|---|---|
| **S**ingle Responsibility | C- | work-migrator.ts, dual-state-exec.ts, probe-evaluator.ts 都做了太多事 |
| **O**pen-Closed | A | Strategy 模式教科书级实现 |
| **L**iskov Substitution | C | ExecError 在 4 层系统中不可替代 |
| **I**nterface Segregation | B+ | Port 接口小而聚焦 |
| **D**ependency Inversion | A- | kernel 零 IO 依赖, barrel (`kernel/index.ts`) 强制边界 |

---

# 第二部分:代码逻辑质量 (5.5/10)

## C 级问题 (关键)

### C1. 14 处 `require()` 在 ESM 上下文 ⚠️ **CRITICAL**

完整清单:

| 文件 | 行 | 代码 |
|---|---|---|
| `src/infra/compile-cache.ts` | 6 | `const { createHash } = require('crypto')` |
| `src/daemon/supervisor.ts` | 88 | `const { spawn } = require('child_process')` |
| `src/daemon/process.ts` | 41 | `const { mkdirSync } = require('fs')` |
| `src/cli/debug.ts` | 13 | `require('fs').readFileSync(...)` |
| `src/cli/install-skill.ts` | 131 | `const { readdirSync } = require('fs')` |
| `src/cli/export.ts` | 54 | `require('fs').writeFileSync(...)` |
| `src/hall/index.ts` | 105, 141 | `require('fs').statSync(...)` |
| `src/oxl/flattener/bundle-flattener.ts` | 126 | `const { parse: parseYaml } = require('yaml')` |
| `src/work/sandbox/sandbox-manager.ts` | 58 | `const { parse: parseYaml } = require('yaml')` |
| `src/oxl/__tests__/examples-parsing.test.ts` | 30 | `const fs = require('fs')` |
| `src/cli/__tests__/proof.test.ts` | 93, 115, 267 | `require('fs').mkdirSync(...)` |

**修复**: 全部改 ESM import, 用 `import { createHash } from 'node:crypto'` 等。

### C2. `resolveForgeRoot` 返回错误路径 ⚠️ **CRITICAL**

**位置**: `src/infra/paths.ts:28-29`

```typescript
export function resolveForgeRoot(scope: Scope, cwd?: string): string {
  return join(resolveBoundary(scope, cwd), 'arsenal', 'drafts')  // ❌ 错误
}
```

**正确路径** (per AGENTS.md): `join(resolveBoundary(scope, cwd), 'forges')`

**影响**: 调用方 (1 处) 会读错目录。功能虽不致命,但语义明确违背了 forge 的设计。

### C3. `queue.shift()` O(n²) 性能问题 ⚠️ **MEDIUM-CRITICAL**

**位置**: `src/kernel/processors/dag.ts:58`

```typescript
const current = queue.shift()!  // 每次调用都重新索引整个数组
```

**影响**: 拓扑排序从 O(n) 退化为 O(n²)。对大型 DAG (数百节点) 性能不正确。

**修复**: 用索引指针 (`let head = 0; const current = queue[head++]`) 或 `Deque`。

### C4. 未校验用户输入的正则 ⚠️ **CRITICAL (安全)**

**位置**: `src/infra/probes/fs-match.ts:34`

```typescript
const regex = new RegExp(regexStr)  // regexStr 来自 params.contains / params.pattern
```

**风险**: 恶意正则 (ReDoS 模式如 `(a+)+b`) 将挂起进程。无长度检查、无超时包装。

**修复**: 用 `safe-regex` 包做复杂度校验 + 用 `re2` 或限时执行。

### C5. Shell 命令注入向量 ⚠️ **CRITICAL (安全)**

**位置 1**: `src/infra/probes/shell-exec.ts:33-36`
```typescript
spawn(command, [], { shell: true })  // command 来自用户 params
```

**位置 2**: `src/infra/process.ts:15`
```typescript
spawn(['sh', '-c', command])  // 同问题
```

**当前 `validateCommand`** (shell-exec.ts:14-19): 只拒绝空字节和换行,**未拦截** `;`, `|`, `$(...)`, 反引号。

**修复**: 改用 `spawn(command, ['arg1', 'arg2'])` 参数化模式, 或加 shell 元字符黑名单。

### C6. Socket 客户端竞态,响应丢失 ⚠️ **CRITICAL**

**位置**: `src/cli/socket-client.ts:81-100`

```typescript
const onData = (data: Buffer) => {
  responseBuffer += data.toString()
  const lines = responseBuffer.split('\n')
  // ...
  for (const line of lines) {
    if (!line.trim()) continue
    const parsed = JSON.parse(line)
    sock.removeListener('data', onData)
    resolve(parsed)
    return  // ← 第一个 JSON 解析后退出循环
  }
}
```

**问题**:
1. 同一 chunk 内多个 JSON 响应,第二个被静默丢弃
2. 下次 `sendToDaemon` 调用时, `responseBuffer` 残留导致 JSON parse 失败
3. `resolve()` 在 `for` 循环内多次调用 (虽然 Promise 后置为 no-op, 但状态混乱)

**修复**: 用 request ID 匹配响应, 或加消息分隔协议。

## M 级问题 (中等)

### M1. 重复 verdict 策略导致行为漂移 (见 P1)

`work/probe-evaluator.ts:37` 的 `fs_match` 与 `kernel/verdicts/verdict.ts:103` 对同一 probe 给出不同判定条件。

### M2. `JSON.parse` 无 try/catch

**位置**: `src/infra/loader.ts:231`

```typescript
const parsed = JSON.parse(content) as Record<string, unknown>
```

损坏的 JSON 文件将抛未捕获异常,沿调用栈上溯到 crash tier。

### M3. 用正则解析 work.oxn (应改 Langium 解析器)

**位置**: `src/cli/work.ts:1139-1142`

```typescript
const bpMatches = Array.from(workContent.matchAll(/blueprint\s+"([^"]+)"/g))
const dMatches = Array.from(workContent.matchAll(/domain\s+"([^"]+)"/g))
```

**风险**:
- 误匹配注释中的 blueprint 名: `// TODO: handle blueprint "foo"`
- 误匹配 skill_context 字符串字面量
- 漏掉带转义引号的名称

同文件其他位置用 `parseOxnFile` 正确解析,正则方式不一致。

### M4. `resolveForgeRoot` 错 (见 C2)

### M5. 通用 `Error` 抛出而非类型化错误

**位置**: `src/work/dual-state-io.ts:94, 161`

```typescript
throw new Error(`Invalid work state.json: ${result.error.message}`)
throw new Error(`Failed to load work state: ${err.message}`)
```

应抛 `IAPError` / `OXNCrash` 让 4 层分类生效。当前落入 "Crash" tier (exit 2 stderr), 实际是数据损坏问题 (`STATE_CORRUPT`)。

### M6. 模块级可变状态在 async 上下文共享

| 文件 | 变量 | 风险 |
|---|---|---|
| `src/infra/socket.ts:16` | `let server` | 并发 `createServer()` 互相覆盖 |
| `src/cli/socket-client.ts:13` | `let socket` | 多个 `sendToDaemon` 共享同一 socket,无队列 |
| `src/infra/probes/index.ts:224-258` | `ProbeRegistry` | handlers map 运行时变更 |
| `src/cli/context.ts:3-25` | `cliContext.formatMode` | 测试间不重置 |

### M7. `loadStandardByPath` 路径解析脆弱

**位置**: `src/infra/loader.ts:197-209`

```typescript
const nameIndex = typeIndex + 2  // 假设 arsenal/<type>/<name>.oxn
```

若目录嵌套深度不同 (如 `arsenal/drafts/foo.oxn` vs `arsenal/blueprints/foo/canonical.oxn`), 索引逻辑静默失败返回 `null`。

### M8. 详细度检测逻辑错误 ⚠️ **BUG**

**位置**: `src/cli/context.ts:40`

```typescript
if (arg === '-vv' || arg === '-v -v') count += 2
```

`-v -v` 实际作为两个独立参数 `['-v', '-v']` 传入, 因此 `arg === '-v -v'` 永不成立, count 只 +1 而非预期的 +2。

## m 级问题 (轻微)

| # | 位置 | 问题 |
|---|---|---|
| m1 | `src/infra/loader.ts:337-339` | draft 路径布局与 `scanArsenalStructure` 不一致 (一个用 `drafts/<name>.oxn`, 另一个用 `drafts/<name>/draft.oxn`) |
| m2 | `src/kernel/processors/dag.ts:39-45` | 入度计算已隐式校验 deps, 但额外循环未校验 `edges` 参数 |
| m3 | `src/kernel/processors/evaluate-predicate.ts:45-54` | `Number(undefined)` → NaN, 静默失败所有 gt/gte/lt/lte 谓词 |
| m4 | `src/kernel/verdicts/probe-stats-updater.ts:29-38` | `extractTarget` 与 `insight-compute.ts:32-41` 复制粘贴 |
| m5 | `src/work/dual-state-exec.ts:348` | `path.substring(0, path.lastIndexOf('/'))` 应改用 `dirname(path)` (Windows 兼容) |
| m6 | `src/cli/output.ts:117-162` | `output()` 的 `'data' in optionsOrData` 检查对含 `data` 字段的普通对象会双重包装 |
| m7 | `src/cli/output.ts:41-45` | human 模式下对象仍 JSON 序列化, 应走 `output()` 的 human 回调 |
| m8 | `src/infra/compile-cache.ts:121` | 整个文件读入内存只为算 hash, 可直接用 mtime |
| m9 | `src/infra/process.ts:12-50` | `process.exec` 无超时保护 (对比 `shell-exec.ts` 有) |
| m10 | `src/infra/scanner.ts:48` | 达 `maxDepth` 静默返回 `[]`, 调用方不知数据被截断 |
| m11 | `src/kernel/verdicts/probe-stats-updater.ts:127` | 注释 "不修改入参" 与 `splice` 行为略显矛盾 (实际浅克隆,安全) |
| m12 | `src/cli/work.ts` | `getProjectRoot()` (调 `process.cwd()`) 在多函数中重复调用, 部分缓存为局部变量部分不缓存 |

## 逻辑质量评分细分

| 因子 | 分数 |
|---|---|
| Null/undefined 安全 | 6 |
| 错误处理 | 5 |
| 竞态条件 | 4 |
| 边界条件 | 5 |
| 类型安全 | 4 |
| 资源泄漏 | 6 |
| 逻辑一致性 | 5 |
| 安全性 | 5 |

---

# 第三部分:架构守卫 (10/10) ✅

L0–L3 分层规则在生产代码中**完美遵守**:

| 规则 | 状态 | 证据 |
|---|---|---|
| L0-Kernel 不导入上层 | ✅ | 确认无 `from.*infra` / `from.*work` / `from.*cli` 在 kernel |
| L1-Infra 走 `kernel/index` barrel | ✅ | 所有 infra import 经过 `kernel/index` |
| Daemon 用 infra/filesystem 而非 raw `fs` | ✅ | 所有 daemon 文件走 `../infra/filesystem` |
| CLI 限制从 daemon 导入 | ✅ | 仅 `daemon-status.ts` + `daemon-start.ts` 从 daemon/ 导入 (IPC 必需) |
| Kernel/Infra 跨层导入 | ✅ | 无 infra 从 kernel 子层导入 |
| Daemon 直接 import `fs` (生产代码) | ✅ | 仅测试文件直接 `import fs`,可接受 |

**评估**: 这是项目最大的结构优势,值得在所有新代码中保持。

---

# 第四部分:优先修复建议

## 优先级 1 (P0) — 安全 + 跨平台

1. **修复 C1**: 14 处 `require()` 全部改 ESM (`import` from `node:*`)
2. **修复 C2**: `resolveForgeRoot` 返回正确路径 `forges/`
3. **修复 C5**: Shell 命令注入 — 改 `spawn(cmd, args[])` 参数化或加元字符黑名单
4. **修复 C4**: ReDoS 风险 — 用 `safe-regex` + 限时执行

## 优先级 2 (P1) — 架构一致性

5. **修复 P1 + M1**: 统一 verdict 策略到 L0-Kernel, 删除 `work/probe-evaluator.ts` 重复实现
6. **修复 P3 + M5**: ExecError 与 dual-state-io 通用 Error 改 `IAPError` / `OXNCrash`
7. **修复 M3**: `work.ts:1139-1142` 改用 `parseOxnFile`

## 优先级 3 (P2) — 健壮性

8. **修复 C6**: Socket 客户端加 request ID 匹配
9. **修复 C3**: `queue.shift()` 改索引指针
10. **修复 M8**: `-vv` 详细度计数逻辑
11. **修复 m3**: NaN 谓词失败应显式报错

## 优先级 4 (P3) — 重构

12. **修复 P2**: 统一 `state.ts` 与 `dual-state.ts` 状态 Schema
13. **修复 P8**: `work-migrator.ts:210-413` 拆分为 3-4 个函数
14. **修复 P5**: 减少 `as any` / `as` 断言, 用 Builder 模式

---

# 附录:检测方法

## 双 Agent 并行分析

本次检测使用 2 个 explore agent 并行执行:

1. **Pattern Agent**: 读 30+ 文件,分析设计模式/架构遵循/SOLID/耦合内聚/错误处理模式/状态管理
2. **Logic Agent**: 读 30+ 文件,分析 null 安全/错误处理/竞态/边界/类型安全/资源泄漏/逻辑一致性/安全性

## 工具命令参考 (本项目可跑的快速检测)

```bash
bun run typecheck    # 类型安全 — 包含 noUncheckedIndexedAccess + verbatimModuleSyntax
bun run check        # Biome 格式 + 风格
bun run lint         # ESLint 架构守卫 (中文错误信息 "🚨 宪法违规…")
bun test             # 414 个测试 (~50 秒)
```

## 进一步深度检测

- `oxn work create code-quality-audit --blueprint audit-patterns` 可创建 AI 工作上下文
- 用 `oxn work context --work <w> --json` 获取特定 work 的 AI 上下文做更深入分析

## 引用文档

- `docs/architecture/l0-l3-constitution.md` — 分层架构
- `docs/core/document.md` — 概念
- `src/kernel/verdicts/verdict.ts:502-534` — 规范 Strategy 注册表
- `src/cli/index.ts:42-138` — 4 层错误分类
