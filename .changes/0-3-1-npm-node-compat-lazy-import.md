# 0.3.1 — npm Node.js 兼容性修复（lazy import SourceTextModule）

> Bug fix: `oxn` 在 Node.js 默认运行时（无 `--experimental-vm-modules` flag）启动崩溃

## 问题

v0.3.0 发布到 npm 后，用户反馈 `oxn --version` 在 Node 23.11 默认运行时直接 SyntaxError：

```
SyntaxError: The requested module 'node:vm' does not provide an export named 'SourceTextModule'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:182:21)
```

### 根因

`src/cli/probe-sandbox.ts:25` 顶层 import 了 `SourceTextModule` from `'node:vm'`：

```ts
// v0.3.0 — 顶层 import（崩）
import { SourceTextModule, createContext } from 'node:vm'
```

- `SourceTextModule` 在 Node.js 下需要 `--experimental-vm-modules` flag 才可用
- Bun 原生支持，无需 flag
- 但 **模块加载时**就 import，整个 CLI 进程（即使只用 `oxn --version`）都启动失败
- 影响范围：所有 Node.js 用户，包括 `npm install -g @istuen/openxenon` 的安装路径

T7 PoC 在 Bun 下通过，但发布时未考虑 Node 用户路径（AGENTS.md 风险已记录）。

## 修复（v0.3.1）

`src/cli/probe-sandbox.ts` 改为 **lazy import**：

```ts
// v0.3.1 — 函数内 dynamic import（仅 sandboxValidate 调用时加载）
async function loadVmModule(): Promise<VmModule> {
  if (cachedVm) return cachedVm
  if (vmLoadError) throw vmLoadError
  const mod = await import('node:vm')
  if (typeof mod.SourceTextModule !== 'function') {
    vmLoadError = new IAPError('INFRA', 'SANDBOX_REJECTED', IAPAction.YIELD_TO_HUMAN,
      'node:vm.SourceTextModule not available. Sandbox requires Bun runtime (or Node with --experimental-vm-modules flag).')
    throw vmLoadError
  }
  // ...cache + return
}
```

### 行为对照表

| 场景 | v0.3.0 | v0.3.1 |
|---|---|---|
| `oxn --version` (Node 默认) | ❌ SyntaxError 整个 CLI 崩 | ✅ 0.3.1 立即返回 |
| `oxn work list` (Node 默认) | ❌ SyntaxError | ✅ 正常 |
| `oxn proof show` (Node 默认) | ❌ SyntaxError | ✅ 正常 |
| `oxn probe add` (Node + flag) | ✅ 工作 | ✅ 工作 |
| `oxn probe add` (Node 无 flag) | ❌ SyntaxError | ✅ 抛 IAPError SANDBOX_REJECTED（明确建议） |
| `oxn probe add` (Bun) | ✅ 工作 | ✅ 工作 |
| 任何 (Bun 跑 oxn 源码) | ✅ 工作 | ✅ 工作 |

## 变更

### src/cli/probe-sandbox.ts
- **删除** 顶层 `import { SourceTextModule, createContext } from 'node:vm'`
- **新增** `interface VmSourceTextModule` / `interface VmModule` 内部类型
- **新增** `let cachedVm / vmLoadError` 缓存
- **新增** `async function loadVmModule()` 懒加载 + cache + 明确错误
- **改写** `sandboxValidate` step 3-4：调用 `loadVmModule()` 取代直接 import
- **行为变更**：`link()` callback 返回 `null` 而非 `null as unknown as SourceTextModule`（typescript 简化）

### package.json
- `version`: 0.3.0 → **0.3.1**

## 验证

- `bun run typecheck`: 0 error
- `bun test`: 1707 pass / 0 fail（probe-sandbox 6 个 + probe-add-e2e 5 个 全绿）
- `node dist/cli.js --version`: ✅ 0.3.1（v0.3.0 此处 SyntaxError）
- `bun dist/cli.js --version`: ✅ 0.3.1

## 用户动作

- 已装 v0.3.0 Node 用户：`npm install -g @istuen/openxenon@latest` 或 `pnpm install -g @istuen/openxenon@latest`
- 已装 v0.3.0 Bun 用户：无需动作（v0.3.0 在 Bun 下 OK）
- v0.3.0 已在 npm deprecate，dist-tag latest 自动指向 v0.3.1
