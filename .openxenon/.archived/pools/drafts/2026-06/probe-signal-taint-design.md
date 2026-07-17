# Probe 信号污染（Signal Taint）v2：CLI 准入 Proof + 项目级作用域 + Work 级精准阻断

> **日期**：2026-06-14 | **状态**：Design Draft v2.0 — **取代** 本文件历史 v0.1 / v1 全部内容（v0.1 标记为 deprecated，v1 标记为 superseded；本文档为唯一权威）
>
> **v1 → v2 关键变更**（基于内部 CLI 引入流程讨论整理；历史对话稿 `probe-cli-1.md` 已被本设计稿吸收，**该文件名不再存在**）：
>
> | 维度 | v1（已弃） | v2（本设计） |
> |---|---|---|
> | 扩展方式 | 启动时通过 `oxn.config.ts` 静态注册 NPM Provider | **`oxn probe add <url-or-file>`** CLI 一行命令，单文件 TS 即插件 |
> | 准入机制 | 无（信任 NPM 包） | **CLI 沙箱 + 内置 Probe Proof** 自举验证（"用 Proof 证明 Proof"） |
> | 网络触点 | Daemon 启动期可触网（拉 NPM 依赖） | **仅 CLI 触网**；Daemon 冷启动期零网络依赖 |
> | 缓存作用域 | `node_modules`（项目级但绑定 package.json） | **`.openxenon/.cache/third-party-probes/`**（项目级且 gitignore 隔离） |
> | 注册表 | `oxn.config.ts` 显式 import | **`.openxenon/probes/registry.json`**（声明式 + 可审计） |
> | 故障模型 | 启动期 Hash 不匹配 → 进程拒启 | **Hash 不匹配 → 标 `CORRUPTED` + 不注册**；Daemon 不崩 |
> | 阻断粒度 | 系统级（任何坏 Provider → 全部罢工） | **Work 级**（坏 Probe 仅阻断使用它的 Work，其他 Work 不受影响） |
> | 第三方分发 | 强制发 NPM 包 | **Phase 1 Gist / Phase 2 社区仓库 / Phase 3 私有源** 三阶段渐进 |

---

## 0. 元信息

- **作者**：opencode（基于 Sherlock WAF 指纹推导 → v0.1 评审否决 confidence/远程规则 → v1 引入 NPM Provider → v2 评审改用 CLI 准入 + 项目作用域 + Work 级隔离）
- **目标读者**：架构师 + OXN 维护者
- **关联 IAP 轴**：Proof（Verdict 三态语义 + 扩展性 + 故障隔离）
- **关联设计稿**：本设计稿（CLI 引入流程的源对话已并入本文）

### 0.1 v0.2 Sprint 拆分索引

> 本设计稿 §10 列出的 7 个 PR 已按 sprint 时机拆分到子目录：
>
> | Sprint | 周次 | 子文档 | 承载 PR |
> |---|---|---|---|
> | Sprint 3a | W3 早 | [`sprints/sprint-3a/2026-06-15-probe-taint-data-contract-pr1.md`](./sprints/sprint-3a/2026-06-15-probe-taint-data-contract-pr1.md) | PR-1 数据契约 v2 骨架 |
> | Sprint 3b | W3 中 | [`sprints/sprint-3b/2026-06-15-probe-taint-frozen-verdict-pr2.md`](./sprints/sprint-3b/2026-06-15-probe-taint-frozen-verdict-pr2.md) | PR-2 frozen.json schema + Verdict 三态展示 |
> | Sprint 3c | W3 末 | [`sprints/sprint-3c/2026-06-15-probe-taint-registry-providers-pr3.md`](./sprints/sprint-3c/2026-06-15-probe-taint-registry-providers-pr3.md) | PR-3 ProviderRegistry + 4 内置 Provider |
> | Sprint 3d | W4 早-中 | [`sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md`](./sprints/sprint-3d/2026-06-15-probe-taint-sandbox-cli-pr4.md) | PR-4 `oxn probe add` + 沙箱验证引擎（**v2 核心**） |
> | Sprint 5a | W5 早 | [`sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md`](./sprints/sprint-5a/2026-06-15-probe-taint-daemon-workcheck-pr5.md) | PR-5 Daemon 冷加载 + Work 前置校验 |
> | Sprint 5b | W5 中 | [`sprints/sprint-5b/2026-06-15-probe-taint-oxl-grammar-pr6.md`](./sprints/sprint-5b/2026-06-15-probe-taint-oxl-grammar-pr6.md) | PR-6 OXL 1.3 grammar + builtin probe 模板迁移 |
> | Sprint 7 | W8 spike | [`sprints/sprint-7/2026-06-15-probe-taint-pr7-spike.md`](./sprints/sprint-7/2026-06-15-probe-taint-pr7-spike.md) | PR-7 14 probe 收敛到 3 IO 原语（**v0.3 推迟 spike**） |
>
> **拆分理由**：v2 文档 1523 行 / 7 PR 体量过大，按 sprint 时机与 reviewer 关注人群拆分。**PR-1 / PR-2 拆分细**（独立 sprint），是因为数据契约稳定是后续所有 PR 的基础；**PR-4 单独 sprint**（v2 核心 PR，中-高风险），需先做 Bun `vm.SourceTextModule` PoC。
- **影响路径**：
  - 改造 L0 层：`src/kernel/contracts/io-primitive.ts`（新）—— 3 个 IO 原语 + `InterferenceFlag` 枚举
  - 改造 L0 层：`src/kernel/contracts/probe-port.ts` —— `ProbeObservation` 加 `interference?: { flags: InterferenceFlag[] }`；`ProbeVerdict` 引入第三态 `verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'`
  - 改造 L0 层：`src/kernel/verdicts/verdict.ts` —— `judge()` 主流程加 `applyTrustBaseline()` 硬编码闸门
  - 改造 L0 层：`src/kernel/verdicts/trust-baseline.ts`（新）—— 12 个 `InterferenceFlag → RED/YELLOW` 硬编码映射
  - 改造 L1 层：`src/infra/registry/provider-registry.ts`（新）—— `InfraProvider` 接口 + `ProviderRegistry` 类（**支持** `corrupted` 状态）
  - 改造 L1 层：`src/infra/providers/`（新）—— `file-provider.ts` / `http-provider.ts` / `shell-provider.ts` / `git-provider.ts`（4 个内置 + 第三方 Provider 占位）
  - 改造 L1 层：`src/infra/probes/*.ts`（14 个）—— 全部重构为对 IO Primitive + Provider 的薄封装（v1.1+ 收敛，v2.0 PoC 保留）
  - 改造 L1 层：`src/infra/frozen/immutable.ts` —— frozen.json 节点携带 `interference_flags` 字段（**取消** v0.1 的 `confidence` 字段）
  - 改造 L2 层：`src/oxl/langium/oxn.langium` —— Probe 表达式支持 `scheme: <uri-prefix>` 显式寻址
  - 改造 L2 层：`src/builtin/probes/*.oxn` —— 14 个 builtin probe 模板补 `scheme:` 字段
  - **新增 L3 层**：`src/cli/probe-add.ts`（新）—— `oxn probe add` 主命令：拉取 → 沙箱验证 → 落盘 → 注册
  - **新增 L3 层**：`src/cli/probe-fix.ts`（新）—— `oxn probe fix` 主命令：尝试重新下载/修复被篡改的 Probe
  - **新增 L3 层**：`src/cli/probe-list.ts`（新）—— `oxn probe list` 主命令：列出项目下所有 Probe 及其状态（OK / CORRUPTED）
  - **新增 L3 层**：`src/cli/probe-sandbox.ts`（新）—— 沙箱验证引擎（封装 vm.Module + 内置 Probe Proof）
  - **新增 L3 层**：`src/cli/__tests__/probe-add-e2e.test.ts`（新）—— 黑盒 E2E：拉 Gist URL → 验证 → 落盘 → 注册 → 写 frozen.json
  - 改造 L3 层：`src/daemon/index.ts` —— 启动时**只读** `.openxenon/probes/registry.json` + 校验 Hash，**不触网**
  - 改造 L3 层：`src/work/state.ts` —— Work 解析前置检查依赖 Probe 状态；CORRUPTED/缺失 → 阻断该 Work
  - 改造 L3 层：`src/core/errors/iap-error.ts` —— 新增 `IAP_PROOF_PROBE_CORRUPTED` / `IAP_PROOF_PROBE_MISSING` 错误码族
  - 文档：`docs/proof.md` 重写 "Verdict 三态" 章节；`docs/cli.md` 增 `oxn probe` 子命令族；`docs/extending.md` 增 "Write a Custom Provider" 章节
- **依赖**：
  - 前置：L0–L3 宪法（Kernel 零 IO，Infra 收口所有物理 IO）—— **本设计强化宪法**，不破坏
  - 前置：v0.0 已实现的 `src/infra/frozen/immutable.ts`（chmod 0o444 + content_hash）—— 本设计复用
  - 前置：Bun `vm` 模块（用于沙箱执行第三方 TS）
  - 关联：v3 intent-pool（v2.1+ 议题：audit 池可记录 Probe 篡改事件）
- **范围之外（Non-Goals）**：
  - N1：**永远不**实现远程规则中心（v0.1 ADR-4 保持一致）
  - N2：**永远不**引入 `confidence: 0-1` 浮点字段
  - N3：**永远不**支持运行时动态注入 Provider
  - N4：**不**重构 Proof Verdict 主流程（仅扩展 Verdict 第三态）
  - N5：**不**改 `frozen.json` 的不可变机制
  - N6：**不**支持 Probe 热更新（运行中替换 Provider）—— 必须重启 Daemon 或下次 Work 解析

---

## What

> **一句话总结**：在 v1 "Kernel 降维 + Infra 插件 + 硬编码 TrustBaseline" 三层骨架的基础上，把"扩展 Probe"的成本从"NPM 包 + `oxn.config.ts` 声明"降到"`oxn probe add <url-or-file>` 一行命令"——CLI 拉取第三方单文件 TS Provider 到项目级缓存 `.openxenon/.cache/third-party-probes/`，用 OpenXenon 自己的 Probe Proof 在沙箱里验证其实现 `InfraProvider` 接口，通过后把 SHA-256 指纹写入 `.openxenon/probes/registry.json`；Daemon 启动期**只读**这个注册表 + 校验缓存 Hash，**永不触网**；若 Hash 不匹配则标记 `CORRUPTED` **而非**崩溃，仅在使用该 Probe 的 Work 边界处精准阻断——污染不扩散、谁出错谁担责、其他 Work 正常运行。

