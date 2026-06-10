# L0-L3 四层架构宪法

> **本文档是 OpenXenon 自身的元域（Meta-Domain）聚合根。**
>
> OpenXenon 内部存在两个完全独立的限界上下文（Bounded Context）：
>
> | 限界上下文 | 文档 | 受众 | 治理对象 |
> |---|---|---|---|
> | **用户业务域** | [`domain.md`](./domain.md) | 使用 OXN DSL 定义业务的工程师 | 用户写什么 `.oxn` 约束 AI |
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
  - **OXN DSL**（Langium grammar / Parser / Validator / Generator / Contracts / Schemas / Scope）
  - **Infra**（Probes 物理执行 / Frozen IO / Explore 采集 / Sandbox / Loader / Hash / Process / Socket / FileSystem）
- **子目录**：`src/oxn-dsl/`（L1-OXN-DSL）+ `src/infra/`（L1-Infra）

### 2.3 L2 Module（业务 / 工程模块层）

- **职责**：业务与工程模块自治
- **核心约束**：模块间互不依赖；通过 Intent 资产化承载业务规则
- **包含模块**：
  - **Builtin**（OXN 编译后的二进制内置资产：`builtin/probes/*.oxn`、`builtin/blueprints/*.oxn`）
  - **Work**（Adapters / Policies / Sandbox / Explore）
- **子目录**：`src/builtin/` · `src/work/`

> **命名决策**：L2 原名 "Domain"（与 OXN DSL 的 `Domain` 实体同名产生歧义），按 ADR-0006 改名为 **Module**。详见 §6.1。

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
- **子目录**：`src/cli/` · `src/daemon/` · `src/hall/` · `src/skills/` · `src/watcher/` · `src/core/` · `src/i18n/`

---

## 3. 物理文件归属

| 层级 | 子层 | 物理位置 | 角色 |
|---|---|---|---|
| **L0 Kernel** | L0-Schema | `src/kernel/schemas/` | 数据骨架（Zod / Type） |
| **L0 Kernel** | L0-Contract | `src/kernel/contracts/` | 外部插座（Port 接口） |
| **L0 Kernel** | L0-Processor | `src/kernel/processors/` `src/kernel/verdicts/` `src/kernel/enums.ts` | 纯逻辑推演机 |
| **L1 Foundation** | L1-Infra | `src/infra/` | 物理 IO 与探针执行 |
| **L1 Foundation** | L1-OXN-DSL | `src/oxn-dsl/` | 语言解析 + 编译生成 |
| **L2 Module** | L2-Builtin | `src/builtin/` | 编译后内置资产（.oxn 资源） |
| **L2 Module** | L2-Work | `src/work/` | 编排与执行（adapters / policies / sandbox / explore） |
| **L3 Runtime** | L3-CLI | `src/cli/` `src/daemon/` `src/hall/` `src/skills/` `src/watcher/` `src/core/` `src/i18n/` | 入口与外部交互 |

> **Oxl 命名澄清**：
> - `src/oxn-dsl/builtin/` 装 **OXN DSL 格式的资产源**（`.oxn` 文件 + Schema 定义）
> - `src/builtin/` 装 **二进制内置资产**（运行时通过 Loader 加载）
> - 二者关系：`oxn-dsl/builtin` 是 Builtin 的"源"，`builtin/` 是"产物"
> - 旧 Arsenal v0.0.x 时代 `src/arsenals/` 已废弃（commit `7cdadb9` / `bad4a12`）

---

## 4. 依赖规则

### 4.1 八子层 allowedDeps 白名单

| 来源层 | 允许依赖 |
|---|---|
| **L0-Schema** | （无） |
| **L0-Contract** | L0-Schema |
| **L0-Processor** | L0-Schema, L0-Contract |
| **L1-Infra** | L0-Schema, L0-Contract, L2-Builtin |
| **L1-OXN-DSL** | L0-Schema, L0-Contract |
| **L2-Builtin** | L1-Infra, L0-Schema, L0-Contract |
| **L2-Work** | L1-Infra, L1-OXN-DSL, L0-Schema, L0-Contract, L0-Processor |
| **L3-CLI** | 全部下层 |

### 4.2 forbiddenDeps 黑名单

任何上层 → 下层的非法方向，CI `validate-deps.yml` workflow 自动拦截。

### 4.3 强制执行

- **CI 验证**：[`.github/workflows/validate-deps.yml`](../../.github/workflows/validate-deps.yml) 在 push/PR 时跑 `bun scripts/validate-dependencies.ts`
- **测试护栏**：`tests/kernel/architectural-guard.test.ts` 守护 L0 Kernel 零 IO 与零外层依赖

---

## 5. 与其他文档的关系

| 文档 | 视角 | 与本文关系 |
|---|---|---|
| [`docs/core/document.md`](../core/document.md) §2.4-§2.5 | OXN Engine 三模块（Kernel/Infra/Daemon） | 等价互补：本文 = 代码分层视角；document.md = Runtime 视角 |
| [`README.md` §7](../../README.md) | 用户视角的 L0-L3 | 入门指引；完整定义见本文 |
| [`domain.md`](./domain.md) | 用户业务域（DDD Bounded Context） | 上下文映射（见 §8） |
| [`blueprint.md`](./blueprint.md) | Blueprint 实体深读 | Blueprint 位于 L1 OXN DSL |
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

**动机**：OXN DSL 有 `Domain` 实体（DDD 限界上下文），位于 L2 层；"L2 Domain" 命名既可指层也可指实体，产生歧义。

**决策**：L2 改名为 **Module**，包含三个并列子模块：**Arsenal**（v0.0.x 兼容） + **Domain**（DDD） + **Work**。当前 v0.0.x Arsenal 已废弃（`src/arsenals/` 已删除），L2 Module 实际为 **Builtin + Work** 两个子模块。

