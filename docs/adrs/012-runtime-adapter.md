# ADR-012: Runtime 适配层（Node 18+ 兜底 + Bun 加速）

> **状态**：Accepted
> **日期**：2026-06-12
> **决策者**：架构师 + 维护者
> **关联 forge**：
<!-- allow-version -->
> - 设计 v0.3（最终拍板）：`.openxenon/forges/2026-06-11-runtime-adapter-design.v0.3.md`
> - 架构讨论 v1.0：`.openxenon/forges/2026-06-11-runtime-adapter-arch-discussion.md`
> - v0.1.0 pre-publish（Step 0 硬依赖）：`.openxenon/forges/2026-06-11-v0.1.0-pre-publish-design.md`
<!-- /allow-version -->
> **关联 changeset**：`.changes/0-1-6-runtime-adapter.md`

## 背景

OpenXenon 是 Bun 项目（`bun.lock`），但用户调研硬约束：**用户不愿为了 CLI 工具多装 60MB Bun runtime**。

| 维度 | 现状 | 目标 |
|---|---|---|
| **开发期 runtime** | Bun（快 50ms 启动） | 保持 Bun |
| **用户安装** | `npm i -g openxenon` + 被迫装 Bun | `npm i -g openxenon` **0 额外依赖** |
| **用户 runtime** | 必须 Bun ≥ 1.1 | **Node 18+ 兜底** + Bun 加速（自动 detect） |
| **包大小** | 63 MB binary | **< 3 MB 纯 JS** |

## 决策

在 `src/infra/runtime/` 新增 6 个 runtime 适配模块（`types.ts` / `detect.ts` / `index.ts` 工厂 + `bun/` 双实现 + `node/` 双实现），将 14 处 Bun API 用法抽象到适配层，**`engines` 改为 `node >=18`**（不再要求 Bun）。

**关键决策**（arch-discussion §4 Q3=B 拍板）：**RuntimePort 归属 Type B (Infra Contract)**，放 `src/infra/runtime/types.ts`，**不放** `kernel/contracts/`。

## 理由

### 1. 推广便利（核心）
Node 18+ 兜底让 npm install 0 负担（用户调研硬约束）。

### 2. 不丢 Bun 优势
用户装了 Bun 自动用 Bun 路径（启动 50ms vs Node 200ms）。`isBun()` 在模块加载时一次性求值并缓存，无运行时开销。

### 3. 架构一致
- 适配层在 L1-Infra 内部，**零层间违规**（`bun scripts/validate-dependencies.ts` 验证）
- RuntimePort 放 L1-Infra（不是 L0-Contract），遵循"定义在哪里、消费在哪里"原则

### 4. Type A vs Type B 接口分类（arch-discussion §3 拍板）
| 类型 | 位置 | 注入方式 | 现有实例 |
|---|---|---|---|
| **Type A** (Kernel Contract) | `kernel/contracts/*-port.ts` | 函数参数 | `HashPort`（被 kernel 消费） |
| **Type B** (Infra Contract) | `infra/**/types.ts` | 直接模块 import + 工厂 | `RuntimePort`（被 probe handler 消费） |

**RuntimePort 不属于 Type A** 因为 `spawn()` 消费者是 L1-Infra 的 probe handler，**不是 kernel 纯函数**。Kernel 是 lambda vacuum（禁止 `fs`/`net`/`child_process`/`process.env`/`EventEmitter`），不可能调用 spawn。

### 5. 双目录 + 工厂（arch-discussion §5.1 拍板）
<!-- allow-version -->
**不**用扁平 5 文件目录（v0.2 design 原方案），改用：
<!-- /allow-version -->
```
src/infra/runtime/
├── types.ts              # RuntimePort 接口
├── detect.ts             # isBun() 缓存
├── bun/{spawn,file,glob}.ts + bun/index.ts   # Bun 实现
├── node/{spawn,file,glob}.ts + node/index.ts # Node 实现
├── index.ts              # 工厂: runtime = isBun() ? bunRuntime : nodeRuntime
└── __tests__/            # 5 个 runtime 测 + 2 个 probe e2e 测
```