---

## 决策记录（ADR）

### ADR-1：v0.1 方案的"运行时动态性"被否决（继承自 v1，**不重述论证**）

**决策**：**拒绝** v0.1 的两个核心机制：

1. **拒绝** `confidence: 0-1` 浮点字段。
2. **拒绝** 远程规则中心（包括 v0.2 ADR-4 承诺的"v0.2 远程规则"）。

**理由**：见 v1 ADR-1 详细论证。核心三点：(1) 防污染机制自身存在被污染风险；(2) 破坏 Proof 绝对确定性；(3) Kernel 收不到确定的输入。

### ADR-2：Kernel Probe 行为从"业务语义"降维到"3 个 IO 原语"（继承自 v1，**契约口径不变**）

**决策**：Kernel 内部定义 **3 个最基础的 IO 原语**：

```ts
// src/kernel/contracts/io-primitive.ts（spec — 继承自 v1 ADR-2）
export type IOPrimitive = 'io.stat' | 'io.read' | 'io.exec'

export interface IOStatRequest   { path: string }
export interface IOReadRequest   { path: string; encoding?: 'utf-8' | 'base64'; maxBytes?: number }
export interface IOExecRequest   { command: string; args?: string[]; timeoutMs?: number; env?: Record<string, string> }

export interface IOStatResult   { exists: boolean; isFile: boolean; isDir: boolean; mtimeMs: number | null; size: number | null; symlink: boolean }
export interface IOReadResult   { bytes: number; text: string; truncated: boolean }
export interface IOExecResult   { exitCode: number | null; stdout: string; stderr: string; durationMs: number }

export interface IOInterference { flags: InterferenceFlag[] }

export type InterferenceFlag =
  | 'waf_detected' | 'cdn_cache' | 'cache_path' | 'just_modified'
  | 'symlink' | 'detached_head' | 'shallow_clone' | 'sandbox_violation'
  | 'network_timeout' | 'response_truncated' | 'permission_denied' | 'unknown'
```

**理由**：3 个原语足够覆盖所有 builtin probe 的语义；n 个业务 = n 处 OXL 组合表达，**不需修改 Kernel**。

**v2 唯一增补**：第三方 Provider **必须**实现 `InfraProvider` 接口（见 ADR-5），其方法签名严格遵循这 3 个原语的 Request/Result 类型。**沙箱验证阶段**就用这 3 个原语去"测"它能否正常返回。

### ADR-3：硬编码信任基线（`TRUST_BASELINE`），拒绝"阈值调参"（继承自 v1，**实现口径不变**）

**决策**：在 `src/kernel/verdicts/trust-baseline.ts` 维护一张**硬编码的映射表**：

```ts
// src/kernel/verdicts/trust-baseline.ts（spec — 继承自 v1 ADR-3）
export const TRUST_BASELINE: Readonly<Record<InterferenceFlag, 'RED' | 'YELLOW'>> = {
  waf_detected:         'RED',     // WAF 拦截的响应不算业务事实
  cdn_cache:            'YELLOW',  // CDN 缓存可作为"缓存内的事实"，仅记录不阻断
  cache_path:           'YELLOW',  // .cache / node_modules 是"工程文件"，业务上合法
  just_modified:        'RED',     // mtimeMs 距 now < 1000ms 必是构建残留
  symlink:              'YELLOW',  // 符号链接在 OXN 部署中合法
  detached_head:        'RED',     // git HEAD detached = 工程状态未受版本控制
  shallow_clone:        'RED',     // git 历史不完整
  sandbox_violation:    'RED',     // shell 命令被沙箱拦截 = 实际没执行
  network_timeout:      'RED',     // 超时 = 没拿到响应
  response_truncated:   'RED',     // 截断 = 响应不完整
  permission_denied:    'RED',     // 权限拦截 = 不可读
  unknown:              'RED',     // 未识别的 flag 一律 RED（保守策略）
}

/** 命中任一 RED flag → 短路返回 INCONCLUSIVE；YELLOW flag 透传；无 flag 走正常推演 */
export function applyTrustBaseline(flags: readonly InterferenceFlag[], normalJudge: () => ProbeVerdict): ProbeVerdict { /* ... */ }
```

**理由**：信任是系统决策不是用户决策；硬编码语义可审计（`git blame` 一行即知）；行为可复现（版本号锁死 → 行为锁死）。

### ADR-4：Verdict 引入第三态 `INCONCLUSIVE`（继承自 v1，**语义不变**）

**决策**：`ProbeVerdict.verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'`，与 IAPError `YIELD_TO_HUMAN` 对齐。

**v2 关键应用**：第三方 Probe 触发 `sandbox_violation`（沙箱拦截越界副作用）→ 标 `INCONCLUSIVE` 并 failureMessage 含 `'sandbox_violation — YIELD_TO_HUMAN'`。

### ADR-5：InfraProvider 接口 + URI Scheme 路由，**取消 NPM Provider 机制，改 CLI 单文件**（v2 核心倒置）

**决策**：在 `src/infra/registry/provider-registry.ts` 定义 Provider 接口 + Registry 类。**v1 的 `oxn.config.ts` + NPM 包机制被废除**——v2 改用 CLI 单文件机制：

```ts
// src/infra/registry/provider-registry.ts（v2 spec）
import type { IOPrimitive, IOStatRequest, IOReadRequest, IOExecRequest,
              IOStatResult, IOReadResult, IOExecResult, IOInterference,
              InterferenceFlag } from '../../kernel/contracts/io-primitive'

/** Provider 健康状态 */
export type ProviderStatus = 'OK' | 'CORRUPTED' | 'UNREGISTERED'

export interface ProviderEntry {
  name: string                          // 's3' / 'ssh' / 'redis' ...
  status: ProviderStatus
  schemes: readonly string[]
  primitives: readonly IOPrimitive[]
  expectedHash: string                  // SHA-256
  cachePath: string                     // .openxenon/.cache/third-party-probes/<name>.ts
  source: string                        // 原始 URL 或本地路径（仅审计用）
  registeredAt: number
  provider?: InfraProvider              // 启动校验通过后实例化；CORRUPTED 时为 undefined
  corruptionReason?: string             // CORRUPTED 状态下记录原因
}

/**
 * Provider 接口：第三方单文件 TS 必须导出 default 实现此接口的对象
 */
export interface InfraProvider {
  readonly name: string
  readonly schemes: readonly string[]
  readonly primitives: readonly IOPrimitive[]
  stat(req: IOStatRequest, ctx: ProviderContext): Promise<IOStatResult & IOInterference>
  read(req: IOReadRequest, ctx: ProviderContext): Promise<IOReadResult & IOInterference>
  exec(req: IOExecRequest, ctx: ProviderContext): Promise<IOExecResult & IOInterference>
}

export interface ProviderContext {
  projectRoot: string
  env: Readonly<Record<string, string | undefined>>
  now: () => number
}

/**
 * 启动期冷加载：
 *   1. 读 .openxenon/probes/registry.json
 *   2. 对每个 entry 校验 cachePath 文件 Hash
 *      - 匹配：实例化 Provider，status = 'OK'，填入内存 Registry
 *      - 不匹配：status = 'CORRUPTED'，provider = undefined，**不抛错**
 *   3. 未在 registry.json 中出现的 scheme → status = 'UNREGISTERED'（仅在使用时报错）
 *
 * 关键不变量：CORRUPTED 状态不阻断其他 Probe 的运行，仅在使用该 Probe 的 Work 边界阻断。
 */
export class ProviderRegistry {
  private readonly entries: Map<string, ProviderEntry> = new Map()

  /** 启动期调用一次。CORRUPTED 标状态不抛错。 */
  bootstrapFromDisk(registryJsonPath: string, cacheDir: string): { ok: number; corrupted: number; missing: number } { /* ... */ }

  /** 运行时路由：未注册或 CORRUPTED 都返回 entry，调用方决定如何处理 */
  resolve(scheme: string): ProviderEntry | null { /* ... */ }

  /** Work 前置检查：依赖的 scheme 列表中若有 CORRUPTED/UNREGISTERED → 返回阻断信息 */
  checkWorkDependencies(schemes: readonly string[]): { ok: true } | { ok: false; blocked: Array<{ scheme: string; reason: string }> } { /* ... */ }
}
```

**v2 内置 4 个 Provider（与 v1 相同，但加载路径变化）**：

| Provider | schemes | 干扰检测 | v2 加载方式 |
|---|---|---|---|
| `FileProvider` | `file://` `''` | symlink / just_modified / cache_path / permission_denied | 代码内置（`src/infra/providers/file-provider.ts`） |
| `HttpProvider` | `http://` `https://` | waf_detected / cdn_cache / response_truncated / network_timeout | 代码内置 |
| `ShellProvider` | `shell://` | sandbox_violation / network_timeout | 代码内置 |
| `GitProvider` | `git://` | detached_head / shallow_clone | 代码内置 |
| 第三方 Provider | 用户自声明 | 由第三方实现 `InfraProvider` 决定 | **通过 `oxn probe add` 引入** |

**理由（v2 倒置 v1 的论证）**：

| 反对 v1 | v2 解法 |
|---|---|
| **NPM 包机制过重**：发包需 `npm init` / `package.json` / `tsconfig` / 锁文件 | **单文件 TS 即插件**：`oxn probe add <gist-url>` 一行完成 |
| **NPM 全局污染**：`npm install -g` 改全局 | **项目级作用域**：`.openxenon/.cache/third-party-probes/`，不同项目物理隔离 |
| **NPM 版本冲突**：`s3-provider@1` vs `s3-provider@2` 共存难 | **项目级注册表**：项目 A 用 v1，项目 B 用 v2，互不干扰 |
| **Daemon 启动期可触网**（NPM 解析依赖） | **Daemon 零网络**：仅读本地缓存 + 校验 Hash |
| **Hash 不匹配 → 进程拒启**（系统级连坐） | **Hash 不匹配 → 标 CORRUPTED**：Daemon 不崩，其他 Probe 照常 |
| **依赖白名单写在 TS 头部**（v1 ADR-5 第三条） | **沙箱验证一次性解决**：在 CLI 准入阶段就拦住越界副作用，运行时无需白名单 |

### ADR-6：`oxn probe add` CLI：拉取 → 沙箱验证 → 落盘 → 注册（v2 新增，**v1 没有**）

**决策**：新增 3 个 L3 CLI 主命令：

