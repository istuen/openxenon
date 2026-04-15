以下是基于《Xenonix 白皮书 v2.0》提炼的核心架构决策记录（ADR），以及完全契合该理论体系的架构设计与生命周期图。
---
# Xenonix 架构决策记录 (ADR)
## ADR-001: 状态存储与通信协议的物理剥离
* **背景**：传统异步 Agent 架构依赖共享文件系统（如共同读写一个 `manifest.json`）进行状态同步，存在严重的竞态条件风险和跨平台锁失效问题。
* **决策**：彻底摒弃文件轮询。采用**“SQLite 单写者 + JSON 线格式”**架构。Core 进程独占 SQLite 写锁，作为系统唯一真相来源；JSON 仅作为内存/网络中的通信载荷，不落盘作为共享状态。
* **后果**：彻底消除了状态失步的可能。AI 无法越权篡改系统状态，Core 的控制权在操作系统层面得到绝对物理保障。
## ADR-002: 相空间边界约束
* **背景**：LLM 的规划能力具有无限发散性，直接将其生成的 DAG 交由底层执行，必然导致不可控的“幻觉蔓延”。
* **决策**：引入**“证明字典”**机制。AI 不拥有无限制的规划权，其拆分的每一个 Step，必须能被 Core 当前已注册的 Proof Type 所度量（如 `AST_CHECK`, `EXEC_EXIT_ZERO`）。
* **后果**：将无限的 AI 概率空间，强制压缩到 Core 物理可观测的有限相空间内。从源头上杜绝了“无法验证的黑盒步骤”。
## ADR-003: 确定性物理度量衡替代黑盒指标
* **背景**：系统需要基于历史数据演化，但 Core 无法感知 AI 模型内部的 Token 消耗（云厂商黑盒），无法建立准确的成本函数。
* **决策**：抛弃 Token 统计，采用基于物理挂钟时间的确定性效用函数：$Total Cost = \alpha \times Elapsed\_Seconds + \beta \times Override\_Flag + \gamma \times Retry\_Count$。以 `[Spec 标签] + [Proof Type]` 为联合主键建立统计单元格。
* **后果**：系统的演化动力建立在绝对客观、Core 可独立测量的物理量之上，使得二阶反馈回路具备了严谨的数学基础。
## ADR-004: 运行时相空间扩张与受控降级
* **背景**：系统在执行中可能遇到字典缺失（需加新规则）或持续失败（直接熔断太粗暴）的非标状态。
* **决策**：
  1. **扩张**：工程师通过 `/xn-sync` 触发硬中断，Core 强制重置状态机，注入 `DICT_SYNCED` 向量强制 AI 基于新字典重规划。
  2. **降级**：字典中前置定义 `fallback_proof`。重试耗尽时，Core 自动切换宽松规则验证，带 `degraded=True` 标签放行，但记下极高的 $\gamma$ 成本以触发未来演化。
