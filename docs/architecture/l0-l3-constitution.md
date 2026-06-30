# L0-L3 四层架构宪法

> **本文档是 OpenXenon 自身的元域（Meta-Domain）聚合根。**
>
> OpenXenon 内部存在两个完全独立的限界上下文（Bounded Context）：
>
> | 限界上下文 | 文档 | 受众 | 治理对象 |
> |---|---|---|---|
> | **用户业务域** | [`domain.md`](./domain.md) | 使用 OXL 定义业务的工程师 | 用户写什么 `.oxn` 约束 AI |
> | **OXN 元域** | 本文档 | 开发/维护 OXN 的架构师 | OXN 引擎自身的代码组织 |
>
> 二者通过**上下文映射**（Context Mapping）连接（见 §8），不可互相包含。

---

## 目录

- [1. 宪法原则](#1-宪法原则)
- [2. 四层定义](#2-四层定义)
- [3. 物理文件归属](#3-物理文件归属)
- [4. 依赖规则](#4-依赖规则)
- [5. 与其他文档的关系](#5-与其他文档的关系)
- [6. 命名决策史](#6-命名决策史)
- [7. 审计报告（附录）](#7-审计报告附录)
- [8. 上下文映射：与 domain.md 的边界](#8-上下文映射与-domainmd-的边界)

---

## 1. 宪法原则

### 1.1 内层不依赖外层

参考 CPU L0-L3 缓存设计：**内层是外层的"高纯度提炼"**。L0 Kernel 不 import L1+ 任何模块；L1 Foundation 不依赖 L2/L3；L2 Module 不依赖 L3。

### 1.2 三类流转

| 流转 | 路径 | 说明 |
|---|---|---|
| **资产流** | `Drafts ─[Promote]─▶ Arsenal` | v0.0.x 兼容（资产生命周期） |
| **执行流** | `Work ─[Type 绑定]─▶ Blueprint → Part → Artifact` | 运行时任务执行 |
| **验证流** | `Artifact ─[L1 Infra 观测]─▶ L0 Kernel 判决 ─[pass]─▶ frozen.json` | 物理观测 + 纯函数判定 |

---

## 2. 四层定义

### 2.1 L0 Kernel（核心真空层）

- **职责**：纯逻辑推演，零 IO。基于 Schema 校验事实，生成 `frozen.json` 快照
- **核心约束**：纯函数、零 IO、零状态
- **包含模块**：Schema / Contract / Processor / 判定策略
- **子目录**：`src/kernel/schemas/` · `src/kernel/contracts/` · `src/kernel/processors/` · `src/kernel/verdicts/`
- **禁止**：`fs.*` / `net.*` / `child_process` / `process.env` / `process.std*` / `EventEmitter` / `require('fs' | 'path' | 'crypto' | 'http' | 'child_process' | 'os')`

> **注**：`src/kernel/verdicts/catalog.ts` 与 `src/kernel/verdicts/verdict.ts` 虽位于 `verdicts/` 目录，**不是 IO 探针**，而是 L0 内部的"判定策略注册表"（纯函数）与"探针元数据"（AI 可见语义）。**物理 IO 探针**在 L1 `src/infra/probes/`，由 `src/kernel/verdicts/verdict.ts` 的 `PROBE_VERDICT_STRATEGIES` 纯函数判定。两层以 `verdicts` ↔ `probes` 命名对偶显式 L0 ⇄ L1 边界。

### 2.2 L1 Foundation（基础设施层）

- **职责**：DSL 解析 + 物理 IO 收口
- **核心约束**：所有物理 IO 必须通过 Port 接口（`FsPort` / `PathPort` / `ProbePort` / `HashPort` / `OsPort` / `PartPort`）；可被 mock 替换
- **包含模块**：
  - **OXL / OpenXenon Language**（Langium grammar / Parser / Validator / Generator / Contracts / Schemas / Scope）
  - **Infra**（Probes 物理执行 / Frozen IO / Explore 采集 / Sandbox / Loader / Hash / Process / Socket / FileSystem）
- **子目录**：`src/oxl/`（L1-OXL）+ `src/infra/`（L1-Infra）

### 2.3 L2 Module（业务 / 工程模块层）

- **职责**：业务与工程模块自治
- **核心约束**：模块间互不依赖；通过 Intent 资产化承载业务规则
- **包含模块**：
  - **Builtin**（OXN 编译后的二进制内置资产：`builtin/probes/*.oxn`、`builtin/blueprints/*.oxn`）
  - **Work**（Adapters / Policies / Sandbox / Explore）
- **子目录**：`src/builtin/` · `src/work/`

> **命名决策**：L2 原名 "Domain"（与 OXL 的 `Domain` 实体同名产生歧义），按 ADR-0006 改名为 **Module**。详见 §6.1。

### 2.4 L3 Runtime（入口 / 外部交互层）

- **职责**：系统入口、人/AI 交互、进程守护、视图渲染
- **核心约束**：入口层不持有业务规则；所有用户交互调用 L2/L1/L0
- **包含模块**：
  - **CLI**（`oxn` 命令集合）
  - **Daemon**（Engine / IPC / Radar / Trace / Types）
  - **Hall**（Web UI，🔜 v0.2）
  - **Skill**（AI 助手技能包）
  - **Watcher**（文件监听）
  - **Core**（错误字典 / IAPError / OXNCrash）
  - **i18n**（多语言）
- **子目录**：`src/cli/` · `src/daemon/` · `src/skills/` · `src/watcher/` · `src/core/` · `src/i18n/`

---

## 3. 物理文件归属

| 层级 | 子层 | 物理位置 | 角色 |
|---|---|---|---|
| **L0 Kernel** | L0-Schema | `src/kernel/schemas/` *(含 `enums.ts` 类型枚举与 `types/` 子目录)* | 数据骨架（Zod / Type） |
| **L0 Kernel** | L0-Contract | `src/kernel/contracts/` | 外部插座（Port 接口） |
| **L0 Kernel** | L0-Processor | `src/kernel/processors/` `src/kernel/verdicts/` | 纯逻辑推演机 |
| **L1 Foundation** | L1-Infra | `src/infra/` | 物理 IO 与探针执行 |
| **L1 Foundation** | L1-OXL | `src/oxl/` *(compiler/ 仅含语法解析与全局索引)* | 语言解析 + 编译生成 |
| **L2 Module** | L2-Builtin | `src/builtin/` | 编译后内置资产（.oxn 资源） |
| **L2 Module** | L2-Work | `src/work/` | 编排与执行（adapters / policies / sandbox / explore） |
| **L3 Runtime** | L3-CLI | `src/cli/` `src/daemon/` `src/skills/` `src/watcher/` `src/core/` `src/i18n/` | 入口与外部交互 |

> **L0 Kernel 公开面（v0.1.4 PR-K 修订）**：
>
> L0 Kernel 的 4 子层（`contracts/` `schemas/` `processors/` `verdicts/`）是**内部职责分工**，**对外透明**。
> L1/L2/L3 调 Kernel 时，**唯一合法入口**是 `src/kernel/index.ts`（或简写 `src/kernel`）：
> ```ts
> // ✅ 合法
> import { FrozenProofSchema, topologicalSortGeneric, IAPError } from '../kernel/index'
> import { judge } from '../kernel'
>
> // ❌ 黑名单（已被 validate-deps 拦截）
> import { FrozenProofSchema } from '../kernel/schemas/proof-schema'
> import { topologicalSortGeneric } from '../kernel/processors/dag'
> import { IAPError } from '../kernel/contracts/iap-error'
> ```
>
> L0 内部 4 子层之间互相 import **自由**——它们是包内组织，外部不可见（类比 npm `exports` 字段：决定公开面，`src/` 内怎么分目录是包自己的事）。

> **Oxl 命名澄清**：
> - `src/oxl/builtin/` 装 **OXL 格式的资产源**（`.oxn` 文件 + Schema 定义）
> - `src/builtin/` 装 **二进制内置资产**（运行时通过 Loader 加载）
> - 二者关系：`oxl/builtin` 是 Builtin 的"源"，`builtin/` 是"产物"
> - 旧 Arsenal v0.0.x 时代 `src/arsenals/` 已废弃（commit `7cdadb9` / `bad4a12`）

---

## 4. 依赖规则

### 4.1 简化规则（v0.1.4 PR-K 修订）

PR-K 把 8 子层白名单矩阵**简化为 1 条规则**：

> **L1/L2/L3 调 Kernel 时，只能走 `src/kernel/index.ts`（或简写 `src/kernel`）。**
> 走子层路径（`src/kernel/contracts/xxx` / `src/kernel/schemas/xxx` / `src/kernel/processors/xxx` / `src/kernel/verdicts/xxx` / `src/kernel/enums.ts` / `src/kernel/constants.ts`）**全部黑名单**。

**核心理念**：Kernel 的 4 子层是**内部职责分工**，不是外部访问控制。L1/L2/L3 看 Kernel 是一个**单一 L0 黑盒**，只通过 `index.ts` 暴露的 export 列表与之交互。

L0 内部 4 子层（`contracts/` `schemas/` `processors/` `verdicts/`）互相 import **自由**——它们是包内组织，外部不可见。L0 内部禁止自我 import `index.ts`（避免循环依赖）——由 `eslint.config.js` 拦截。

### 4.2 L1-L2-L3 跨层规则（旧 8 子层矩阵压缩为 6 大类）

L1/L2/L3 互相之间的依赖仍按"内层不依赖外层"原则：

| 来源层（调用方） | 可以依赖 | 禁止依赖 |
|---|---|---|
| **L0-Kernel** | （无；L0 只能 import 同子层） | L1-Infra, L1-OXL, L2-Builtin, L2-Work, L3-CLI |
| **L1-Infra** | L0-Kernel | L2-Work, L3-CLI |
| **L1-OXL** | L0-Kernel | L2-Builtin, L2-Work, L3-CLI |
| **L2-Builtin** | L1-Infra, L0-Kernel | L2-Work, L3-CLI |
| **L2-Work** | L1-Infra, L1-OXL, L0-Kernel | L3-CLI |
| **L3-CLI** | L2-Builtin, L2-Work, L1-Infra, L1-OXL, L0-Kernel | （无） |

### 4.3 强制执行

- **CI 验证**：[`.github/workflows/validate-deps.yml`](../../.github/workflows/validate-deps.yml) 在 push/PR 时跑 `bun scripts/validate-dependencies.ts`
- **测试护栏**：`tests/kernel/architectural-guard.test.ts` 守护 L0 Kernel 零 IO 与零外层依赖
- **ESLint**：`eslint.config.js` 对 L0 内部禁止 fs/net/child_process/Infra + 禁止自我 import `index.ts`

---

## 5. 与其他文档的关系

| 文档 | 视角 | 与本文关系 |
|---|---|---|
| [`docs/core/document.md`](../core/document.md) §2.4-§2.5 | OXN Engine 三模块（Kernel/Infra/Daemon） | 等价互补：本文 = 代码分层视角；document.md = Runtime 视角 |
| [`README.md` §7](../../README.md) | 用户视角的 L0-L3 | 入门指引；完整定义见本文 |
| [`domain.md`](./domain.md) | 用户业务域（DDD Bounded Context） | 上下文映射（见 §8） |
| [`blueprint.md`](./blueprint.md) | Blueprint 实体深读 | Blueprint 位于 L1 OXL |
| [`work-and-task.md`](./work-and-task.md) | Work + Task 实体深读 | 位于 L2 Module |
| [`state.md`](./state.md) | 双层 state.json | 物理位置在 L2 Work 与 L3 CLI 共同维护 |

### 5.1 三视角的等价与互补

| 视角 | 提问 | 答案 |
|---|---|---|
| **OXN Engine 三模块** | "运行时怎么执行？" | Kernel（纯逻辑）→ Infra（IO）→ Daemon（守护 + 逃逸） |
| **L0-L3 四层** | "代码怎么组织？" | L0 Kernel / L1 Foundation / L2 Module / L3 Runtime |
| **IAP 三轴** | "权力怎么分配？" | Intent（工程师） / Align（AI） / Proof（OXN） |

三个视角正交但同源——L0-L3 是 IAP 范式在代码物理世界的投影。

---

## 6. 命名决策史

### 6.1 L2 Domain → L2 Module（ADR-0006 摘要）

**动机**：OXL 有 `Domain` 实体（DDD 限界上下文），位于 L2 层；"L2 Domain" 命名既可指层也可指实体，产生歧义。

**决策**：L2 改名为 **Module**，包含三个并列子模块：**Arsenal**（v0.0.x 兼容） + **Domain**（DDD） + **Work**。当前 v0.0.x Arsenal 已废弃（`src/arsenals/` 已删除），L2 Module 实际为 **Builtin + Work** 两个子模块。

### 6.2 术语演化

| 旧术语 | 新术语 | 演化 commit |
|---|---|---|
| Stage | Slot（Blueprint）/ Part（Task） | v0.1 DDD dual-layer |
| Task | Work | v0.1-final |
| Arsenal | Builtin / Work | `7cdadb9` |
| YAML / JSON Blueprint | OXL | v0.1 |

### 6.3 L0-L3 vs P0-P3 区分

| 概念 | 维度 | 命名空间 |
|---|---|---|
| **L0-L3** | 代码架构层（内层不依赖外层） | `src/` 物理位置 |
| **P0-P3** | 产品路线图（涌现路径台阶） | `phase` / `cli` 子命令 |

二者正交：L0-L3 描述"代码在哪"，P0-P3 描述"下一步做什么"。

---

## 7. 审计报告（附录）

### 7.1 审计方法

```bash
# 1. 依赖图扫描
bun scripts/validate-dependencies.ts

# 2. L0 Kernel 护栏测试
bun test tests/kernel/architectural-guard.test.ts

# 3. 类型检查
bun run typecheck

# 4. 目录树扫描
find src -maxdepth 2 -type d | sort
```

### 7.2 偏差清单（基线 2026-06-07）

#### 7.2.1 脚本与测试基础设施问题（已修复）

| ID | 严重度 | 偏差 | 修复 |
|---|---|---|---|
| **C-1** | 🔴 High | `scripts/validate-dependencies.ts` `return` 应为 `continue`（早退导致 `src/core/` 之后所有层未被扫描） | 已修 |
| **C-2** | 🔴 High | 脚本未识别 `import type` 语句（误报 7 个 type-only 依赖为真实违规：`DagNode`/`DagValidationResult` + 4 个 enums + `HashPort`） | 已修 |
| **C-3** | 🟡 Med | 脚本未跳过 `__tests__/` 与 `*.test.ts` 文件（test 文件按 relaxed 规则处理；3 个 test 违规被隐藏） | 已修 |
| **C-4** | 🟡 Med | L2 引用 `L2-Arsenal`（目录已删除），未映射 `src/builtin/` | 已修（→ L2-Builtin） |
| **C-5** | 🟡 Med | L3 映射缺失 `src/skills/` `src/watcher/` `src/core/` `src/i18n/` | 已修（全部归 L3-CLI） |
| **C-6** | 🟡 Med | `L1-Infra` allowedDeps 含 `L2-Arsenal`（已不存在） | 已修（移除） |
| **C-7** | 🟡 Med | `tests/kernel/architectural-guard.test.ts` 检查 `arsenals`（目录已不存在） | 已修（→ builtin） |
| **C-8** | 🟢 Low | 脚本入口未指向本文档 | 已修（头部加宪法引用注释） |

#### 7.2.2 文档化偏差（已文档化）

| ID | 偏差 | 文档位置 |
|---|---|---|
| **C-9** | `src/oxl/builtin/` vs `src/builtin/` 命名重叠 | §3 末尾命名澄清 |
| **C-10** | `src/kernel/probes/` 命名易与 L1 `src/infra/probes/` 混淆 | §2.1 末尾注（已重命名 `probes` → `verdicts`） |
| **C-11** | `package.json` 描述为"面向大语言模型的工程化控制引擎"，未体现 L0-L3 / IAP 定位 | 待办（见 7.4） |

### 7.3 修复后基线

| 指标 | 修复前 | 修复后 |
|---|---|---|
| `validate-dependencies.ts` violations | 12 | **3** |
| `architectural-guard.test.ts` | 18/18 pass | 18/18 pass（语义刷新：arsenals→builtin） |
| `typecheck` | pass | pass |
| 扫描文件数 | 145（含早退） | 206（完整） |
| 跳过 type-only imports | 0 | 112 |
| 跳过 test 文件 | 0 | 29 |

### 7.4 残留问题与待跟进（架构决策待办）

v0.1.4 PR-K（Kernel 公开面收敛）落地后：
- **4 条违规已消除**（R-1 / R-2 / R-3 / R-5）：全部通过改 import 路径走 `kernel/index` 解决，零物理文件移动。
- **2 条违规仍存**（R-4 / R-6）：L1-OXL → L2-Work 越界，与 Kernel 公开面正交，留待后续 PR 决策。

#### 残留 1（已解决，PR-B）：L0-Processor → L3-CLI (IAPError 反向依赖)

- **状态**：✅ **已解决**（PR-B `140f9f5`）
- **原位置**：`src/kernel/verdicts/catalog.ts:435` 从 `src/core/errors` 导入 `IAPError` / `IAPAction`
- **修复**：`src/core/errors/iap-error.ts` → `src/kernel/contracts/iap-error.ts`（L0-Contract）。`src/core/errors/index.ts` 加 re-export 保持 L3 现有 5 个 importer 兼容。`catalog.ts` 改 `from '../contracts/iap-error'`。
- **结果**：消除 1 条 validate-deps 违规，984 → 985 测试全绿。

#### 残留 2（已解决，PR-K）：L1-Infra → L0-Processor (PROBE_CATALOG)

- **状态**：✅ **已解决**（PR-K 公开面收敛）
- **原位置**：`src/infra/explore/collector.ts:10` value import `PROBE_CATALOG`
- **修复**：无需物理文件移动——`PROBE_CATALOG` 仍在 `verdicts/catalog.ts`，但 `kernel/index.ts` 把它 re-export 出去了。`collector.ts` 改 `from '../../kernel/index'`。
- **结果**：消除 1 条违规，且未来任何 L1+ 文件调 PROBE_CATALOG 都不再需要走子层路径。

#### 残留 3（已解决，PR-K）：L1-OXL → L0-Processor (topologicalSortGeneric)

- **状态**：✅ **已解决**（PR-K 公开面收敛）
- **原位置**：`src/oxl/validators/blueprint-dag.ts:2` value import `topologicalSortGeneric`
- **修复**：零物理移动。`topologicalSortGeneric` 仍在 `processors/dag.ts`，`kernel/index.ts` 把它 re-export。`blueprint-dag.ts` 改 `from '../../kernel/index'`。
- **哲学确认**：「纯函数本身就是计算契约」（与 Port 接口对消费者无差别）—— 验证了你的"4 子层 = 内部职责分工"理解。

#### 残留 4（已解决，PR-M · 方向 A）：L1-OXL → L2-Work (work/plan-hash) × 2

- **状态**：✅ **已解决**（PR-M · 方向 A · 整体迁位）
- **原位置**：
  - `src/oxl/compiler/work-domains-merger.ts:26` `import { hashText } from '../../work/plan-hash'`
  - `src/oxl/compiler/work-blueprints-merger.ts:19` `import { hashText } from '../../work/plan-hash'`
- **根因**（更深层）：**merger 物理位置错位**——`work-{domains,blueprints}-merger` 真实职责是"work 运行时索引构建器"（处理 `works/<w>/{domains,blueprints}.json`），与"解析 .oxn 语法"无关。物理错位到 L1-OXL 才引发 L1→L2 越界。
- **修复**：整体迁位 + 重命名
  - `src/oxl/compiler/work-domains-merger.ts` → `src/work/per-work-domains-merger.ts`
  - `src/oxl/compiler/work-blueprints-merger.ts` → `src/work/per-work-blueprints-merger.ts`
  - 2 个测试同步迁到 `src/work/__tests__/`
  - merger 自身 `from './plan-hash'`（同子层合法）
  - 4 个 importer 改路径（`cli/work.ts` 改 `'../work/per-work-*'`，`work-migrator.ts` 改 `'./per-work-*'`）
- **结果**：R-4 / R-6 全部消除（validate-deps 2 → 0）。merger 物理归属与真实职责一致。
- **hashText 归属**：merger 调 `plan-hash.ts` 内部的 `hashText`（L2-Work 同子层互引合法）。

#### C-12（已文档化，🟢 Low）：L0-Schema → L0-Contract (type-only)

- **位置**：`src/kernel/schemas/validators/compiled-schema.ts:2` `import type { HashPort } from '../../contracts/hash-port'`
- **状态**：✅ **合法**（PR-A 已文档化）
- **PR-K 修订**：随着 L0 4 子层对外透明（`kernel/index.ts` 唯一公开面），L0 内部 `import type { HashPort }` 形式保留——它是 L0 内部跨子层 type-only 互引，**外部不可见**。
- **决策方**：架构师于 v0.1.4 审计批准

#### C-13（v0.1.4 文档化，🟢 Low）：Kernel 公开面收敛 by index.ts

- **位置**：`src/kernel/index.ts`（新文件，PR-K 创建）
- **状态**：✅ **已落地**
- **设计哲学**：
  1. **纯函数本身就是契约**——`topologicalSortGeneric` / `judge` / `evaluatePredicate` 等纯函数是 Kernel 自带的"计算契约"，与 Port 接口（外层实现）对消费者无差别。
  2. **4 子层是内部职责分工**——`contracts/` `schemas/` `processors/` `verdicts/` 是 Kernel 包内 `src/` 目录组织，对外透明（类比 npm `exports` 字段）。
  3. **公开面 = index.ts**——L1/L2/L3 调 Kernel 只能 `import '.../kernel/index'`，禁止走子层路径。
- **修复成果**：
  - 旧 8 子层白名单矩阵（`LAYER_RULES`，4×4 表）→ 单条规则（L1+ 不能 `kernel/<sub>/<file>`）
  - 4 条 validate-deps 违规消除（R-1/R-2/R-3/R-5）
  - ESLint 加 L0 内部禁自我 `import './index'`（防循环）
  - 宪法 §3/§4.1/§7.4 同步重写
- **验证**：`bun scripts/validate-dependencies.ts` 6 → **2**（仅 R-4/R-6 与 Kernel 公开面正交，保留）
- **决策方**：架构师于 v0.1.4 审计批准

#### C-14（v0.1.4 文档化，🟢 Low）：merger 错位归位 by 方向 A

- **位置**：`src/work/per-work-domains-merger.ts` + `src/work/per-work-blueprints-merger.ts`（PR-M 创建）
- **状态**：✅ **已落地**
- **设计哲学**：
  1. **物理归属与真实职责一致**——merger 处理 `works/<w>/{domains,blueprints}.json` 运行时索引，是 L2-Work 的事；与"解析 .oxn 语法"无关。L1-OXL `compiler/` 应当只含"语法解析 + 全局索引"。
  2. **命名一致性**——`domain-index-builder` / `blueprint-index-builder` 是**全局**索引（扫 `.openxenon/{domains,blueprints}/` 全部）；per-work 索引应叫 `per-work-*-merger` 以显式区分。
  3. **错位归位解决越界**——R-4 / R-6 根因是 merger 错位；迁位后 L2-Work 同子层互引（`from './plan-hash'`）天然合法，无需特例。
- **修复成果**：
  - 2 个 merger + 2 个测试 git mv 保留历史
  - 4 个 importer 改路径（`cli/work.ts` + `work-migrator.ts`）
  - merger 自身 import 调路径（`scope` 改 `../oxl/scope/`，`domain-index-builder` 改 `../oxl/compiler/`，`plan-hash` 改 `./plan-hash`）
  - 宪法 §3 表格 L1-OXL 行加注"compiler/ 仅含语法解析与全局索引"
- **验证**：`bun scripts/validate-dependencies.ts` 2 → **0**。`bun test` 1008/1008 pass。
- **决策方**：架构师于 v0.1.4 审计批准

---

## 8. 上下文映射：与 domain.md 的边界

### 8.1 两个域的对比

| 维度 | 用户业务域（`domain.md`） | OXN 元域（本文档） |
|---|---|---|
| 治理对象 | AI 在具体业务中的行为 | OXN 引擎自身的代码 |
| 形式 | 用户写的 `.oxn` 文件 | `src/` 下的 TypeScript 代码 |
| 主体 | 工程师 + AI 协作 | OXN 架构师 |
| 变更频率 | 随业务变化 | 随 OXN 演进 |
| 一致性约束 | term/ban/invariant 强校验 | 内层不依赖外层 + 零 IO |

### 8.2 资产映射（用户域 → OXN 元域）

| 用户域资产 | OXN 元域物理位置 | 阶段 |
|---|---|---|
| Domain（`.oxn` 源） | L1 `src/oxl/builtin/` | OXL 解析 |
| Blueprint（`.oxn` 源） | L1 `src/oxl/builtin/` | OXL 解析 |
| 编译后 Builtin 资产 | L2 `src/builtin/` | 二进制内置运行时 |
| 用户项目资产 | L2 `.openxenon/domains/`, `.openxenon/blueprints/` | 项目运行时实例 |
| Work / Task（`.oxn` 源） | L1 `src/oxl/` | 解析 + 校验 |
| Task 运行时实例 | L2 `src/work/` + `.openxenon/works/` | 编排与执行 |

### 8.3 反向映射（OXN 元域 → 用户域）

| OXN 元域的层 | 对用户暴露的"接口" | 用户域能感知的 |
|---|---|---|
| L0 Kernel | `frozen.json` 判决 | ✅ 看到 verdict（PASS/FAIL） |
| L1 Infra | Probe 类型（如 `fs-exists`, `shell-exec`） | ✅ 引用探针名 |
| L1 OXL | `.oxn` 语法 | ✅ 写文件 |
| L2 Builtin/Work | `oxn` CLI 子命令 | ✅ 调用 CLI |
| L3 Runtime | `frozen.json` 路径 + Hall Web UI | ✅ 读路径 / 访问 UI |
| 内部实现（Probes/Verdict 策略） | 无 | ❌ 不可见（信息隐藏） |

### 8.4 关键边界规则

- `domain.md` **不**解释"Domain 实体在 OXN 引擎代码的哪个目录"
- 本文档 **不**解释"用户怎么写一个 `Domain.oxn`"
- 二者通过 §8.2 资产映射表连接；任何跨域引用必须显式标注"代码物理归属"或"用户语义"角色