```bash
# 1. 引入第三方 Provider
oxn probe add <url-or-file> --name s3

# 2. 列出项目下所有 Probe
oxn probe list
#   s3          OK         v0.0.1    2026-06-14  https://gist.github.com/.../s3-provider.ts
#   redis       CORRUPTED  v0.0.1    2026-06-14  https://.../redis-provider.ts  (hash mismatch)
#   http        OK         builtin   2026-01-01  src/infra/providers/http-provider.ts

# 3. 修复被篡改的 Probe
oxn probe fix redis
#   → 重新拉取 https://.../redis-provider.ts → 重跑沙箱验证 → 更新 Hash → 状态恢复 OK
```

**CLI 主流程**（`src/cli/probe-add.ts`）：

```ts
// spec — 关键阶段
export async function probeAdd(source: string, name: string, opts: ProbeAddOptions): Promise<ProbeAddResult> {
  // 阶段 1: 拉取（仅本地或 HTTP GET，**仅此一处触网**）
  const raw = await fetchSource(source)  // 本地读 / HTTP GET
  const cachePath = join(opts.projectRoot, '.openxenon/.cache/third-party-probes', `${name}.ts`)

  // 阶段 2: 沙箱验证（vm.Module + 内置 Probe Proof）
  const validation = await sandboxValidate(raw, { name, schemeHints: opts.schemeHints })
  if (!validation.ok) {
    return { ok: false, stage: 'sandbox', errors: validation.errors }
  }

  // 阶段 3: 落盘（写缓存）
  await writeFile(cachePath, raw, { mode: 0o644 })

  // 阶段 4: 计算 Hash + 写入注册表
  const hash = sha256(raw)
  await registryUpsert(opts.projectRoot, {
    name, schemes: validation.schemes, primitives: validation.primitives,
    expectedHash: hash, cachePath, source, registeredAt: Date.now(),
  })

  return { ok: true, name, hash, schemes: validation.schemes, primitives: validation.primitives }
}
```

**沙箱验证（`src/cli/probe-sandbox.ts`）—— "用 Proof 证明 Proof" 的自举实现**：

```ts
// spec
import { vm } from 'vm'

export interface SandboxValidation {
  ok: boolean
  errors: string[]
  schemes: string[]
  primitives: IOPrimitive[]
}

/**
 * 在受限 vm.Module 中加载 TS（先 transpile 成 JS by Bun build API）：
 *   - 阻断 require('fs') / require('child_process') / require('http') 等高风险模块
 *   - 提供一个 minimal globalThis（仅 console / setTimeout / URL / AbortSignal）
 *   - 让用户模块 export default 一个对象
 *   - 用真实 IOPrimitive Request 输入调用其 stat/read/exec 方法
 *   - 验证返回结构严格符合 Result & IOInterference
 */
export async function sandboxValidate(tsSource: string, hints: { name: string; schemeHints?: string[] }): Promise<SandboxValidation> {
  // 1. Bun 内置 transpile TS → JS
  const jsSource = await Bun.build({ entrypoints: ['<inline>'], stdin: tsSource })

  // 2. 在 vm.Module 中执行
  const module = new vm.SyntheticModule(/* ... */, { context: sandboxContext })
  await module.link(sandboxLinker)
  await module.evaluate()

  const Provider = module.namespace.default
  if (typeof Provider !== 'object' || Provider === null) return { ok: false, errors: ['no default export'], ... }

  // 3. Schema Proof：检查 name / schemes / primitives 字段
  if (typeof Provider.name !== 'string') return { ok: false, errors: ['missing name'], ... }
  if (!Array.isArray(Provider.schemes) || Provider.schemes.length === 0) return { ok: false, errors: ['empty schemes'], ... }
  if (!Array.isArray(Provider.primitives) || Provider.primitives.length === 0) return { ok: false, errors: ['empty primitives'], ... }

  // 4. Kernel Execution Proof：构造模拟 Context + 标准 IOPrimitive Request
  const mockCtx: ProviderContext = {
    projectRoot: '/tmp/sandbox-test',
    env: { PATH: '/usr/bin' },
    now: () => 1700000000000,
  }

  for (const primitive of Provider.primitives as IOPrimitive[]) {
    try {
      const result = await Provider[primitive](dummyRequestFor(primitive), mockCtx)
      // 5. 验证返回结构
      if (!result || typeof result !== 'object') throw new Error('result not object')
      if (!Array.isArray(result.flags)) throw new Error('missing flags array')
      if (!result.flags.every(f => typeof f === 'string')) throw new Error('flags not string[]')
    } catch (err) {
      return { ok: false, errors: [`${primitive} failed: ${err.message}`], ... }
    }
  }

  return { ok: true, errors: [], schemes: Provider.schemes, primitives: Provider.primitives }
}
```

**沙箱不允许的副作用**（在 `sandboxContext` 中显式拒绝）：
- `require('fs')` / `require('child_process')` / `require('http')` / `require('https')` / `require('net')` / `require('dgram')` / `require('cluster')` / `require('worker_threads')`
- `process.exit` / `process.kill` / `process.binding`
- `globalThis.fetch`（除非 Provider 显式声明需要）
- 写文件到 `.openxenon/` 之外（v2 简化：沙箱内无写权限即可）

**理由**：
1. **CLI 是唯一触网点**——Daemon 启动期不联网，运行时也无需联网，符合"Proof 可复现"宪法。
2. **"用 Probe 证明 Probe"是 OpenXenon 的核心哲学**——内核零 IO / 沙箱验证外部 Provider 行为 / 只放行符合 `InfraProvider` 接口者，与 v0.0 的 Probe Proof 同构。
3. **沙箱拦截越界副作用（如探测 `fs-exists` 时尝试写文件）**——v2.0 一次性解决供应链攻击的"间接越权"问题，v1 的"白名单 + 启动期检查"过于静态。

### ADR-7：Daemon 冷加载 + Hash 校验 + `CORRUPTED` 状态（v2 倒置 v1 的"启动期拒启"）

**决策**：Daemon 启动时：

```ts
// src/daemon/index.ts（v2 spec）
export async function daemonStartup(projectRoot: string): Promise<DaemonStartupResult> {
  const reg = getProviderRegistry()
  const bootstrap = reg.bootstrapFromDisk(
    join(projectRoot, '.openxenon/probes/registry.json'),
    join(projectRoot, '.openxenon/.cache/third-party-probes/'),
  )
  // bootstrap = { ok: 3, corrupted: 1, missing: 0 }
  // 关键：CORRUPTED 不抛错、不阻断 Daemon
  return { ok: true, bootstrap, message: `${bootstrap.ok} providers OK, ${bootstrap.corrupted} corrupted` }
}
```

**Hash 校验失败的 4 种可能 + 处理**：
| 场景 | 检测 | 处理 |
|---|---|---|
| 用户手动修改缓存 TS 文件 | Hash 不匹配 | 标 `CORRUPTED`，不阻断 |
| 缓存目录被外部工具误删 | 文件不存在 | 标 `MISSING`（registry.json 仍有记录但 cachePath 无文件） |
| 磁盘损坏 | 读错误 | 标 `CORRUPTED`，记 reason |
| 注册表与缓存版本不匹配 | registry.json 写了 v2，缓存是 v1 文件 | 标 `CORRUPTED`，建议跑 `oxn probe fix` |

**理由（v1 → v2 倒置论证）**：

| v1 行为 | v2 行为 | 理由 |
|---|---|---|
| Hash 不匹配 → 进程拒启 | Hash 不匹配 → 标 CORRUPTED | **污染不扩散**：一个第三方 Probe 被篡改不应让整个 OpenXenon 罢工 |
| 启动期 panic | 启动期宽容 + Work 期精准阻断 | **高可用性**：未被该 Probe 影响的 Work 应能正常跑 |
| 失败信息在系统启动日志里 | 失败信息在 `oxn probe list` 输出中 | **可观测性**：开发者可一目了然看到哪些 Probe 状态异常 |

### ADR-8：Work 前置校验 + 精准阻断（v2 新增，**v1 没有**）

**决策**：在 Work 解析/启动前调用 `ProviderRegistry.checkWorkDependencies(schemes)`：

```ts
// src/work/state.ts（v2 spec）
export async function workPrecheck(workId: string, work: WorkSpec): Promise<WorkPrecheckResult> {
  const requiredSchemes = work.probes.flatMap(p => extractSchemesFromProbe(p))
  // 例如: ['file', 'http', 's3']

  const check = getProviderRegistry().checkWorkDependencies(requiredSchemes)
  if (!check.ok) {
    // 精准阻断：仅该 Work 不启动
    return {
      ok: false,
      blocked: check.blocked,
      message: `Work "${workId}" blocked: ${check.blocked.map(b => `${b.scheme}=${b.reason}`).join('; ')}`,
    }
  }
  return { ok: true }
}
```

**触发场景**：
1. `Work "deploy-to-s3"` 引用 `s3://...` → `s3` 在 registry.json 中但缓存 Hash 不匹配（CORRUPTED）
2. `Work "redis-cache-check"` 引用 `redis://...` → `redis` 从未在 registry.json 中（UNREGISTERED）

**阻断粒度**：
- 仅该 Work 进入 `FAIL` 状态，failureMessage 含 `IAP_PROOF_PROBE_CORRUPTED` 或 `IAP_PROOF_PROBE_MISSING` 错误码
- 其他不依赖坏 Probe 的 Work 正常运行
- 开发者收到 `oxn probe list` 输出后，可执行 `oxn probe fix <name>` 修复

**IAP 错误码**（`src/core/errors/iap-error.ts` 增）：

```ts
export type IAPErrorCode =
  | 'INFRA_FAIL' | 'CRASH' | 'CHECKLIST_MISSING'
  | 'UNDEFINED_TERM' | 'NAME_FILE_MISMATCH' | 'INCONCLUSIVE'
  | 'PROBE_CORRUPTED'   // ← v2 新增：依赖的 Provider Hash 校验失败
  | 'PROBE_MISSING'     // ← v2 新增：依赖的 scheme 未在 registry.json 注册
```

### ADR-9：OXL 1.3 显式 `scheme:` 寻址（继承自 v1，**用户面不变**）

**决策**：OXL 1.3 Probe 表达式显式声明 `scheme:` 字段，与 v1 相同。**用户完全无感**：只需写 `probe "io.stat" { target = "s3://..." }`——不感知底层 TS 文件在哪里、何时由 `oxn probe add` 引入。

**理由**（不变）：frozen.json 携带 `probe.scheme` 字段可审计；缺包立即在 OXL validate 阶段报错（而非运行时）。

### ADR-10：取消 v0.1 的 `confidence: 0-1` 字段；frozen.json 仅保留 `interference_flags` 与 `verdict`（继承自 v1，**实现口径不变**）

