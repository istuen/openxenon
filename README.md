# OpenXenon
> 演化工程意图，收敛 AI 推理，实现软件交付。
>
> * 从人类需求到结构化目标
> * 从发散推理到边界约束
> * 从输出产物到工程实体
OpenXenon 是一个面向大语言模型的工程化控制引擎。它摒弃了“直接让 AI 写代码”的盲目模式，通过将宏观意图解构、对推理过程施加物理约束、对最终产物进行机械验证，将不可靠的 AI 能力转化为可靠、可追溯的软件实体。

> **一句话定义**：轻量级、语言无关的确定性状态机引擎。将 AI 模型视为不可信的算力输出端，通过外部状态机施加物理约束，将软件工程转化为高信噪比的资产沉淀过程。
## 快速开始
```bash
# 1. 安装 CLI 工具 (默认部署至 ~/.openxenon/)
pnpm install -g @istuen/openxenon
# 2. 拉起全局唯一的后台控制中枢
oxn daemon start
# 3. 在当前项目建立物理围栏并注册
oxn init
# (随后在 AI 助手中输入 /oxn-task 开始工作)
```

## 从源码构建

### 环境要求
- **Bun**: >= 1.0.0
- **pnpm**: >= 8.0.0 (推荐使用 pnpm 作为包管理器)

### 安装步骤

1. **克隆仓库**
```bash
git clone https://github.com/istuen/openxenon.git
cd openxenon
```

2. **安装依赖**
```bash
pnpm install
```

3. **运行开发模式**
```bash
# 直接运行 CLI（无需编译）
pnpm dev -- --help

# 或运行测试
pnpm test
```

4. **构建可执行文件**
```bash
# 为当前平台构建
pnpm build

# 为所有平台构建
pnpm build:all

# 或分别构建
pnpm build:linux   # Linux x64
pnpm build:macos   # macOS x64
pnpm build:windows # Windows x64
```

5. **运行构建产物**
```bash
./dist/oxn --help
```

### 开发脚本

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 以开发模式运行 CLI |
| `pnpm build` | 构建当前平台的可执行文件 |
| `pnpm build:all` | 构建所有平台的可执行文件 |
| `pnpm test` | 运行测试套件 |
| `pnpm test:watch` | 监听模式运行测试 |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm clean` | 清理构建产物和依赖 |

## Skill 系统

OpenXenon 提供了一套 Skill 系统，用于指导 AI 助手执行特定操作。Skill 采用 **TypeScript 源码 → Markdown 编译产物** 架构，确保类型安全。

### Skill 架构

```
src/skills/              # Skill TS 源码（类型安全）
├── types.ts             # OpenXenonSkill 接口定义
├── oxn-init.ts           # /oxn-init 指令
├── oxn-task.ts           # /oxn-task 指令
└── ...

src/adapters/            # 适配器
├── opencode.adapter.ts  # 编译到 .opencode/skills/
└── ...

.opencode/skills/        # 编译产物（AI 读取）
├── oxn-init/SKILL.md
├── oxn-task/SKILL.md
└── ...
```

### 编译 Skill

```bash
# 初始化项目时自动编译
oxn init --adapter opencode

