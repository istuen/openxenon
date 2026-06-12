# manual-concepts-prune

## MODIFIED Requirements

### Requirement: 02-concepts.md 删除废弃术语表

**FROM:**

```markdown
## 术语表

### 系统角色

| 术语 | 英文 | 定义 |
|------|------|------|
| **工程师** | Engineer | 唯一负熵源，只负责输入宏观需求和最终异常兜底 |
| **工作空间** | Space | 项目目录的物理边界（`.openxenon/` 目录） |
| **AI 助手** | AI Assistant | 降维为受控的执行器 |
| **Core 引擎** | OpenXenon Core | 全局唯一的二阶控制中枢 |

### 意图演化阶段

| 术语 | 英文 | 定义 |
|------|------|------|
| **任务** | Task | 工程师通过 Skill 触发的最宏观业务目标 |
| **执行计划** | Blueprint | AI 自行拆解并填充的结构化执行蓝图 |

### 推理收敛阶段

| 术语 | 英文 | 定义 |
|------|------|------|
| **原子步骤** | Stage | Blueprint 中的最小执行单元 |
| **执行规范** | Spec | 绑定在 Stage 上的边界约束条件 |
| **验证探针** | Proof | Core 持有的机械级校验程序 |

### 交付与追踪阶段

| 术语 | 英文 | 定义 |
|------|------|------|
| **工程产物** | Artifact | 通过 Proof 验证的最终合法输出物 |
| **步骤舱单** | step-manifest.json | 由 AI 写入、Core 监听的物理文件 |
| **任务轨迹** | task-trace.yaml | Task 完成后导出的链路追踪文件 |

### 核心控制机制

| 术语 | 英文 | 定义 |
|------|------|------|
| **明线验证** | Active Verification | AI 主动通过 API 发起的正常校验路径 |
| **逃逸检测** | Escape Detection | Core 的暗线兜底机制，监听 JSON 变更 |
| **模型逃逸** | AI Escape | AI 绕过 Core 验证网关的失控状态 |

### 核心原语

| 术语 | 英文 | 定义 |
|------|------|------|
| **样本分支** | Sample | 动态逃生机制，当 AI 在 Stage 中受挫时探索变体 |
| **拓扑蓝图** | Blueprint | 由多个 Stage 组成的有向无环图（DAG） |
```

**TO:**

（整个术语表删除，替换为简化版）

```markdown
## 术语表

### 系统角色

| 术语 | 定义 |
|------|------|
| **工程师** | 提供高层意图和约束，不直接写代码 |
| **AI 助手** | 解析工程师意图，生成 Blueprint 和代码 |
| **oxn CLI** | 命令行入口，不依赖 Daemon 即可使用核心功能 |

### 核心概念

| 术语 | 定义 |
|------|------|
| **Blueprint** | 任务的完整结构定义，包含多个 Stage |
| **Stage** | 任务执行的一个阶段 |
| **Proof** | 验证闭环，由一个或多个 Probe 组成 |
| **Probe** | 原子化检查（如 fs_exists、shell_exec） |
| **Arsenal** | 存放所有标准资产的目录 |

### 生命周期

| 术语 | 定义 |
|------|------|
| **DRAFT** | AI 通过 `/oxn-forge` 生成的资产草稿 |
| **CANONICAL** | 审查通过、可被任务引用的正式资产 |
| **task-trace.yaml** | 任务执行过程的记录文件 |
```

### Requirement: 删除"核心原语"章节

**FROM:**

```markdown
## 核心原语

| 术语 | 英文 | 定义 |
|------|------|------|
| **样本分支** | Sample | 动态逃生机制，当 AI 在 Stage 中受挫时探索变体 |
| **拓扑蓝图** | Blueprint | 由多个 Stage 组成的有向无环图（DAG） |
```

**TO:**

（删除，Sample 已废弃，DAG 概念在 Stage 描述中已涵盖）
```

### Requirement: 删除"Stage 执行流程"中的 Core 引用

**FROM:**

```markdown
### Stage 执行流程

1. Core 加载 Blueprint
2. 按 selected 顺序执行 Stage
3. 每个 Stage 内的 steps 顺序执行
4. 每个 step 的 proof 被 Core 执行验证
```

**TO:**

```markdown
### Stage 执行流程

1. AI 通过 `/oxn-task` 获取任务
2. 按 Blueprint 中的顺序执行 Stage
3. 每个 Stage 的 Proof 被 Kernel 判定
4. 验证结果通过 task-trace.yaml 记录
```