**决策**（不变）：
- `ProbeObservation.interference?: { flags: InterferenceFlag[] }`（**取代** v0.1 的 `taint: ProbeTaint`）
- `ProbeVerdict.verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'`（**取代** v0.1 的 `confidence` 主导）
- frozen.json probe 节点 schema 同步：保留 `output` / `error` / `exitCode`，**新增** `verdict`（三态）与 `interference_flags`（枚举数组），**删除** v0.1 计划中的 `confidence` 字段

---

## 2. 三层架构总览（v2）

### 2.1 完整架构图

```
                          用户工作流
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   工程师 A              工程师 B              社区维护者
   (项目 A)              (项目 B)              (s3-provider.ts)
        │                    │                    │
   oxn probe add ...──┐      │                    │
                      │      │                    │
                      ▼      ▼                    ▼
                ┌──────────────────────┐    单文件 TS
                │   CLI 阶段 (有网络)  │  ──────────────▶ Gist URL
                │                      │         │
                │ 1. 拉取 TS 文件      │         │
                │ 2. 沙箱验证          │ ◀───────┘
                │    - Schema Proof    │
                │    - Kernel Exec     │
                │      Proof           │
                │    - 越界拦截        │
                │ 3. 落盘              │
                │ 4. 写 registry.json  │
                └──────────┬───────────┘
                           │
                  .openxenon/
                      ├── probes/registry.json
                      └── .cache/third-party-probes/
                          ├── s3-provider.ts
                          └── redis-provider.ts
                           │
                           │ (冷启动期: 仅本地 IO)
                           ▼
                ┌──────────────────────┐
                │  Daemon / CLI run    │
                │  (无网络/求确定性)   │
                │                      │
                │  1. 读 registry.json │
                │  2. 校验 Hash        │
                │     ├─ OK → 实例化   │
                │     └─ 不匹配 →      │
                │        CORRUPTED     │
                │  3. 内存 Registry    │
                │     ├─ OK: 3         │
                │     └─ CORRUPTED: 1  │
                └──────────┬───────────┘
                           │
              OXL 编排层 / Work 调度
                           │
                           ▼
                ┌──────────────────────┐
                │  Work 执行期         │
                │  (精准阻断)          │
                │                      │
                │  Work "deploy-s3"    │
                │   ├─ require s3      │
                │   │  status=         │
                │   │  CORRUPTED       │
                │   └─→ BLOCKED ✅     │
                │      其他 Work 正常  │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  L1 ProviderRegistry │
                │  ├─ FileProvider     │
                │  ├─ HttpProvider     │
                │  ├─ ShellProvider    │
                │  └─ 第三方 (S3/...)  │
                │     └─ IO Primitive  │
                │        (stat/read/   │
                │         exec)        │
                └──────────┬───────────┘
                           │
                           ▼
                ┌──────────────────────┐
                │  L0 Kernel           │
                │  ├─ IO Primitive     │
                │  │  Contract         │
                │  ├─ TrustBaseline    │
                │  │  (硬编码 12 flag) │
                │  └─ judge() 纯函数   │
                │     verdict: 3 态    │
                └──────────┬───────────┘
                           │
                           ▼
                     Frozen Proof
                  (含 verdict + flags)
```

### 2.2 三类角色的职责边界

| 角色 | 触网? | 写文件? | 副作用? | 不可变约束 |
|---|---|---|---|---|
| **CLI 准入期** (`oxn probe add`) | ✅ 仅此阶段 | ✅ 写 `.openxenon/.cache/` + `registry.json` | ✅ 沙箱执行第三方 TS | 沙箱边界（阻断越界） |
| **Daemon 启动期** | ❌ | ❌（仅读） | ❌（仅 Hash 校验） | CORRUPTED 标状态不抛错 |
| **Work 执行期** | ❌ | ❌（仅 Provider 内部允许的 IO） | ✅（Provider 自己的 IO） | Work 级失败隔离 |
| **Kernel 判定期** | ❌ | ❌ | ❌（纯函数） | 宪法：零 IO |
| **frozen.json 落盘** | ❌ | ✅ 写 `frozen.json` | ❌（数据快照） | chmod 0o444 + content_hash |

### 2.3 关键不变式（v2 增订）

| 不变式 | 守护手段 |
|---|---|
| Kernel 零 IO | L0–L3 宪法 + `validate-dependencies.ts`（已存在） |
| Kernel 不接受 confidence 数字 | `tsconfig` 严格模式 + ADR-10 显式拒绝 |
| Trust baseline 不可配置 | `TRUST_BASELINE` 是 `const` + `Readonly<>` + `Object.freeze` |
| Provider 启动期零网络 | Daemon `bootstrapFromDisk()` 不含 `fetch()` 调用 |
| CORRUPTED 不阻断 Daemon | `bootstrapFromDisk()` 永不抛错，CORRUPTED 仅标状态 |
| 第三方 TS 必走沙箱验证 | `oxn probe add` 唯一注册入口；`bootstrapFromDisk` 不接受裸文件路径 |
| 沙箱阻断越界副作用 | `vm.SyntheticModule` 上下文 + `require` 黑名单 |
| frozen.json 不可篡改 | `chmod 0o444` + `content_hash`（已存在） |
| OXL 显式 scheme 必需 | Langium validator 在 OXL compile 阶段拒绝无 scheme 的 Probe |
| Work 级失败隔离 | `workPrecheck()` 抛出 `IAP_PROOF_PROBE_CORRUPTED` 仅阻断该 Work |

---

## 3. 数据契约改造

### 3.1 `src/kernel/contracts/io-primitive.ts`（新文件）

```ts
// spec — PR-1 落地（继承 v1）

export type IOPrimitive = 'io.stat' | 'io.read' | 'io.exec'

export type InterferenceFlag =
  | 'waf_detected' | 'cdn_cache' | 'cache_path' | 'just_modified'
  | 'symlink' | 'detached_head' | 'shallow_clone' | 'sandbox_violation'
  | 'network_timeout' | 'response_truncated' | 'permission_denied' | 'unknown'

export interface IOStatRequest { path: string }
export interface IOReadRequest { path: string; encoding?: 'utf-8' | 'base64'; maxBytes?: number }
export interface IOExecRequest { command: string; args?: string[]; timeoutMs?: number; env?: Record<string, string> }

export interface IOStatResult { exists: boolean; isFile: boolean; isDir: boolean; mtimeMs: number | null; size: number | null; symlink: boolean }
export interface IOReadResult { bytes: number; text: string; truncated: boolean }
export interface IOExecResult { exitCode: number | null; stdout: string; stderr: string; durationMs: number }

export interface IOInterference { flags: InterferenceFlag[] }
```

### 3.2 `src/kernel/contracts/probe-port.ts`（改造）

```ts
// v2 改造 — 继承 v1
import type { InterferenceFlag } from './io-primitive'

export interface ProbeObservation {
  probeType: string
  output?: string
  error?: string
  executedAt: number
  exitCode?: number | null
  interference?: { flags: InterferenceFlag[] }  // ← v2 新增
}

export interface ProbeVerdict {
  verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'    // ← v2 新增三态
  passed: boolean                              // 保留兼容：PASS→true, FAIL/INCONCLUSIVE→false
  message: string
  actual?: unknown
  params?: Record<string, unknown>
  duration?: number
  failureMessage?: string
  interferenceFlags?: InterferenceFlag[]       // ← v2 新增（YELLOW 透传）
}
```

### 3.3 取消 v0.1 字段清单（继承 v1，**不重述**）

| v0.1 计划字段 | v2 替代 |
|---|---|
| `ProbeObservation.taint: ProbeTaint` | `interference: { flags: InterferenceFlag[] }` |
| `ProbeVerdict.confidence: number` | 无（`verdict: 'INCONCLUSIVE'` 已表达不确定） |
| `ProbeVerdict.warnings: string[]` | 无 |
| `IAP_PROBE_TAINT_HIGH/MEDIUM/LOW` | 取消（verdict 字段三态化） |
| **v2 新增取消** | |
| v1 `oxn.config.ts` + `defineConfig({ providers: [...] })` | `oxn probe add` CLI（v2 ADR-6） |
| v1 `npm install @my-company/oxn-s3-provider` | 沙箱单文件 TS（v2 ADR-5/6） |
| v1 启动期 Hash 不匹配 panic | Daemon 标 `CORRUPTED`（v2 ADR-7） |

---

## 4. Kernel 层改造

### 4.1 `src/kernel/verdicts/trust-baseline.ts`（新文件）

```ts
// spec — 继承 v1 ADR-3，**实现口径完全一致**
import type { InterferenceFlag } from '../contracts/io-primitive'
import type { ProbeVerdict } from '../contracts/probe-port'

export const TRUST_BASELINE: Readonly<Record<InterferenceFlag, 'RED' | 'YELLOW'>> = Object.freeze({
  waf_detected:         'RED',
  cdn_cache:            'YELLOW',
  cache_path:           'YELLOW',
  just_modified:        'RED',
  symlink:              'YELLOW',
  detached_head:        'RED',
  shallow_clone:        'RED',
  sandbox_violation:    'RED',    // v2 关键：第三方 Provider 越界时触发
  network_timeout:      'RED',
  response_truncated:   'RED',
  permission_denied:    'RED',
  unknown:              'RED',
})

export function applyTrustBaseline(flags: readonly InterferenceFlag[], normalJudge: () => ProbeVerdict): ProbeVerdict {
  const redFlags = flags.filter(f => TRUST_BASELINE[f] === 'RED')
  if (redFlags.length > 0) {
    return {
      verdict: 'INCONCLUSIVE',
      passed: false,
      message: `signal tainted by ${redFlags.length} red flag(s): ${redFlags.join(', ')}`,
      failureMessage: `INCONCLUSIVE: ${redFlags.join(', ')} — YIELD_TO_HUMAN required`,
      actual: { redFlags, allFlags: [...flags] },
    }
  }
  const verdict = normalJudge()
  if (flags.length > 0) return { ...verdict, interferenceFlags: [...flags] }
  return verdict
}
```

### 4.2 `src/kernel/verdicts/verdict.ts`（改造）

```ts
// src/kernel/verdicts/verdict.ts:judge() — v2 改造 spec
export function judge(observation: ProbeObservation, params: Record<string, unknown>): ProbeVerdict {
  const flags = observation.interference?.flags ?? []
  return applyTrustBaseline(flags, () => {
    const strategy = getVerdictStrategy(observation.probeType)
    if (!strategy) {
      return { verdict: 'FAIL', passed: false, message: `no verdict strategy: ${observation.probeType}`, params, failureMessage: `unknown probe type: ${observation.probeType}` }
    }
    const v = strategy(observation, params)
    return { ...v, verdict: v.passed ? 'PASS' : 'FAIL' }
  })
}
```