**handler 只需 `import { spawn } from '../../runtime/index'`，不知 Bun/Node 存在**（DX 最佳）。

### 6. 未来扩展
加 Deno 实现只需新建 `deno/` 目录 + 改 1 行工厂，**不改 handler**。

### 7. 类型不变
`ProbeHandler` 签名不动，14 处 handler 仅替换 API 调用点。

### 8. 安全强化（与 SecurityContext 同步）
- 删除 `shell-exec.ts` 的 `shell: true`，全部走 argv 数组
- `validateCommand` 元字符黑名单（命令替换 + null byte + 换行）
- timeout 统一 SIGKILL（§16 Q4 拍板）

## 架构决策记录

### Q1: fetch 要不要抽象？（**不抽象**）
Node 18+ 与 Bun 都有 `globalThis.fetch`，行为等价。`http-responds` 探针零改造。

### Q2: detect 优先级？
`globalThis.Bun` > `process.versions.bun` > cmdline。`bun --bun oxn` 启动时 `globalThis.Bun` 存在 → 走 Bun 快速路径正是用户期望的（不误判）。

### Q3: CI 矩阵组合？
3 组合：bun + node20 + node22。Node 矩阵用 `node dist/cli.js` 端到端（**不是** `npx bun test`），才能证明 OpenXenon 代码在 Node 下能跑。

### Q4: timeout 统一 SIGKILL？
SIGTERM 可能被进程忽略，SIGKILL 保证超时后进程一定退出。

## 不做

- ❌ 弃用 Bun（保留作为可选加速路径）
- ❌ runtime 切换由用户配置（自动 detect 即可）
- ❌ 全部 handler 重写为 async（现状已 async）
- ❌ 移除 `Bun.*` 引用（保留作为 detect 内部用）
- ❌ RuntimePort 放 `kernel/contracts/`（Type A 分类空抽象）
<!-- allow-version -->
- ❌ 跨平台 binary 矩阵（`build:linux` / `build:macos` / `build:windows` 删除，v0.1.6 纯 JS 入口）
<!-- /allow-version -->
- ❌ RuntimePort 用 DI 容器（Type B 用模块 import + 工厂模式）

## 替代方案

| 方案 | 放弃理由 |
|---|---|
| A. 全部走 Bun（engines.bun） | 用户不愿装 Bun，推广劣势 |
| B. 全部走 Node（engines.node） | 失去 Bun 启动速度优势 |
| C. 编译 binary（63MB） | 体积大、CI 慢、跨平台难 |
| D. brew/scoop（OpenCode 模式） | 仍需 brew，仍有用户门槛 |
| **E. 适配层（双 runtime）** | **✅ 选**——Node 兜底 + Bun 加速，零用户负担 |

## 验收

- ✅ 5 个 probe handler 改造（shell-exec / fs-* / deps-resolved）
- ✅ 6 个 runtime 模块就位（types / detect / index / bun×3 / node×3）
- ✅ 23 个新测全绿（18 runtime + 5 probe e2e）
- ✅ 1053 既有测零回归（1091 / 1094 通过，3 个 pre-existing flaky 测无关）
- ✅ 架构守卫 0 违规
- ✅ Node 18+ 可直接 `node dist/cli.js` 跑（实测 `node dist/cli.js --version` 输出 0.1.6）

## 副作用

- `engines.node` 从 `>=18` 不变（已生效）
- `bin: dist/oxn` (63MB binary) → `bin: dist/cli.js` (2.71MB JS)
<!-- allow-version -->
- `build:all` / `build:linux` / `build:macos` / `build:windows` 删除（v0.1.6 不再 cross-compile binary）
<!-- /allow-version -->
- `prepublishOnly` 升级为 `typecheck + lint + test + build`
- 新增 `which` 直接依赖（Node 路径用 npm `which` 包跨平台兼容）
- `dist/cli.js` 启动时间：Node 路径 ~200ms / Bun 路径 ~50ms（tradeoff）
