--------------------------

问：对《README》的系统架构层级重新调整：
1、Task 是进行时，其对应每次工程师的意图任务。通过 AI 模型选择 Blueprint 或改进 Blueprint 来执行。
2、现有的 Task 层改名 Blueprint，1次 Task 就是 1 个 Blueprint 实例。
3、现有Blueprint 层改名为 Stage，1 个 Blueprint 会关联多个 Stage，每个 Stage 应该固定的 Proof ，当然 Stage 可以变更。
4、现有 Stage 层更名为 Proof，1 个 Proof 里包含 Target、Spec、Action、Validator（原 Proof）、组成。参考：https://zread.ai/Fission-AI/OpenSpec/14-validation-engine。
5、其中 Blueprint 里的 Stages 是固定的，Stage 里的 Proofs 是固定的，除了 Proof 是参数注入。AI 模型能变换 Blueprint、Stages 结构里的顺序，能自建 Proof。

答：让我先查看用户提到的参考链接，了解 Proof 的 Validation Engine 设计理念。
现在我已经完整理解了你的架构调整意图和参考的 Validation Engine 设计。让我为你重新梳理 README 中的系统架构层级。
---
### 重新校准：四层架构的新定义
经过你的重构，OpenXenon 的层级从三层变为四层，每一层的职责与自由度都被重新划分：
```
Task（进行时）
  └── Blueprint（拓扑实例）
        └── Stage（工序节点）
              └── Proof（校验单元 = Target + Spec + Action + Validator）
```
---
#### 1. Task — 工程师意图的运行时容器
**本质**：Task 不再承载任何结构信息，它只是一个"进行时"的运行时上下文。
- 每次工程师在 AI 助手中输入 `/oxn-task` 并描述需求，就创建一个 Task 实例
- Task 的生命周期：`PENDING → RUNNING → COMPLETED / TERMINATED`
- Task 与 Blueprint 是 **1:1** 关系 — 一次意图任务对应一个具体的执行计划
- **Task 本身不包含任何 Stage 或 Proof 信息**，它只是 Blueprint 的宿主和生命周期管理器
```yaml
# Task 的极简结构
task:
  id: "task_a1b2c3"
  name: "实现 RBAC 权限校验"
  status: "RUNNING"
  blueprint_id: "bp_x1y2z3"      # 指向唯一的 Blueprint 实例
  created_at: 1718294400
  updated_at: 1718294500
```
---
#### 2. Blueprint — 可演化的拓扑实例
**本质**：Blueprint 是一次 Task 的完整执行计划。它是一个 DAG（有向无环图），规定了 Stage 的排列顺序。
- 1 个 Task 有且仅有 1 个活跃 Blueprint（但演化过程中可以产生 Draft 候选）
- Blueprint 内的 **Stages 列表及其连接关系是固定的**，这是工程师或 AI 确权后锁死的拓扑
- **AI 能做的**：在执行受挫时，生成一个新的 Draft Blueprint（不同的 Stage 排列或不同的 Stage 组合），提交人类裁决
- **AI 不能做的**：不能在运行时偷偷修改当前 `CANONICAL` Blueprint 的 Stage 结构
```yaml
# Blueprint 的结构
blueprint:
  id: "bp_x1y2z3"
  task_id: "task_a1b2c3"
  status: "CANONICAL"            # CANONICAL | DRAFT | ABANDONED
  stages:
    - "stage_s1"                  # Stage ID 引用（扁平解耦）
    - "stage_s2"
    - "stage_s3"
  edges:                          # DAG 边（可选，默认顺序执行）
    - from: "stage_s1"
      to: "stage_s2"
    - from: "stage_s2"
      to: "stage_s3"
```
---
#### 3. Stage — 最小执行与隔离单元
**本质**：Stage 是 Blueprint 中的一个节点，它是工程隔离的最小单元。
- 1 个 Blueprint 关联多个 Stage，每个 Stage 封装一次完整的 AI 交互意图
- 每个 Stage **绑定固定的 Proof**（可以是单个 Proof，也可以是 Proof 数组）
- **Stage 的 Proof 绑定关系在 Blueprint 确权时锁定**，运行时不可更改
- **Stage 可以变更**：通过"克隆 + 变异"生成新 Stage（新 ID），挂载到 Draft Blueprint 中，但不影响原 Stage
```yaml
# Stage 的结构
stage:
  id: "stage_s1"
  blueprint_id: "bp_x1y2z3"
  name: "定义数据模型"
  status: "PASSED"               # PENDING | RUNNING | PASSED | FAILED | DISCARDED
  order: 0                       # 在 Blueprint 中的执行顺序
  proofs:
    - "proof_p1"                  # Proof ID 引用（扁平解耦）
  artifacts:                      # 该 Stage 产出物清单
    - path: "prisma/schema.prisma"
      hash: "sha256:abc123"
```
---
#### 4. Proof — 校验单元（核心重构点）
**本质**：Proof 不再只是一个探针脚本名，它升级为一个完整的**校验单元**，包含四个维度。
参考 OpenSpec 的 Validation Engine 设计，Proof 采用**两阶段验证管道**：
```
Proof = Target（预期状态）+ Spec（边界约束）+ Action（执行动作）+ Validator（校验探针）
```
| 维度          | 类型      | 说明                                                    | 类比       |
| :------------ | :-------- | :------------------------------------------------------ | :--------- |
| **Target**    | `string`  | 该 Proof 验证通过后，系统应达到的预期状态描述           | "目的地"   |
| **Spec**      | `string`  | 该 Proof 的边界约束条件（必须遵守什么、不能生成什么）   | "交通规则" |
| **Action**    | `string?` | 非必填。指导 LLM 遵守的执行动作（如"先写测试再写实现"） | "驾驶方式" |
| **Validator** | `string`  | Core 持有的机械级校验探针名（项目优先，全局兜底）       | "路检站"   |
```yaml
# Proof 的结构
proof:
  id: "proof_p1"
  name: "Prisma Schema 校验"
  target: "生成符合多对多关系模型的 Prisma Schema 文件"
  spec: "禁止使用 NoSQL，必须使用 Prisma ORM 定义 User 与 Role 的多对多关系表"
  action: "使用 TypeScript，先定义 schema 再生成客户端"
  validator: "prisma-validate"    # 对应 proofs/ 目录下的探针脚本
```
---
### 重构后的完整术语词典
#### 一、 系统角色（不变）
| 中文术语  | 英文标识         | 定义                   |
| :-------- | :--------------- | :--------------------- |
| 工程师    | `Engineer`       | 系统的唯一负熵源       |
| 工作空间  | `Space`          | 项目目录的物理边界     |
| AI 助手   | `AI Assistant`   | 不可信的受控执行器     |
| Core 引擎 | `OpenXenon Core` | 全局唯一的二阶控制中枢 |
#### 二、 四层架构实体（重构核心）
| 中文术语     | 英文标识    | 层级 | 定义                                                                                     |
| :----------- | :---------- | :--- | :--------------------------------------------------------------------------------------- |
| **任务**     | `Task`      | L1   | 工程师意图的运行时容器。1 个 Task 对应 1 个活跃 Blueprint。不含结构信息，只管生命周期。  |
| **蓝图**     | `Blueprint` | L2   | Task 的执行计划，由 Stage 组成的 DAG。拓扑结构在确权后锁定。AI 可通过 Draft 提出新拓扑。 |
| **工序**     | `Stage`     | L3   | Blueprint 的最小执行节点。绑定固定的 Proof。可通过克隆变异生成新 Stage。                 |
| **校验单元** | `Proof`     | L4   | 包含 Target、Spec、Action、Validator 四维度的完整校验定义。Stage 的机械约束来源。        |
#### 三、 交付与追踪（不变）
| 中文术语 | 英文标识             | 定义                                  |
| :------- | :------------------- | :------------------------------------ |
| 工程产物 | `Artifact`           | 经历 Proof 全维度校验后沉淀的代码实体 |
| 步骤舱单 | `step-manifest.json` | AI 写入、Core 监听的单向管道          |
| 任务轨迹 | `task-trace.yaml`    | Task 完成后导出的工程案卷             |
#### 四、 核心控制机制（不变）
| 中文术语 | 英文标识              | 定义                                        |
| :------- | :-------------------- | :------------------------------------------ |
| 明线验证 | `Active Verification` | AI 主动发起的 Stage→Proof 校验路径          |
| 逃逸检测 | `Escape Detection`    | Core 暗线监听 step-manifest.json 的兜底机制 |
| 模型逃逸 | `AI Escape`           | AI 绕过验证网关的失控状态                   |
---
### 四层扁平 Schema（Zod 设计）
```typescript
import { z } from "zod";
// ─── L4: Proof（最底层，自包含的校验单元）───
const ProofSchema = z.object({
  id: z.string(),
  name: z.string(),
  target: z.string().describe("预期状态"),
  spec: z.string().describe("边界约束"),
  action: z.string().optional().describe("执行动作指导"),
  validator: z.string().describe("校验探针名"),
});
// ─── L3: Stage（引用 Proof ID，不嵌套）───
const StageSchema = z.object({
  id: z.string(),
  blueprintId: z.string(),
  name: z.string(),
  status: z.enum(["PENDING", "RUNNING", "PASSED", "FAILED", "DISCARDED"]),
  order: z.number().int(),
  proofIds: z.array(z.string()),
  artifacts: z.array(z.object({
    path: z.string(),
    hash: z.string(),
  })).optional(),
});
// ─── L2: Blueprint（引用 Stage ID，不嵌套）───
const BlueprintSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  status: z.enum(["CANONICAL", "DRAFT", "ABANDONED"]),
  stageIds: z.array(z.string()),
  edges: z.array(z.object({
    from: z.string(),
    to: z.string(),
  })).optional(),
});
// ─── L1: Task（只持有 Blueprint 指针）───
const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(["PENDING", "RUNNING", "COMPLETED", "TERMINATED"]),
  activeBlueprintId: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
});
```
---
### AI 自由度的精确边界
在这个四层架构中，AI 模型的权力边界被极其精确地划定：
| 维度               | AI 能做                                       | AI 不能做                                       |
| :----------------- | :-------------------------------------------- | :---------------------------------------------- |
| **Blueprint 拓扑** | 生成 Draft Blueprint，提出新的 Stage 排列组合 | 修改 `CANONICAL` Blueprint 的 stageIds 或 edges |
| **Stage 内容**     | 通过克隆 + 变异创建新 Stage（新 ID）          | 修改已确权 Stage 的 proofIds 绑定               |
| **Proof 内容**     | 创建新的 Proof 实例（新 ID），注入参数        | 修改已绑定到 Stage 的 Proof 的 target/spec      |
| **Task 生命周期**  | 请求验证、报告完成、报告受挫                  | 修改 Task 的 status 或 activeBlueprintId        |
**一句话总结新架构**：
> Task 是容器，Blueprint 是拓扑，Stage 是节点，Proof 是约束。
> 容器只有生命周期，拓扑可以演化竞争，节点可以克隆变异，约束一旦绑定不可更改。