**透传路径**（无 flag）行为与 v0.0 **完全一致**，AC-2 守护。

---

## 5. Infra 层改造

### 5.1 `src/infra/registry/provider-registry.ts`（新文件，**v2 核心改造点**）

```ts
// spec — v2 核心
import { IAPError } from '../../kernel/contracts/iap-error'
import type { IOPrimitive, IOStatRequest, IOReadRequest, IOExecRequest, IOStatResult, IOReadResult, IOExecResult, IOInterference } from '../../kernel/contracts/io-primitive'

export type ProviderStatus = 'OK' | 'CORRUPTED' | 'UNREGISTERED'

export interface ProviderEntry {
  name: string
  status: ProviderStatus
  schemes: readonly string[]
  primitives: readonly IOPrimitive[]
  expectedHash: string
  cachePath: string
  source: string
  registeredAt: number
  provider?: InfraProvider
  corruptionReason?: string
}

export interface InfraProvider {
  readonly name: string
  readonly schemes: readonly string[]
  readonly primitives: readonly IOPrimitive[]
  stat(req: IOStatRequest, ctx: ProviderContext): Promise<IOStatResult & IOInterference>
  read(req: IOReadRequest, ctx: ProviderContext): Promise<IOReadResult & IOInterference>
  exec(req: IOExecRequest, ctx: ProviderContext): Promise<IOExecResult & IOInterference>
}

export interface ProviderContext {
  projectRoot: string
  env: Readonly<Record<string, string | undefined>>
  now: () => number
}

export interface RegistryJson {
  version: 2
  entries: Array<{
    name: string
    schemes: string[]
    primitives: IOPrimitive[]
    expectedHash: string
    cachePath: string
    source: string
    registeredAt: number
  }>
}

/**
 * 启动期冷加载：永不抛错
 *   - Hash 匹配 → 实例化 Provider，status = 'OK'
 *   - Hash 不匹配 → 不实例化，status = 'CORRUPTED'，记 reason
 *   - 文件不存在 → status = 'CORRUPTED'，reason = 'cache file missing'
 *   - 第三方 Provider 实例化抛错 → status = 'CORRUPTED'，reason = err.message
 */
export class ProviderRegistry {
  private readonly entries: Map<string, ProviderEntry> = new Map()
  // 内置 Provider 始终 OK
  registerBuiltin(provider: InfraProvider): void { /* ... */ }

  bootstrapFromDisk(registryJsonPath: string, cacheDir: string): { ok: number; corrupted: number } {
    // 读 registry.json → 遍历 → 校验 Hash → 实例化
    // 关键：所有失败路径都标 CORRUPTED 而非 throw
  }

  resolve(scheme: string): ProviderEntry | null { /* O(1) 路由 */ }
  list(): ProviderEntry[] { /* 给 oxn probe list 用 */ }

  checkWorkDependencies(schemes: readonly string[]): { ok: true } | { ok: false; blocked: Array<{ scheme: string; reason: string }> } {
    const blocked: Array<{ scheme: string; reason: string }> = []
    for (const scheme of schemes) {
      const entry = this.entries.get(scheme)
      if (!entry) blocked.push({ scheme, reason: 'UNREGISTERED — run oxn probe add' })
      else if (entry.status === 'CORRUPTED') blocked.push({ scheme, reason: `CORRUPTED — ${entry.corruptionReason ?? 'hash mismatch'} — run oxn probe fix` })
    }
    return blocked.length === 0 ? { ok: true } : { ok: false, blocked }
  }
}

export function parseUri(uri: string): { scheme: string; host?: string; path: string; raw: string } { /* ... */ }
export function getProviderRegistry(): ProviderRegistry { /* 单例 */ }
```

### 5.2 `src/infra/providers/file-provider.ts`（PoC）

```ts
// spec — 继承 v1，展示干扰检测如何"硬编码在 Provider 内部"
import { lstatSync, readFileSync, statSync } from 'fs'
import type { InfraProvider, ProviderContext } from '../registry/provider-registry'
import type { IOStatRequest, IOReadRequest, IOExecRequest, IOStatResult, IOReadResult, IOExecResult, IOInterference, InterferenceFlag } from '../../kernel/contracts/io-primitive'

const CACHE_PATH_PATTERNS = [/(^|\/)\.cache(\/|$)/, /(^|\/)node_modules(\/|$)/, /(^|\/)\.git\/objects(\/|$)/]

export class FileProvider implements InfraProvider {
  readonly name = 'file'
  readonly schemes = ['file', ''] as const
  readonly primitives = ['io.stat', 'io.read'] as const   // io.exec 委派到 ShellProvider

  async stat(req: IOStatRequest, ctx: ProviderContext): Promise<IOStatResult & IOInterference> {
    const flags: InterferenceFlag[] = []
    try {
      const lstat = lstatSync(req.path)
      const stat = statSync(req.path)
      if (lstat.isSymbolicLink()) flags.push('symlink')
      if (ctx.now() - stat.mtimeMs < 1000) flags.push('just_modified')
      if (CACHE_PATH_PATTERNS.some(p => p.test(req.path))) flags.push('cache_path')
      return { exists: true, isFile: stat.isFile(), isDir: stat.isDirectory(), mtimeMs: stat.mtimeMs, size: stat.size, symlink: lstat.isSymbolicLink(), flags }
    } catch (err: any) {
      if (err.code === 'EACCES') return { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false, flags: ['permission_denied'] }
      return { exists: false, isFile: false, isDir: false, mtimeMs: null, size: null, symlink: false, flags: [] }
    }
  }

  async read(req: IOReadRequest, ctx: ProviderContext): Promise<IOReadResult & IOInterference> {
    const flags: InterferenceFlag[] = []
    const statResult = await this.stat({ path: req.path }, ctx)
    flags.push(...statResult.flags)
    if (req.maxBytes && statResult.size && statResult.size > req.maxBytes) flags.push('response_truncated')
    try {
      const text = readFileSync(req.path, { encoding: req.encoding ?? 'utf-8' })
      return { bytes: text.length, text, truncated: flags.includes('response_truncated'), flags }
    } catch (err: any) {
      if (err.code === 'EACCES') return { bytes: 0, text: '', truncated: false, flags: ['permission_denied'] }
      throw err
    }
  }

  async exec(_req: IOExecRequest, _ctx: ProviderContext): Promise<IOExecResult & IOInterference> {
    throw new IAPError('PROOF', 'INFRA_FAIL', 'YIELD_TO_HUMAN', 'file provider does not implement io.exec; use shell:// URI')
  }
}
```

### 5.3 `src/infra/providers/http-provider.ts`（PoC）

WAF 头黑名单**硬编码**在 `WAF_HEADERS` 常量中（`Object.freeze`），随版本发布：

```ts
const WAF_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'cf-ray': 'cloudflare', 'x-amz-cf-id': 'aws-cloudfront', 'x-akamai-transformed': 'akamai',
  'x-sucuri-id': 'sucuri', 'x-cdn-forward': 'generic-cdn',
})
// 详见 v1 spec
```

---

## 6. L3 CLI 改造（v2 新增核心）

### 6.1 `src/cli/probe-add.ts`（新文件）

```ts
// spec — CLI 引入流程主命令
import { join } from 'path'
import { mkdir, writeFile } from 'fs/promises'
import { createHash } from 'crypto'
import { sandboxValidate } from './probe-sandbox'
import { registryUpsert } from './probe-registry-store'

export interface ProbeAddOptions {
  projectRoot: string
  schemeHints?: string[]   // 提示用户预期支持的 scheme
}

export interface ProbeAddResult {
  ok: boolean
  stage?: 'fetch' | 'sandbox' | 'write' | 'registry'
  errors?: string[]
  name?: string
  hash?: string
  schemes?: string[]
  primitives?: IOPrimitive[]
}

export async function probeAdd(source: string, name: string, opts: ProbeAddOptions): Promise<ProbeAddResult> {
  // 阶段 1: 拉取
  let raw: string
  try {
    raw = source.startsWith('http://') || source.startsWith('https://')
      ? await (await fetch(source)).text()
      : await Bun.file(source).text()
  } catch (err) {
    return { ok: false, stage: 'fetch', errors: [String(err)] }
  }

  // 阶段 2: 沙箱验证
  const validation = await sandboxValidate(raw, { name, schemeHints: opts.schemeHints })
  if (!validation.ok) return { ok: false, stage: 'sandbox', errors: validation.errors }

  // 阶段 3: 落盘
  const cacheDir = join(opts.projectRoot, '.openxenon/.cache/third-party-probes')
  const cachePath = join(cacheDir, `${name}.ts`)
  await mkdir(cacheDir, { recursive: true })
  await writeFile(cachePath, raw, { mode: 0o644 })

  // 阶段 4: 写注册表
  const hash = createHash('sha256').update(raw).digest('hex')
  await registryUpsert(opts.projectRoot, {
    name, schemes: validation.schemes, primitives: validation.primitives,
    expectedHash: hash, cachePath, source, registeredAt: Date.now(),
  })

  return { ok: true, name, hash, schemes: validation.schemes, primitives: validation.primitives }
}
```

### 6.2 `src/cli/probe-sandbox.ts`（新文件）

