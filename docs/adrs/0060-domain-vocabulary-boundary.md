---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-17
supersedes: null
superseded-by: null
related:
  - .openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md
  - .openxenon/docs/adrs/0059-domain-reference-model-v2.md
  - .openxenon/assets/domains/oxn-domain.md
  - .openxenon/assets/domains/oxn-engine-domain.md
  - docs/zh-cn/dev/oxn-engine.md
---

# ADR-0060: Domain 词汇边界（What/How 判据）

<!-- allow-version -->
> **状态**：🟢 Accepted（v0.7 RFC §2 同步拍板）
> **日期**：2026-07-17
> **来源**：[v0.7-domain-hierarchy-restructure-rfc §2.1 v0.4.1 演进行](../../rfcs/v0.7-domain-hierarchy-restructure-rfc.md)
<!-- /allow-version -->
> **影响层**：L1-OXL（AssetFrontmatter schema）+ L2-Engine（Domain transformer）+ L3（oxn CLI）

## 背景

<!-- allow-version -->
v0.7 RFC §2 决定采用三层 Domain 架构（root / package / module），但未明确 Domain 应承载的词汇边界。前几个版本的 Engine Domain 反复出现"新增实现词 → 下一版本实现改了 → 再删词"的循环（v0.2 Langium → v0.4 删除；v0.3 Layer×6 + Monorepo×3 → v0.4 删除；v0.4 新增 md-pipeline/md-bridge/EntityCompiler/EntityRegistry/PackageEngine/Barrel/OXNPackageScope → 又面临再删）。
<!-- /allow-version -->

每次实现重构，Domain 都要跟着删/改一批词，本质是 **Domain 承载了实现名**，违反 DDD 通用语言（universal language）原则。

<!-- allow-version -->
具体症状（v0.4 Engine Domain 的 16 个 term）：
<!-- /allow-version -->

| 性质 | Term | 命运 |
|---|---|---|
| 业务/契约词 | OXN Engine / Kernel / Infra / Daemon / OXL / BuiltinAsset / IAPError / OXNCrash / CliInputError | 跨版本稳定 |
<!-- allow-version -->
| 实现层词 | PackageEngine / Barrel / OXNPackageScope / md-pipeline / md-bridge / EntityCompiler / EntityRegistry | v0.4.1 删除 |
<!-- /allow-version -->

## 决策

### D1：Domain 词汇双层判定（What vs How）

Domain 仅承载"**是什么**"层词汇；"**怎么实现**"层词汇由 Stack 资产或开发者手册（docs/zh-cn/dev/）承载。

| 层级 | 含义 | 归宿 |
|---|---|---|
| **What**（Domain 收） | 该词描述"这是什么概念/能力/技术领域" | Domain |
| **How**（Domain 不收） | 该词描述"具体怎么实现 / 实现细节 / 代码路径 / 实现状态" | Stack 资产 / 开发者手册 |

判据：

<!-- allow-version -->
> **重写测试**："如果 OpenXenon 用 Rust 重写、或 v0.8 把内部实现改名（如 md-pipeline 改名为 unified-ast-bridge），这个词还需存在么？"
<!-- /allow-version -->
>
> - 仍需存在 → Domain 收（它在描述"是什么"）
> - 不需存在 → 迁 Stack/docs（它在描述"怎么实现"）

### D2：Domain 词汇 4 个分类

按 D1 判据，Domain 词汇进一步分为 4 类：

| 分类 | 含义 | 例 | 归宿 |
|---|---|---|---|
| 产品词汇 | 业务对象 | OpenXenon / IAP / Intent / Align / Proof / Asset / Work / Insight / Hall / Verdict | Domain |
| 特性词汇（技术） | 项目特定技术领域词（"这是什么技术领域"） | OXL（OpenXenon Language）| Domain |
| 实现词汇（技术） | "怎么实现" / 代码路径 / 实现状态 / 框架选择 | md-pipeline / Barrel / `packages/.../src/...` / `@pending-migration` | Stack / docs |
| 通用技术词 | 通用度过高的外部技术词 | TypeScript / Bun / unified | Stack（不进 Domain） |

### D3：root Domain 装顶层特性词

root Domain 装的是 **OpenXenon 的特性集合**，不限业务/技术分类。OXL（OpenXenon 的特定领域语言）作为特性词属于 root，与 IAP / Asset / Work 等业务特性并列。

> ⚠️ 区别于旧理解的"root = 业务词汇集合"——旧理解会让 OXL 这种跨视角的技术特性词无处安放。

### D4：同名特性词多域共存

