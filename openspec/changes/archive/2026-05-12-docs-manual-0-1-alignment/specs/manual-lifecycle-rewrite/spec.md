# manual-lifecycle-rewrite

## MODIFIED Requirements

### Requirement: 03-lifecycle.md 完全重写

**FROM:**

```markdown
# 3. 完整生命周期

## 交互流程

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

## 三种水流

OpenXenon 将复杂的 AI 协作严格切分为三种清晰的水流：

| 水流 | 类型 | 说明 |
|------|------|------|
| **正常流** | 确定性 | AI 严格执行 CANONICAL 状态的 Blueprint，Stage 顺序流转，最终沉淀为 Artifact |
| **偏差流** | 微观自愈 | 触发 Sample。AI 在单个节点边界内探索变体，系统自动校验，风险极低 |
| **演化流** | 宏观涌现 | 触发 Draft。AI 推翻整体规划，以"物理提案"形式上交人类，风险极高，需人类裁决 |
```
```

**TO:**

```markdown
# 3. 完整生命周期

## 0.1 实际流程

0.1 是 CLI-direct 模式，不依赖 Daemon。以下是完整的任务执行周期：

```
1. oxn init              # 初始化项目围栏
       │
       ▼
2. oxn forge probe      # 获取元 Forge 约束
       │
       ▼
3. AI 生成 Draft YAML    # 根据约束生成资产
       │
       ▼
4. oxn forge probe --save # 保存 Draft 资产
       │
       ▼
5. oxn arsenal promote   # Draft → CANONICAL
       │
       ▼
6. oxn task submit --blueprint <file>  # 提交任务
       │
       ▼
7. oxn task next --task-id <id>  # 获取下一个 Stage
       │
       ▼
8. AI 执行 Stage 工作    # 写代码、跑命令
       │
       ▼
9. oxn task verify --task-id <id> --stage-id <id>  # 验证
       │
       ▼
10. 重复 7-9 直到所有 Stage 通过
```

## 0.2 目标：Daemon 长驻模式

以下为 0.2 目标架构，当前尚未实现：

- Daemon 长驻进程持有 DAG 状态
- 自动超时检测（逃逸检测）
- 任务队列和并发控制
- `oxn daemon start` 启动后可通过 `oxn arsenal search` 搜索全局资产

0.1 阶段所有核心功能（forge、task submit/verify、arsenal）均通过 CLI 直连可用，不依赖 Daemon。
```

### Requirement: 删除系统交互流程图（Mermaid）

**FROM:**

```markdown
## 系统交互流程图

```mermaid
sequenceDiagram
    participant Eng as 工程师
    participant AI as AI 助手软件 (含 LLM)
    participant Core as OpenXenon Core (全局唯一)
    ...
```
```

**TO:**

（删除 Mermaid 图，0.1 没有 Core 引擎，此图不适用）

替换为简单的命令序列说明：
```markdown
## 典型命令序列

```bash
# 初始化
oxn init

# 查看可用资产
oxn arsenal list

# 锻造新 Probe
oxn forge probe
# AI 根据约束生成 YAML
oxn forge probe --save '<yaml>' --name my-probe

# 提交任务
oxn task submit --blueprint my-task.yaml
# 获取任务 ID，假设是 abc123
oxn task next --task-id abc123
# AI 执行工作...
oxn task verify --task-id abc123 --stage-id build
# 重复 next + verify 直到完成
```
```

### Requirement: 删除全局/项目物理边界中的 core.oxn 引用

**FROM:**

```markdown
## 系统架构：全局/项目双层边界

### 全局物理边界 (`~/.openxenon/`)

```
~/.openxenon/
├── core.oxn            # 全局元数据：注册所有被 init 的项目路径、状态等
├── proofs/            # 全局探针库：内置的通用验证探针
└── daemon.sock        # Core 进程的本地通信 Socket
```

### 项目物理边界 (`<your-project>/.openxenon/`)

```
<your-project>/
├── .openxenon/
│   ├── space.oxn     # 项目状态源：当前项目的唯一真理源
│   ├── proofs/        # 项目探针库（可选）
│   └── tasks/
│       └── <task_id>/
│           ├── step-manifest.json  # 单向管道：AI 写入，Core 监听
│           └── task-trace.yaml     # 交付物：任务完成后的最终案卷
└── src/               # 业务代码 (Artifact 落盘处)
```
```

**TO:**

```markdown
## 项目目录结构

```
<project>/
├── .openxenon/           # 项目围栏
│   ├── config.json       # 项目配置
│   ├── arsenals/         # 项目级资产
│   │   ├── probes/
│   │   └── stages/
│   └── tasks/
│       └── <task_id>/
│           ├── blueprint.yaml      # 任务蓝图
│           ├── step-manifest.json # AI 舱单（AI 写入）
│           └── task-trace.yaml    # 执行记录（追加写入）
└── src/                  # 业务代码
```

全局目录 (`~/.openxenon/`) 在 0.1 仅用于 Daemon 相关文件，CLI 直连模式不依赖它。
```
