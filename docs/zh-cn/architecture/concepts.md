# 2. 核心概念

## L0-L3 四层架构

OpenXenon 采用四层架构设计，各层职责分明：

```
┌─────────────────────────────────────────────────────────────────┐
│ L3: Runtime (应用交互层)                                        │
│ 职责: 系统入口，人/AI 交互，进程守护，视图渲染                   │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐       │
│ │    CLI    │ │   Daemon  │ │   Skill   │ │    Hall   │       │
│ │ 外部指令集 │ │ 后台监控   │ │ AI 助手技能│ │ 可视化研讨厅│       │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ L2: Domain (领域实体层)                                         │
│ 职责: 资产实例的生命周期管理, 任务编排与执行                    │
│ ┌───────────────────────────────┐ ┌─────────────────────────┐ │
│ │   Arsenal (资产域)              │ │   Work (执行域)          │ │
│ │ 核心资产: Blueprint/Part/Probe │ │ 核心类型: Task/Plan/Exp  │ │
│ │ - Forge (打造草稿)             │ │ 与 Blueprint.type 强绑定 │ │
│ │ - Promote (提升正式)           │ │                         │ │
│ └───────────────────────────────┘ └─────────────────────────┘ │
└────────────────────────────┬────────────────────────────────────┘
                             │ 依赖 L1 进行 IO 与文本解析
┌────────────────────────────▼────────────────────────────────────┐
│ L1: Foundation (基建层)                                          │
│ 职责: 提供领域语言解析能力 与 宿主环境副作用收口                 │
│ ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│ │   OXN DSL (语义基座)    │ │     Infra (物理基座)         │   │
│ │ - Grammar (语法定义)    │ │ - FsPort (文件系统)          │   │
│ │ - Parser (解析器)      │ │ - PathPort (路径计算)        │   │
│ │ - Validator (校验器)   │ │ - ProbePort (系统观测)       │   │
│ └─────────────────────────┘ └─────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────┘
                             │ 供给 L0 数据与接口契约
┌────────────────────────────▼────────────────────────────────────┐
│ L0: Kernel (核心真空层)                                         │
│ 职责: 绝对的逻辑圣殿，零依赖，零 IO                             │
│ ┌────────────┐ ┌────────────┐ ┌────────────────────────────┐  │
│ │   Schema   │ │  Contract  │ │        Processor            │  │
│ │ (数据骨架)  │ │ (外部插座)  │ │     (纯逻辑推演机)         │  │
│ └────────────┘ └────────────┘ └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

**层次说明**：
- **L0 Kernel**：纯数据契约 + 纯逻辑推演，零 IO
- **L1 Foundation**：OXN DSL 语义解析 + Infra 宿主适配
- **L2 Domain**：Arsenal 资产生命周期 + Work 执行单元
- **L3 Runtime**：CLI/Daemon/Skill/Hall 对外交互

---

## Blueprint

Blueprint 是 OpenXenon 的"工程图"，定义了任务的完整结构。

### Blueprint 结构

```yaml
name: 我的任务
type: task
parts:
  - id: build
    ref: parts/build
  - id: test
    ref: parts/test
    deps: [build]
```

### Blueprint 的两个视角

- **对工程师**：可读的 YAML，包含任务描述、零件编排
- **对系统**：机器可解析的结构化数据，用于执行调度

### Blueprint 与 Work 的类型绑定

Work 的 type 与 Blueprint 的 type 强绑定：
- `Task` 类型的 Work，只能实例化 `type: task` 的 Blueprint
- `Plan` 类型的 Work，只能实例化 `type: plan` 的 Blueprint
- `Explore` 类型的 Work，只能实例化 `type: explore` 的 Blueprint

---

## Part

Part 是 L2 的"零件"，包含 target/action/spec/probes 四字段，内置 _version 版本号。

### Part 结构

```yaml
name: build
_version: 1
target:
  description: "构建项目"
action:
  description: "运行 npm run build"
spec:
  description: "构建产物必须存在于 dist/"
probes:
  - ref: fs_exists
    parameters:
      pattern: "dist/index.js"
