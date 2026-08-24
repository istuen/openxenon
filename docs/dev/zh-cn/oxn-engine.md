---
title: OXN Engine 开发者手册
---

# OXN Engine 开发者手册

> **术语权威源**：本文档基于 `oxn-engine-domain` 引擎术语（Layer 1 · `packages/engine/`）编译。所有 term 定义以该 Domain 为唯一 SSOT（见 [术语表](/openxenon/product/zh-cn/concepts/glossary.html)）。

## What —— 是什么

`packages/engine/` 是 OpenXenon 的厚实现层（L0-L2 + daemon），承载全部业务逻辑、
独立验证主权与 E1-E4 实体实现。所有 Engine 行为可拆解为：

- **双包 Monorepo 结构**（Monorepo / PackageEngine / Barrel / OXNPackageScope / SocketBridge）
- **L0-L3 分层架构**（Layer / SubLayer / Kernel / Foundation / Infra / Module / Runtime / Port）
- **E1-E4 双层叙事**（EntityLayer + CodeLayer + LayeredNarrative）
- **OXL/Langium 解析**（OXL / Langium / Parser / AST / Scheme / Validator + 实体声明 Probe/Invariant/Work/DomainProofRef/TaskDeps）
- **Daemon 守护进程**（Daemon / StepPipeline / Watcher / Supervisor / CircuitBreaker / TraceArchiver / Escape）
- **Engine 侧安全沙箱**（ReDoS / ShellInjection / PathTraversal / Sandbox / Timeout）

## Why —— 设计原则

1. **L0 Kernel 真空**：纯函数零 IO；只接受 Infra 通过 Port 暴露的观测结果；禁止 fs/net/process.env/EventEmitter
2. **Kernel/Infra 司法/行政分离**：Kernel 只做 COMPLETED/DEVIATED 判定，Infra 只回答事实（不能给自己盖章）
3. **Daemon 不能立法**：Daemon 不能修改 Kernel 规则（司法不能立法）；Infra 不能行政（不能自己宣布 Work 完成）
4. **OXL/Langium 唯一权威**：src/oxl/generated/ 由 langium:generate 自动生成，绝对不可手工编辑
5. **Engine 沙箱铁律**：所有用户路径必须 resolve 后在 Sandbox 之内；外部命令必须 timeout；spawn 必须 argv 数组
6. **cli↔daemon 仅 socket**：禁止互相 import；payload schema 唯一权威 src/daemon/protocol.ts

## How —— 模块结构

```
packages/engine/
├── src/
│   ├── index.ts                         # Barrel 公共 API
│   ├── kernel/                          # L0 真空层
│   │   ├── schemas/                     #   Zod schemas (L0-Schema)
│   │   ├── contracts/                   #   跨层契约 (L0-Contract)
│   │   └── processors/, verdicts/       #   纯函数判定 (L0-Processor)
│   ├── infra/                           # L1 物理 IO 收口
│   │   ├── filesystem.ts                #   FsPort 收口
│   │   ├── paths.ts                     #   PathPort 收口
│   │   ├── probes/                      #   ProbePort 收口 (L1)
│   │   └── git/workspace.ts             #   Git 适配器
│   ├── oxl/                             # L1 OXL 解析
│   │   ├── langium/oxn.langium          #   语法定义
│   │   ├── generated/                   #   langium:generate 产物（不可编辑）
│   │   └── md-pipeline/                 #   md → IR 转换
│   ├── builtin/                         # L2 内置资产（@oxn scope）
│   ├── Work/, Asset/, Intent/, Align/, Proof/, Insight/, Pool/   # L2 业务模块
│   └── daemon.ts                        # L3 Daemon 入口
```

## L0-L3 分层架构