# 强制重写所有 Skill
oxn init --adapter opencode --compile-force
```

### 动态寻址

所有 Skill 使用 `oxn api base` 命令获取 Core 通信地址，避免硬编码：

```bash
# 获取 Core 当前地址
oxn api base
# 输出: ~/.openxenon/daemon.sock
```

### 开发新 Skill

详见 [docs/skill-development.md](docs/skill-development.md) 和 [docs/adapter-development.md](docs/adapter-development.md)

## 核心运转机制
OpenXenon 的运转完全围绕上述三句话展开，它重新定义了人类、AI 助手与底层引擎之间的协作边界：

### 探索项目结构：AI 分析现状
 工程师在 AI 助手软件中通过 Skill（如输入 `/oxn-task`）触发任务并描述宏观需求。AI 首先探索当前 Space 的项目结构，包括：目录布局、现有代码、技术栈依赖、配置文件等。Core 提供项目探针协助扫描，但不越俎代庖。

### 演化工程意图：从人类需求到结构化目标
 在了解项目现状后，AI 将宏观需求转化为结构化的 `Blueprint`。OpenXenon Core 作为"武器库"，向下提供当前上下文可用的 `Proof`（验证探针）和 Blueprint 模板。真正的拆解由 AI 模型自行完成：它分析需求，将模板填充为具体的步骤，然后提交给 Core 保存。这是一种"AI 自主演化 + Core 确权固化"的结构化过程。

### 收敛 AI 推理：从发散推理到边界约束
这是系统最硬核的控制环节。AI 助手在执行每个具体的 `Stage` 时，被底层 Prompt 强制要求将进度写入当前任务目录下的 `step-manifest.json`。系统采用“双轨并行”机制对发散的推理进行强制收敛：
* **明线（正常约束）**：AI 完成 Stage 后主动通过 API 请求 Core 验证。Core 调用绑定的 `Spec` 规范和 `Proof` 探针进行机械校验，通过后才允许推进下一个 Stage。
* **暗线（逃逸兜底）**：Core 绝对不信任 AI 的自觉性。后台的雷达会实时监听项目内 `step-manifest.json` 的物理变更，一旦捕获变更，立即将其快照同步至当前项目的 `space.oxn` 并打上时间戳。系统比对数据库时间戳，若发现状态已变更，但 AI 超时未通过 API 发起验证请求，Core 会直接判定 **“AI 模型逃逸”**，立刻剥夺其执行权，并抛出异常交由工程师人工确认。这彻底封死了大模型自说自话、绕过验证的可能。
### 实现软件交付：从输出产物到工程实体
 软件交付并非最后一步才发生，而是伴随每个 Stage 验证通过，合规的 `Artifact`（代码文件、配置等）逐步落盘于项目文件系统中。当所有 Stage 执行完毕，Core 会对全量步骤进行最终复盘，从项目的 `space.oxn` 中抽离记录，输出一份包含所有验证记录的 `task-trace.yaml`。这份"工程案卷"向工程师证明了最终交付的软件实体不是凭空捏造的，而是步步合规、物理确权的工业产物。

## 核心原语

OpenXenon 的整个运行机制建立在五个核心原语之上（统称 `Xn*` 协议）：

### 生命周期

一次完整的 OpenXenon 运行周期如下：

```
[加载 Blueprint]
       |
       v
[执行当前 Stage，加载边界规则] ---> [将 Prompt 发送给 LLM]
       |
       v
[LLM 返回代码变更]
       |
       v
[Proof 执行 Diff 审计与特征匹配]
       |
       +---> (越界/违规) ---> [熔断丢弃] ---> [记录审计日志] ---> [终止或人工介入]
       |
       +---> (未违规，但业务逻辑受挫/编译失败)
       |         |
       |         v
       |    [触发 Sample 机制] ---> [在临时高隔离边界内生成探索性代码]
       |         |
       |         v
       |    [人工审核或严格沙箱验证] ---> (通过) ---> [固化为新 Stage，回注 Blueprint]
       |                                 |
       |                                 (失败) ---> [丢弃，保持原状]
       |
       +---> (严格通过) ---> [沉淀为 Artifact，安全合入工作区]
       |
       v