```ts
// spec — 沙箱验证引擎
import vm from 'vm'
import type { IOPrimitive, IOStatResult, IOReadResult, IOExecResult, IOInterference } from '../kernel/contracts/io-primitive'

const FORBIDDEN_MODULES = new Set(['fs', 'child_process', 'http', 'https', 'net', 'dgram', 'cluster', 'worker_threads', 'tls'])

const sandboxLinker = (specifier: string): vm.Module | undefined => {
  if (FORBIDDEN_MODULES.has(specifier)) throw new Error(`module "${specifier}" is forbidden in provider sandbox`)
  // ... 最小化 linker
}

const sandboxContext = vm.createContext({
  console: { /* 限定的 console */ },
  setTimeout, clearTimeout,
  URL, AbortSignal,
  // 显式不提供: fetch, process, require, Buffer
})

export interface SandboxValidation {
  ok: boolean
  errors: string[]
  schemes: string[]
  primitives: IOPrimitive[]
}

export async function sandboxValidate(tsSource: string, hints: { name: string; schemeHints?: string[] }): Promise<SandboxValidation> {
  // 1. TS → JS（Bun build API）
  const buildResult = await Bun.build({ entrypoints: ['<inline>'], stdin: tsSource, target: 'bun', format: 'esm' })
  if (!buildResult.success) return { ok: false, errors: ['TS transpile failed', ...buildResult.logs.map(l => l.message)], schemes: [], primitives: [] }
  const jsSource = await buildResult.outputs[0].text()

  // 2. 在 vm.SyntheticModule 执行
  const module = new vm.SourceTextModule(jsSource, { context: sandboxContext, identifier: hints.name })
  await module.link(sandboxLinker)
  await module.evaluate()

  const Provider = module.namespace.default
  if (typeof Provider !== 'object' || Provider === null) return { ok: false, errors: ['no default export'], schemes: [], primitives: [] }

  // 3. Schema Proof
  if (typeof Provider.name !== 'string') return { ok: false, errors: ['missing name'], schemes: [], primitives: [] }
  if (!Array.isArray(Provider.schemes) || Provider.schemes.length === 0) return { ok: false, errors: ['empty schemes'], schemes: [], primitives: [] }
  if (!Array.isArray(Provider.primitives) || Provider.primitives.length === 0) return { ok: false, errors: ['empty primitives'], schemes: [], primitives: [] }

  // 4. Kernel Execution Proof：用标准 IOPrimitive Request 调用
  const mockCtx = { projectRoot: '/tmp/sandbox-test', env: { PATH: '/usr/bin' }, now: () => 1700000000000 }
  for (const primitive of Provider.primitives as IOPrimitive[]) {
    try {
      const result = await Provider[primitive](dummyRequestFor(primitive), mockCtx)
      if (!result || typeof result !== 'object') throw new Error('result not object')
      if (!Array.isArray(result.flags)) throw new Error('missing flags array')
    } catch (err) {
      return { ok: false, errors: [`${primitive} failed: ${(err as Error).message}`], schemes: [], primitives: [] }
    }
  }

  return { ok: true, errors: [], schemes: Provider.schemes, primitives: Provider.primitives }
}

function dummyRequestFor(primitive: IOPrimitive): unknown {
  switch (primitive) {
    case 'io.stat': return { path: '/tmp/sandbox-test/fixture.txt' }
    case 'io.read': return { path: '/tmp/sandbox-test/fixture.txt', encoding: 'utf-8' }
    case 'io.exec': return { command: '/bin/echo', args: ['hello'], timeoutMs: 1000 }
  }
}
```

### 6.3 `src/cli/probe-fix.ts`（新文件）

```ts
// spec — 修复被篡改的 Probe
export async function probeFix(name: string, projectRoot: string): Promise<ProbeFixResult> {
  // 1. 读 registry.json 找到 source URL
  // 2. 重新拉取 → 重跑 sandboxValidate → 重新计算 hash
  // 3. 若 hash 改变且通过验证 → 写新文件 + 更新 registry
  // 4. 若拉取失败 → 标 CORRUPTED，提示用户手动处理
}
```

### 6.4 `src/cli/probe-list.ts`（新文件）

```ts
// spec — 列出项目下所有 Probe
export async function probeList(projectRoot: string): Promise<ProbeListResult> {
  const reg = getProviderRegistry()
  return reg.list().map(entry => ({
    name: entry.name,
    status: entry.status,                    // OK / CORRUPTED / UNREGISTERED
    version: 'v2',                          // v2 protocol
    registeredAt: entry.registeredAt,
    source: entry.source,
    corruptionReason: entry.corruptionReason,
  }))
}
```

### 6.5 `src/daemon/index.ts`（改造）

```ts
// spec — Daemon 启动期
export async function daemonStartup(projectRoot: string): Promise<DaemonStartupResult> {
  const reg = getProviderRegistry()

  // 1. 注册 4 个内置 Provider
  reg.registerBuiltin(new FileProvider())
  reg.registerBuiltin(new HttpProvider())
  reg.registerBuiltin(new ShellProvider())
  reg.registerBuiltin(new GitProvider())

  // 2. 冷加载第三方 Provider
  const bootstrap = reg.bootstrapFromDisk(
    join(projectRoot, '.openxenon/probes/registry.json'),
    join(projectRoot, '.openxenon/.cache/third-party-probes/'),
  )
  // 关键：永不抛错
  return { ok: true, bootstrap, message: `${bootstrap.ok} OK, ${bootstrap.corrupted} corrupted` }
}
```

### 6.6 `src/work/state.ts`（Work 前置校验）

```ts
// spec — Work 解析时调用
export async function workPrecheck(workId: string, work: WorkSpec): Promise<WorkPrecheckResult> {
  const requiredSchemes = work.probes.flatMap(p => extractSchemesFromProbe(p))
  const check = getProviderRegistry().checkWorkDependencies(requiredSchemes)
  if (!check.ok) {
    return {
      ok: false,
      blocked: check.blocked,
      message: `Work "${workId}" blocked: ${check.blocked.map(b => `${b.scheme}=${b.reason}`).join('; ')}`,
      iapError: new IAPError('PROOF', check.blocked.some(b => b.reason.startsWith('CORRUPTED')) ? 'PROBE_CORRUPTED' : 'PROBE_MISSING', 'YIELD_TO_HUMAN', ...),
    }
  }
  return { ok: true }
}
```

---

## 7. OXL 层改造

### 7.1 Langium grammar 增量（与 v1 一致，**实现口径不变**）

OXL 1.3 Probe 表达式显式声明 `scheme:` 字段。**用户面语法与 v1 完全一致**——v2 的变化在 CLI/Registry，OXL 用户无感。

---

## 8. 项目级作用域（v2 新增核心）

### 8.1 物理路径

| 路径 | 用途 | gitignore? |
|---|---|---|
| `.openxenon/probes/registry.json` | 第三方 Provider 注册表（SHA-256 指纹 + schemes） | **是**（运行时数据） |
| `.openxenon/.cache/third-party-probes/<name>.ts` | 第三方 Provider TS 文件缓存 | **是** |
| `.openxenon/probes/` | builtin probe 模板（tracked） | **否**（仅 builtin 资产） |

### 8.2 隔离保证

- **项目 A** vs **项目 B**：物理文件系统完全隔离，`.openxenon/.cache/third-party-probes/s3.ts` 在两个项目里互不干扰
- **版本并存**：项目 A 可用 `s3-provider v1`，项目 B 可用 `s3-provider v2`——靠 registry.json 的 `expectedHash` 区分
- **作用域边界**：第三方 Provider 的 `ctx.projectRoot` 限制在项目根目录内，IO 路径越界可被 Provider 自身拒绝

### 8.3 为什么不用 NPM

| NPM 问题 | v2 解法 |
|---|---|
| 需 `package.json` / `tsconfig.json` / `node_modules` | **单文件 TS** + `.openxenon/.cache/` |
| 需 `npm publish` 走 npm registry | **Gist / GitHub / 公司内 Git 仓库** 即可 |
| 全局安装污染 | 项目级缓存，零全局副作用 |
| 版本冲突噩梦 | `expectedHash` 精确锁定，零冲突 |
| 启动期解析依赖需触网 | Daemon 零网络 |
| 锁文件大 | 单文件缓存，KB 级 |

---

## 9. 生态演进路径（v2 新增）

### Phase 1：Gist / 单文件分享（v2.0 默认）

```bash
# 工程师 A 开发 s3-provider.ts 并发布到 Gist
# 工程师 B 引入：
oxn probe add https://gist.github.com/Alice/abc123/raw/s3-provider.ts --name s3
#   → 下载 → 沙箱验证 → 落盘 → 注册
#   → Done. Project now supports s3:// scheme.
```

**优势**：比 NPM 包轻量 100 倍，复制粘贴即跑，试错成本极低。

### Phase 2：官方 Probe 社区仓库（v2.1+ 议题）

- 开源 `openxenon-community/probes` 仓库
- 社区 PR 提交 TS 文件
- CI 中自动运行"内置 Probe Proof"验证（与 `oxn probe add` 同套沙箱）
- 合并后用户可：`oxn probe add @community/redis`（短名解析到 `https://raw.githubusercontent.com/openxenon-community/probes/main/redis.ts`）

**本质**：把 Sherlock 的 `data.json` 仓库升级为更强大的代码级仓库，**准入标准由 Proof 强控**。

### Phase 3：企业级私有源（v2.2+ 议题）

```bash
oxn config set probe-registry https://probe-registry.internal.corp/
oxn probe add @corp/legacy-db
#   → 拉取 https://probe-registry.internal.corp/legacy-db.ts
```

**本质**：大公司内部有私有基础设施，可搭静态文件服务器集中管理 Provider。

---

## 10. PR 拆分（v2.0 → v2.6，6 个 PR）

> 总原则：每 PR ≤ 500 行；每 PR 可独立 ship + 独立回滚；CI 全程绿。
> 透传路径（无 interference flag）行为与 v0.0 完全一致，AC-2 守护。

### PR-1：数据契约 v2 骨架 — ~250 行

**目标**：新增 `io-primitive.ts` + `trust-baseline.ts` 骨架，扩展 `ProbeObservation` / `ProbeVerdict` 字段；**默认行为零变更**（无 flag 时 `judge()` 走原逻辑）。

**涉及文件**：
- `src/kernel/contracts/io-primitive.ts`（新）—— `IOPrimitive` / `InterferenceFlag` / 3 个 Request/Result 类型
- `src/kernel/contracts/probe-port.ts` —— `ProbeObservation` 加 `interference?`；`ProbeVerdict` 加 `verdict: 'PASS' | 'FAIL' | 'INCONCLUSIVE'`
- `src/kernel/verdicts/trust-baseline.ts`（新）—— `TRUST_BASELINE` + `applyTrustBaseline()`
- `src/kernel/verdicts/verdict.ts` —— `judge()` 入口加 `applyTrustBaseline()` 包装
- `src/kernel/verdicts/__tests__/trust-baseline.test.ts`（新）

**验收命令**：`bun test src/kernel/verdicts/` + `bun run typecheck` + `bun run lint` + `bun test`（414 全绿）

**风险**：低。纯字段扩展 + 透传包装，AC-2 守护 0 行为变更。

### PR-2：frozen.json schema 同步 + Verdict 三态展示 — ~200 行

**目标**：frozen.json 节点携带 `verdict` 三态与 `interferenceFlags`；CLI 展示三态。