<!-- allow-version -->
> **Runtime Implementation Status (2026-07-17)**: ✅ **Implemented**（[ADR-0061 §D1+D2](../0061-data-flow-contract.md) + v0.7.3 RFC §4 P3）
<!-- /allow-version -->
>
> - `work-context-builder.ts:294 buildTermViews` 聚合同名 term 多 Domain 视角
> - `renderContextHuman` 输出 `## Allowed Language (multi-view)` 块状结构 + `[Domain 名]` 行内标注
> - Token 预算缓解：前 3 background 满注入 desc，4+ 仅 term name 列表
<!-- allow-version -->
> - 依据：[v0.7.3 理想态数据流 RFC §2.2 + §5.1](../rfcs/v0.7.3-ideal-data-flow-rfc.md)
<!-- /allow-version -->

同一特性词（如 OXL）可在 root + 子 Domain（Engine / CLI 等）重名存在，依 ADR-0059 §D2「重名不重定义」机制：

- **root 定义本质**：OXL 是什么（"OpenXenon 的特定领域语言，用于声明与校验 OXN 实体"）
- **子 Domain 补视角特性**：在 Engine Domain 补"Engine 视角下的 OXL"（"Engine 通过 unified 库实现 MD 语法的特性"）；未来 CLI Domain 可补"CLI 视角下的 OXL"（CLI 如何消费 OXL 编译结果）

子 Domain 的同名 term desc **不重定义 root 已说的部分**，只补"该视角下的具体特性"。

### D5：Domain 引用规则

#### D5.1 禁止指向 docs/

Domain 的 desc / invariant **禁止** markdown link 引用 `docs/`——docs/ 是 SSOT 之下的可变层，会随编辑而破坏 Domain 引用稳定性。

#### D5.2 禁止纯文本指向 docs/

Domain 的 desc / invariant **禁止**纯文本"详见 / 完整清单见 / 具体实现见 / 见开发者手册"指向 docs/——即使不嵌 markdown link，仍会引导 AI 去读取 How 层。

**Domain 必须 What 自给自足**——核心断言（IO 禁用清单、字段结构、约束列表）必须 inline 写入 desc / invariant value。

#### D5.3 禁止代码路径

Domain 的 desc / invariant **禁止**包含代码路径（`src/...`、`packages/.../src/...`）——属 How 层。

#### D5.4 禁止实现状态注释

Domain 的 desc / invariant **禁止**包含实现状态注释（`@pending-migration`、物理实现 Where）——属 How 层。

#### D5.5 允许引用 ADR（append-only）

<!-- allow-version -->
Domain 的 desc / invariant **允许**引用 ADR（append-only 不可变），但作为名词陈述句的一部分（如 "v0.7 Langium 退役（ADR-0052）"），不嵌 markdown link。
<!-- /allow-version -->

#### D5.6 允许 Domain 间 MD link

Domain 的 desc **允许**引用其他 Domain 的同名 term（ADR-0059 §D2 sub→root 引用机制），这是 Domain 间的 What 引用，不是 How 指向。

例：Engine Domain `### OXL` desc 含 `[`oxn-domain.OXL`](./oxn-domain.md#oxl)` 是合规的。

#### D5.7 External 标号引用语法

External 标号引用语法（如 `[External: ADR-0031]`）待 ADR-0061 单独立法，本次不引入。

### D6：不变式自给自足

Invariant 的 value **必须自给自足**——核心断言完整 inline 写入，不允许"完整清单见 X"。

例：

```yaml
### inv-3
- value: |
  Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；
  Infra 只回答事实不做判定；
  Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter
```

禁用清单（fs/net/child_process/process.env/process.std*/EventEmitter）inline 写在 value 里，不甩到外部文档。

### D7：OXL 子 Domain 拆分触发条件

OXL 当前在 Engine Domain 内（1 个 term）。若 OXL 相关契约词 > 5 个（如未来增加 OXL Compiler / OXL Registry / OXL Pipeline 等契约词），触发拆出 `oxn-engine-oxl-domain`（依 RFC §2.2 命名规则）。本 ADR 不立即拆分。

### D8：Domain 视角隔离

<!-- allow-version -->
> **Runtime Implementation Status (2026-07-17)**: ✅ **Implemented**（[ADR-0061 §D2](../0061-data-flow-contract.md) + v0.7.3 RFC §4 P3）
<!-- /allow-version -->
>
> - `renderContextHuman` 在 multi-view 块状渲染中**强制标注 `[Domain 名]` 行内前缀**（`[oxn-engine-domain [main]]` / `[oxn-domain [background]]` / `[oxn-engine-domain [name-only]]`）
> - AI 上下文能看到每个 desc 的视角来源，不会把不同视角的 desc 当成同一断言的多重确认
> - 视角隔离原则在 runtime 层有显式落地，不再是纯纸面规范
<!-- allow-version -->
> - 依据：[v0.7.3 理想态数据流 RFC §2.2 + §5.4 ADR 一致性](../rfcs/v0.7.3-ideal-data-flow-rfc.md)
<!-- /allow-version -->