* **后果**：系统具备了“不死机”的工业容错能力，同时确保所有的“妥协”都被精确量化，用于未来的自我优化。
---
# 架构设计与生命周期图
## 1. 系统架构设计图 (物理边界与控制流)
此图展示了 Xenonix 各组件的物理部署关系，重点突出了“单写者原则”、“相空间边界”以及“二阶数据库”的拓扑位置。
```mermaid
graph TD
    subgraph "总师层 (系统相空间扩张源)"
        ENG((工程师))
        CLI[Xenonix CLI]
    end
    subgraph "控制层"
        subgraph Core_Engine["Xenonix Core 引擎 (绝对单写者)"]
            direction TB
            CTRL{状态机控制器<br>IDLE/THINKING/VERIFYING}
            DICT{{证明字典<br>Proof Dictionary<br>(相空间物理边界)}}
            PROBE[Proof 执行器<br>(物理探测器)]
        end
        SQLITE[(SQLite 状态机与动力学库<br>微观: 当前Step/State<br>宏观: 联合主键历史统计)]
    end
    subgraph "执行层"
        AI((AI 模型<br>受控效应器))
    end
    subgraph "审计层 (只读导出)"
        LOG[((Trace YML 文件案卷<br>供人类/外部系统阅读))]
    end
    %% === 交互流定义 ===
    
    %% 总师控制流
    ENG -->|"1. 注册新 Proof 脚本"| CLI
    CLI -->|"2. /xn-sync 硬中断"| DICT
    
    %% 相空间注入
    DICT -.->|"3. 下发边界约束"| AI
    %% 标准协议通信流 (无文件轮询)
    AI -->|"4. POST 提交 Playbook/Step 数据 (JSON线格式)"| CTRL
    CTRL -->|"5. 响应状态与自适应参数"| AI
    
    %% 内部状态转移与探测
    CTRL <-->|"6. 状态翻转与指令下发"| PROBE
    PROBE -->|"7. 物理探测 Artifact"| PROBE
    
    %% 底层数据沉淀
    CTRL <-->|"8. 唯一读写通道"| SQLITE
    
    %% 审计输出
    SQLITE -->|"9. 任务结束导出快照"| LOG
    %% 人工覆写穿透
    ENG -->|"10. /xn override 穿透指令"| CLI
    CLI -->|"11. 强制状态翻转"| CTRL
    %% 样式强化
    style SQLITE fill:#ffeaa7,stroke:#d35400,stroke-width:4px
    style DICT fill:#dfe6e9,stroke:#2980b9,stroke-width:3px,stroke-dasharray: 5 5
    style CTRL fill:#fab1a0,stroke:#d63031,stroke-width:3px
    
    classDef aiBorder fill:#ffffff,stroke:#636e72,stroke-width:2px
    class AI aiBorder
    
    classDef logBorder fill:#f5f5f5,stroke:#b2bec3,stroke-dasharray: 10 5
    class LOG logBorder
```
---
## 2. 确定性生命周期图 (含异常流与动力学采样)
此图详尽展示了在“单写者”约束下，一个 Step 从执行到统计的完整微观生命周期，包含了 `/xn-sync` 中断与 `Fallback` 降级两条关键异常路径。
```mermaid
sequenceDiagram
    participant Eng as 工程师
    participant CLI as Xenonix CLI
    participant AI as AI 模型
    participant Core as Core 状态机
    participant DB as SQLite 动力学库
    %% ========== 初始化阶段 ==========
    rect rgb(240, 248, 255)
    Note over AI, DB: Phase 1: 受限建链与二阶参数注入
    AI->>Core: 提交 Playbook (必须在字典边界内)
    Core->>DB: 查询 [Spec+Proof] 联合主键的历史统计
    DB-->>Core: 返回历史高成本警告
    Core-->>AI: 返回 Accept (附带 adaptive_control: 强制拆分提示)
    end
    %% ========== 正常微观闭环 ==========
    rect rgb(240, 255, 240)
    Note over AI, DB: Phase 2: 微观负反馈闭环 (一阶控制)
    Core->>Core: [单写] 将当前 Step 设为 AI_THINKING，记录 start_time
    Core-->>AI:下发 Invoke 指令
    
    Note right of AI: AI 在本地沙箱执行<br>绝对无法接触 Core 状态
    
    AI->>Core: POST Callback 提交 Artifact 数据
    
    rect rgb(255, 248, 220)
    Note over Core: [单写] 记录 end_time<br>计算 elapsed_time (α)<br>设为 CORE_VERIFYING
    end
    
    Core->>Core: 执行 Proof 物理探测
    
    alt 验证 FAIL
        Note over Core: retry_count + 1 (γ增加)
        Core->>Core: [单写] 强制打回 AI_THINKING
        Core-->>AI:下发 Reject (附带失败原因)
    else 验证 PASS
        Note over Core: 记录 (α, γ, override=0)
        Core->>DB: 写入该单元格微观成本数据
        Core->>Core: [单写] 推进至下一个 IDLE
        Core-->>AI:下发 PASS 与下一任务
    end
    end
    %% ========== 异常流 A: 相空间扩张 ==========
    rect rgb(255, 248, 220)
    Note over Eng, DB: 异常流 A: 运行时相空间硬中断
    
    Note over AI, Core: (假设系统卡在 THINKING 状态)
    Eng->>CLI: xn sync (注入了新的 Proof_Z 脚本)
    CLI->>Core: 硬中断信号
    Core->>Core: 热加载 Proof_Z 扩张相空间
    Core->>Core: [单写] 强制重置当前 Step 为 AI_THINKING
    Core-->>AI: 返回中断向量: interrupt=DICT_SYNCED
    Note right of AI: AI 识别向量，丢弃旧思路<br>基于新边界重新规划提交
    end
    %% ========== 异常流 B: 受控降级 ==========
    rect rgb(255, 240, 245)
    Note over Eng, DB: 异常流 B: 触及重试上限的受控降级
    
    Note over Core: (假设某 Step 已连续失败达到 max_retries)
    
    AI->>Core: 最后一次提交
    Core->>DB: 查字典得知 fallback_proof = "FS_EXISTS"
    
    rect rgb(200, 255, 200)
    Note over Core: 不抛出 FATAL，进入 DEGRADED_VERIFYING<br>使用宽松规则验证同一 Artifact
    end
    
    Core->>Core: 降级验证通过
    Core->>DB: [单写] 记录 degraded=True，记下极高瑕疵惩罚 (γ)
    Core->>Core: [单写] 推进至下一个 IDLE
    Core-->>AI: 返回 Warning: Passed via DEGRADED_FALLBACK
    
    Note over DB: 二阶效应：该单元格失败率飙升<br>将在未来任务中触发正反馈演化<br>（如强制拆分或提示工程师修改规则）
    end
```