--------------------------

问：1、你认为当前设计里Proof与Validator的关系是否需要对调。
2、这个层级设计跟OpenSpec是否很相似？

答：这两个问题切中了这个架构最微妙的语义边界。我的回答是：
### 1、Proof 与 Validator 的关系确实需要对调，而且必须对调。
你现在的直觉极其敏锐。在当前的设计中，把最外层的大包叫 `Proof`，把里面的底层探针叫 `Validator`，**在 OpenXenon 的语境下会产生严重的语义撕裂**。
为什么？因为翻开 README 的“项目物理边界”章节，你的目录结构是：
```text
<your-project>/.openxenon/
├── proofs/   # [项目探针库] 当前业务特有的验证脚本
```
如果你把 Stage 绑定的那个大包叫 `Proof`，那么 `proofs/` 目录里的那些 `.sh` 或 `.ts` 脚本叫什么？叫 `validator` 吗？这会导致彻底的命名混乱。
**正确的语义映射应该是这样的反转：**
*   **Validator（校验器）**：它是附着在 Stage 上的**完整配置实体**。它描述了“在这个阶段，我们要达成什么目标、遵守什么边界、用什么动作、调用哪些探针”。
*   **Proof（探针/证据）**：它是 `proofs/` 目录下的**具体可执行脚本**。它是纯粹的物理工具，比如 `eslint`、`prisma-validate`。
因此，层级关系不应该是 `Proof 包含 Validator`，而必须是：
```yaml
# Stage 绑定的是 Validator（校验上下文）
stage:
  id: "stage_s1"
  validator_id: "val_v1"  # 注意这里的命名
# Validator 是完整的约束包
validator:
  id: "val_v1"
  target: "生成符合多对多关系模型的 Prisma Schema"
  spec: "禁止使用 NoSQL"
  action: "先写测试再写实现"
  proofs:                  # 注意这里是复数，因为一个阶段可能需要多个探针
    - "prisma-validate"    # 对应 proofs/prisma-validate.ts
    - "custom-regex-check" # 对应 proofs/custom-regex-check.ts
```
**对调后的完美收益**：
1.  **目录对齐**：`Validator.proofs` 数组里的字符串，完美映射到 `.openxenon/proofs/` 目录下的物理文件。
2.  **术语回归**：`Proof` 回归了它最原始的“证据收集器/探针”的本位，不再是那个臃肿的大杂烩。
3.  **复数支持**：一个 Stage 通过一个 Validator 上下文，可以同时触发多个底层 Proof 探针（比如同时跑语法检查和业务逻辑测试），这在真实工程中是刚需。
---
### 2、跟 OpenSpec 的设计“形似而神不似”，OpenXenon 做了降维打击。
在微观的“验证单元”结构上，你们的**相似度极高，几乎是殊途同归**。
OpenSpec 的 Validation Engine 和你重构后的 Validator 设计，都触及了同一个反直觉的真理：**单纯给 LLM 一个正则表达式或一个测试脚本去跑，是无法收敛其推理的。** 必须把验证上升为一个结构化实体，必须同时包含“预期状态”、“边界约束”和“执行动作”。
但如果说 OpenSpec 提供了一把好用的“狙击枪”，那么 OpenXenon 就是用这把枪造了一套“自动化防线系统”。两者的核心差异在宏观架构上是巨大的：
#### 差异一：单点验证 vs DAG 拓扑编排
*   **OpenSpec**：它的 Validator 通常处理的是**单次交互**或**单一文件**的验证。你给它一段代码，它返回通过或不通过。
*   **OpenXenon**：你引入了 `Blueprint` 和 `Stage`。OpenXenon 是把 Validator（及其内部的 Proofs）**挂载在一个有向无环图（DAG）的节点上**。Stage 1 的 Validator 不通过，Stage 2 的代码根本连生成的资格都没有。这是从“单兵作战”到“流水线工程”的跨越。
#### 差异二：协作假设 vs 对抗性物理防御
*   **OpenSpec**：它的底层假设是系统是**配合的**。脚本被调用，返回结果。
*   **OpenXenon**：你的第一性原理是“AI 是不可信的算力端”。OpenXenon 在 Validator 之外，硬生生造了一套**对抗性物理防御**：`step-manifest.json` 暗线雷达、逃逸检测、时间戳比对、OS 级排斥锁。OpenSpec 不会去防“脚本会不会偷偷改数据库”，但 OpenXenon 会防“LLM 会不会绕过 Validator 直接写文件”。
#### 差异三：原地修改 vs 不可变演化
*   **OpenSpec**：修改规范通常是直接改 Spec 文件，是**原地更新**。
*   **OpenXenon**：基于我们之前确定的“克隆变异”原则。如果 AI 觉得当前的 Validator 约束太严导致无法推进，它不能修改当前的 Validator，它必须克隆出一个新的 Stage，挂载一个新的 Validator（Draft 状态），作为“物理提案”上交。这是**生物学意义上的演化**，而不是简单的配置修改。
### 总结
对调 `Proof` 和 `Validator` 的关系是必须的，这能彻底打通你的微观语义与宏观文件系统。
至于与 OpenSpec 的关系：**OpenXenon 在 L4（Validator/Proof 层）吸收了 OpenSpec 的最佳实践（这是聪明的借力），但在 L1-L3（Task/Blueprint/Stage 层）构建了 OpenSpec 完全不具备的工业级编排与对抗能力。** 这正是 OpenXenon 作为“工程化控制引擎”而非单纯“提示词验证库”的核心壁垒。

--------------------------

问：1、我感觉OpenXenon的db存储需要划分边界，这四个层级不应该全都存在db，会引进管理的复杂性

