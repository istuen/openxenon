## Context

当前 README.md 存在多处关键性架构描述错误，需要修正：

1. **Artifact 物理归属错误**：将 Artifact（真实产物）错误归类到 Work 空间，实际上应归属宿主项目目录
2. **L0 Kernel 职责越界**：描述 L0 "生成 frozen.json"，但 L0 禁止任何 IO，仅输出 Verdict
3. **主/从 Agent 架构缺失**：缺少 Main Agent（战略家）与 Sub Agent（执行者）的协同模型说明
4. **Artifact 绑定机制模糊**：Probe 参数如何与真实产物路径动态关联

## Goals / Non-Goals

**Goals:**
- 修正 README.md 中所有架构描述错误
- 建立清晰的 Main Agent / Sub Agent 协同模型
- 确立"边界与留痕"的核心架构哲学——不防贼，立界碑；不堵死，留铁证
- 明确 Artifact 通过 CLI CRUD 动态绑定到 Blueprint Probe 参数的机制

**Non-Goals:**
- 不修改任何代码实现（纯文档修正）
- 不引入新的功能或能力
- 不改变 OpenXenon 的架构设计，只修正描述偏差

## Decisions

### Decision 1: Artifact 物理归属修正

**选择**：明确 Artifact 归属宿主项目目录（如 `src/`），Work 空间只存储 Blueprint 实例和快照

**理由**：
- Artifact（源代码、配置文件）是项目本身的物理产物
- Work 空间是 OpenXenon 的元数据目录，存储 Blueprint 实例、frozen.json 等元数据
- 这符合 OpenXenon 的隔离原则——AI 在项目空间执行，Probe 在 OpenXenon 空间验证

### Decision 2: L0 Kernel 职责修正

**选择**：L0 只输出纯数据 Verdict，frozen.json 生成由 L2 Work 负责

**理由**：
- L0 是纯逻辑推演层，Kernel 公理规定其"零 IO"
- L2 Work 接收 L0 Verdict，通过 L1 Infra 将 Verdict + 当前 .oxn 快照写入 frozen.json
- 这消除了 Section 8.3 中 L0 越界描述的错误

### Decision 3: 主/从 Agent 协同模型确立

**选择**：确立 Main Agent（主 Agent/战略家）与 Sub Agent（执行 Agent/战术家）的分层架构

**架构**：

```
┌─────────────────────────────────────────────────────────────────┐
│  Main Agent (主 Agent - 战略家)                                  │
│  ├── 拥有全局视野：理解 Blueprint、Part、Probe 的完整意图       │
│  ├── 通过 CLI CRUD 调整边界：修改 <work-type>.oxn 中的 Probe    │
│  └── 权利：知道一切，调整一切；责任：一切调整皆留痕             │
│                                                                 │
│  Sub Agent (执行 Agent - 战术家)                                 │
│  ├── 视野受限：只关心 work next 返回的 target + action          │
│  └── 执行动作：构建 Artifact，提交验证                          │
└─────────────────────────────────────────────────────────────────┘
```

**理由**：
- Main Agent 掌握全局意图与验证标准，负责调度与通过 CLI CRUD 回填执行结果
- Sub Agent 仅接收 `target+action`，负责纯粹的物理构建，对验证标准"盲区"
- 这解决了"AI 不能感知 Probe"的过度防御问题——Main Agent 知道 Probe 是合法的

### Decision 4: Artifact 动态绑定机制

**选择**：AI 通过 CLI CRUD 将产物路径动态绑定到 Blueprint Probe 参数，而非建立 artifact.json 或隐式桥接

**执行流**：

```text
1. [Class 定义 - Arsenal]
   Blueprint 中的 Probe 是抽象的占位符：
   probe fs_exists { path: "{{main_file}}" }

2. [Instance 实例化 - Work]
   CLI 创建 Work 时，将 Blueprint 复制到 work/task/my-work/task.oxn

3. [Main Agent 动态绑定]
   Main Agent 执行 Action，在项目中创建了 Artifact (如 src/login.ts)
   Main Agent 调用 CLI CRUD 将具体路径注入：
   > oxn update probe --work my-work --name main_check --data '{"path": "src/login.ts"}'
   此时 Work 空间的 Probe 变为具体实例：
   probe fs_exists { path: "src/login.ts" }

4. [验证与快照]
   > oxn work verify my-work
   CLI 读取已实例化的 .oxn → Infra 探测 → Kernel 判决
   生成 frozen.json (此刻 .oxn 与产物的绝对快照)
```

**理由**：
- 复用 CRUD 基础设施，无需引入新机制
- frozen.json 自然包含"当时验证了哪个具体文件"的记录
- AI 知道并修改 Probe 是合法的边界调整，而非逃逸

### Decision 5: 边界与留痕原则

**选择**：OpenXenon 的核心是"固化边界指导 AI 工作"，而非"杜绝 AI 逃逸"

**架构哲学**：

| 维度           | 旧模型 (防御模型) | 新模型 (边界+审计模型)              |
| -------------- | ----------------- | ------------------------------------ |
| **核心目标**   | 防止 AI 犯错      | 指导 AI 工作，记录 AI 行为           |
| **信息可见性** | 对 AI 隐藏 Probe  | Main Agent 可见，Sub Agent 受限      |
| **边界管理**   | 系统强制锁定      | 工程师定义，AI 可通过 CLI 调整       |
| **逃逸处理**   | 视为系统故障      | 视为正常行为，通过语法校验+证据链兜底 |
| **最终裁判**   | 系统自动判定      | 工程师基于证据链判决                 |

**证据链三元组**：
- `frozen.json`：判决快照（验证标准与产物路径的绝对记录）
- `work-trace.json`：操作轨迹（谁在何时做了什么修改）
- `work-state.json`：当前状态（进行中/已阻断）

**理由**：
- AI 是图灵完备执行者，逃逸是必然可能，试图隐藏信息防止作弊是脆弱的安全观
- 证据链是真正的约束力——AI 可以乱来，但所有操作都有不可篡改的记录
- 工程师通过 Hall 审查这些记录，决定是惩罚（回滚）还是宽容（接纳结果并调整边界）

## Risks / Trade-offs

- **风险**：工程师可能误读"AI 可修改 Probe"为"系统鼓励修改"
  - **缓解**：文档明确说明这是"边界调整权"而非"随意修改权"，证据链让所有修改可审计
- **风险**：Main Agent 知道 Probe 可能导致"应试代码"
  - **缓解**：Sub Agent 才是真正执行的盲区，Main Agent 的"作弊"会被快照如实记录，工程师可判决

## Open Questions

无