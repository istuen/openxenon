# T7 PoC 结果：Bun `vm.SourceTextModule` 沙箱

> 日期: 2026-06-15
> 父文档: `.openxenon/forges/sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md` §1.2 §4
> 决策: **方案 A 继续**（不降级）

## 闸门验证矩阵

| 用例 | 加载 | runtime 拦截 | 闸门 |
|---|---|---|---|
| 合法 S3 Provider (implements InfraProvider) | ✅ | ✅ ioStat 返回期望值 | ✅ |
| 越界 `require('fs')` | ❌ link 阶段 throw `require is not defined` | n/a | ✅ |
| 越界 `process.exit(1)` | ✅ module 加载 | ✅ runtime throw `process is not defined` | ✅ |
| 越界 `globalThis.fetch('https://...')` | ✅ module 加载 | ✅ runtime throw `globalThis.fetch is not a function` | ✅ |

**结论**: 4/4 通过，**方案 A 继续**。

## 关键发现

1. **Bun `vm.SourceTextModule` 完美支持 ESM 沙箱** —— TS 转译后 JS 可作为 ES Module 加载，default export 的 class 经 `new exported()` 实例化后保留所有成员。
2. **Bun 沙箱严格隔离** —— `process` / `require` / `module` / `exports` / `__dirname` / `__filename` 即使不在 context 内也不可访问（比 Node 严格）。
3. **沙箱 context 不放 `globalThis.fetch` 即拦截 fetch** —— Bun 沙箱默认不暴露 host runtime 的 fetch。
4. **link 阶段拦截** `import` 模块名（`fs` / `fs/promises` / `child_process` / 等）— `module.link(specifier)` 抛 `sandbox_violation: module X is forbidden`。
5. **runtime 阶段拦截** 调用具体全局 API —— `provider.ioStat()` 内部触发越界时 throw `process is not defined`。

## 沙箱 API 蓝图

```ts
// bunTranspile
import { Bun } from 'bun'
const t = new Bun.Transpiler({ loader: 'ts' })
const js = t.transformSync(tsSource)

// 沙箱 context: 严格白名单
const ctx = vm.createContext({
  console: { log: () => {}, warn: () => {}, error: () => {} },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Buffer, URL, URLSearchParams, TextEncoder, TextDecoder,
}, {
  name: 'probe-sandbox',
  codeGeneration: { strings: false, wasm: false },
})

// SourceTextModule
const m = new vm.SourceTextModule(js, {
  identifier: `probe-sandbox:${label}`,
  context: ctx,
  initializeImportMeta: (meta) => { meta.url = `sandbox://${label}` },
})

// link 拦截: module specifier
await m.link(async (specifier) => {
  if (FORBIDDEN_MODULES.includes(specifier)) {
    throw new Error(`sandbox_violation: module ${specifier} is forbidden`)
  }
  return null
})

// evaluate + 取 namespace
await m.evaluate()
const provider = m.namespace.default
const instance = typeof provider === 'function' ? new provider() : provider
```

## 跑 PoC

```bash
bun bun-poc/spike-t7-sandbox/vm-source-text-module.ts
```

期望: exit 0 + "闸门总体: ✅ 通过"。

## 备选方案（PoC 通过故不启用）

- **方案 B**: `worker_threads` 隔离 — 性能差, 需 IPC 序列化
- **方案 C**: `Bun.spawn` 隔离子进程 — 性能最差, 需 stdin/stdout 通信
- **方案 D**: 推迟 PR-4 到下个 sprint

## 实施遗留

`bun-poc/spike-t7-sandbox/vm-source-text-module.ts` 保留作回归基线 (后续若 Bun 升级导致沙箱行为变化，可重跑此 PoC 验证)。
