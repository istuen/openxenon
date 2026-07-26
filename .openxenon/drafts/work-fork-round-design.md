# Work Fork/Round 设计规划（v0.7+ 候选 RFC）

> **日期**：2026-07-23
> **来源**：实践盘问 #3-#5（grilling session 转入实践阶段）
> **状态**：📝 设计保留（现阶段不实现，后续迭代追加 Round/Fork 到 lock/unlock 之上）
> **关联**：ADR-0075（Round loop = AI 搜索行为记录）+ ADR-0077（目标→边界参照转换）+ ADR-0078（边界工程）

## 当前阶段决策

现阶段 Work 和 Task 依然有 lock/unlock 操作，但**只有一个版本**（不做 Fork/Round 分支）。trace 负责记录 lock/unlock 操作即可，**先丢失 diff 内容也不怕**。后续再通过 lock/unlock 追加 Round 和 Fork 机制。

最起码现在知道如何让 LLM Agent 具备 loop 的思路——通过 lock/unlock 信号 + trace 记录。

---

## 完整设计（后续迭代目标）

### 核心洞察

lock/unlock = Round 的信号机制。lock 不再是"锁计划"的静态门禁，而是 Round 的创建信号：

- **work.md**：lock 冻结初始状态；要改必须 Fork（全量复制 Work）
- **task.md**：lock 冻结当前状态；unlock → AI 调整 → re-lock = 一个 Round

### 三层历史模型

```
层次 3: Fork 树（Work 间）—— AI 的路径探索
  ├── works/<w>/              当前活跃路径
  ├── works/<w>--fork-1/      探索路径 1
  └── works/<w>--fork-2/      探索路径 2
      │
      │  每个 Fork 内部：
      │
层次 2: Round 里程碑（Work 内）—— 阶段划分
      ├── Round 1 [unlock → adjust → re-lock]
      ├── Round 2 [unlock → adjust → re-lock]
      └── Round 3 [current]
          │
          │  每个 Round 内部：
          │
层次 1: 事件流 + diff（trace 内）—— 精确记录
          ├── unlock {file, hash-before}
          ├── plan-changed {file, diff}    ← 后续追加
          ├── probe-result
          └── re-lock {file, hash-after, new-round?}
```

### Fork/Round 边界（文件级）

| AI 行为 | 修改文件 | 机制 | OXN 响应 |
|---|---|---|---|
| 调整 Task context/parts/probes | task.md | Round（unlock→改→re-lock） | 记 diff + 创建新 Round |
| 调整 Work goal/constraints/refs | work.md | Fork | 全量复制 + 新 Work |
| 增/删/重排 Task DAG | work.md | Fork | 全量复制 + 新 Work |
| 执行 Task（不改计划） | 无（只写 .run/） | 正常执行 | trace 记执行事件 |

**边界判据**：work.md 改 = Fork；task.md 改 = Round。物理文件映射，AI 只需知道"我在改哪个文件"。

### Round 机制（task.md 级）

```
AI 请求 unlock task.md
    │
    │  OXN 记录 unlock 事件到 trace
    │  OXN 对比当前 task.md hash 与上一轮 lock 时 hash
    │
    ▼
AI 调整 task.md（自由修改）
    │
    ▼
AI 请求 re-lock
    │
    │  OXN 计算 diff（上一轮 lock 状态 → 当前）
    │  OXN 记录 diff 到 trace（后续迭代追加 diff 内容）
    │  OXN re-lock（冻结新状态）
    │
    ├── hash 相同（AI unlock 了但没改）→ 幂等，不创建新 Round
    └── hash 不同（AI 改了东西）→ 创建新 Round + 记 diff
```

**幂等**：已 unlock 状态下再请求 unlock = no-op。

**hash 复用**：re-lock 时如果 task.md hash == 上一轮 lock 时 hash，不创建新 Round（AI 没实际改动）。来回重复 diff 不阻止，由 Round 数量限制控制。

### Fork 机制（work.md 级）

```
AI 要改 work.md → work.md lock 保护 → 必须 Fork
    │
    ▼
oxn work fork <name>
    │  全量复制 Work → works/<w>--fork-N/
    │  新 Work 的 work.md 解锁可改
    │  AI 修改 work.md（新初始状态）
    │  re-lock → 新初始状态冻结
    │
    ▼
新 Work 独立运行（有自己的 Round 序列）
```

**Fork 数量信号意义**：

| Fork 次数 | 信号 | 可能原因 |
|---|---|---|
| 0-2 | 正常探索 | AI 在边界内微调 |
| 3-4 | 需关注 | Blueprint 可能不够成熟 |
| 5+ | 预警 | Work 目标太大 / Blueprint 未验证 / 方向偏移 / AI 理解偏移 |

Fork 频率 = Work/Blueprint 质量的反向指标，是 Daemon 预警工程师的场景。