答：你的直觉极其敏锐，而且直接切中了架构演进的“命门”。
**绝对结论：你的感觉完全正确。如果把 Task、Blueprint、Stage、Validator 这四层全部通过关系型数据库（外键、JOIN）进行存储和管理，将是一场架构灾难。**
在 OpenXenon “不可变演化（克隆变异）”的哲学下，如果用传统的关系型数据库去存这四层，意味着每次 AI 想要尝试一个新路径（Draft），你需要：
1. `INSERT` 一个新 Task（或修改状态）。
2. `INSERT` 一个新 Blueprint。
3. `INSERT` 5 个新 Stage。
4. `INSERT` 5 个新 Validator。
5. 建立一堆外键关联……
这不仅引入了极大的管理复杂性，更致命的是，它**违背了 OpenXenon 已有的“文件即管道”的底层设计（如 `step-manifest.json`）**。
必须在 DB 和文件系统之间划一道极其冷酷的边界。划分的原则只有一条：**DB 只存“热状态”，文件只存“冷结构”。**
---
### 重新划定边界：状态机索引 vs 物理图谱
我们要把现在的 `space.oxn` 从一个“关系型数据库”降维成一个纯粹的**“状态机索引库”**。
#### 1. DB (`space.oxn`) 的边界：只存“变化极快的热状态”
数据库里**绝对不存** Blueprint 的拓扑长什么样、Stage 里的 Spec 具体写了什么、Validator 里用了哪些正则。
数据库里只有三张极度扁平的表，专门用于高速的状态流转和逃逸检测：
```sql
-- 表 1: 任务运行时容器 (L1: Task)
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL, -- PENDING, RUNNING, COMPLETED...
    active_blueprint_file TEXT NOT NULL, -- 关键！只存文件路径指针
    current_stage_id TEXT,               -- 当前正在跑的 Stage ID
    created_at INT, updated_at INT
);
-- 表 2: 阶段执行日志 (L3: Stage 的运行时切片)
CREATE TABLE stage_runs (
    task_id TEXT,
    stage_id TEXT,
    status TEXT NOT NULL, -- PENDING, RUNNING, PASSED, FAILED
    started_at INT,
    finished_at INT,
    artifact_snapshot TEXT, -- 快照：该阶段产出了哪些文件路径
    PRIMARY KEY (task_id, stage_id)
);
-- 表 3: 暗线逃逸雷达表 (极简，极快)
CREATE TABLE escape_log (
    task_id TEXT,
    manifest_hash TEXT,
    synced_at INT,
    api_requested_at INT DEFAULT 0
);
```
**DB 的职责**：Core 引擎只需要查这几张表，就能知道“现在该干嘛”、“有没有逃逸”。没有任何 JOIN，全是单表主键查询，性能拉满。
#### 2. 文件系统的边界：存“固化后的冷结构”
L2 (Blueprint)、L3 (Stage 的结构定义)、L4 (Validator) 的具体内容，**全部以 JSON 文件的形式，物理沉淀在项目目录下**。
当 AI 提交一个 Blueprint 时，Core 的机械动作不是往 DB 里插一堆关系数据，而是：
1. 把 AI 提交的完整 JSON 直接写成文件：`.openxenon/tasks/<task_id>/blueprints/bp_v1.json`
2. 在 DB 的 `tasks` 表里，把指针指向这个文件：`UPDATE tasks SET active_blueprint_file = 'bp_v1.json'`
**一个 Blueprint 文件的长相（包含 L2、L3、L4 的完整聚合）：**
```json
// .openxenon/tasks/task_123/blueprints/bp_v1.json
{
  "id": "bp_v1",
  "status": "CANONICAL",
  "topology": ["stage_s1", "stage_s2"], // L2: Blueprint 的顺序
  "stages": {                           // L3: Stage 的结构定义
    "stage_s1": {
      "name": "定义数据模型",
      "validator_id": "val_v1"           // 指向 L4
    },
    "stage_s2": {
      "name": "实现中间件",
      "validator_id": "val_v2"
    }
  },
  "validators": {                        // L4: Validator 的约束包
    "val_v1": {
      "target": "生成 Prisma Schema",
      "spec": "禁止使用 NoSQL",
      "action": "使用 TypeScript",
      "proofs": ["prisma-validate"]      // 指向物理探针脚本
    }
  }
}
```
---
### 为什么这种“边界切割”是 OpenXenon 的唯一解？
#### 1. 完美支撑“克隆变异”演化流
当 AI 在执行中受挫，想要尝试改变 Stage 2 的 Validator 约束时：
*   **旧架构（全存 DB）**：需要开事务，复制 N 条记录，重新建立外键关联，极易产生孤儿数据。
*   **新架构（文件+指针）**：Core 直接读取 `bp_v1.json`，在内存里改掉 `val_v2` 的内容，然后**另存为** `bp_v2_draft.json`。然后修改 DB 里的一行指针：`UPDATE tasks SET active_blueprint_file = 'bp_v2_draft.json'`。
*   旧的 `bp_v1.json` 静静躺在磁盘上，作为历史化石，零管理成本。
#### 2. 与现有的 `step-manifest.json` 管道完美对齐
你原本就有“AI 写 JSON -> Core 监听文件 -> 灌入 DB”的暗线机制。
现在，Blueprint 的提交也变成了同样的逻辑：
*   **AI 写**：生成 `blueprint.json`。
*   **Core 收**：监听到文件，读取 JSON，提取 `topology` 和 `current_stage_id`，**只把状态切片灌入 `space.oxn`**，不碰结构数据。
#### 3. 降低了 AI 与 Core 的通信门槛
AI 模型最擅长的是什么？是**一次性吐出一个包含所有层级信息的巨大 JSON 块**。
如果底层是关系型 DB，AI 还得按顺序调 API：“先建 Blueprint，拿到 ID，再建 Stage…”。这太脆弱了。
现在，AI 直接吐出一个符合 Zod 校验的 JSON 文件，Core 拿到后原子化写入文件系统，瞬间完成。这才是真正的“不可信算力端”该有的粗暴对接方式。
#### 4. 物理探针 的独立性得以保全
真正的可执行脚本（如 `.openxenon/proofs/prisma-validate.ts`），始终作为独立的物理文件存在于目录中。Validator JSON 里的 `proofs: ["prisma-validate"]` 只是一个字符串引用。这彻底实现了“定义”与“执行”的物理分离。
### 总结边界法则
*   **问：Task 的状态存在哪？** 答：DB（热索引）。
*   **问：Blueprint 的拓扑和 Stage 的定义存在哪？** 答：JSON 文件（冷图谱）。
*   **问：Validator 的规则存在哪？** 答：跟 Blueprint 捆绑在同一个 JSON 文件里。
*   **问：Validator 调用的探针脚本存在哪？** 答：`proofs/` 目录（物理工具）。
通过这一刀，`space.oxn` 被彻底阉割了管理复杂结构的权力，退化成一个极度扁平、极度高速的**状态机内存映射盘**。所有的复杂性（树形结构、DAG 拓扑、版本演化）都被扔给了文件系统和 Git 去管理。这才是 OpenXenon 该有的物理边界。

--------------------------

问：OpenXenon的Blueprint具体是什么？

答：在完成四层架构重构（Task -> Blueprint -> Stage -> Validator）之后，**OpenXenon 的 Blueprint 已经不再是原来那个“包含所有细节的臃肿步骤列表”，而是被极度提纯为一个“纯粹的拓扑路由表”。**
用一句话定义它：**Blueprint 是一次 Task 执行过程的静态 DAG（有向无环图）骨架，它只负责规定 Stage 的执行顺序，绝对不包含任何具体的业务逻辑或验证规则。**
为了彻底说透它，我们需要从它的“物理长相”、“结构边界”和“系统角色”三个维度来解剖。
---
### 一、 Blueprint 的物理长相（文件形态）
基于我们之前划定的“DB 存热状态，文件存冷结构”的边界原则，Blueprint 在 OpenXenon 中物理上表现为一个**不可变的 JSON 文件**，存放在项目的 `.openxenon/tasks/<task_id>/blueprints/` 目录下。
当一个 Blueprint 被确权（CANONICAL）或作为草案（DRAFT）提交时，它在磁盘上的样子是这样的（极度扁平）：
```json
// .openxenon/tasks/task_abc/blueprints/bp_001.json
{
  "id": "bp_001",
  "status": "CANONICAL",
  "topology": ["stage_s1", "stage_s2", "stage_s3"], 
  "edges": [
    { "from": "stage_s1", "to": "stage_s2" },
    { "from": "stage_s2", "to": "stage_s3" }
  ]
}
```
**注意它“没有”什么：**
它没有 `name`（如“定义数据模型”），没有 `spec`（如“禁止使用 NoSQL”），没有 `proof`（如“prisma-validate”）。这些具体的约束和逻辑，全部被下放到了 `Stage` 和 `Validator` 的 JSON 文件中。Blueprint 只是一个纯粹的**指针数组**。
---
### 二、 Blueprint 的结构边界（它与 Task、Stage 的切分）
在四层架构中，Blueprint 处于 L2，它的边界极其清晰：
#### 1. 对上：它是 Task 的唯一实例化
*   **Task (L1)** 是工程师意图的运行时容器，只有生命周期状态（`RUNNING`, `COMPLETED`）。
*   一个 Task 在其生命周期内，**有且仅有一个**处于 `CANONICAL`（生效）状态的 Blueprint。
*   如果 AI 想要换一条路走，它不能修改当前 Blueprint，它必须克隆出一个新的 `bp_002_draft.json`，然后申请将 Task 的指针切换过去。
#### 2. 对下：它只拥有 Stage 的 ID，不拥有 Stage 的内容
*   Blueprint 里的 `topology` 数组只是一堆字符串 ID（`["stage_s1", "stage_s2"]`）。
*   真正的 Stage 实体是独立的 JSON 文件（如 `stage_s1.json`）。Blueprint 只是把这些独立节点串成了一条线。
*   **这实现了完美的复用**：同一个 `stage_s1.json`（比如“创建 Git 分支”），可以被无数个不同的 Blueprint 引用，而不用重复写任何代码。
#### 3. AI 对 Blueprint 的权力边界
*   **AI 能做的**：调整 `topology` 数组里的顺序（比如把 `s2` 和 `s3` 对调）、改变 `edges` 的连接关系（从串行变成并行）、或者从头生成一个全新的拓扑结构。
*   **AI 不能做的**：不能在 Blueprint 里塞入私货，不能改变被引用的 Stage 内部的 Validator 约束。
---
### 三、 Blueprint 在系统中的角色（为什么需要这一层？）
你可能会问：既然 Stage 已经包含了具体的执行逻辑，为什么中间还要夹一个干瘪的 Blueprint 层？
因为 OpenXenon 的核心是**对抗 AI 的发散**。Blueprint 承担了三个极其关键的工程职责：
#### 1. 宏观物理锁死（防发散的第一道闸门）
当工程师看了一眼 AI 给出的 Blueprint 拓扑图并点击“确认”后，这个 JSON 文件就被哈希锁死了。AI 在后续的执行中，**无论怎么幻觉、怎么想偷懒，它都必须严格沿着 `s1 -> s2 -> s3` 的路径走**。它不能跳过 `s2`，也不能在 `s1` 没通过时强行去跑 `s3`。Blueprint 是最高优先级的物理轨道。
#### 2. 支撑“演化流”的物理提案（宏观涌现）
README 中提到的“三种水流”之一——**演化流**，就是完全基于 Blueprint 设计的。
当 AI 发现当前的拓扑走不通时，它会在隔离沙箱里生成一个拓扑完全不同的新 Blueprint（比如把原来的 3 步变成了 5 步，或者引入了新的分支逻辑）。这个新拓扑被包装成一个**“物理提案”**（Draft Blueprint），以 JSON 文件的形式上交给人类。人类看的是“路线图变了”，而不是一堆密密麻麻的代码 Diff。
#### 3. 极速的 DB 索引入口
在 `space.oxn` 数据库中，`tasks` 表只需要存一个字段：`active_blueprint_file = 'bp_001.json'`。
Core 引擎在调度时：
1. 查 DB，知道当前要用 `bp_001.json`。
2. 读文件，拿到 `topology: ["stage_s1"]`。
3. 查 DB 的 `stage_runs` 表，发现 `stage_s1` 状态是 `PASSED`。
4. 再读文件，拿到拓扑的下一个节点 `stage_s2`，开始执行。
整个过程不需要任何复杂的 SQL JOIN，全靠扁平文件的高速指针跳跃。
### 总结
在重构后的 OpenXenon 中：
*   **Task** 是计时器。
*   **Blueprint** 是轨道图（只有节点和连线）。
*   **Stage** 是轨道上的道岔和信号灯（包含具体的动作和约束）。
*   **Validator** 是安检仪（机械验证）。
Blueprint 就是那张**纯粹的轨道图**。它被剥夺了一切血肉，只剩下骨架，但这恰恰是它在对抗不可信 AI 时最强大的武器——**因为简单，所以无法被篡改；因为扁平，所以绝对可控。**