[解锁下一 Stage，继承当前 Artifact 状态] ---> 继续流转...
```

#### 三种水流

通过上述设计，OpenXenon 将复杂的 AI 协作严格切分为三种清晰的水流：

1.  **正常流（确定性）**：AI 严格执行 `CANONICAL` 状态的 Blueprint，Stage 顺序流转，最终沉淀为 Artifact。
2.  **偏差流（微观自愈）**：触发 Sample。AI 在单个节点边界内探索变体，系统自动校验。风险极低，无需人工介入。
3.  **演化流（宏观涌现）**：触发 Draft。AI 推翻整体规划，在隔离沙箱中跑通新拓扑，最后以"物理提案"的形式上交人类。风险极高，必须人类裁决。

#### 适用场景

1.  **遗留系统安全重构**：在缺乏测试的老代码库中，通过 Blueprint 路径锁死，防止 AI 牵一发而动全身；遇到历史遗留的奇葩逻辑时，通过 Sample 打补丁，而非重写。
2.  **团队工程规范强制落地**：将高级架构师的经验编写为 Blueprint。初级工程师在使用 AI 时，其产出物会被强制约束在 Blueprint 内，不符合规范的 AI 输出无法成为 Artifact。
3.  **复杂业务流编排**：将涉及多表变更、多服务联调的需求，拆解为 DAG 蓝图，让 AI 在确定的拓扑轨道上精确作业。

### 1. Stage（工序节点）
 工程隔离的最小执行单元。一个 Stage 封装了一次完整的 AI 交互意图，并强制声明其**物理边界**。
 * **输入**：包含上下文的 Prompt 模板
 * **边界声明**：精确到文件路径（支持 Glob/正则）、允许调用的 API 范围、甚至特定的代码修改模式
 * **状态声明**：该节点执行成功后，系统应达到的预期状态

### 2. Proof（校验熔断器）
 附着在 Stage 上的硬拦截器。当 LLM 返回结果后，必须经过 Proof 的审计。
 * **Diff 路径扫描**：比对变更集，任何不在 Stage 声明路径内的文件变更，直接判定为 `FAILED`
 * **特征正则拦截**：通过正则匹配，拦截危险的代码模式
 * **熔断机制**：一旦 Proof 校验失败，本次 AI 的输出将被整体丢弃

### 3. Blueprint（拓扑蓝图）
 由多个 Stage 组成的有向无环图（DAG），代表系统工程的静态规划。节点之间的流转是单向的，前置节点的 Proof 必须返回 `PASSED`，后续节点才允许被触发。

### 4. Sample（受控样本分支）
 动态逃生机制。当 AI 在 Stage 中受挫，且无法通过重试解决时，允许生成一个 Sample。Sample 必须在极其苛刻的临时边界内运行，其产生的代码变更被视为"实验性补丁"。

### 5. Artifact（确定性产物）
 整个 OpenXenon 引擎运转的最终输出物。它是严格经历了 `Blueprint` 的拓扑流转、通过了所有 `Proof` 的校验熔断后，最终沉淀下来的**高信噪比工程资产**。

## 系统架构：全局/项目双层边界

OpenXenon 采用严格的全局与项目双层物理隔离架构。Core 引擎是全局唯一的常驻进程，通过挂载不同项目的上下文来实施控制。

> 详细的架构设计请参阅 [docs/architecture.md](docs/architecture.md)

### 全局物理边界 (`~/.openxenon/`)
全局边界是 Core 引擎的宿主，提供跨项目的基线能力。
```text
~/.openxenon/
├── core.oxn            # [全局元数据] 注册所有被 init 的项目路径、状态等
├── proofs/            # [全局探针库] 内置的通用验证探针 (如通用 eslint、语法检查等)
└── daemon.sock        # Core 进程的本地通信 Socket
```
### 项目物理边界 (`<your-project>/.openxenon/`)
项目边界是单一工程任务的执行沙箱，状态完全内聚。
```text
<your-project>/
├── .openxenon/
│   ├── space.oxn     # [项目状态源] 当前项目的唯一真理源 (存储状态机、逃逸时间戳)
│   ├── proofs/        # [项目探针库] (可选) 当前业务特有的验证脚本
│   └── tasks/
│       └── <task_id>/
│           ├── step-manifest.json  # [单向管道] 由 AI 写入，由 Core 监听并同步至 space.oxn
│           └── task-trace.yaml     # [交付物] 任务完成后由 Core 从 space.oxn 导出的最终案卷
└── src/               # 你的业务代码 (Artifact 落盘处)
```
## 系统交互流程
 以下流程图展示了工程师、AI 助手软件、全局 Core 与项目沙箱在这四个阶段中的完整交互拓扑：
 ```mermaid
 sequenceDiagram
     participant Eng as 工程师
     participant AI as AI 助手软件 (含 LLM)
     participant Core as OpenXenon Core (全局唯一)
     participant GFS as 全局边界 (~/.openxenon/)
     participant PFS as 项目边界 (Space)
     rect rgb(230, 245, 255)
     Note over Eng, PFS: 阶段零：探索项目结构（AI 分析现状）
     Eng->>AI: 通过 Skill 触发 /oxn-task (人类需求)
     AI->>Core: 发起任务请求
     Core->>GFS: 扫描全局 proofs/
     Core->>PFS: 扫描项目结构 (目录、依赖、配置)
     Core-->>AI: 返回项目结构 + 可用 Proof 探针
     AI->>AI: LLM 分析项目现状，理解技术栈
     end
     rect rgb(240, 248, 255)
     Note over Eng, PFS: 阶段一：演化工程意图（从人类需求到结构化目标）
     AI->>AI: LLM 自行分析需求，拆解并填充 Blueprint
     AI->>Core: 提交填充完整的 Blueprint
     Core->>PFS: 将 Blueprint 状态持久化至 space.oxn
     Core-->>AI: 返回保存成功确认
     end
    rect rgb(255, 250, 240)
    Note over Eng, PFS: 阶段二：收敛 AI 推理（从发散推理到边界约束）
    
    AI->>Eng: (可选) 展示计划，请求人工确认
    Eng-->>AI: 确认执行
    AI->>AI: 开始执行 Stage 1...
    loop 针对每一个 Stage
        AI->>PFS: 生成代码产物
        AI->>PFS: [强制Hook] 写入 tasks/<id>/step-manifest.json
        
        par 正常验证路径 (明线)
            AI->>Core: [强制Hook] API 请求当前 Stage 验证
            Core->>PFS: 读取项目 space.oxn 获取上下文
            Core->>Core: 执行整合后的 Proof 探针机械校验
            alt 校验通过
                Core->>PFS: 更新 space.oxn 状态
                Core-->>AI: 返回通过，下发下一个 Stage 指令
            else 校验失败
                Core-->>AI: 返回失败，要求回滚重试
            end
        and 逃逸检测路径 (暗线 - 文件监听)
            Core->>PFS: 监听 step-manifest.json 物理变更
            Core->>PFS: 快照同步至 space.oxn 并记录时间戳
            alt 发现 DB 状态变更，但超时未收到 API 验证请求
                Core->>Core: 判定 AI 模型逃逸！
                Core->>Eng: 抛出逃逸异常，要求人工介入确认
            end
        end
    end
    end
    rect rgb(240, 255, 240)
    Note over Eng, PFS: 阶段三：实现软件交付（从输出产物到工程实体）
    Note over PFS: 随着上述循环，合规的 Artifact 逐步落盘于项目中
    AI->>Core: 通知所有 Stage 执行完毕 (Task 结束)
    Core->>PFS: 对 space.oxn 全量记录进行最终复盘汇总
    Core->>PFS: 导出并保存 tasks/<id>/task-trace.yaml
    Core-->>Eng: 推送最终报告，完成软件工程交付
    Eng->>PFS: 基于确权的工程实体进行后续操作
    end