**涉及文件**：
- `src/infra/frozen/types.ts` —— `FrozenProbeNode` 加 `verdict` / `interferenceFlags`
- `src/infra/frozen/immutable.ts` —— 序列化携带新字段
- `src/infra/frozen/__tests__/frozen-shape.test.ts`（新）—— schema 兼容老 frozen.json
- `src/cli/proof-show.ts` —— 输出三态 verdict 与 flags
- `docs/proof.md` —— "Verdict 三态" 章节

**验收命令**：`bun test src/infra/frozen/` + `dist/oxn proof show <frozen-id>`

**风险**：低。

### PR-3：ProviderRegistry + 4 个内置 Provider + 内置 IO Primitive 契约 — ~600 行

**目标**：实现 `InfraProvider` 接口 + `ProviderRegistry.bootstrapFromDisk()` + 4 个内置 Provider。

**涉及文件**：
- `src/infra/registry/provider-registry.ts`（新）—— 接口 + Registry 类 + `bootstrapFromDisk()` + `checkWorkDependencies()`
- `src/infra/providers/file-provider.ts`（新）—— 完整 stat/read + 4 个 flag
- `src/infra/providers/http-provider.ts`（新）—— 完整 read + 4 个 flag
- `src/infra/providers/shell-provider.ts`（新）—— 委派到 `shell-exec` PoC
- `src/infra/providers/git-provider.ts`（新）—— 委派到 `git-*` PoC
- `src/infra/registry/__tests__/provider-registry.test.ts`（新）—— bootstrap 成功/失败/CORRUPTED 三路径
- `src/infra/providers/__tests__/file-provider.test.ts`（新）
- `src/infra/providers/__tests__/http-provider.test.ts`（新）

**验收命令**：
```bash
bun test src/infra/registry/ src/infra/providers/
# 验证：mock cf-ray 头 → flags 含 waf_detected
# 验证：symlink 路径 → flags 含 symlink
# 验证：bootstrapFromDisk 遇坏文件 → 标 CORRUPTED，**不抛错**
```

**风险**：中。WAF 头黑名单需定期审计。

### PR-4：`oxn probe add` CLI + 沙箱验证引擎（v2 核心 PR） — ~700 行

**目标**：实现 CLI 引入流程 + vm.SyntheticModule 沙箱 + "用 Probe 证明 Probe"自举。

**涉及文件**：
- `src/cli/probe-add.ts`（新）—— 主命令实现
- `src/cli/probe-sandbox.ts`（新）—— `sandboxValidate()` + 沙箱 linker/context
- `src/cli/probe-registry-store.ts`（新）—— `registryUpsert()` / `registryRead()` 工具
- `src/cli/__tests__/probe-add-e2e.test.ts`（新）—— 黑盒 E2E：本地 TS / 远程 URL 两种 source
- `src/cli/__tests__/probe-sandbox.test.ts`（新）—— 沙箱拦截越界副作用
- `docs/cli.md` —— `oxn probe` 子命令族章节

**验收命令**：
```bash
# 1. 引入合法 Provider
oxn probe add ./fixtures/sample-s3-provider.ts --name s3
# 期望：output 含 "Done. Project now supports s3 scheme."

# 2. 引入越界 Provider（尝试写文件）
oxn probe add ./fixtures/evil-provider.ts --name evil
# 期望：output 含 "sandbox rejected: module fs is forbidden"

# 3. 引入未实现 InfraProvider 的 TS
oxn probe add ./fixtures/empty.ts --name empty
# 期望：output 含 "sandbox rejected: missing schemes"

bun test src/cli/__tests__/probe-add-e2e.test.ts
```

**风险**：**中-高**。沙箱是 v2 核心，需多轮 fuzz 测试（恶意 TS 输入）。建议本地 + CI 跑 Bun 自带 sandbox tests + OpenSSF 最佳实践。

### PR-5：Daemon 冷加载 + Work 前置校验 + `oxn probe list/fix` — ~400 行

**目标**：Daemon `daemonStartup()` + Work `workPrecheck()` + `oxn probe list` / `oxn probe fix` 两个辅助命令。

**涉及文件**：
- `src/daemon/index.ts` —— `daemonStartup()` 调 `bootstrapFromDisk()`
- `src/work/state.ts` —— `workPrecheck()` 调 `checkWorkDependencies()`
- `src/cli/probe-list.ts`（新）—— `oxn probe list`
- `src/cli/probe-fix.ts`（新）—— `oxn probe fix <name>`
- `src/core/errors/iap-error.ts` —— 新增 `PROBE_CORRUPTED` / `PROBE_MISSING`
- `src/cli/__tests__/work-precheck.test.ts`（新）—— 坏 Probe 阻断该 Work、不影响其他
- `src/cli/__tests__/probe-list.test.ts`（新）

**验收命令**：
```bash
# 1. 篡改缓存文件后启动 Daemon
echo "// tampered" >> .openxenon/.cache/third-party-probes/s3.ts
oxn daemon start
# 期望：warning "1 provider corrupted: s3 (hash mismatch)" + Daemon 正常启动

# 2. 执行依赖坏 s3 Provider 的 Work
oxn work run deploy-to-s3
# 期望：exit 1, stderr "IAP_PROOF_PROBE_CORRUPTED: s3 scheme corrupted"

# 3. 执行不依赖 s3 的 Work
oxn work run lint-check
# 期望：正常跑（不受 s3 坏影响）

# 4. oxn probe list
oxn probe list
# 期望输出含 s3 行 status=CORRUPTED
```

**风险**：中。Work 状态机需与 v0.0 兼容，建议小步 PR + 完整 E2E。

### PR-6：OXL 1.3 grammar + builtin probe 模板迁移 — ~400 行

**目标**：OXL 1.3 Probe 表达式加 `scheme:` 字段；14 个 builtin probe 模板全部迁移。

**涉及文件**：
- `src/oxl/langium/oxn.langium` —— ProbeStatement 加 `scheme` 字段
- `src/oxl/generated/parser.ts` / `ast.ts` —— `bun run langium:generate` 自动生成
- `src/oxl/validators/probe-validator.ts`（新）—— 静态校验 scheme 已注册
- `src/oxl/builtin/probes/*.oxn`（14 个）—— 加 `scheme:` 字段
- `src/oxl/builtin/__tests__/probe-templates.test.ts`（新）

**验收命令**：
```bash
bun run langium:generate
bun test src/oxl/builtin/
# 验证：OXL 编译时未声明 scheme → 编译失败
# 验证：scheme 不在 oxn.config.ts → 编译失败
```

**风险**：中。OXL grammar 改动需重新跑 `langium:generate`；14 个模板需批量迁移。

### PR-7（v2.1+ 议题，非 v2.0 必做）：Probe 收敛到 3 个 IO 原语 — ~800 行

**目标**：14 个 builtin probe 全部重构为"调用 3 个原语 + 应用 matcher"的 CompoundProbe；Kernel strategy 数量从 14 收敛为 3。

**风险**：**高**。触及最多代码。建议分 2-3 个子 PR。**v2.0 release 不强求**。

---

## 11. 验收标准（v2 完整版）

### AC-1：数据契约 v2 骨架不破坏现有测试
```bash
bun test && bun run typecheck && bun run lint && bun scripts/validate-dependencies.ts
```

### AC-2：透传路径零行为变更
```bash
bun test src/infra/probes/  # 14 个 Probe 测试全绿
```

### AC-3：Trust Baseline 三档全覆盖
```bash
bun test src/kernel/verdicts/__tests__/trust-baseline.test.ts
# 验证：RED/YELLOW/PASS 三档各 case
# 验证：'unknown' flag → RED（保守策略）
```

### AC-4：FileProvider / HttpProvider 干扰检测
```bash
bun test src/infra/providers/__tests__/
# 验证：symlink / just_modified / cache_path / permission_denied 4 个 flag
# 验证：waf_detected / cdn_cache / response_truncated / network_timeout 4 个 flag
```

### AC-5：ProviderRegistry bootstrap 永不抛错
```bash
bun test src/infra/registry/__tests__/provider-registry.test.ts
# 验证：
#   - Hash 匹配 → status = 'OK'
#   - Hash 不匹配 → status = 'CORRUPTED'，**不抛错**
#   - 文件不存在 → status = 'CORRUPTED'，reason = 'cache file missing'
#   - 实例化抛错 → status = 'CORRUPTED'，reason = err.message
#   - 内置 Provider 始终 status = 'OK'
```

### AC-6：沙箱拦截越界副作用（v2 核心）
```bash
bun test src/cli/__tests__/probe-sandbox.test.ts
# 验证 fixture：
#   - 尝试 require('fs') → 拒绝 "module fs is forbidden"
#   - 尝试 require('child_process') → 拒绝
#   - 尝试 process.exit() → 拒绝
#   - 尝试 globalThis.fetch() → 拒绝（除非 Provider 显式声明）
#   - 不实现 InfraProvider 接口 → 拒绝 "missing schemes"
#   - 返回 result 缺 flags 字段 → 拒绝 "missing flags array"
#   - 返回 flags 含非字符串 → 拒绝 "flags not string[]"
```

### AC-7：frozen.json schema 兼容 v0.1.2
```bash
bun test src/infra/frozen/__tests__/frozen-shape.test.ts
# 验证：含 verdict 三态 + interferenceFlags
# 验证：反序列化老 frozen.json 不报错
# 验证：content_hash 向后兼容
```

### AC-8：OXL 显式 scheme 校验
```bash
bun test src/oxl/builtin/__tests__/probe-templates.test.ts
# 验证：14 个 builtin probe 模板都有 scheme 字段
# 验证：未声明 scheme → 编译失败
```

### AC-9：Verdict 三态与 IAPAction 映射
```bash
bun test src/kernel/verdicts/__tests__/verdict-three-state.test.ts
# 验证：
#   - verdict: 'INCONCLUSIVE' + passed: false + failureMessage 含 'YIELD_TO_HUMAN'
#   - verdict: 'PASS' / 'FAIL' 三态正确映射
#   - IAPError('PROOF', 'INCONCLUSIVE') 在 schema 校验失败时抛
```

### AC-10：CORRUPTED 不阻断 Daemon（v2 核心倒置）
```bash
# 模拟坏缓存 → 启动 Daemon
echo "// tampered" >> .openxenon/.cache/third-party-probes/s3.ts
oxn daemon start
# 期望：warning 含 "1 provider corrupted"，exit code 0（启动成功）

# 验证：oxn probe list 正确报告
oxn probe list
# 期望：s3 行 status=CORRUPTED
```

### AC-11：Work 级精准阻断（v2 核心倒置）
```bash
# 执行依赖坏 s3 Provider 的 Work
oxn work run deploy-to-s3
# 期望：exit 1, stderr "IAP_PROOF_PROBE_CORRUPTED: s3 scheme corrupted"

# 同时执行不依赖 s3 的 Work
oxn work run lint-check
# 期望：exit 0（**不受** s3 坏影响）
```

