---
version: 0.7.0
date: 2026-07-17
type: minor
rfc:
  - .openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md
adr:
  - .openxenon/docs/adrs/0052-langium-retirement-oxn-deprecation.md
  - .openxenon/docs/adrs/0059-domain-reference-model-v2.md
---

# 0.7.0 — Domain 三层架构重组（W2/W3 修订：Engine/CLI 对齐 v0.7 实态）

> 本 changelog 记录 v0.7 Domain 三层架构重组在 W2（oxn-cli-domain）+ W3（oxn-engine-domain）落地的 **二次修订**：
> W1（root Domain）+ W4-W7（4 个 Layer 2 业务子域）见 `.changes/0-7-0-md-native-domain-hierarchy.md`（W1 主 changelog）。
> 本次聚焦 Engine/CLI 两个 package 子域与"旧 Domain 内容压缩+分组"路径的差异 — 修正按 v0.7 实态重写，
> 而非照搬 L0L3Context/MonorepoContext/GrammarContext/SecurityContext/DaemonContext 五个旧 Domain 的内容。

## 核心变更

### Engine 域（oxn-engine-domain.md v0.4.0）

- **删 9 term**：SocketBridge（虚构）/ Layer / SubLayer / Foundation / Module / Runtime / Port 6 个工程分层词 / Monorepo / Constitution / LayeredNarrative 3 个跨域元概念
- **改 7 term**：Kernel / Infra / OXL / Daemon / Barrel / OXNPackageScope / PackageEngine / BuiltinAsset — 全部业务语义重写，删除"被 cli 依赖"反写视角、删除 IO 黑名单/物理路径细节（去 `docs/zh-cn/dev/oxn-engine.md`）
- **新增 4 term**：EntityCompiler / EntityRegistry / md-pipeline / md-bridge（v0.7 OXL MD-native 真实存在的 4 个核心组件）
- **迁入 3 term**（自 CLI 域）：IAPError / OXNCrash / CliInputError — 按代码物理归属（packages/engine/src/errors/）归 Engine 域
- **inv 21 → 6**：删除 Langium 残留（inv-12/13）/ 删除实现细节（inv-9/11/16-20）/ 跨包纪律拆为 Engine↔CLI 各自承担（inv-4 前半 → CLI inv-14，inv-8 → CLI inv-15）
- **bans 删 2 项**：shell: true / child_process.exec（沙箱纪律去 `docs/zh-cn/dev/oxn-engine.md` §"Engine 安全沙箱"）

### CLI 域（oxn-cli-domain.md v0.4.0）

- **删 6 term**：IAPError / OXNCrash / CliInputError（迁 Engine）/ Grammar / Schema / Validator（迁入 md-pipeline 描述）
- **精简 9 term**：保留 15 terms（含 ExitCode）— 1 行定义 + 删除 DEFAULT_ADAPTERS / autoMirror / 命令字典数量等实现细节
- **inv 18 → 16**：删除 Langium 注册机制（inv-13/14）/ 删除历史错误码枚举（inv-2）/ 删除工程细节（inv-15/16）/ 改 inv-1（去除 IAPError 引用）/ 新增 2 inv（迁自 Engine：CLI 严禁穿透 import / cli↔daemon socket 协议）

### root Stack 资产（oxn-stack.md v0.2.0）

- **新增 Architecture blockquote 区**：Monorepo / Constitution / LayeredNarrative 3 个项目工程架构词的简短定义 + cross-link 至 docs/zh-cn/dev/l0-l3-constitution.md
- 不进 StackIR（blockquote 是治理元数据，与 root Domain `> migrated from:` 同模式）
- abstract 由多行压缩为单行

### 上游 SSOT 同步刷新

| 文件 | 改动 |
|---|---|
| `AGENTS.md` line 3 | "基于 Langium 的 OXN DSL" → "基于 **md-pipeline** 的 OXN DSL（v0.7 起纯 MD，Langium 已退役，见 ADR-0052）" |
| `AGENTS.md` line 27 | L0-L3 路径表 daemon.ts 行加 "（待迁移，目前 daemon 物理在根 src/daemon/）" 标注 |
| `.openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md` §2 | 三层 Domain 全景图重写：删除 Langium 词、新增 EntityCompiler/EntityRegistry/md-pipeline/md-bridge 4 个 Engine term、IAPError 等 3 个错误术语迁 Engine、新增 §2.1 Engine 域演进表 + §2.2 未来子 Domain 拆分规则 |
| `docs/zh-cn/dev/oxn-engine.md` | 完整重写：删 Langium 过期表述 + 新增 "L0-L3 工程分层词汇" 专章定义 6 个工程词 + 重写 OXL 解析链路（md-pipeline + md-bridge）+ 错误契约 4 档分流 TopCatch 段 |

## 不变量

- **版本号**：engine 0.3.0 → 0.4.0 / cli 0.3.0 → 0.4.0 / stack 0.1.0 → 0.2.0（向后兼容：术语定义变更不影响 IR schema）
- **Domain references 方向**：仍为 sub→root，root references 为空（ADR-0059 §D5）
- **Backlinks 自动**：desc 中 MD 链接由 backlinks 引擎扫描自动反向索引（`oxn domain show` 验证）
- **L0-L3 物理分层不变**：L0-L2 仍在 packages/engine/src/，L3 仍跨 packages/cli/src/ + 残留 src/daemon/

## 兼容性

- **breaking**：`oxn-engine-domain`/`oxn-cli-domain` 的旧 term（SocketBridge / Layer / SubLayer / Foundation / Module / Runtime / Port / Monorepo / Constitution / LayeredNarrative）已删除；任何引用这些 term 的外部代码路径（如旧 Domain banner 内的 cross-link）应改用 docs/zh-cn/dev/oxn-engine.md §"L0-L3 工程分层词汇" 或 oxn-stack.md Architecture blockquote
- **non-breaking**：term desc 的 1 行化精简；inv 合并精简；bans 项精简（移除 shell:true/child_process.exec 在 Engine 域，迁 docs/ 落地）
- 旧 17 个 Domain（带 migration banner）继续保留至 W8 收尾

## 后续工作

1. **W8**：旧 17 个 Domain 物理删除（待 planLock 解锁后 git rm）
2. **W9（未来）**：若 Engine term 总数 > 30，按 RFC §2.2 规则拆 `oxn-engine-<x>-domain.md` 子 Domain
3. **daemon 物理迁移**：src/daemon/ → packages/engine/src/daemon.ts（独立 sprint）
4. **oxn domain split / merge CLI 命令**：ADR-0059 §D5 流程的工程实现