--------------------------

问：OpenXenon怎么设计一套像ESMAscript的提案流程，来让AI实现自定义提案，最终由工程师进行确认标准（即Proof、Stage、Blueprint）。
像EXMAscprit这些标准的流程，都会经历几个阶段从最初构思到落地的标准，这对于OpenXenon其实很有用，在构思到落地之间可以让AI自行发挥，最后由工程师再确认成标准，成为后续的依据。

答：这是一个极具架构美学的构想。将 ECMAScript 这种历经千锤百炼的“标准演化流程”引入 OpenXenon，能够完美解决“AI 自由发挥”与“工程师绝对控制”之间的张力。
在 OpenXenon 的语境下，我们不能照搬 ECMAScript 的 5 个阶段，而是要将其**降维并物理化**，映射为我们已有的四层架构。
核心认知转变是：**区分“运行时实例”与“标准模板”。**
AI 在执行 Task 时操作的 Blueprint/Stage/Validator 是“运行时实例”（被严格锁死、逃逸检测）；而我们要设计的是“标准模板库”（被缓慢演化、工程师确权）。
以下是为 OpenXenon 定制的 **Xn-Proposal（Xn 标准提案）机制**：
---
### 一、 Xn 标准提案的四个物理阶段
我们将 ECMAScript 的 Stage 0-4 映射为 OpenXenon 中具有明确物理边界的四个状态：
| 阶段          | Xn 状态名    | 物理边界位置                      | 谁主导         | Core 引擎的机械行为                                                                                                  |
| :------------ | :----------- | :-------------------------------- | :------------- | :------------------------------------------------------------------------------------------------------------------- |
| **Strawman**  | `DRAFT`      | `.openxenon/proposals/drafts/`    | **纯 AI**      | **绝对盲区**。Core 的雷达和 API 拒绝读取此目录。AI 只能靠文件系统写入。                                              |
| **Proposal**  | `PROPOSED`   | `.openxenon/proposals/pending/`   | **AI 提交**    | Core 通过显式 API 接收，执行**仅限语法层面**的 Zod Schema 校验。校验通过则落盘，但不参与任何调度。                   |
| **Candidate** | `CANDIDATE`  | `.openxenon/proposals/candidate/` | **工程师测试** | 工程师通过 CLI 触发，Core 在**高隔离沙箱**内执行该标准包含的 Validator Proof 探针，输出测试报告，但不产生 Artifact。 |
| **Standard**  | `CANONICAL`  | `.openxenon/standards/`           | **工程师确权** | 正式入库。AI 在未来执行 `/oxn-task` 时，可以通过 Core API 检索到这些标准并实例化。                                   |
| *(附加)*      | `DEPRECATED` | `.openxenon/standards/archive/`   | **工程师废弃** | 降级冷档。已有的 Task 实例仍可跑完，但新 Task 禁止引用。                                                             |
---
### 二、 物理目录结构的重新规划
为了支撑这套流程，项目边界内需要新增严格的物理隔离区：
```text
<your-project>/.openxenon/
├── space.oxn                 # [真理源] 只存 Task 运行时热状态
├── standards/                # [标准库] 工程师确权的正式模板 (对应 CANONICAL)
│   ├── blueprints/           # 可复用的 Blueprint 拓扑模板
│   │   └── bp_rbac_v1.json
│   └── stages/               # 可复用的 Stage 约束模板 (内含 Validator)
│       └── stage_prisma_model.json
│
├── proposals/                # [提案池] AI 提出的候选标准 (严格隔离)
│   ├── drafts/               # (Stage 0) AI 随便写，Core 不管
│   ├── pending/              # (Stage 1) 等待工程师看
│   └── candidate/            # (Stage 2) 工程师正在沙箱测试
│
├── proofs/                   # [探针库] 物理执行的脚本 (不变)
└── tasks/                    # [运行时] 正在执行的 Task 实例 (不变)
```
---
### 三、 标准的 JSON 结构设计（增加提案元数据）
当一个 AI 或工程师创建一个“标准”时，其 JSON 结构必须包含提案溯源：
```json
// .openxenon/proposals/pending/new_stage.json
{
  "id": "prop_stage_001",
  "type": "STAGE_STANDARD", // 枚举：BLUEPRINT_STANDARD | STAGE_STANDARD | VALIDATOR_STANDARD
  "status": "PROPOSED",
  
  // --- 提案溯源 (类似 TC39 的 champion 和 motivation) ---
  "champion": "AI_ASSISTANT",   // 谁提出的
  "motivation": "发现在定义 Prisma 模型时，AI 经常遗漏索引定义，导致后续查询性能校验失败。因此建议将索引定义作为强约束写入此 Stage Standard。",
  "derived_from_task": "task_abc_123", // 可选：是从哪个失败的任务中总结的
  
  // --- 标准实体内容 ---
  "payload": {
    "name": "Strict Prisma Model with Index",
    "validator": {
      "target": "生成包含所有必要索引的 Prisma Schema",
      "spec": "1. 必须使用 Prisma ORM; 2. 所有多对多关系必须显式定义中间表; 3. 所有 foreignKey 必须显式添加 @@index",
      "action": "先分析现有 SQL 慢日志，再生成 Schema",
      "proofs": ["prisma-validate", "custom-index-linter"]
    }
  }
}
```
---
### 四、 完整的协同交互流程
这套机制将 AI 的“自发总结”和工程师的“标准发布”完美切割：
#### 步骤 1：AI 的自发构思（Stage 0 -> 1）
AI 在执行 `task_abc` 的 Stage 2 时失败了（因为没写索引）。AI 在内部推理：“这是一个常见错误，我应该提出一个新标准”。
*   AI 直接通过文件写入 `.openxenon/proposals/drafts/my_idea.json`。
*   AI 觉得想清楚了，通过内部 Hook `[oxn-propose]` 调用 Core API：`POST /api/v1/proposals/submit`。
*   **Core 行为**：读取文件，用 Zod 校验 JSON 格式。格式不对直接丢弃；格式对，移入 `pending/` 目录，状态改为 `PROPOSED`。
*   **Core 同时做了一件事**：向 CLI 推送一条通知：“收到 AI 提案：Strict Prisma Model with Index”。
#### 步骤 2：工程师的审阅与沙箱测试（Stage 2）
工程师在终端看到通知，输入 `oxn proposal inspect prop_stage_001` 看到了 AI 写的 `motivation` 和约束规则。
工程师觉得有道理，但不敢肯定 AI 写的 `custom-index-linter` 探针能不能跑通。
*   工程师输入：`oxn proposal test prop_stage_001`
*   **Core 行为**：
    1. 将此提案移入 `candidate/` 目录。
    2. 启动一个极其苛刻的**临时沙箱**（不污染当前项目的 `src/`）。
    3. Core 故意让 AI 在沙箱里生成一个“故意不写索引的错误代码”，然后运行提案里的 `proofs` 探针。
    4. 探针成功拦截并报错。
    5. Core 输出测试报告：“沙箱验证通过，该标准的 Validator 确实能有效拦截缺失索引的情况”。