```

### Part 四字段结构

| 字段 | 可见性 | 含义 |
|------|--------|------|
| `target` | 对 AI 可见 | 约束执行的作用域 |
| `action` | 对 AI 可见 | 下发给 AI 的执行指令 |
| `spec` | 对 AI 不可见 | 工程师对意图的结构化约束 |
| `probes` | 对 AI 不可见 | 校验该工序是否完成的探针集合 |

---

## Probe

Probe 是 L1 的"原子检查"，通过物理观测获取事实，由 Kernel 纯函数判定结果。

### 内置 Probe 类型

| 类型 | 能力层实现 | 评判层逻辑 |
|------|-----------|-----------|
| `fs_exists` | `glob()` 扫描文件系统 | `found.length > 0` |
| `fs_not_exists` | `glob()` 扫描文件系统 | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `pattern.test(content)` |
| `shell_exec` | `spawn()` 执行命令 | `exitCode === 0` |

---

## Arsenal

Arsenal 是 OpenXenon 的"资产库"，存放所有标准资产。

### 资产类型

| 类型 | 层级 | 描述 |
|------|------|------|
| **Probe** | L1 | 原子化检查 |
| **Part** | L2 | 零件，含 target/action/spec/probes |
| **Blueprint** | L3 | 蓝图，定义完整执行拓扑 |

### Arsenal 物理结构

```
.openxenon/arsenal/
├── blueprints/
│   ├── drafts/<name>/       ← Forge 产出
│   └── formal/<name>/      ← Promote 产出
├── parts/
│   ├── drafts/<name>.oxn
│   └── formal/<name>.oxn
└── probes/
    ├── drafts/<name>.oxn
    └── formal/<name>.oxn
```

类型是第一级分类维度，状态（drafts/formal）嵌套在类型内部。

### 生命周期

所有 Arsenal 资产必须经过两态生命周期：

```
Draft ──[oxn arsenal promote]──▶ Formal
```

---

## Work

Work 是 OpenXenon 的"执行单元"，是 Blueprint 的实例化运行时。

### Work 类型

| 类型 | 说明 | Blueprint.type 绑定 |
|------|------|---------------------|
| **Task** | 任务执行 | `task` |
| **Plan** | 计划编排 | `plan` |
| **Explore** | 探索执行 | `explore` |

### Work 生命周期

1. **CREATED** - Work 已创建，Blueprint 已编译为 Frozen
2. **IN_PROGRESS** - Work 正在执行
3. **PASSED** - 所有 Part 和 Probe 通过
4. **FAILED** - 某个 Probe 失败

### Work 执行流程

1. AI 通过 `oxn work resume <work-id>` 获取下一个 Part
2. AI 执行 Part 工作（写代码、跑命令）
3. AI 通过 `oxn work complete <work-id>` 提交结果
4. Kernel 用 Probe 校验 Artifact，判定成败
5. 重复直到所有 Part 通过

---

## Hall (研讨厅)

Hall 是 OpenXenon 的"研讨厅"，提供项目状态的可视化视图。

### 功能

- 查看 Work 列表和状态
- 查看 Draft/Formal 资产
- 查看执行轨迹和判定结果

### CLI 命令

```bash
oxn hall              # 打开研讨厅
oxn hall --open       # 在浏览器中打开
```

---

## 术语表

### 系统角色

| 术语 | 定义 |
|------|------|
| **工程师** | 提供高层意图和约束，不直接写代码 |
| **AI 助手** | 解析工程师意图，生成 Blueprint 和代码 |
| **oxn CLI** | 命令行入口，不依赖 Daemon 即可使用核心功能 |

### L0-L3 架构

| 层级 | 组件 | 职责 |
|------|------|------|
| **L0** | Schema/Contract/Processor | 数据契约 + 纯逻辑推演 |
| **L1** | OXN DSL + Infra | 语义解析 + 宿主适配 |
| **L2** | Arsenal + Work | 资产管理 + 执行调度 |
| **L3** | CLI/Daemon/Skill/Hall | 外部交互 |

### 核心概念

| 术语 | 定义 |
|------|------|
| **Blueprint** | 任务的完整结构定义，编排多个 Part |
| **Part** | 零件，包含 target/action/spec/probes |
| **Probe** | 原子化检查（如 fs_exists、shell_exec） |
| **Work** | Blueprint 的实例化执行单元 |
| **Hall** | 研讨厅，项目状态可视化 |

---

## 概念关系图

```
L3 Runtime
  └── CLI / Daemon / Skill / Hall

L2 Domain
  ├── Arsenal ──► Blueprint / Part / Probe
  └── Work ─────► Task / Plan / Explore

L1 Foundation
  ├── OXN DSL ──► Grammar / Parser / Validator
  └── Infra ─────► FsPort / PathPort / ProbePort

L0 Kernel
  └── Schema / Contract / Processor
```

---

## 下一章

下一章将介绍 [CLI 命令参考](../guides/cli-reference.md)。