Term desc 仅描述**本 Domain 视角**的 What；跨视角信息由子 Domain 自有 term + references 表达。

**约束（2026-07-17 修订）**：

- Term desc **不可**包含指向其他 sub Domain 同名 term 的 MD link（sub ↔ sub 互引造成双向耦合，违反视角隔离）
- root → sub MD link 受 ADR-0059 §D2 保护，不受本节约束
- 跨 Domain 视角信息表达机制：
  1. 子 Domain 自有同名 term 描述该视角下的具体特性（依 ADR-0059 §D2 "重名不重定义"）
  2. 跨 Domain 消费关系由 references frontmatter 表达（sub→root DAG）；不通过 desc 内 MD link 互通
- 违反示例：Engine Domain `### IAPError` desc 描述"通过 stdout JSON 输出"（CLI 视角），CLI Domain `### ExitCode` desc 描述"错误代码 2"（错误类型视角）——这是视角跨越，应拆分到各自的 Domain

### D9：代码物理 ≠ Domain 归属

Domain 归属按**语义边界**切，不按代码目录切。

**判据（2026-07-17 修订）**：

- Domain 归属判据：术语的**语义视角归属**（业务/架构/错误处理/CLI 消费），而非代码物理路径
- 共享契约词（被多个 Domain 视角共同消费）归 root 或最相关子域；不按物理位置（如 `packages/engine/src/kernel/errors/`）直接归 Engine Domain
- 处理方式（stdout/stderr/exit code 等进程 IO 概念）属**消费侧** Domain（CLI），不属错误类型定义侧 Domain（Engine）
- 违反示例：把 IAPError/OXNCrash/CliInputError 的代码物理位置在 `packages/engine/src/kernel/errors/`，就简单归 Engine Domain；但三个错误类型的"错误处理"语义归 CLI 视角（stdout/stderr/exit code），导致 Engine Domain desc 写了 CLI 视角的处理方式——违反 D8 视角隔离

## 影响

| 模块 | 改动 |
|---|---|
<!-- allow-version -->
| `oxn-engine-domain.md` v0.4 → v0.4.1 | 删 7 词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）；9 个保留 term 的 desc 按 D5 清理 |
| `oxn-domain.md` v0.4 → v0.4.1 | 新增 OXL 顶层特性词（16 → 17） |
| `oxn-cli-domain.md` v0.4 → v0.4.1 | 删 2 处 SSOT 代码路径引用 |
| `oxn-work-domain.md` v0.2 → v0.2.1 | 删 1 处 docs 引用 |
| `oxn-asset-domain.md` v0.2 → v0.2.1 | 删 1 处 docs 引用 |
<!-- /allow-version -->
| `docs/zh-cn/dev/oxn-engine.md` | 已承担 7 个被删词的实现细节描述（§"OXL 解析链路" / §"模块结构"）；无需大改 |
| RFC §2 全景图 | Engine 域 terms 列表去掉 7 词；root terms 列表加 OXL |
<!-- allow-version -->
| RFC §2.1 演进表 | 新增 v0.4.1 行 |
<!-- /allow-version -->
| `remark-canonical.ts` | 未来增强：D5.1-D5.4 校验作为可选 strict mode（本次不实现） |

## 兼容性

- Engine Domain 删 7 词是 **deleting-only breaking change**——已被这些词的 desc 引用的其他文档（docs/zh-cn/dev/oxn-engine.md）已承载同等描述
- root oxn-domain 新增 OXL term 是 **adding-only**——不影响任何依赖

## 验证

- `oxn domain validate` × 7 全通过
- `bun test`：backlinks / transformer 测试不受影响
- grep 确认：所有 Domain desc/invariant 中无 `](../../../docs/` 或 `](../../docs/` markdown link 残留
- grep 确认：所有 Domain desc/invariant 中无 `src/...` 或 `packages/.../src/...` 代码路径残留

## 与其他 ADR/RFC 的关系

- **ADR-0059 §D2（sub→root 引用）**：D5.6 扩展 ADR-0059 允许 Domain 间 MD link 作为 What 引用
- **ADR-0059 §D7（citations 处理）**：本 ADR 不动 citations 语义
<!-- allow-version -->
- **RFC v0.7 §2.1 v0.4.1 行**：本 ADR 是其落地约束
<!-- /allow-version -->
- **ADR-0052（Langium 退役）**：作为 ADR 引用保留例；cli-domain `forbidden-constructs` desc 名词陈述句 "Langium 退役（ADR-0052）" 是 D5.5 合规引用