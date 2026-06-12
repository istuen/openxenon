## Context

docs/manual/ 的 01/02/03 是按"Core 引擎是中心"架构写的，但 0.1 实际是 CLI-direct 模式。这不是换术语能解决的结构性错位——需要重写核心叙事。

## Goals / Non-Goals

**Goals:**

- 让 manual 准确反映 0.1 的实际状态（CLI-direct + 三层架构）
- 删掉 0.2 才有的功能描述（逃逸检测、熔断、Sample）
- 保留有效概念（Blueprint、Arsenal、Stage、Proof、Probe）
- 让新工程师看完手册能正确使用 0.1

**Non-Goals:**

- 不写 0.2 的详细设计（可以简单标注"0.2 目标"）
- 不改变任何代码实现
- 不修改 architecture.md（刚改完）

## Decisions

### 决策 1：01-intro.md 重写架构图

**选择**：删除"综合集成研讨厅"，用简化的 CLI-direct 架构图替代

**理由**：
- "综合集成研讨厅"是学术概念，对实际使用没有指导价值
- 新架构图要反映：工程师 → AI → oxn CLI → Kernel/Infra → 文件系统/进程
- Daemon 架构（0.2 目标）简单标注，不展开

**新架构图**：
```
工程师
   │
   ▼
AI 模型（通过 /oxn-forge、/oxn-task 与系统交互）
   │
   ▼
oxn CLI（命令入口）
   │
   ├──► Kernel（纯函数判定）
   │
   ├──► Infra（文件系统和进程操作）
   │
   └──► Arsenal（内置资产）
```

### 决策 2：02-concepts.md 删除而非重写

**选择**：删除 Sample/明线暗线/Core 引擎/Space 等整个术语表条目

**理由**：
- 这些概念在 0.1 不存在，保留只会误导
- Blueprint、Arsenal、Stage、Proof、Probe 是有效概念，保留并简化
- 不需要"替代概念"——没有就是没有

**保留的概念**：
- Blueprint：任务的完整结构定义
- Arsenal：存放所有标准资产
- Stage：任务执行的一个阶段
- Proof：验证闭环，由一个或多个 Probe 组成
- Probe：原子化检查（fs_exists、shell_exec 等）
- DRAFT/CANONICAL：资产生命周期

**删除的概念**：
- Core 引擎
- 明线/暗线验证
- 逃逸检测
- 模型逃逸
- 样本分支 / Sample
- Space / space.oxn
- 降维为受控执行器
- 唯一负熵源

### 决策 3：03-lifecycle.md 简化为 CLI-direct 流程

**选择**：删除整个 Core 引擎流程图，重写为 0.1 实际流程

**理由**：
- 03 的核心价值是"让工程师知道任务怎么跑"
- 0.1 的实际流程是：forge → draft → promote → task submit → task verify
- 简单直接，比复杂的 Core 引擎流程更有用

**0.1 实际流程**：
```
1. oxn init（初始化项目围栏）
2. oxn forge probe（获取约束）
3. AI 生成 Draft YAML
4. oxn forge probe --save（保存 Draft）
5. oxn arsenal promote（Draft → CANONICAL）
6. oxn task submit --blueprint <file>（提交任务）
7. oxn task next --task-id <id>（获取下一个 Stage）
8. AI 执行 Stage 工作
9. oxn task verify --task-id <id> --stage-id <id>（验证）
10. 重复 7-9 直到所有 Stage 通过
```

### 决策 4：快速开始命令签名修正

**选择**：将 `oxn task new` 替换为 `oxn task submit --blueprint`

**理由**：
- 0.1 的实际命令是 `oxn task submit --blueprint <file>`
- `oxn task new` 不存在

## Risks / Trade-offs

| 风险 | 描述 | 缓解 |
|------|------|------|
| 删除太多内容导致手册太薄 | 01/02/03 重写后可能比原来短很多 | 保留有效的概念描述，只是去掉未实现功能 |
| 手册与 architecture.md 风格不一致 | 一个探索型，一个可能还是学术腔 | architecture.md 刚改完，风格已对齐 |
| 删除 Sample 后"三种水流"整个消失 | 03 可能显得空洞 | CLI-direct 流程本身就是内容 |

## Open Questions

（无——0.1 实际状态已通过代码和现有文档确认）