```
## 数据结构：Blueprint 示例
这是一个由 AI 助手拆解并提交给 Core 保存的最小 Blueprint 结构，展示了 `Stage`、`Spec`、`Proof` 的强绑定关系：
```yaml
task: "实现 RBAC 权限校验"
steps:
  - id: step_1
    name: "定义数据模型"
    spec: "禁止使用 NoSQL，必须使用 Prisma ORM 定义 User 与 Role 的多对多关系表"
    proof: "prisma-validate"  # Core 会优先在项目 proofs/ 查找，找不到则降级到全局 proofs/
  - id: step_2
    name: "实现中间件"
    spec: "必须拦截特定路由，且不可绕过，抛出 403 错误需符合 RFC 规范"
    proof: "eslint-and-test"
```
## OpenXenon 术语词典

### 一、 系统角色

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **工程师** | `Engineer` | 系统的唯一负熵源。只负责输入宏观需求和最终的异常兜底，不参与底层的代码拼装与过程纠偏。 |
| **工作空间** | `Space` | 项目目录的物理边界。每个 Space 对应一个 `.openxenon/` 目录及 `space.oxn` 数据库。 |
| **AI 助手** | `AI Assistant` | 包含大语言模型的宿主环境（如 IDE 插件或 Web 端）。在 OpenXenon 体系中，它被降维为受控的执行器。 |
| **Core 引擎** | `OpenXenon Core` | **全局唯一**的二阶控制中枢。不直接生成代码，负责挂载 Space 上下文、下发边界约束、执行机械验证、检测逃逸。 |

### 二、 意图演化阶段

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **任务** | `Task` | 工程师通过 Skill 触发的最宏观的业务目标。会在 Space 内生成唯一的 `task_id`。 |
| **执行计划** | `Blueprint` | 由 AI 助手基于 Core 提供的模板，自行拆解并填充生成的结构化执行蓝图，提交给 Core 保存确权。 |

### 三、 推理收敛阶段

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **原子步骤** | `Stage` | Blueprint 中的最小执行单元。AI 助手必须以 Stage 为粒度推进任务。 |
| **执行规范** | `Spec` | 绑定在 Stage 上的边界约束条件，规定了 AI 在这一步"必须遵守什么规则、不能生成什么内容"。 |
| **验证探针** | `Proof` | Core 持有的机械级校验程序。采用"项目优先，全局兜底"的整合策略。 |
| **执行动作** | `Action` | 非必填。填写则用于让 LLM 遵守执行的动作（如"使用 TypeScript"、"先写测试再写实现"）。 |

### 四、 交付与追踪阶段

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **工程产物** | `Artifact` | 经历了 Spec 约束且通过 Proof 验证的最终合法输出物（落盘于项目业务目录）。 |
| **步骤舱单** | `step-manifest.json` | 位于 `.openxenon/tasks/<id>/` 下。**由 AI 写入、由 Core 监听**的物理文件，作为进度同步到 `space.oxn` 的单向管道。 |
| **任务轨迹** | `task-trace.yaml` | 位于 `.openxenon/tasks/<id>/` 下。Task 完成后由 Core 从 `space.oxn` 导出的链路追踪文件。 |

### 五、 核心原语

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **样本分支** | `Sample` | 动态逃生机制。当 AI 在 Stage 中受挫时，允许在临时边界内探索变体。 |

### 六、 核心控制机制

| 中文术语 | 英文标识 | 定义 |
| :--- | :--- | :--- |
| **明线验证** | `Active Verification` | AI 主动通过 API 发起的正常校验路径（完成 Stage -> 请求 Core -> Proof 校验）。 |
| **逃逸检测** | `Escape Detection` | Core 的暗线兜底机制。监听 JSON 变更同步至 Space 的 `space.oxn`，若超时未收到 API 验证请求，则判定逃逸。 |
| **模型逃逸** | `AI Escape` | AI 助手绕过 Core 的验证网关，陷入发散推理或自说自话的失控状态。 |
---
## OpenXenon 指令
```bash
# 主命令：oxn
```
| CLI 命令                      | 使用场景                                    | 机械行为                                                                                                                                                               |
| :---------------------------- | :------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`oxn init`**                 | 项目首次接入 OpenXenon                        | 1. 在当前目录生成 `.openxenon/` 及 `space.oxn`。<br>2. 向全局 `core.oxn` 注册当前项目路径。                                                                              |
| **`oxn daemon`**               | 管理全局 Core 引擎的生命周期                | `oxn daemon start` / `stop` / `status`。拉起或挂载全局唯一的常驻进程。                                                                                                  |
| **`oxn inspect`**              | 怀疑 AI 篡改了状态，需要看最底层的真相      | 直接 `cat` 输出当前任务下的 `step-manifest.json` 原始内容。                                                                                                            |
| **`oxn trace`**                | 终端里直接查看案卷，不依赖 AI 解读          | 直接 `cat` 输出当前任务下的 `task-trace.yaml` 原始内容。                                                                                                               |
| **`oxn rollback <step_id>`**   | **极其危险但必要**。AI 逻辑崩盘，删垃圾代码 | 1. 读取 `task-trace.yaml` 找到该 Stage 产出的 Artifact。<br>2. 执行物理 `rm -rf`。<br>3. 强行回退 `space.oxn` 及 `step-manifest.json` 状态。<br>*(绝对不能交给 AI 做)* |
| **`oxn force-pass <step_id>`** | 极端情况：Proof 探针写错，正常代码无法通过  | 工程师强制修改当前项目的 `space.oxn` 中该 Stage 状态为 `passed`。                                                                                                      |
---
## AI Assistant Skills 词典
 在 AI 助手里输入的 `oxn-*` 指令，核心特征是：**必须经过 LLM 的理解与转化，再由 LLM 代为向全局 Core 发起请求。**
| Skill 指令 | 阶段映射 | 意图描述 | AI 助手被触发后的内部行为 |
| :--- | :--- | :--- | :--- |
| **`/oxn-init`** | 环境准备 | **初始化围栏**。在当前项目植入 OpenXenon 基因。 | 1. 向 Core 发起初始化请求。<br>2. Core 建立 Space 边界并注册至全局。<br>3. AI 提示工程师：围栏已建立。 |
| **`/oxn-explore`** | 探索项目结构 | **探索现状 + 创建 Blueprint**。扫描项目目录、技术栈、依赖、配置等，分析后生成 Blueprint。 | 1. 向 Core 请求项目结构扫描。<br>2. LLM 分析项目现状，理解技术栈。<br>3. LLM 将需求转化为 Blueprint。<br>4. 提交 Core 保存确权。 |
| **`/oxn-task`** | 演化意图 | **分析任务 + 执行 Blueprint**。基于现有 Blueprint 执行任务，不探索项目结构。 | 1. 截获需求，向 Core 获取 Proof 探针 + Blueprint。<br>2. LLM 分析任务，填充或复用 Blueprint。<br>3. 提交 Core 保存并执行。 |
| **`/oxn-resume`** | 收敛推理 | **恢复断点**。从中止的 Stage 继续执行。 | 1. 读取项目内的 `step-manifest.json`。<br>2. 定位失败或未完成的 Stage。<br>3. 恢复执行循环。 |
| **`/oxn-status`** | 通用 | **状态体检**。通过 AI 的自然语言了解进度。 | 1. 向 Core 请求当前项目的 `space.oxn` 状态。<br>2. LLM 将状态转化为人类易读的进度报告。 |
| **`/oxn-stop`** | 收敛推理 | **人工熔断**。要求 AI 停止一切生成行为。 | 1. AI 立即停止当前 Stage 的写入。<br>2. 向 Core 发送强制终止信号，锁定项目状态。 |
| **`/oxn-trace`** | 交付实体 | **轨迹取证**。让 AI 帮忙解读交付案卷。 | 1. 向 Core 请求拉取当前任务的 `task-trace.yaml`。<br>2. LLM 总结案卷内容，解释验证得失。 |

> **内部 Hook**：AI 助手在执行任务时，还会被底层 Prompt 强制执行两个不可见的内部 Hook：
> - `[oxn-update]`：将状态写入项目内的 `step-manifest.json`
> - `[oxn-verify]`：主动调用 Core API 请求 Proof 验证
---
## 技术栈

OpenXenon 采用以下技术栈构建：

| 组件 | 用途 | 说明 |
|------|------|------|
| **TypeScript** | 开发语言 | Strict Mode，类型即约束 |
| **Bun** | 运行时 | 全局常驻 Daemon，冷启动毫秒级 |
| **Bun:sqlite** | 存储驱动 | 原生内置 C 级 SQLite 绑定，零依赖 |
| **Citty** | CLI 构建器 | Unjs 生态极简工具，类型推导完美 |

### 核心引擎层

OpenXenon 采用**工厂模式 + 依赖注入**实现运行时解耦。

#### 四大命脉接口

OpenXenon 通过四大命脉接口实现运行时解耦，切 Bun 绑定：

```typescript
// 命脉一：状态真理源
export interface XnStore {
  initialize(path: string): void;
  exec(sql: string, params?: any[]): void;
  query<T = any>(sql: string, params?: any[]): T[];
  transaction<T>(callback: () => T): T;
  close(): void;
}

