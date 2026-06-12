## ADDED Requirements

### Requirement: 三表扁平拓扑

系统 SHALL 实现 Task、Blueprint、Stage 的三表扁平拓扑，它们通过外键 ID 引用关联，而非 JSON blob 嵌套。

表关系：
- Task 1:N Blueprint：一个 Task 可以有多个 Blueprint（支持旁路演化）
- Blueprint 1:N Stage：一个 Blueprint 可以有多个 Stage（原子工序节点）

#### Scenario: 创建 Task
- **WHEN** 用户提交一个新的任务
- **THEN** 系统在 tasks 表插入一条记录，生成唯一 ID

#### Scenario: 创建 Blueprint
- **WHEN** Task 创建后需要拓扑规划
- **THEN** 系统在 blueprints 表插入一条记录，task_id 指向父 Task

#### Scenario: 创建 Stage
- **WHEN** Blueprint 需要定义工序节点
- **THEN** 系统在 stages 表插入一条记录，blueprint_id 指向父 Blueprint

### Requirement: Task 表结构

tasks 表 SHALL 包含以下列：
- `id TEXT PRIMARY KEY`：任务唯一标识符
- `name TEXT NOT NULL`：任务名称
- `status TEXT NOT NULL DEFAULT 'PENDING'`：任务状态，枚举值 PENDING/RUNNING/COMPLETED/ESCAPED/TERMINATED
- `active_blueprint_id TEXT`：当前活跃的 Blueprint ID（可选，指向 blueprints 表）
- `created_at INTEGER NOT NULL`：创建时间戳
- `updated_at INTEGER NOT NULL`：更新时间戳

#### Scenario: Task 状态流转
- **WHEN** 任务从 PENDING 变为 RUNNING
- **THEN** 系统更新 tasks 表的 status 和 updated_at 字段

#### Scenario: Task 绑定活跃 Blueprint
- **WHEN** 某个 Blueprint 被标记为 CANONICAL
- **THEN** 系统将 tasks.active_blueprint_id 更新为该 Blueprint 的 ID

### Requirement: Blueprint 表结构

blueprints 表 SHALL 包含以下列：
- `id TEXT PRIMARY KEY`：Blueprint 唯一标识符
- `task_id TEXT NOT NULL`：父 Task ID，外键引用 tasks(id)
- `name TEXT NOT NULL`：Blueprint 名称
- `status TEXT NOT NULL DEFAULT 'DRAFT'`：Blueprint 状态，枚举值 DRAFT/CANONICAL/SAMPLE/ABANDONED
- `created_at INTEGER NOT NULL`：创建时间戳

#### Scenario: Blueprint 状态流转
- **WHEN** Blueprint 从 DRAFT 变为 CANONICAL
- **THEN** 系统更新 blueprints 表的 status 字段

#### Scenario: Blueprint 废弃
- **WHEN** Blueprint 被废弃（触发 ABANDONED）
- **THEN** 该记录保留在数据库中作为历史化石，status 更新为 ABANDONED

### Requirement: Stage 表结构

stages 表 SHALL 包含以下列：
- `id TEXT PRIMARY KEY`：Stage 唯一标识符
- `blueprint_id TEXT NOT NULL`：父 Blueprint ID，外键引用 blueprints(id)
- `name TEXT NOT NULL`：工序节点名称
- `deps TEXT NOT NULL DEFAULT '[]'`：依赖数组，JSON 格式存储 Stage ID 列表
- `target TEXT NOT NULL`：预期终态描述（自然语言）
- `spec TEXT NOT NULL`：执行边界约束（自然语言）
- `action TEXT`：执行动作提示（可选）
- `proof TEXT NOT NULL`：验证探针名或探针数组的 JSON
- `status TEXT NOT NULL DEFAULT 'PENDING'`：Stage 状态，枚举值 PENDING/RUNNING/PASSED/FAILED
- `created_at INTEGER NOT NULL`：创建时间戳
- `completed_at INTEGER`：完成时间戳

#### Scenario: Stage 不可变插入
- **WHEN** 需要修改某个 Stage 的 proof
- **THEN** 系统插入一个新的 Stage 记录（带新 ID），而非修改原记录

#### Scenario: Stage 状态流转
- **WHEN** Stage 从 PENDING 变为 PASSED
- **THEN** 系统更新 stages 表的 status 和 completed_at 字段

### Requirement: 旁路演化支持

当 AI 在执行中受挫需要调整 Blueprint 拓扑时，系统 SHALL 支持旁路演化：
- 不修改原 Blueprint 记录
- 插入一个全新的 Blueprint 记录（带有新的 ID）
- 新的 Blueprint 初始状态为 DRAFT

#### Scenario: 触发演化流
- **WHEN** AI 执行受挫并提出新的拓扑方案
- **THEN** 系统创建一条新的 Blueprint 记录，status 为 DRAFT

### Requirement: 状态机终态墓碑

被淘汰的 Blueprint 和 Stage 不通过物理删除消失，而是通过状态机终态标记：
- Blueprint 状态 ABANDONED 表示被否决的演化分支
- Stage 状态 FAILED 表示验证失败的工序节点

#### Scenario: 演化石碑保留
- **WHEN** 一个演化分支被人类否决
- **THEN** 该 Blueprint 标记为 ABANDONED，保留在数据库中作为审计轨迹