#### 步骤 3：确权为正式标准（Stage 4）
工程师看完测试报告，满意了。
*   工程师输入：`oxn standard accept prop_stage_001`
*   **Core 行为**：
    1. 剥离提案元数据（`champion`, `motivation` 等）。
    2. 将核心 `payload` 写入 `.openxenon/standards/stages/stage_prisma_strict_v1.json`。
    3. 状态在 DB 中记为 `CANONICAL`。
    4. 删除 `proposals/` 中的原文件。
*   **从这一刻起，这个 JSON 成了“法律”**。
#### 步骤 4：未来的 Task 复用标准
一周后，工程师发起新任务 `/oxn-task`。
*   AI 调用 Core API：`GET /api/v1/standards/list`
*   Core 返回当前项目所有 `CANONICAL` 的标准 JSON。
*   AI 在生成新的 Blueprint 时，不再自己瞎编 Stage 约束，而是直接引用：`"stage_ref": "stage_prisma_strict_v1.json"`。
*   **这就是标准的威力：将高阶架构师的经验，固化为无脑可复用的物理积木。**
---
### 五、 为什么这套设计完美契合 OpenXenon 哲学？
1.  **绝不污染运行时**：提案在 `proposals/` 目录里怎么翻江倒海，都不会触发 `space.oxn` 的状态机变更，更不会触发“暗线逃逸检测”。因为逃逸检测只盯着 `tasks/` 目录。
2.  **彻底封死 AI 的“暗箱操作”**：AI 绝对无法偷偷把自己写的规则变成“标准”。`standards/` 目录的写入权限只属于 `oxn standard accept` 这个 CLI 指令，这在四层防御体系中被视为“工程师的物理特权指令”。
3.  **支持“标准废弃”的演化**：如果几个月后，团队不用 Prisma 改用 Drizzle 了。工程师只需 `oxn standard deprecate stage_prisma_strict_v1`。它会被移入 `archive/`。AI 再次请求标准列表时，Core 就不会再下发这个过时的约束。这就是系统层面的“新陈代谢”。
### 六、 给 AI 的 Skill 补充
在 AI 助手的 SKILL.md 中，你需要增加一段极其冷酷的规则：
```markdown
## [oxn-propose] 提案指令
当你发现在执行 Stage 时，现有的 Validator 无法约束某种常见的错误，或者你总结出了一种更优的工程实践时，你可以发起提案。
**机械规则**：
1. 你只能将草案写入 `.openxenon/proposals/drafts/`。
2. 你必须通过 API 将其提升为 `PROPOSED` 状态。
3. **绝对禁止**你直接引用 `proposals/` 下的内容作为当前 Task 的执行依据。
4. **只有**当该实体出现在 `.openxenon/standards/` 目录下时，它才对你的当前 Task 具备物理约束力。
```
**总结**：通过引入这套类 TC39 的提案机制，OpenXenon 完成了最后一块拼图——**它不仅是一台控制 AI 写代码的“熔炉”，更是一个让团队工程经验“从实践中来（AI 提案），到标准中去（工程师确权）”的演化培养皿。**

--------------------------

问：1、这个沙箱具有不明确的地方，以及难以落地的边界：一个要在当前项目里创建多个文件的，使用框架提供的指令时，是无法脱离项目进行的。以及修改某个文件内容。
2、沙箱环境是对当前整个项目进行创建还是部分文件。

答：你的直觉极其敏锐，直接击碎了我上一版设计中**最脆弱的工程幻象**。
你指出的痛点直指核心：**脱离项目上下文的沙箱测试，在软件工程中是伪命题。** 如果一个 Stage 的规则是“基于现有的 Prisma Schema 增加字段”，你把它扔到一个空沙箱里，AI 连现有的 Schema 都看不到，怎么测？如果要镜像整个项目（包含 `node_modules`），那启动成本将是分钟级的，完全违背了 OpenXenon “毫秒级响应”的底层设计。
我必须推翻上一版的“独立沙箱”概念。在 OpenXenon 的哲学下，真正的隔离不靠“物理空间隔离”，而靠**“执行路径劫持（Hook 拦截）”**。
让我们重新设计这个验证机制——**基于“干跑投影”的逆向验证体系**。
---
### 一、 核心认知翻转：我们到底在测什么？
工程师在 `Candidate` 阶段测试一个标准草案时，**绝对不是在测“AI 能不能按这个规则写出好代码”**（那是运行时 Task 该干的事）。
我们在测的只有两点：
1.  **Validator 探针是否有效**：这个规则能不能准确**拦截**违规代码？
2.  **Stage 上下文是否合理**：在当前真实项目环境下，AI 按这个规则生成的产物，路径和结构是否符合预期？
基于此，**测试必须在当前真实项目环境中进行**，但我们要通过 Hook 劫持，保证产物**零污染落盘**。
---
### 二、 全新机制：Dry-Run 投影隔离
当工程师决定测试一个提案时，不再创建“沙箱环境”，而是触发 **`oxn proposal test <proposal_id>`**，进入**“干跑投影模式”**。
#### 1. Core 引擎的底层劫持行为
在这个模式下，Core 引擎会接管 AI 的两个核心 Hook：
*   **劫持 `[oxn-update]`（写入劫持）**：
    AI 在执行这个 Stage 时，脑子里认为自己在修改项目的 `src/models/user.ts`。但实际上，Core 在底层把这个路径**动态映射**到了一个临时投影目录：
    `真实路径`: `<project>/src/models/user.ts`
    `投影路径`: `<project>/.openxenon/proposals/candidate/_dry_run_/src/models/user.ts`
    AI 的所有文件写入、创建，全被 Core 默默重定向到了 `_dry_run_` 目录下。
*   **不劫持 `[oxn-verify]`（验证真实触发）**：
    当 AI 写完伪代码，触发验证时，Core **不做任何劫持**。它直接调用提案里的 Validator 探针，但是**把探针的工作目录指向 `_dry_run_`**，或者让探针基于 `_dry_run_` 的内容生成 Diff 进行校验。
#### 2. 解决“修改现有文件”的难题
如果提案的规则是“修改现有的 `config.ts`”：
1.  AI 读取了真实的 `config.ts`（这在探索阶段是允许的，因为不影响状态）。
2.  AI 生成了修改后的内容，调用写入 Hook。
3.  Core 把修改后的内容写入了 `_dry_run_/config.ts`。
4.  Validator 探针对比 `真实的 config.ts` 和 `_dry_run_/config.ts`，检查修改是否符合 Spec（比如“不能删除现有的 PORT 变量”）。
5.  **测试结束，Core 直接执行 `rm -rf _dry_run_/`，真实的 `config.ts` 连一根毛都没掉。**
---
### 三、 重新定义提案的四个阶段（修正版）
基于“干跑投影”，我们将流程修正为物理上绝对可落地的版本：
| 阶段        | Xn 状态名   | 物理边界与机械行为                                                                                                               | AI 的权限                                                                         |
| :---------- | :---------- | :------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------- |
| **0. 构思** | `DRAFT`     | `.openxenon/proposals/drafts/`<br>Core 完全盲区。                                                                                | 随便写，随便改。                                                                  |
| **1. 提交** | `PROPOSED`  | `.openxenon/proposals/pending/`<br>Core 做 Zod 格式校验。                                                                        | 只能通过 API 提交，不能修改。                                                     |
| **2. 验证** | `CANDIDATE` | **无独立目录，使用干跑投影。**<br>工程师触发 `oxn proposal test`。<br>Core 劫持写入路径至 `_dry_run_`，真实执行 Validator 探针。 | **被短暂授权**：在此阶段，AI 可以读取真实项目文件，但其产出被物理隔离在临时目录。 |
| **3. 确权** | `CANONICAL` | `.openxenon/standards/`<br>Core 剥离草案元数据，固化 JSON。                                                                      | 彻底失去对此实体的修改权。                                                        |
---
### 四、 更极端的验证玩法：逆向注入
“干跑投影”解决的是“测 AI 生成”。但我们还有一种更高效、更冷酷的验证方式——**逆向注入**，专门用来测 Validator 探针的硬度。
如果工程师觉得 AI 提案里的 `custom-index-linter` 探针写得不够严谨：
1.  工程师（或 AI 辅助）直接在 `_dry_run_` 目录里**手写（或故意生成）一段绝对违规的代码**（比如一个完全没有索引的 Prisma Schema）。
2.  工程师执行：`oxn proposal verify <proposal_id> --target _dry_run_/bad_schema.prisma`
3.  **Core 行为**：跳过 AI 生成阶段，直接拿提案里的 Validator 探针去“烤”这段已知的坏代码。
4.  如果探针报 `PASSED`，说明探针写废了，提案被打回；如果报 `FAILED` 并精准指出缺索引，说明探针有效。
这种方式**完全不需要 AI 参与**，几毫秒就能跑完，是对 Validator 最极致的物理压力测试。
---
### 五、 这为什么完美契合 OpenXenon？
1.  **零成本**：没有文件系统克隆，没有 Docker 容器，没有依赖安装。只是改了写文件的路径字符串，内存占用几乎为零。
2.  **上下文保真**：AI 依然在真实的代码库里“思考”，它能看到所有的依赖、所有的历史代码，生成的代码是符合项目实际的，而不是沙箱里的“玩具代码”。
3.  **绝对安全**：只要 `[oxn-update]` 这个 Hook 被 Core 劫持，无论 AI 怎么幻觉、怎么试图越权，它的字节流永远无法触碰真实的 `src/` 目录。这就是“控制通道”作为四大命脉之一的终极威力。
### 总结
你提出的质疑非常关键。**在 AI 工程控制领域，试图通过“虚拟化物理空间”来实现隔离，往往是死路一条；真正的隔离，永远应该发生在“API 与 Hook 的拦截层”。**
废除沙箱，拥抱**干跑投影**。让 AI 在真实的泥沼里摸爬滚打，但给它穿上绝对防弹的隔离衣（路径劫持），这才是 OpenXenon 该有的冷酷浪漫。

