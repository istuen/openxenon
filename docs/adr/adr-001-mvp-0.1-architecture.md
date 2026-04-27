# OpenXenon MVP 0.1 架构决策文档

> 版本：v0.1.0
> 状态：进行中
> 目标：跑通 Task 生命周期，证明核心引擎可行性

---

## 背景与目标

OpenXenon 的愿景是构建一个"面向大语言模型的工程化控制引擎"。在 0.1 阶段，我们不追求功能完备，而是追求**核心机制的可工作性验证**。

0.1 版本的唯一目标：**证明"双轨并行控制 + 物理隔离"这套机制在真实工程场景下能够有效约束 AI 的不可信输出。**

---

## 一、核心架构决策

### ADR-001：四层物理模型（Task → Blueprint → Stage → Proof）

**状态**：已确认

**决策**：
- **Task (L1)**：工程师意图的运行时容器，只存在于 `space.oxn` 中。包含 `task_id`、`status`、`active_blueprint_file` 指针。
- **Blueprint (L2)**：可复用的拓扑蓝图，物理存放在 `arsenal/active/blueprints/` 下。
- **Stage (L3)**：Blueprint 的最小执行单元，绑定固定 Proof 组合，物理存放在 `arsenal/active/stages/` 下。
- **Proof (L4)**：最小验证闭环单元，包含 `Target + Spec + Action + Probes` 四元组，物理存放在 `arsenal/active/proofs/` 下。

**存储边界**：
- DB (`space.oxn`)：**只存热状态**，即 Task 状态机、逃逸时间戳、Stage 执行进度指针
- 文件系统：**只存冷结构**，即 Blueprint、Stage、Proof 的 YAML/JSON 定义

**0.1 简化**：Blueprint、Stage、Proof 全部内聚在一个 JSON 文件中，不做文件间引用。

```json
// .openxenon/tasks/<task_id>/blueprint.json
{
  "id": "bp_v1",
  "status": "CANONICAL",
  "stages": [
    {
      "id": "s1",
      "name": "创建用户模型",
      "validator": {
        "target": "User 模型存在于 app/Models/",
        "spec": "必须使用 Prisma ORM",
        "action": "使用 TypeScript",
        "probes": ["eslint-check"]
      }
    }
  ]
}
```

---

### ADR-002：线性执行（暂不支持 DAG）

**状态**：已确认

**决策**：0.1 版本 Blueprint 的 `stages` 字段为**数组**（顺序执行），不支持 `edges` 图结构。

**理由**：DAG 并行执行引入了复杂的资源竞争和状态同步问题，超出 0.1 范围。先验证"线性约束"机制的有效性。

**未来**：0.5 版本引入 DAG 时，stages 字段改为 `{ id, name, depends_on[], validator }` 结构。

---

### ADR-003：Staging 目录缓冲机制

**状态**：已确认

**决策**：AI 生成的代码**禁止直接写入** `src/` 目录，必须先写入 `.openxenon/tasks/<task_id>/staging/` 目录。

**验证流程**：
1. AI 将代码写入 `staging/`
2. Core 执行 Probes 探针（工作目录指向 `staging/`）
3. 探针返回 `PASSED` → Core 执行 `mv staging/* src/` 落盘
4. 探针返回 `FAILED` → Core 执行 `rm -rf staging/*`

**理由**：
- 零成本实现物理隔离，不需要 Git 分支或容器
- 完美契合"不通过的代码连看都别看"的熔断哲学
- 避免 AI 写坏的文件污染主分支

**未来**：0.5 版本引入 Git 分支沙箱后，staging 机制降级为"微观防御插件"。

---

## 二、双轨并行控制决策

### ADR-004：明线验证 API

**状态**：已确认

**决策**：Core 暴露以下 Socket API：

| 接口 | 方法 | 职责 |
|------|------|------|
| `/api/v1/task/create` | POST | 创建 Task，初始化状态机 |
| `/api/v1/blueprint/submit` | POST | 接收 AI 提交的 Blueprint JSON，保存文件 |
| `/api/v1/task/next` | GET | AI 查询当前应执行的 Stage 及 Spec |
| `/api/v1/step/verify` | POST | AI 请求当前 Stage 验证，触发探针执行 |
| `/api/v1/task/trace` | GET | 导出最终 task-trace.yaml |

