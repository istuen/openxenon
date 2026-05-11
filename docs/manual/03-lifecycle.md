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

## 适用场景

1. **遗留系统安全重构**：在缺乏测试的老代码库中，通过 Blueprint 路径锁死；遇到历史遗留的奇葩逻辑时，通过 Sample 打补丁
2. **团队工程规范强制落地**：将高级架构师的经验编写为 Blueprint，初级工程师的产出被强制约束在 Blueprint 内
3. **复杂业务流编排**：将涉及多表变更、多服务联调的需求，拆解为 DAG 蓝图，让 AI 在确定的拓扑轨道上精确作业

## 系统交互流程图

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

## 系统架构：全局/项目双层边界

OpenXenon 采用严格的全局与项目双层物理隔离架构。Core 引擎是全局唯一的常驻进程，通过挂载不同项目的上下文来实施控制。

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

> 详细的架构设计请参阅 [docs/architecture.md](../architecture.md)。

## 下一章

下一章将介绍 [CLI 命令参考](./04-cli-ref.md)。