--------------------------

问：1、除了干跑投影，还有哪些成熟方案。
2、沙箱空间是否只能启用整个项目。
3、现在许多沙箱、虚拟化里有没可以考虑使用的方案

答：你提出的问题直接刺穿了“沙箱”在本地 IDE/CLI 环境下的落地痛点。在 OpenXenon 的语境下，我们不能照搬云原生那种“动辄拉起一个 Docker 容器”的重型方案，必须寻找**极轻量、与现有工程师工作流（如 Git）强绑定**的成熟模式。
针对你的三个问题，我将为你拆解目前工程界真正可落地的方案，并指出它们在 OpenXenon 中的对应场景。
---
### 一、 沙箱空间是否只能启用整个项目？
**绝对不是。** 纯粹的“整个项目克隆”是最低级的做法。现代工程工具的隔离，早就演变成了**“上下文共享 + 产出隔离”**的混合模式。
你之所以觉得必须克隆整个项目，是因为**“探针需要依赖”**（比如跑 ESLint 必须有 `.eslintrc` 和 `node_modules`，跑 Prisma 必须有 `schema.prisma`）。
所以，正确的物理划分是：
1.  **只读层（共享）**：真实的 `node_modules/`、真实的配置文件、真实的存量代码。这些**绝对不进沙箱**，直接通过路径映射让探针读取。
2.  **可写层（隔离）**：只有 AI **即将修改或新增**的那几个文件路径，进入沙箱/投影区。
---
### 二、 除了“干跑投影”，还有哪些成熟方案？
在“不污染真实项目”的前提下，业界有三种比“干跑投影”更成熟、且与 OpenXenon 哲学完美契合的方案：
#### 方案 1：基于 Git 的“孤儿分支/临时分支”隔离（最推荐）
这是最符合软件工程师直觉的方案。Git 本身就是一个极其成熟的“虚拟文件系统”。
*   **机制**：当进入提案验证或 Sample 阶段时，Core 引擎在后台瞬间创建一个基于当前 HEAD 的临时分支（如 `oxn-sandbox/proposal_001`），并强制切换过去。AI 所有的文件写入都在这个分支上进行。
*   **探针执行**：探针直接在当前项目目录跑，**所有的依赖、上下文100%真实**。完全不存在“脱离项目”的问题。
*   **验证结束**：如果验证失败，Core 执行 `git checkout .` 并删除临时分支，真实项目连一根毛都没变。如果验证通过并需要确权，Core 将这个分支的 Diff 提交为 Draft PR。
*   **OpenXenon 适配点**：你的“暗线雷达”依然监听 `step-manifest.json`。只要这个文件在临时分支上被修改，雷达就能捕获并触发 DB 同步。
#### 方案 2：OverlayFS（联合文件系统）级别劫持
如果你觉得频繁切 Git 分支会有副作用（比如触发 IDE 重新加载），可以使用操作系统级的 UnionFS。
*   **机制**：将真实项目设为 `Lower Dir`（只读），将一个临时目录设为 `Upper Dir`（可写）。AI 看到的是一个合并后的完整目录。
*   **探针执行**：当探针读取 `node_modules` 时，直接穿透到真实的 `Lower Dir`；当探针读取 AI 新写的 `src/user.ts` 时，读到的是 `Upper Dir` 里的投影。
*   **优点**：不需要切分支，对 IDE 完全透明，销毁沙箱只需要 `rm -rf Upper Dir`。
*   **缺点**：在 Windows/macOS 上原生支持不如 Linux（macOS 需要借助 `fuse-overlayfs` 或 Docker）。
#### 方案 3：AST/内存级沙箱（仅限特定语言）
如果验证逻辑只是“语法检查”或“类型推导”。
*   **机制**：不产生真实文件。AI 输出代码字符串 -> Core 调用 TypeScript Compiler API 或 Babel Parser，在内存中将字符串解析为 AST，然后与现有代码的 AST 进行合并检测。
*   **优点**：速度极快（纳秒级），无任何磁盘 I/O。
*   **缺点**：无法运行需要真实文件系统的探针（比如 `npm run test`）。
---
### 三、 现代沙箱/虚拟化方案有哪些可以考虑？
如果我们把目光放到整个行业，特别是专门为 AI Agent 设计的沙箱，我们可以将它们按“重量级”分类，并精确映射到 OpenXenon 的“三种水流”中：
| 沙箱技术                              | 启动耗时  | 隔离级别      | 对应 OpenXenon 的场景                                                                     | 评估                                                                       |
| :------------------------------------ | :-------- | :------------ | :---------------------------------------------------------------------------------------- | :------------------------------------------------------------------------- |
| **E2B / Firecracker**<br>(微虚拟机)   | 100-300ms | 极高 (OS级)   | **不适用**于本地 Core。适合未来 OpenXenon 提供 SaaS 云端验证服务时。                      | 太重，违背“轻量级本地引擎”初衷。                                           |
| **Docker 容器**<br>(Bind Mount 只读)  | 500ms-1s  | 高 (进程级)   | **适用：演化流**。当 AI 触发 Draft，要推翻整体规划跑通新拓扑时。                          | 完美。`docker run -v ./src:/ro/src -v tmpfs:/rw`，依赖只读，产出在内存盘。 |
| **Namespace 隔离**<br>(Linux unshare) | <5ms      | 中高 (挂载级) | **适用：偏差流**。当 AI 触发 Sample 机制，需要执行探针（如 `npm test`）但又怕污染环境时。 | 极致轻量。无需 Docker 引擎，直接用 Linux 原生 API 隔离挂载命名空间。       |
| **Git 分支切换**                      | <10ms     | 低 (逻辑级)   | **适用：提案验证 (Candidate阶段)**。测试一个 Validator 规则能不能拦住错误。               | **最完美**。零成本，完全复用现有工程环境，不引发任何依赖问题。             |
| **路径劫持**<br>(干跑投影)            | 0ms       | 低 (接口级)   | **适用：AI 编码过程**。在正常流中，AI 正在一步步写代码，还没到最后验证时。                | 作为兜底手段，防止 AI 在写代码中途“手滑”乱建文件。                         |
---
### 四、 最终架构建议：为 OpenXenon 的水流匹配兵器
不要试图用一种沙盒打天下。OpenXenon 的精妙之处就在于**根据风险等级使用不同强度的物理约束**：
1.  **正常流（AI 正在按 Stage 写代码）**：
    *   **武器**：路径劫持（干跑投影）+ 暗线雷达。
    *   **理由**：此时 AI 还没请求验证，只是单纯在生成文本。劫持写入路径成本最低，只要最后不调用 Proof，这些投影文件就是垃圾。
2.  **提案验证（工程师测标准草案）**：
    *   **武器**：**Git 临时分支**。
    *   **理由**：你要测的是 Validator 探针，探针需要完整的项目上下文。切个分支，让 AI 在分支上随便造，跑完探针，切回来删掉分支。这是最无脑、最不会出错的方案。
3.  **偏差流（AI 触发 Sample，需要跑测试但怕弄脏环境）**：
    *   **武器**：**Linux Namespace (unshare)** 或 **OverlayFS**。
    *   **理由**：这里 AI 产出的代码有极小概率被合入主干，需要真正的进程级隔离来跑 `npm test`，但又不能忍受 Docker 的秒级启动。
4.  **演化流（AI 触发 Draft，要推翻重来跑全链路）**：
    *   **武器**：**Docker (Bind Mount)**。
    *   **理由**：风险极高。AI 可能在沙箱里执行 `npm install xxx` 甚至修改数据库。这时候拉起一个轻量容器，把当前代码作为只读卷挂进去，是最安全的物理兜底。