**探针执行**：Core 调用 `XnSandbox.spawn()` 执行探针脚本，根据退出码（0=PASSED，非0=FAILED）判定。

---

### ADR-005：暗线逃逸检测（时间戳超时）

**状态**：已确认

**决策**：
- Core 启动时，使用 `XnRadar` 监听当前任务的 `step-manifest.json`
- 每次文件变更，记录 `synced_at` 时间戳到 `space.oxn`
- 每次明线验证 `/api/v1/step/verify` 成功后，记录 `api_requested_at`
- 后台轮询：若发现 `synced_at` 已更新，但 `api_requested_at` 未在 120 秒内跟进，判定为 **AI_ESCAPED**

**理由**：0.1 暂不实现复杂文件监听逻辑，用 DB 超时机制代替，验证"暗线检测"概念的有效性。

**未来**：0.5 版本实现完整的文件监听 + 时间戳比对逻辑。

---

### ADR-006：逃逸处理

**状态**：已确认

**决策**：一旦判定 `AI_ESCAPED`：
1. Core 立即将 Task 状态更新为 `ESCAPED`，锁定状态机
2. Core 执行 `rm -rf staging/*`，丢弃未落盘的代码
3. 工程师必须手动介入（`oxn rollback` 或人工清理）

**0.1 排除**：`oxn rollback` 和 `oxn force-pass` 指令暂不实现。工程师自行 Git 操作恢复。

---

## 三、存储结构决策

### ADR-007：项目物理边界

**状态**：已确认

```text
<project>/.openxenon/
├── space.oxn              # [唯一真理源] SQLite，状态机 + 逃逸时间戳
│
├── arsenal/               # [工程师武库] 0.1 扁平结构
│   ├── blueprints/         # Blueprint 定义
│   │   └── bp_v1.json
│   ├── stages/            # Stage 定义
│   │   └── stage_migration.json
│   └── proofs/           # 探针脚本（可执行）
│       └── eslint-check.sh
│
└── tasks/                 # [运行时沙箱]
    └── <task_id>/
        ├── blueprint.json # Blueprint 实例快照
        ├── step-manifest.json  # 单向管道
        ├── staging/            # 代码缓冲
        │   └── user.ts
        └── task-trace.yaml     # 最终案卷
```

**0.1 简化**：
- 不实现 `active/draft/archive` 子目录，只用扁平 `arsenal/`
- 不实现 `params.json`，参数直接内嵌在 Blueprint JSON 中
- 不实现 `samples/` 目录

---

### ADR-008：数据库 Schema

**状态**：已确认

```sql
-- tasks 表：Task 运行时容器
CREATE TABLE tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,  -- PENDING, RUNNING, COMPLETED, FAILED, ESCAPED
    blueprint_file TEXT NOT NULL,  -- 指向 tasks/<id>/blueprint.json
    current_stage_id TEXT,
    created_at INTEGER,
    updated_at INTEGER
);

-- stage_runs 表：Stage 执行日志
CREATE TABLE stage_runs (
    task_id TEXT,
    stage_id TEXT,
    status TEXT NOT NULL,  -- PENDING, RUNNING, PASSED, FAILED
    started_at INTEGER,
    finished_at INTEGER,
    artifact_paths TEXT,  -- JSON 数组，记录落盘的文件路径
    PRIMARY KEY (task_id, stage_id)
);

-- escape_log 表：逃逸雷达
CREATE TABLE escape_log (
    task_id TEXT,
    manifest_hash TEXT,
    synced_at INTEGER,
    api_requested_at INTEGER DEFAULT 0
);
```

---

## 四、Skill 与 AI 交互决策

### ADR-009：Skill 架构（0.1 简化版）

**状态**：已确认

**决策**：0.1 不实现 TypeScript → Markdown 编译链路，直接手写 `SKILL.md` 文件。

```text
.opencode/skills/
├── oxn-init/SKILL.md
├── oxn-task/SKILL.md
├── oxn-status/SKILL.md
├── oxn-trace/SKILL.md
└── oxn-stop/SKILL.md
```