// 命脉二：进程沙箱
export interface XnSandbox {
  spawn(
    command: string,
    args: string[],
    options?: { cwd?: string; env?: Record<string, string>; timeout?: number; }
  ): Promise<{ exitCode: number | null; stdout: string; stderr: string; wasTimeout: boolean; }>;
}

// 命脉三：暗线雷达
export interface XnRadar {
  watch(
    path: string,
    callback: (event: 'create' | 'modify' | 'delete', filename?: string) => void,
    options?: { debounceMs?: number; }
  ): () => void;
}

// 命脉四：控制通道
export interface XnTransport {
  serve(path: string, onMessage: (data: Buffer) => void): void;
  request(path: string, payload: Buffer, timeoutMs?: number): Promise<Buffer>;
  destroy(): void;
}
```

#### 运行时适配器

```typescript
// src/bootstrap.ts
const runtime = isBun ? BunRuntime : NodeRuntime;

const core = new OpenXenonCore(
  runtime.store,   // XnStore
  runtime.sandbox, // XnSandbox
  runtime.radar,   // XnRadar
  runtime.transport // XnTransport
);
core.start();
```

### 数据持久化层

#### 全局状态 (`~/.openxenon/core.oxn`)

仅存储跨项目的注册表（项目绝对路径、最后一次心跳时间等），不参与任何业务逻辑。

#### 项目状态 (`<project>/.openxenon/space.oxn`)

单个项目的**唯一状态真理源**。SQLite WAL 模式实现无锁并发读与原子写。

#### 管道设计 (JSON -> DB)

为了兼容 LLM 最底层的文件输出能力，保留 `step-manifest.json` 作为单向写入管道。AI 只能写 JSON，Core 通过文件监听捕获变更并灌入 `space.oxn`。

### 交互与通信层

#### Unix Socket 通信

采用 Unix Domain Socket (`~/.openxenon/daemon.sock`) 替代 HTTP API，内核层内存拷贝，延迟比 HTTP 低数十倍，且不暴露网络端口。

#### 薄客户端模式

所有 `oxn` CLI 命令退化为 Daemon 的"远程遥控器"，只有 Daemon 进程拥有数据库读写句柄。

#### Core Socket API 规范

| 接口路径 | 方法 | 对应 Skill | 核心职责 |
| :------- | :--- | :--------- | :------- |
| `/api/v1/workspace/init` | POST | `/oxn-init` | 创建项目 `space.oxn` |
| `/api/v1/proofs/list` | GET | `/oxn-task` | 返回可用探针列表 |
| `/api/v1/task/submit` | POST | `/oxn-task` | 接收 Blueprint 并落盘 |
| `/api/v1/step/verify` | POST | `[oxn-verify]` | 触发 Proof 校验 |
| `/api/v1/task/status` | GET | `/oxn-status` | 返回任务状态机 |
| `/api/v1/task/stop` | POST | `/oxn-stop` | 强制熔断 |
| `/api/v1/task/trace` | GET | `/oxn-trace` | 导出 task-trace.yaml |

### 四层防御体系

针对 AI "越狱探底"的防御机制：

| 防御层 | 机制 | 说明 |
|--------|------|------|
| **文件伪装** | `.oxn` 后缀 | AI 误认为是二进制容器 |
| **OS 级排斥** | SQLite 独占锁 | 强行读取得到 "database is locked" |
| **认知围栏** | System Prompt | "绝对禁止读取 `.openxenon/` 下的非 YAML/JSON 文件" |
| **熔断闭锁** | FATAL_SYSTEM_MELTDOWN | CLI 连接失败时返回强警告 JSON |

### 执行与沙箱层

#### 进程控制

使用 `Bun.spawn` 执行 Proof 探针，流式精准捕获 Stderr，发现红线时纳秒级 SIGKILL。

#### 沙箱机制

在执行 Proof 前，动态创建隔离环境，将待测 Artifact 映射进去执行，结束后销毁。
