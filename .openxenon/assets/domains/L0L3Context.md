---
entity: domain
version: 0.3.0
name: L0L3Context
oxn-source-sha: 2d3b6d3ff99ac3325bb86f09309bc490f351ee2e3cf00ae5af9cbec7ab34e80a
synced-at: 2026-07-08T13:52:19.203Z
---

# Domain: L0L3Context

> OpenXenon 元域限界上下文：约束 L0-L3 四层架构的核心词汇、禁用词与业务不变量

## Terms

### Layer
- desc: 四层之一（L0/L1/L2/L3），描述代码在 src/ 树中的物理归属与依赖方向

### SubLayer
- desc: 八子层之一（Schema/Contract/Processor/Infra/OXN-DSL/Builtin/Work/CLI），是 CI validate-deps 的最小校验单位

### Kernel
- desc: L0 核心真空层，纯函数零 IO，包含 Schema/Contract/Processor 三个子层

### Foundation
- desc: L1 基础设施层，DSL 解析（OXL/OpenXenon Language）+ 物理 IO 收口（Infra）

### Module
- desc: L2 业务/工程模块层，包含 Builtin（资产）+ Work（运行时）

### Runtime
- desc: L3 入口/外部交互层，包含 CLI/Daemon/Hall/Skill/Watcher/Core/i18n

### Port
- desc: L1 物理 IO 收口接口（FsPort/PathPort/ProbePort/HashPort/OsPort/PartPort）

### Builtin
- desc: L2 编译后的二进制内置资产，位于 src/builtin/

### ContextMap
- desc: 跨域引用声明（DDD 术语），唯一允许的跨边界依赖方式

### Constitution
- desc: OXN 元域的聚合根文档，即 docs/architecture/l0-l3-constitution.md

### Violation
- desc: 违反 L0-L3 依赖规则的跨层引用，被 CI validate-deps.yml 自动拦截

## Bans

### forbidden-constructs
- items:
  - L2Domain
  - Tier
  - TierLevel
  - Stratum
  - Strata
  - ArsenalPromote
  - DraftAsset
  - CanonicalAsset
- desc: L2Domain, Tier, TierLevel, Stratum, Strata, ArsenalPromote, DraftAsset, CanonicalAsset

## Invariants

### inv-1
- value: L0 Kernel 不得 import 任何 L1+ 模块（src/kernel/ 内不出现 oxl/infra/builtin/work/cli/daemon/hall/skills/watcher/core/i18n 引用）

### inv-2
- value: L1 Foundation 不得 import L2/L3 模块

### inv-3
- value: L2 Module 不得 import L3 Runtime 模块

### inv-4
- value: L3 Runtime 允许 import 所有下层（入口层的特权）

### inv-5
- value: L0 Kernel 不得使用 fs / path / crypto / http / child_process / os / net 等平台 IO 模块

### inv-6
- value: L0 Kernel 不得访问 process.env / process.stdout / process.stdin

### inv-7
- value: L0 Kernel 不得使用 EventEmitter 或维护运行时状态

### inv-8
- value: L2 层命名为 Module 而非 Domain（避免与 OXL 的 Domain 实体产生歧义，参见 ADR-0006）

### inv-9
- value: L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图

### inv-10
- value: Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 context_map 显式连接，不可互相包含

### inv-11
- value: OXN 元域的宪法文档（l0-l3-constitution.md）不在用户业务域的文档体系内