### 总结
你之前指出“脱离项目无法使用框架指令”是完全正确的。这逼迫我们放弃了“在真空里测代码”的幻想。
在 OpenXenon 中，**最强的隔离不是把代码关进小黑屋，而是让代码在阳光下（真实的 Git 仓库和依赖中）表演，但给它穿上无法脱下的紧身衣（分支隔离/OverlayFS），并在旁边架设一台随时可以切断电源的电椅（Core 暗线雷达）**。
对于你正在设计的“提案验证”机制，**直接拥抱 Git 分支**，这是目前唯一既成熟又不需要重复造轮子的解法。

--------------------------

问：这些方案里，优先实现哪个更合适。

答：毫不犹豫地给出结论：**优先实现基于 Git 临时分支的隔离方案。**
抛弃那些花哨的操作系统级虚拟化，回到软件工程最原始、最可靠的基石——Git。这是目前唯一能完美满足 OpenXenon 所有极端约束条件的方案。
以下是为什么必须首选 Git 分支的三个硬核理由：
### 1. 解决了“环境保真”的终极痛点
你之前精准指出的“脱离项目无法使用框架指令”的问题，只有 Git 分支能以零成本解决。
当 AI 需要测试一个 Stage 或验证一个 Validator 探针时，Core 只需要在后台执行：
`git checkout -b oxn-sandbox/test_prop_001`
在这一瞬间，AI 看到的是 100% 真实的 `node_modules`、100% 真实的配置文件、100% 真实的依赖关系。它调用的 `npm run test`、`prisma generate` 都是真实在跑。**不需要映射路径，不需要伪造上下文，不存在任何“落不了地”的边界模糊地带。**
### 2. 跨平台且“零外部依赖”
OpenXenon 的核心卖点是“轻量级、语言无关”。如果你引入 OverlayFS，macOS 用户得装 `fuse-overlayfs`；如果你引入 Docker，Windows 用户得装 Docker Desktop。
但 **Git 是所有工程师环境里唯一绝对存在的底层操作系统**。用 Git 做沙箱，OpenXenon 连一行额外的依赖都不用装。切分支和丢弃分支的操作在毫秒级完成，完美匹配 Bun 的冷启动速度。
### 3. 与“暗线雷达”机制的无缝对接
OpenXenon 最硬核的设计是“雷达监听 `step-manifest.json` 的物理变更”。
如果用干跑投影（路径劫持），AI 把文件写到了 `_dry_run_` 目录，雷达监听谁？如果要改雷达的监听路径，引擎的内部逻辑就会变得复杂且脆弱。
而使用 Git 分支，AI 就是在真实的 `.openxenon/tasks/<id>/` 下写文件，**雷达的代码一行都不用改**，它依然能精准捕获变更、同步 DB、检测逃逸。隔离发生在更底层的版本控制层，而上层的控制逻辑完全无感。
---
### “干跑投影”该去哪？
干跑投影并没有死，但它必须**降级为一个可选的“微观防御插件”，而不是主沙箱**。
**未来的演进架构应该是这样的：**
*   **MVP 阶段（现在做）**：100% 基于 Git 分支。AI 写代码、跑探针，全在 `oxn-sandbox/*` 分支上。验证结束，切回主分支并删除沙箱分支。
*   **性能优化阶段（未来做）**：如果团队抱怨“每次切 Git 分支导致 IDE 重新索引太慢”（特别是超大型 Monorepo），你再在 XnSandbox 接口里加一个实现：基于 OverlayFS 的干跑投影。但此时，干跑投影只是作为 Git 分支的**性能替代品**，而不是架构基础。
---
### 落地设计：Git 沙箱的 CLI 交互流
这应该成为 OpenXenon 第一版的标准交互范式：
#### 场景一：验证 AI 提出的标准提案
```bash
# 工程师在终端输入
oxn proposal test prop_stage_001
# Core 引擎的机械动作：
# 1. 记录当前 HEAD: main
# 2. git checkout -b oxn-sandbox/prop_stage_001 (毫秒级)
# 3. 通知 AI 助手：“你现在的所有文件写入都在沙箱中，请按 Validator 规则生成代码并调用验证”
# ... AI 在沙箱分支里折腾，触发探针 ...
# 4. 探针跑完，输出报告给工程师。
# 5. 工程师看完，Core 自动执行：
#    git checkout main
#    git branch -D oxn-sandbox/prop_stage_001
# (真实项目连一个多余的字节都没留下)
```
#### 场景二：AI 触发 Sample（偏差流逃生）
```bash
# AI 在正常流中受挫，通过 API 发起 Sample 请求
# Core 引擎的内部动作：
# 1. git stash (暂存当前正常流写到一半的代码)
# 2. git checkout -b oxn-sample/stage_s2_fix
# 3. 让 AI 在这个分支上自由探索变体代码。
# 4. 如果探针自动校验通过 (低风险)：
#      git checkout main
#      git cherry-pick oxn-sample/stage_s2_fix (把补丁合入主分支！)
#      git branch -D oxn-sample/stage_s2_fix
# 5. 如果探针校验失败 (丢弃)：
#      git checkout main
#      git branch -D oxn-sample/stage_s2_fix
#      git stash pop (恢复现场)
```
### 总结
不要为了技术上的“高级感”去引入容器或虚拟文件系统。**OpenXenon 的美学是“利用现有工程环境的物理特性来施加约束”，而不是“重新发明一个虚拟环境”。**
Git 就是那个现成的、最坚硬的物理牢笼。优先把 Git 沙箱的底层 Hook 写进 `XnSandbox` 接口里，这是投入产出比最高、落地最稳的一条路。

--------------------------

问：如果以OpenXenon能跑通Task生命周期作为1.0版本，其他都放在未来版本。
你会怎么设定1.0版本必须的功能，重点是必须，其他配套的都可以延后