### AC-12：oxn probe add 端到端流程
```bash
# 1. 引入合法 Provider
oxn probe add https://gist.github.com/sample/s3-provider.ts --name s3
# 期望：output "Done. Project now supports s3 scheme."

# 2. 验证注册表已更新
cat .openxenon/probes/registry.json
# 期望：entries 含 { name: 's3', expectedHash: 'sha256-...', cachePath: '...' }

# 3. 验证缓存文件已落盘
ls .openxenon/.cache/third-party-probes/
# 期望：s3.ts 存在

# 4. 篡改缓存后再 list
echo "// tampered" >> .openxenon/.cache/third-party-probes/s3.ts
oxn probe list
# 期望：s3 行 status=CORRUPTED

# 5. 修复
oxn probe fix s3
# 期望：重新拉取 → 重新验证 → 状态恢复 OK
```

### AC-13：架构合规
```bash
# 验证 v2 不破坏 L0–L3 宪法
bun scripts/validate-dependencies.ts

# 验证 Kernel (verdict.ts / trust-baseline.ts) 零 IO
rg "from 'fs'|from 'net'|child_process|process\\.env" src/kernel/verdicts/
# 期望：0 命中

# 验证 TRUST_BASELINE 是 const + Readonly
rg "TRUST_BASELINE" src/kernel/verdicts/trust-baseline.ts
# 期望：含 'const TRUST_BASELINE: Readonly<...>'

# 验证 Daemon 启动期零网络
rg "fetch\\(|http\\.get|https\\.get" src/daemon/index.ts
# 期望：0 命中（仅 bootstrapFromDisk 内可有 fetch for 远程注册源，v2.1+ 议题）
```

### AC-14：CLI E2E 黑盒
```bash
bun test src/cli/__tests__/probe-add-e2e.test.ts
# 验证：本地 TS / 远程 URL 两种 source 都走完整沙箱验证
# 验证：含 CORRUPTED Provider 的项目可正常 daemon start（仅 warning）
# 验证：依赖坏 Probe 的 Work 精准阻断
```

---

## 12. 风险与回滚

| PR | 风险 | 回滚成本 | 关键不变量 |
|---|---|---|---|
| PR-1 | **低** | 1 commit revert，≤ 30 分钟 | 透传路径 0 行为变更 |
| PR-2 | **低** | 1 commit revert | frozen.json 老格式仍可读 |
| PR-3 | **中** | 1 commit revert | WAF 头黑名单审计 |
| PR-4 | **中-高**（v2 核心） | 1 commit revert | 沙箱 fuzz 测试 |
| PR-5 | **中** | 1 commit revert | Work 状态机兼容 v0.0 |
| PR-6 | **中** | 1 commit revert | OXL 老 .oxn 仍可读 |
| PR-7 | **高** | 拆 2-3 个子 PR | 414 测试全绿 |

**v2.0 release 风险底线**：PR-1 + PR-2 + PR-3 + PR-4 + PR-5 + PR-6 即可兑现"确定性 + 扩展性 + 故障隔离"三重承诺。**PR-7 可推迟到 v2.1**。

---

## 13. 后续工作（v2.1+ 议题）

| 议题 | 优先级 | 备注 |
|---|---|---|
| PR-7：14 个 probe 收敛到 3 个原语 | P1 | v2.0 release 不强求 |
| WAF 头黑名单扩到 20+ | P2 | 监控生产环境 WAF 拦截数据 |
| Phase 2 社区仓库 `oxn probe add @community/redis` | P2 | v2.1 PoC |
| Phase 3 企业私有源 `oxn config set probe-registry <url>` | P3 | v2.2+ 议题 |
| audit 池 taintHistory 字段（v3 intent-pool 桥接） | P2 | 关联 v3 intent-pool，单独 PR |
| Provider hot-reload（开发态） | P3 | 监听 `.openxenon/probes/registry.json` 变更触发 bootstrap（**不影响** frozen.json 不可变） |
| 沙箱加固（`node:vm` ↔ `Bun.vm` 评估） | P1 | v2.0 release 前必做 fuzz 测试 |

---

## 14. 终极对比（v2）：Sherlock vs OpenXenon

| 维度 | Sherlock (OSINT 工具) | OpenXenon v2 (Proof 引擎) |
|---|---|---|
| **核心诉求** | 覆盖广、规则更新极快 | 绝对确定、结果可复现、高可用 |
| **污染检测** | 运行时启发式 + 远程 `exclusions.json` | **代码内硬编码**，随版本发布 |
| **扩展方式** | 运行时远程加载 JSON 清单 | **`oxn probe add <url>`** CLI 单文件 TS |
| **协议抽象** | HTTP/HTTPS only | URI Scheme（`file://` `http://` `s3://` `ssh://` `redis://` ...） |
| **防污染策略** | 远程 Exclusion 规则动态降级 | Provider 内部硬编码 → `interference_flags` |
| **判定依据** | 基于动态规则流的模糊判断 | **硬编码 TrustBaseline** + 三态 `verdict` 纯函数推演 |
| **故障模型** | 失败重试 | **Work 级精准阻断**，不连坐 Daemon |
| **作用域** | 全局 | **项目级**（`.openxenon/.cache/third-party-probes/`） |
| **面对 WAF** | "宁可标记为不确定" | `waf_detected` RED → INCONCLUSIVE |
| **面对 CDN 缓存** | "标记为不确定" | `cdn_cache` YELLOW → 仍 PASS + 记录 flag |
| **面对符号链接** | N/A | `symlink` YELLOW → 仍 PASS + 记录 flag |
| **面对构建残留** | N/A | `just_modified` RED → INCONCLUSIVE |
| **面对 detached HEAD** | N/A | `detached_head` RED → INCONCLUSIVE |
| **面对超时** | "重试" | `network_timeout` RED → INCONCLUSIVE |
| **面对坏 Probe** | N/A | **标 CORRUPTED + Work 精准阻断** |
| **面对未知** | 列入规则库 | `'unknown'` 枚举值（RED，保守策略） |

**关键哲学差异**：
- **Sherlock** 用"覆盖广"换"确定性"——OSINT 场景合理（找不到比假阳性好）
- **OpenXenon v2** 用"宁可 INCONCLUSIVE"换"Proof 绝对可复现"——Proof 引擎必需
- **OpenXenon v2** 用"项目级作用域 + Work 级隔离"换"高可用"——大规模团队必需

---

## 参考

### 灵感来源

- **Sherlock WAF 指纹识别**——`sherlock-project/sherlock` data.json WAF 头黑名单 + "宁可标记为不确定"原则。**经评审后部分借鉴**（WAF 头硬编码）**部分否决**（远程规则 + 模糊 confidence）。
- **内部 CLI 引入流程讨论**——沙箱验证 + 项目级缓存 + Work 级精准阻断（已并入本设计稿）。

### OpenXenon 内部参考

- `docs/architecture/l0-l3-constitution.md` §2.1 注 —— `verdicts` ↔ `probes` 命名对偶 + 新增 `trust-baseline.ts`
- `src/kernel/contracts/probe-port.ts` —— `ProbeObservation` / `ProbeVerdict` 数据契约
- `src/kernel/verdicts/verdict.ts` —— 14 个 verdict 策略（v2 入口加 `applyTrustBaseline` 包装）
- `src/kernel/contracts/iap-error.ts` —— IAPError 错误字典（v2 新增 `PROBE_CORRUPTED` / `PROBE_MISSING`）
- `src/infra/frozen/immutable.ts` —— frozen.json 序列化（PR-2 扩展点）
- `src/oxl/langium/oxn.langium` —— OXL grammar（PR-6 扩展点）
- `src/oxl/builtin/probes/*.oxn` —— 14 个 builtin probe 模板（PR-6 迁移点）
- `docs/proof.md` —— Verdict 语义 SSOT（PR-2 更新点）
- `docs/cli.md` —— CLI 参考（PR-4/5 更新点：`oxn probe` 子命令族）
- `docs/extending.md` —— 扩展指南（PR-4 更新点：写自定义 Provider）
- `AGENTS.md` L0–L3 宪法——**本设计强化，不破坏**

### 内部设计稿关联

- `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v0.1 —— **本文档完全取代**（v0.1 confidence 浮点方案）
- `.openxenon/forges/2026-06-14-probe-signal-taint-design.md` v1 —— **本文档完全取代**（v1 NPM Provider 方案）
- `.openxenon/forges/2026-06-13-intent-pool-design.md` v3 —— Intent Pool（v2.1+ 可桥接：audit 池记录 `interferenceHistory` + `probeCorruptionEvents`）
- `.openxenon/forges/2026-06-11-probe-mount-system-design.md` —— Probe Mount 系统（与 v2 ProviderRegistry 概念正交，v2.1+ 整合）
- `.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md` —— Runtime Adapter（v2 ProviderRegistry 的前身概念）

### 外部参考

- WAF Fingerprinting：OWASP WAF Fingerprinting 社区资源
- Cloudflare / Akamai / Imperva 公开响应头规范
- 信号污染理论：Trusted Signal Chain / Taint Analysis 的软件工程实践
- Node.js `vm.Module` 沙箱：与 OpenSSF Sandbox Best Practices 对齐
- Sherlock `exclusions.json` 模式：远程规则动态加载的成熟范式（**v0.1 评审否决**）

### 废弃项（v0.1 + v1 全部废弃，**v2 正式撤销**）

- ❌ 远程规则中心——v0.1 ADR-4，v2 **永久撤销**
- ❌ 第三方插件远程注册——v0.1 ADR-5，v2 **永久撤销**
- ❌ 用户级 taint 规则自定义——v0.1 ADR-6，v2 **永久撤销**
- ❌ `confidence: 0-1` 浮点字段——v0.1 核心机制，v2 **永久撤销**
- ❌ `IAP_PROBE_TAINT_HIGH/MEDIUM/LOW` 三个错误码——v0.1 计划，v2 **永久撤销**
- ❌ `oxn.config.ts` + `defineConfig({ providers: [...] })` NPM Provider 机制——v1 ADR-5，v2 **永久撤销**
- ❌ 启动期 Hash 不匹配 → 进程拒启——v1 ADR-7，v2 **永久撤销**（改为标 CORRUPTED + Work 精准阻断）
- ❌ `npm install @my-company/oxn-s3-provider`——v1 ADR-5，v2 **永久撤销**（改为 `oxn probe add <url>`）