### Fork 的核心定位

Fork 不只是"重来的机制"，是 **AI 贡献经验回灌 Asset 的通道**：

```
原闭环（ADR-0074）：
  工程师经验 → Asset → Work → AI 执行 → Insight → 工程师学习 → 更新 Asset

Fork 补充的新通道：
  AI 自主探索 → Fork 尝试 → 成功模式 → Insight → 工程师沉淀 → 新 Asset
```

Fork 是 AI 的已有知识通过探索被验证有效后，沉淀为工程师 Asset 的机制——从 AI 的隐性知识变成 OXN 的显性边界。

### "旅行问题"对应

| 旅行问题 | OXN 对应 |
|---|---|
| 起点 | Work create + lock（初始状态冻结） |
| 探索一条路 | Round（unlock task.md → 调整 → re-lock） |
| 走不通，回到岔路口重新选 | Fork（复制 Work，尝试不同方案） |
| 到达终点 | Work finalize（路径有效） |
| 走过但没走通的路 | 失败的 fork（保留参考或删除） |
| 路径记录 | trace + round 里程碑 + fork 树 |

OXN 不做路径规划（Term #17）——OXN 记录 AI 的路径探索过程。Fork 树就是 AI 搜索行为的外化记录，和 ADR-0075 完全一致。

### 配置项（两套分开）

| 配置 | 控制 | 默认 |
|---|---|---|
| `round.autoAuthorize` | AI 是否可自主 unlock task.md（不需工程师介入） | false |
| `fork.autoAuthorize` | AI 是否可自主 Fork work.md | false |
| `fork.maxCount` | 最大 Fork 数量，超限 OXN 拒绝执行 | 待定 |
| `round.maxIterations` | 最大 Round 数量（继承当前 maxIterations） | 3 |

### lock 语义变更

| 文件 | 当前 planLock 保护 | 新设计 |
|---|---|---|
| work.md | ✅ `workMdHash` | ✅ 保留（初始状态冻结，要改必须 Fork） |
| blueprints.json | ✅ `blueprintsHash` | ✅ 保留（Blueprint 索引冻结） |
| task.md | ✅ `tasksHash` | ✅ 保留（但可通过 unlock 释放 → Round 机制） |

### 文件合并（前置依赖）

当前一个 3-Task Work 有 18 文件，Fork 会放大。需先合并到最小文件集：

**方案 A：最小合并（18 → 8 文件）**

```
works/<w>/
  work.md                    Intent（含所有 Task 定义内嵌）
  .work                      CLI 门禁（含 blueprints.json 合并 + planLock）
  .run/
    state.json               Work + 所有 Task 的进度（合并）
    trace.jsonl              Work + 所有 Task 的事件流（合并，事件带 task 字段区分）
    frozen.json              Work + 所有 Task 的终态快照（合并）
```

**方案 B：激进合并（18 → 4 文件）**

```
works/<w>/
  work.md                    Intent（含所有 Task 定义）
  .work                      CLI 门禁（含 blueprints + planLock）
  .run/
    trace.jsonl              所有事件（append-only，含计划变更 diff）
    state.json               当前状态（可变，含 Work + Task 进度 + frozen 终态合并）
```

---

## 落地路径

### 现阶段（v0.7.x）

1. ✅ Work 和 Task 保留 lock/unlock 操作（单版本）
2. ✅ trace 记录 lock/unlock 操作（不记 diff 内容）
3. ✅ AI 通过 lock/unlock 知道调整的信号机制

### 后续迭代（v0.8+）

1. 🔲 Round 机制：unlock task.md → re-lock 时 hash 对比 → 创建新 Round + 记 diff
2. 🔲 Fork 机制：work.md 改 → 全量复制 Work → 新 Work 独立运行
3. 🔲 文件合并：task.md 内嵌到 work.md / blueprints.json 合并到 .work / .run/ 文件合并
4. 🔲 配置项：round.autoAuthorize + fork.autoAuthorize + fork.maxCount
5. 🔲 diff 记录：trace 事件加 diff 内容（结构化 MD diff）
6. 🔲 Fork 树管理：fork 索引 / fork 间对比 / fork 清理
7. 🔲 Insight 集成：Fork 频率信号 / Round 模式统计

---

## 关联 ADR

| ADR | 关系 |
|---|---|
| ADR-0075 | Round loop = AI 搜索行为记录（Fork 是更高维度的搜索记录） |
| ADR-0077 | 目标→边界参照转换（Fork 是 AI 探索新边界的机制） |
| ADR-0078 | 边界工程（Fork 沉淀经验回灌 Asset 是边界工程的反向闭环） |
| ADR-0074 | 分布式学习（Fork 是 AI 贡献经验的通道） |
| ADR-0050 | Starter Work（onboarding Blueprint 引导新用户） |