**核心 Hook**：
- `[oxn-update]`：AI 写入 `step-manifest.json`
- `[oxn-verify]`：AI 调用 `/api/v1/step/verify`

---

## 五、0.1 版本排除清单

以下功能明确排除在 0.1 版本之外：

| 功能 | 排除原因 | 计划版本 |
|------|----------|----------|
| DAG 拓扑编排 | 引入复杂资源竞争 | v0.5 |
| 提案流程（Draft/Proposed/Candidate） | 需要完整的提案 UI 和审核流程 | v0.5 |
| Sample 偏差流 | 需要 Git 分支沙箱支持 | v0.5 |
| 全局探针库（`~/.openxenon/proofs/`） | 简化资产发现机制 | v0.5 |
| `oxn rollback` | 需要文件 Diff 快照支持 | v0.5 |
| `oxn force-pass` | 极端情况手工处理 | v0.5 |
| XnRadar 完整文件监听 | 用 DB 超时代替，简化实现 | v0.5 |
| TypeScript Skill 编译器 | 手写 SKILL.md 足够 | v0.5 |
| Git 分支沙箱 | 用 staging 目录代替 | v0.5 |

---

## 六、验收标准

0.1 版本成功当且仅当能无 Bug 跑通以下流程：

```bash
# 1. 环境准备
oxn init
oxn daemon start

# 2. AI 助手接收指令："帮我写一个符合 ESLint 规范的 User 模型"

# 3. AI 内部调用流程
POST /api/v1/task/create              # → task_id: task_001
POST /api/v1/blueprint/submit          # → blueprint.json 落盘
GET /api/v1/task/next                 # → stage_id: s1, spec: "必须使用 Prisma"

# 4. AI 生成代码，写入 staging/user.ts（故意不加分号）
# 5. AI 调用 POST /api/v1/step/verify
# 6. Core 执行 eslint-check.sh staging/user.ts → 退出码 1 (FAILED)

# 7. AI 收到 FAILED，修改代码，重新写入 staging/
# 8. AI 再次调用 POST /api/v1/step/verify
# 9. Core 执行探针 → 退出码 0 (PASSED)
# 10. Core 执行 mv staging/user.ts src/models/user.ts

# 11. AI 调用 GET /api/v1/task/trace
# 12. Core 返回 task-trace.yaml

# 13. 工程师运行 oxn trace task_001
#     → 看到完整 YAML，证明 s1 经过 eslint-check 机械确权
```

---

## 七、未来演进路线

```
v0.1 (当前)          v0.5                       v1.0
─────────────────────────────────────────────────────────
线性 Blueprint       DAG 拓扑编排              协议封神
staging 缓冲         Git 分支沙箱              YAML Schema 冻结
DB 超时逃逸          完整雷达监听              Socket API 冻结
手写 SKILL.md        TS Skill 编译器           插件生态
扁平 arsenal/        active/draft/archive      跨 IDE 适配
```

---

## 八、关键风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| AI 生成代码写入 staging 但从不调用 verify | 中 | 高 | 暗线检测 + 超时机制 |
| staging 目录被 AI 误删 | 低 | 中 | staging 内容未落盘前不可删除（由 Core 管理） |
| 探针脚本路径注入攻击 | 中 | 高 | 0.1 探针只接受单文件路径，不接受任意命令 |
| 多 Task 并发竞争同一文件 | 低 | 高 | 0.1 强制单 Task 执行，space.oxn 加锁 |

---

## 九、总结

**0.1 版本的核心价值**：证明"双轨并行 + 物理隔离"机制在真实工程场景下可工作。

**0.1 版本不是**：
- 不是完整的 AI 工程平台
- 不是支持复杂业务流的编排引擎
- 不是具备生态的协议标准

**0.1 版本是**：
- 是一把能切开 AI 垃圾代码的手术刀
- 是一个能物理确权工程产物的凭证系统
- 是 OpenXenon 作为基础设施的"点火仪式"

> 把这个跑通，OpenXenon 的灵魂就立住了。剩下的都是血肉。