### 6.2 术语演化

| 旧术语 | 新术语 | 演化 commit |
|---|---|---|
| Stage | Slot（Blueprint）/ Part（Task） | v0.1 DDD dual-layer |
| Task | Work | v0.1-final |
| Arsenal | Builtin / Work | `7cdadb9` |
| YAML / JSON Blueprint | OXN DSL | v0.1 |

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
| **C-5** | 🟡 Med | L3 映射缺失 `src/hall/` `src/skills/` `src/watcher/` `src/core/` `src/i18n/` | 已修（全部归 L3-CLI） |
| **C-6** | 🟡 Med | `L1-Infra` allowedDeps 含 `L2-Arsenal`（已不存在） | 已修（移除） |
| **C-7** | 🟡 Med | `tests/kernel/architectural-guard.test.ts` 检查 `arsenals`（目录已不存在） | 已修（→ builtin） |
| **C-8** | 🟢 Low | 脚本入口未指向本文档 | 已修（头部加宪法引用注释） |

#### 7.2.2 文档化偏差（已文档化）

| ID | 偏差 | 文档位置 |
|---|---|---|
| **C-9** | `src/oxn-dsl/builtin/` vs `src/builtin/` 命名重叠 | §3 末尾命名澄清 |
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

修复后剩 **3 个真实违规**（其中 1 个为本次审计新发现），需后续 PR 决策：

#### 残留 1（新发现，🔴 High）：L0-Processor → L3-CLI (IAPError 反向依赖)

- **位置**：`src/kernel/verdicts/catalog.ts:435` 从 `src/core/errors` 导入 `IAPError` / `IAPAction`
- **根因**：`IAPError` / `IAPAction` 是 IAP 范式核心数据契约，**逻辑属于 L0**（IAP = Intent-Align-Proof = 引擎内核范式），但物理放在 `src/core/errors/`（L3-CLI）。导致 L0 反而依赖 L3（外层依赖内层颠倒）
- **建议**：将 `IAPError` / `IAPAction` / `IAPErrorCode` / `IAPErrorContext` 从 `src/core/errors/iap-error.ts` 移到 `src/kernel/contracts/iap-error.ts`（L0-Contract）。`OXNCrash` / `cli-input-error` 留 L3
- **决策方**：架构师确认 IAP 错误语义归属后 1 个文件移动 + 1 个 importer 更新

#### 残留 2：L1-Infra → L0-Processor (PROBE_CATALOG)

- **位置**：`src/infra/explore/collector.ts:10` value import `PROBE_CATALOG`
- **根因**：L1 Explore collector 用 `PROBE_CATALOG` 生成"内置探针"列表做展示（display 关注点），但 L1 不应依赖 L0-Processor
- **建议 A**：将 `PROBE_CATALOG` 移到 `src/oxn-dsl/builtin/` 或新建 `src/oxn-dsl/catalog/probes.ts`（L1-OXN-DSL 持有"探针元数据"）
- **建议 B**：把 collector 移到 L2 Work（display 关注点本就不属于 L1 Infra）
- **决策方**：catalog 归属与 L1/L2 边界，需架构师评审

#### 残留 3：L1-OXN-DSL → L0-Processor (topologicalSortGeneric)

- **位置**：`src/oxn-dsl/validators/blueprint-dag.ts:2` value import `topologicalSortGeneric`
- **根因**：L1 validator 需要 L0 纯函数（不破纯逻辑约束），但 L1→L0-Processor 跨层
- **建议 A**：把 `topologicalSortGeneric` 移到 L0-Schema 或 L0-Contract（保持纯函数）
- **建议 B**：在 layer rules 中放开"L1-OXN-DSL 可调用 L0-Processor 的纯函数"特例
- **决策方**：需在宪法层面讨论"纯函数工具"是否应有一个 L0-Utility 子层

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
| Domain（`.oxn` 源） | L1 `src/oxn-dsl/builtin/` | OXN DSL 解析 |
| Blueprint（`.oxn` 源） | L1 `src/oxn-dsl/builtin/` | OXN DSL 解析 |
| 编译后 Builtin 资产 | L2 `src/builtin/` | 二进制内置运行时 |
| 用户项目资产 | L2 `.openxenon/domains/`, `.openxenon/blueprints/` | 项目运行时实例 |
| Work / Task（`.oxn` 源） | L1 `src/oxn-dsl/` | 解析 + 校验 |
| Task 运行时实例 | L2 `src/work/` + `.openxenon/works/` | 编排与执行 |

### 8.3 反向映射（OXN 元域 → 用户域）

| OXN 元域的层 | 对用户暴露的"接口" | 用户域能感知的 |
|---|---|---|
| L0 Kernel | `frozen.json` 判决 | ✅ 看到 verdict（PASS/FAIL） |
| L1 Infra | Probe 类型（如 `fs-exists`, `shell-exec`） | ✅ 引用探针名 |
| L1 OXN DSL | `.oxn` 语法 | ✅ 写文件 |
| L2 Builtin/Work | `oxn` CLI 子命令 | ✅ 调用 CLI |
| L3 Runtime | `frozen.json` 路径 + Hall Web UI | ✅ 读路径 / 访问 UI |
| 内部实现（Probes/Verdict 策略） | 无 | ❌ 不可见（信息隐藏） |

### 8.4 关键边界规则

- `domain.md` **不**解释"Domain 实体在 OXN 引擎代码的哪个目录"
- 本文档 **不**解释"用户怎么写一个 `Domain.oxn`"
- 二者通过 §8.2 资产映射表连接；任何跨域引用必须显式标注"代码物理归属"或"用户语义"角色