> **见 [架构总览 §2 L0-L3 工程分层](./architecture.html#2-l0-l3-工程分层)**——L0 Schema/Contract/Processor + L1 Infra/OXL + L2 模块 + L3 入口的完整分层表与依赖图。Engine 模块的 7 项核心不变量（Kernel 真空 / ProbeObservation vs ProbeOutcome / Trace-before-State / PathPort 注入 / Langium 类型隔离 等）详见 [架构总览 §9](./architecture.html#9-l0-l1-runtime-不变量)。

**CI 守门**：`bun scripts/validate-dependencies.ts` + ESLint `no-restricted-imports`
按目录配置，跨层引用即 fail。

## 司法/行政分离（核心边界）

| 角色 | 职责 | 不能做 |
|---|---|---|
| **Kernel**（司法） | COMPLETED/DEVIATED 判定 | 不能 fs / 不能执行 Task |
| **Infra**（行政） | 回答事实（IO） | 不能判定 COMPLETED/DEVIATED / 不能宣布完成 |
| **Daemon**（守卫） | 生命周期 + Probe DEVIATED 阻止 | 不能修改 Kernel 规则 |

## OXL 解析链路

```
.md 源文件 (用户/AI 创作)
  ↓ Langium Parser（自动生成）
AST（自动生成）
  ↓ OXL 实体声明
ProbeDeclaration / InvariantDecl / WorkDeclaration / DomainProofRef / TaskDeps
  ↓ OXL Validator（probe-validator / blueprint-dag / probe-namespace / probe-ref-validator）
已校验 IR
  ↓ Engine 执行（Kernel + Infra）
业务行为 + frozen.json
```

**关键约束**：
- `src/oxl/generated/` 由 `bun run langium:generate` 自动生成，绝对不可手工编辑
- Zod schema 必须与 Grammar 一一对应
- 15 builtin probe 模板全部含 scheme 字段（`file://` / `http://` / `shell://` / `git://`）
- T10 → T11 串行：OXL grammar 两次 generate 必须分两次 PR

## Daemon 生命周期

```
Startup (cold-load + warnings)
  ↓
Daemon 主循环
  ├── Watcher 检测 .md 资产漂移 → validate + lock 守卫
  ├── Supervisor 管理子进程（健康检查 + 自动重启）
  ├── StepPipeline 增量式 Proof 驱动（rollback on failure）
  ├── CircuitBreaker 防雪崩
  └── TraceArchiver 归档 trace.jsonl（阈值 10000 行）
```

**`oxn daemon *` 命令**：`start / stop / restart / logs --lines N / kill / status`
（绕开 CrashLoop / ForkDaemon / SystemdUnit / LaunchD — 必须走 oxn 命令）

## Engine 安全沙箱

| 威胁 | 防护 |
|---|---|
| **ReDoS** | safe-regex 校验（max safe length < 10^5） |
| **ShellInjection** | spawn 必须 argv 数组（禁用 `shell:true` + `child_process.exec`） |
| **PathTraversal** | `path.resolve` + `boundary.startsWith` 检查 |
| **外部命令超时** | timeout 默认 30s（shell-exec / process.exec 必配） |
| **正则回溯** | 必须 timeout 或次数上限 |
| **socket 监听** | max connection 上限 + 读超时 |

## 双包 Monorepo 边界

> **见 [架构总览 §6 L3 Tools](./architecture.html#6-l3-tools-工具入口层)**——CLI / Skills / Daemon 的物理位置 + 职责分工。本节聚焦 Engine 自身的 **cli↔daemon socket 协议约束**（架构总览省略的细节）。

**cli↔daemon 通信约束**（Engine 内部专属）：

- 仅 `unix socket` + JSON payload，禁止互相 import 模块
- payload schema 唯一权威：`src/daemon/protocol.ts`
- `oxn daemon *` 命令：`start / stop / restart / logs --lines N / kill / status`
  - 绕开 CrashLoop / ForkDaemon / SystemdUnit / LaunchD — 必须走 oxn 命令

**Builtin Asset scope 隔离**：
- `@oxn`（Engine 编译内置，src/builtin/）vs `@prj`（项目 override，`.openxenon/assets/`）严格分离
- 详见 [`oxn-asset-domain Inv3BuiltinAssetTwoLayer`](../openxenon/assets/domains/oxn-asset-domain.md)

## 参考

- [OXN 顶层术语 · core-terms](/openxenon/product/zh-cn/concepts/glossary.html)
- [OXN Engine 术语 · engine-terms](/openxenon/assets/domains/oxn-engine-domain.md)（本文档 SSOT）
- [OXN CLI 开发者手册 · oxn-cli.md](./oxn-cli.md)
- [L0-L3 宪法 · l0-l3-constitution.md](./l0-l3-constitution.md)
- [Monorepo 双包 · monorepo.md](./monorepo.md)
- [架构总览 · architecture.md](./architecture.md)
<!-- allow-version -->
- v0.7 Domain 三层架构 RFC（v0.7 探索阶段产物，已并入 [RFC-0007 Domain 词汇与 OXN 定位](../../rfc/zh-cn/RFC-0007-domain-positioning.html)）
<!-- /allow-version -->