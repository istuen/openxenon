# 架构总览

> OpenXenon 严格的 **L0-L3 四层架构宪法**，确保核心逻辑真空、物理副作用收口、领域职责分离。
>
> **L2 命名为 Module**：避免与 OXN DSL 中的 `Domain` 实体产生歧义（详见 [ADR-0006](../adr/0006-l2-named-module.md)）。

## 1. 四层宪法

```
┌─────────────────────────────────────────────────────────────────┐
│ L3: Runtime（入口 / 外部交互）                                   │
│  职责：CLI / Daemon / Skill / Hall / VSCode Extension           │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐         │
│  │    CLI    │ │  Daemon   │ │   Skill   │ │   Hall    │         │
│  └───────────┘ └───────────┘ └───────────┘ └───────────┘         │
└────────────────────────────┬────────────────────────────────────┘
                             │ 调用
┌────────────────────────────▼────────────────────────────────────┐
│ L2: Module（业务 / 工程模块）                                     │
│  职责：DDD 限界上下文 + 资产生命周期 + 任务执行                    │
│  ┌───────────────┐ ┌───────────────┐ ┌─────────────────────┐  │
│  │   Arsenal     │ │    Domain     │ │       Work          │  │
│  │ 资产管理       │ │ DDD 限界上下文 │ │   Work + Task       │  │
│  │ (v0.0.x 兼容) │ │  (Intent)     │ │      (Align)        │  │
│  └───────────────┘ └───────────────└─────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ 使用
┌────────────────────────────▼────────────────────────────────────┐
│ L1: Foundation（基础设施）                                       │
│  职责：DSL 解析 + 物理 IO 适配                                   │
│  ┌──────────────────────┐ ┌──────────────────────────────────┐ │
│  │       OXN DSL        │ │             Infra                │ │
│  │  Grammar / Parser   │ │  FsPort / PathPort / ProbePort   │ │
│  │  Validator / Schema  │ │  收口所有 IO 副作用               │ │
│  └──────────────────────┘ └──────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ 依赖
┌────────────────────────────▼────────────────────────────────────┐
│ L0: Kernel（纯逻辑）                                              │
│  职责：Schema 校验 + Contract 约束 + Processor 推导              │
│  ┌──────────────┐ ┌──────────────┐ ┌────────────────────────┐  │
│  │    Schema    │ │   Contract   │ │       Processor        │  │
│  │  (Zod)       │ │              │ │ (DAG / TypeCheck)      │  │
│  └──────────────┘ └──────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. 层级职责

| 层级 | 名称 | 核心约束 | 包含模块 |
|---|---|---|---|
| **L0** | Kernel | 纯函数、零 IO、零状态 | Schema / Contract / Processor |
| **L1** | Foundation | DSL 解析 + 物理 IO 收口 | OXN DSL（Grammar/Parser/Validator）+ Infra（FsPort/PathPort/ProbePort） |
| **L2** | **Module** | 业务与工程模块自治 | Arsenal（v0.0.x 兼容）+ **Domain**（DDD 限界上下文）+ **Work**（编排器） |
| **L3** | Runtime | 入口与外部交互 | CLI / Daemon / Skill / Hall |

### L2 命名为 Module 的原因

> "L2 Domain" 容易与 OXN DSL 中的 `Domain` 实体混淆（Domain 是 DDD 限界上下文，不是分层名）。
>
> 故 L2 命名为 **Module**（模块层），涵盖 Arsenal、Domain、Work 三个并列模块。
>
> 详见 [ADR-0006: L2 命名为 Module](../adr/0006-l2-named-module.md)。

## 3. 三类流转

| 流转 | 路径 | 说明 |
|---|---|---|
| **资产流** | `Drafts ─[Promote]─▶ Arsenal` | v0.0.x 兼容，不在 v0.1 核心流程 |
| **编排流** | `Domain + Blueprint (Intent) ─[Work 引用]─▶ Task DAG (Align)` | v0.1 核心 |
| **执行流** | `Task.part ─[align Slot]─▶ Probe 验证 ─[pass]─▶ frozen.json` | 运行时 |
| **验证流** | `AI 执行 ─[Core 调用 Infra 观测]─▶ Kernel 纯函数判决 ─[写入 trace]` | 物理观测 + 纯函数判定 |

## 4. 核心约束

### L0 Kernel：零副作用
- 不得调用 `fs.readFileSync` / `process.exec` / `socket.send` 等 IO
- 不得维护运行时状态
- 不得使用 EventEmitter
- 所有调用必须是被动的：`Core → Infra → Kernel → return result`

### L1 Foundation：副作用收口
- 所有物理 IO 必须通过 `FsPort` / `PathPort` / `ProbePort`
- Port 实现可以替换为 mock，方便测试

### L2 Module：模块自治
- Domain 不得依赖其他 Domain 的 term（仅通过 context_map.imports 声明）
- Work 不得自行实现验证逻辑（必须通过 Probe）
- 三个模块（Arsenal / Domain / Work）互相独立，可独立演进

### L3 Runtime：入口
- 所有用户交互（CLI / Daemon / Skill / Hall）都调用 L2/L1/L0
- 入口层不持有业务规则

## 5. 物理文件归属

| 层级 | 物理位置 |
|---|---|
| L0 Kernel | `src/kernel/`, `src/oxn-dsl/schemas/` |
| L1 Foundation | `src/oxn-dsl/langium/`, `src/infra/` |
| L2 Module | `.openxenon/domains/`, `.openxenon/blueprints/`, `.openxenon/works/` |
| L3 Runtime | `src/cli/`, `src/daemon/`, `src/skills/`, `src/hall/`（待实现） |

> **L2 物理位置详细说明**：
> - `.openxenon/domains/` — Domain 实体文件
> - `.openxenon/blueprints/` — Blueprint 实体文件
> - `.openxenon/works/` — Work 实体文件 + Task 实体文件

## 6. 演进原则

| 原则 | 说明 |
|---|---|
| **L0 必须最先稳定** | Kernel 是基础，纯逻辑必须可证明正确 |
| **L1 依赖 L0** | DSL 解析结果必须是 L0 Schema 校验后的强类型数据 |
| **L2 依赖 L1** | Module 不得直接操作文件，必须通过 L1 Port |
| **L3 可独立演进** | CLI / Skill / Hall 可替换实现，调用接口稳定即可 |

## 7. 下一章

- [Domain 详解](./domain.md) — L2 Module 之一：业务限界上下文
- [Blueprint 详解](./blueprint.md) — L1 OXN DSL 的语义模板
- [Work + Task 详解](./work-and-task.md) — L2 Module 之一：编排与执行
- [State 详解](./state.md) — 双层 state.json
- [信息隐藏原则](./information-hiding.md)