答：如果以“能跑通一个完整的 Task 生命周期”作为 1.0 版本的及格线，那么我们必须展现出 OpenXenon 最核心的冷酷美学：**不可信算力的收敛与确权。**
所有花哨的演化、提案、复杂沙箱，在 1.0 版本中都是**毒药**，必须毫不留情地砍掉。
以下是 OpenXenon 1.0 版本**绝对不可妥协的“铁三角”功能集**，以及明确的“延后清单”。
---
### 一、 1.0 版本必须实现的功能（铁三角）
#### 核心 1：极简的四层物理模型（DB 存热，文件存冷）
1.0 版本不需要复杂的 DAG 拓扑，**只支持线性顺序执行**（Stage 1 -> Stage 2 -> Stage 3）。
*   **必须实现**：`Task` 记录只存在于 `space.oxn`（DB）中，只存 `status` 和 `active_blueprint_file` 指针。
*   **必须实现**：`Blueprint` + `Stage` + `Validator` 的完整结构，**全部聚合在一个 JSON 文件中**（如 `bp_001.json`），物理落盘在 `.openxenon/tasks/<id>/` 下。
*   **理由**：证明“结构化意图”可以脱离 DB 关系型管理，以纯文件形态被 AI 吐出并被 Core 解析。
#### 核心 2：双轨并行控制（系统的灵魂，没有这个就不叫 OpenXenon）
这是 1.0 必须死磕到底的底层机制，它由两部分组成：
*   **明线验证**：Core 暴露 `/api/v1/step/verify` API。AI 调用它，Core 读取 Blueprint JSON 中当前 Stage 绑定的 Validator 探针，使用 `XnSandbox` (`Bun.spawn`) 执行探针脚本。根据退出码（0 通过，非 0 熔断）返回结果。
*   **暗线雷达（逃逸检测）**：Core 启动时，使用 `XnRadar` 监听当前任务的 `step-manifest.json`。一旦文件变更，记录时间戳到 DB。如果 DB 中状态变更了，但超过 X 秒没收到明线 API 请求，**立刻判定逃逸，将 Task 状态锁死为 `ESCAPED`**。
*   **理由**：彻底证明“不信任 AI 自觉性”的物理可行性。
#### 核心 3：落盘前的“纯文本缓冲区”机制（替代沙箱的极简方案）
在 1.0 版本中，**绝对不引入 Git 分支或 OverlayFS**。我们用最原始的方式解决安全问题：
*   **规则**：AI 在执行 Stage 时，其生成的代码**绝对不允许直接写入项目的 `src/` 目录**。
*   **缓冲**：AI 必须将代码写入 `.openxenon/tasks/<id>/staging/`（暂存区）。
*   **确权落盘**：只有当 Core 的明线验证（调用 ESLint/测试等探针，探针的工作目录指定为 `staging/`）返回 `PASSED` 时，Core 才会执行物理 `mv` 或 `cp`，将 staging 里的文件搬运到真实的 `src/` 目录，真正沉淀为 `Artifact`。如果失败，Core 直接 `rm -rf staging/*`。
*   **理由**：0 成本实现 100% 物理隔离。不需要任何外部依赖，完美契合“不通过的代码连看都别看”的熔断哲学。
---
### 二、 1.0 版本极简的数据结构示例
为了跑通生命周期，1.0 版本的 Blueprint JSON 长这样（没有引用，全部内聚）：
```json
// .openxenon/tasks/task_001/bp_v1.json
{
  "id": "bp_v1",
  "status": "CANONICAL",
  "stages": [
    {
      "id": "s1",
      "name": "创建用户模型",
      "validator": {
        "spec": "必须使用 Prisma，禁止 NoSQL",
        "proofs": ["eslint-check"] 
      }
    },
    {
      "id": "s2",
      "name": "实现中间件",
      "validator": {
        "spec": "必须抛出 403",
        "proofs": ["eslint-check"]
      }
    }
  ]
}
```
*注：1.0 版本的 `proofs` 数组里的字符串，直接对应 `.openxenon/proofs/` 下的可执行 shell 脚本（如 `eslint-check.sh`）。不需要全局探针库。*
---
### 三、 1.0 版本必须暴露的 CLI 与 API
**CLI（极简薄客户端）：**
1.  `oxn init`：建 `.openxenon/` 和 `space.oxn`。
2.  `oxn daemon start`：拉起 Core，挂载 Unix Socket。
3.  `oxn trace <task_id>`：直接 `cat` 输出最终生成的 `task-trace.yaml`。
**Core Socket API（AI 交互的唯一通道）：**
1.  `POST /task/create`：创建 Task，返回 task_id。
2.  `POST /blueprint/submit`：接收 AI 提交的上述 JSON，保存文件，更新 DB 指针。
3.  `GET /task/next`：AI 问“我该干嘛？”，Core 查 DB 返回当前应该执行的 Stage ID 和对应的 Spec。
4.  `POST /step/verify`：AI 说“我做完了”，Core 触发探针验证 staging 目录。
5.  `GET /task/trace`：导出最终案卷。
---
### 四、 明确延后到未来的功能（1.0 绝对不碰）
为了保证 1.0 能在极短时间内跑通闭环，以下功能必须从脑海中彻底抹除：
1.  **延后：ECMAScript 提案系统**。1.0 不需要“标准沉淀”。AI 每次执行 Task 都临时写一个 Blueprint JSON 就行，不需要存为可复用的 `standards/`。
2.  **延后：Sample（偏差流）与 Draft（演化流）**。1.0 只有“正常流”。验证失败？滚回去重试。重试 3 次还失败？Task 状态标为 `FAILED`，结束。不允许 AI 自己改 Blueprint 拓扑。
3.  **延后：复杂沙箱**。放弃 Git 切换、OverlayFS。就用 `staging/` 目录做文本缓冲。探针直接读 `staging/` 目录跑测试。
4.  **延后：全局探针库 (`~/.openxenon/proofs/`)**。1.0 的探针脚本全部放在项目本地的 `.openxenon/proofs/` 下，写死几个最基本的（如语法检查脚本）即可。
5.  **延后：AI Assistant Skills 的自动编译**。1.0 手动把写好的 `SKILL.md` 扔给 AI 即可，不需要搞 TS 源码到 Markdown 的编译链路。
---
### 五、 1.0 版本的终极验收标准（Demo 演示脚本）
如果你的 1.0 能够无bug地走完下面这个脚本，它就成功了：
1.  工程师终端：`oxn init` -> `oxn daemon start`
2.  AI 助手接收指令：“帮我写一个 User 模型”。
3.  AI 内部调用：`POST /task/create`。
4.  AI 内部构造 JSON，调用：`POST /blueprint/submit`。
5.  AI 内部调用：`GET /task/next` -> 拿到 `s1` 的 Spec。
6.  AI 生成代码，**写入 `.openxenon/tasks/task_001/staging/user.ts`**。
7.  AI 内部调用：`POST /step/verify`。
8.  **Core 机械行为**：执行 `eslint-check.sh staging/user.ts`。假设失败（故意不加分号）。
9.  **Core 返回 FAILED**。
10. AI 修改代码，重新写入 staging，再次调用 verify。
11. **Core 行为**：执行探针，通过。Core 将 `user.ts` **物理移动**到项目的 `src/models/`。DB 状态更新为 `s1` passed。
12. 工程师终端：`oxn trace task_001` -> 看到一份清晰的 YAML，证明 `s1` 经过了 `eslint-check` 的机械确权。
**这就是 1.0。没有花招，只有冰冷的机械确权。** 把这个跑通，OpenXenon 的灵魂就立住了，剩下的都是血肉的添加。

--------------------------

问：那你认为这个是Demo还是MVP，采用0.1版本还是1.0版本

答：这是一个极其锋利的工程哲学问题。
我的明确论断是：它是 **MVP (Minimum Viable Product)**，并且必须被标记为 **0.1 版本**。
绝对不能叫 Demo，也绝对不能叫 1.0。这两者都会给项目带来致命的伤害。
---
### 一、 为什么它是 MVP，而不是 Demo？
**Demo 是“骗人的把戏”，MVP 是“能用的武器”。**
*   **Demo 的特征**：为了演示跑通，它在底层充满了 `hardcode`（硬编码）。比如它可能绕过了 Socket 通信直接函数调用，或者暗线雷达是写死只监听一个特定文件的假逻辑。Demo 证明了“理论上可行”，但只要用户换个目录、改个文件名，它就立刻崩溃。
*   **这个功能集的特征**：它包含了完整的**双向物理交互**。AI 真的通过 Unix Socket 发 JSON，Core 真的把它存成文件，雷达真的在监听文件系统变更，探针真的在 `staging/` 目录里跑脚本，最后真的执行了 `mv` 落盘。没有任何一行代码是“假装在工作”。
只要这套东西跑通了，工程师今天就可以真的拿它去完成一个“写一个符合 ESLint 规范的工具函数”的真实任务。**它解决了一个真实的、极其痛的工程痛点（防止 AI 垃圾代码污染主分支）**，所以它是 MVP。
---
### 二、 为什么它是 0.1 版本，而不是 1.0 版本？
这里涉及到了**“版本号的契约精神”**。
当你把一个软件标记为 `1.0` 时，你在向用户传递一个强烈的心理暗示：“**它完成了，它稳定了，它的核心 API 不会再有破坏性更改，你可以把你的业务流托付给它。**”
如果我们把现在的线性执行 + staging 缓冲叫作 1.0，会发生什么灾难？
1.  **用户期望错位**：用户看了 README 说“演化工程意图”，结果 1.0 版本只能一条路走到黑，失败了只能整个人工接管。用户会觉得这是个残次品。
2.  **技术债锁死**：0.1 版本的 `staging/` 目录缓冲机制，在未来引入 DAG 并行执行时是绝对行不通的（多个 Stage 同时往 staging 写文件会冲突）。如果叫 1.0，你就背上了一个必须向后兼容的垃圾包袱。
**0.1 版本的真实定义是：核心引擎点火成功，但飞机还没装机翼。**
0.1 版本向世界宣告的是：“底层四大命脉接口（Store、Sandbox、Radar、Transport）的抽象是正确的，双轨并行的状态机运转是成立的。接下来的 0.2 - 0.9，我们只是在上面堆功能，不再动地基。”
---
### 三、 从 0.1 迈向 1.0 的硬性指标（什么才算 1.0？）
为了证明 0.1 不是偷懒，你必须在心里有一条极其清晰的从 0.1 到 1.0 的演进路线。只有补齐了以下三个硬伤，才配叫 1.0：
#### 1. 补齐“复杂编排”能力（从线性到 DAG）
*   **0.1**：Blueprint 是一个数组 `["s1", "s2", "s3"]`。
*   **1.0 必须有**：Blueprint 是一个图结构，支持并行（如 `s1` 完成后，`s2` 和 `s3` 同时开始）和汇合。这是应对“复杂业务流编排”这一核心卖点的底线。
#### 2. 补齐“探针解析”能力（从硬编码到动态发现）
*   **0.1**：Validator 里写死 `"proofs": ["eslint-check.sh"]`，脚本必须手动放在项目里。
*   **1.0 必须有**：实现“项目优先，全局兜底”的解析策略。Core 必须能扫描 `~/.openxenon/proofs/` 和项目级 `.openxenon/proofs/`，自动匹配可执行文件，并支持参数注入。
#### 3. 补齐“状态回滚”的原子性（从粗暴丢弃到精准恢复）
*   **0.1**：验证失败，Core 直接 `rm -rf staging/*`。如果是中途失败，Task 状态直接标为 `FAILED`。
*   **1.0 必须有**：结合 Git 沙箱（或者在底层记录文件 Diff 快照），如果一个包含 5 个 Stage 的 DAG，在第 4 个失败，1.0 版本必须能**精准回退**到第 3 个成功时的物理文件状态，而不是让工程师自己去 `git checkout`。
---
### 总结
把你刚刚设定的那个“铁三角”功能集，打上 **`v0.1.0-alpha`** 的标签，发到 GitHub 上。
在 README 最显眼的地方写上：
> **v0.1 (The Ignition)：** 核心状态机点火。目前仅支持线性 Blueprint 执行与基于 staging 目录的物理隔离。请不要用它编排复杂微服务，但你可以用它安全地让 AI 写一个不会炸掉你主分支的工具函数。
这既有吹嘘的资本（因为双轨并行和逃逸检测太酷了），又没有任何过度承诺的负债。这就是最完美的开局。

--------------------------

问：

答：
--------------------------

问：

答：
