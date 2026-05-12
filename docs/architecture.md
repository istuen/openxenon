# OpenXenon 架构设计文档

> **版本**: 0.1
> **状态**: 探索阶段
> **最后更新**: 2026-05-12

---

## 一、概述

OpenXenon 是一个实验性框架，探索如何让工程师与 AI 更有效地协作。

它的出发点是：

- AI 模型是推测性的、不可控的、会出现幻觉，但执行效率和探索能力极高
- 工程师懂业务需求和技术实现，并持续积累经验
- **核心问题**：如何把工程师的经验转化为 AI 能理解并执行的指令，同时降低 Token 成本

OpenXenon 不运行 AI 的推理过程，不理解 AI 代码的语义，只负责一件事——**验证 AI 声称的工作成果是否与文件系统和进程的实际状态一致**。

```
┌─────────────────────────────────────────────────────────────────┐
│                      OpenXenon 在系统中的位置                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│    工程师 ──▶ AI 助手 ──▶ OpenXenon ──▶ 文件系统/进程          │
│                                                                  │
│    AI 负责"执行"（写代码、跑命令）                                │
│    OpenXenon 负责"裁决"（验证结果、记录案卷）                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 1.1 设计约束

OpenXenon 的设计基于三条约束：

| 约束 | 内容 | 原因 |
|------|------|------|
| **AI 的输出不可信** | 不直接采信 AI 的声明，必须用观测验证 | AI 会幻觉，会撒谎 |
| **判定逻辑必须可复现** | Kernel 只做纯函数计算，无 I/O 无副作用 | 保证判定结果可预测、可测试 |
| **文件系统和进程操作必须收敛** | Infra 是唯一触碰硬件的组件 | 防止侧路绕过验证 |

这些约束是当前的最佳判断，不是教条。如果实践证明某条约束没必要，可以调整。

### 1.2 探索方向

0.x 阶段的核心方向：**让工程师的经验成为 AI 工程里的资产，提升 AI 的执行质量。**

我们关心的几个问题（没有答案，也不急着有）：

- 约束是否真的有用？还是只是让人感觉更可控？
- 工程师经验能否系统性地转化为 AI 可执行的资产？
- 资产能不能积累和复用？还是每次都要从零开始？
- 当前的分层架构是否必要？还是过度设计？
- Daemon 长驻模式比 CLI 直连好在哪里？

这些问题不需要现在回答。先把路走通，答案会自己冒出来。

### 1.3 自举定义

| 级别 | 定义 | 状态 |
|------|------|------|
| **L1 编译自举** | `pnpm build` 产出的二进制能执行 `oxn forge probe` | ✅ 已达成 |
| **L2 资产自举** | Forge→Draft→Promote→Task→Verify 全链路跑通 | ⚠️ 待验证 |
| **L3 质量自举** | OpenXenon 自身的开发过程通过 OpenXenon 管理 | 0.2 目标 |

**0.1 的目标 = L2 通过。** L3 是 0.2 的目标。

---

## 二、分层架构

### 2.1 三层架构拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                    OpenXenon 三层架构                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  CLI (外壳 - 一次性扳机)                                  │   │
│   │  ├─ 读取 Blueprint YAML                                   │   │
│   │  ├─ 调用 Kernel/Compiler: YAML -> JSON Payload           │   │
│   │  └─ 调用 Infra/Socket: 发送 JSON -> 退出                 │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │ Unix Socket (纯 JSON)              │
│                              ▼                                  │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │  Daemon (裁决容器 - 长驻进程)                              │   │
│   │  ├─ 协调层: 阻塞/解锁 Stage 的时间调度                    │   │
│   │  ├─ 提取层: 从 Manifest 提取当前 Stage 的 Probe 列表      │   │
│   │  └─ 编排层: 调用 Infra (观测) -> 调用 Kernel (评判)        │   │
│   └─────────────────────────────────────────────────────────┘   │
│                              │                                  │
│                              │                                  │
│          ┌───────────────────┴───────────────────┐             │
│          ▼                                       ▼             │
│   ┌─────────────────┐                   ┌─────────────────┐   │
│   │  Kernel         │                   │  Infra          │   │
│   │  (纯逻辑层)   │                   │  (I/O 层)   │   │
│   │                 │                   │                 │   │
│   │ 纯函数，无副作用 │                   │ 唯一触碰硬件的  │   │
│   │ 只做符号归约    │                   │ 物理触角       │   │
│   │                 │                   │                 │   │
│   │ DAG Validator   │                   │ fs.exists()   │   │
│   │ Probe Evaluator │                   │ process.exec() │   │
│   │ Stage Reducer   │                   │ socket.send() │   │
│   └─────────────────┘                   └─────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 组件职责边界

```
┌─────────────────────────────────────────────────────────────────┐
│                     组件职责边界定义                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  CLI (一次性扳机)                                                │
│  ├─ 能做: 读取 YAML，调用 Kernel 编译，调用 Infra 发送 JSON      │
│  └─ 不能做: 任何 IPC 之外的持久化，任何状态维护                   │
│                                                                  │
│  Daemon (裁决容器)                                                │
│  ├─ 能做: 维护内存状态 (currentDAGState)，编排 Kernel + Infra     │
│  └─ 不能做: 直接执行物理 I/O，必须通过 Infra                      │
│                                                                  │
│  Kernel (纯逻辑层)                                              │
│  ├─ 能做: 纯函数计算，DAG 拓扑推导，Probe 结果归约               │
│  └─ 不能做: 任何 I/O，任何副作用，任何状态维护                     │
│                                                                  │
│  Infra (I/O 层)                                               │
│  ├─ 能做: fs 操作，进程执行，Socket 通信                         │
│  └─ 不能做: 业务逻辑判断，任何符号归约                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 三、探针（Probe）机制

探针（Probe）是 OpenXenon 的核心验证单元。它的生命周期必须严格分为三个物理隔离的阶段。

### 3.1 探针的三阶段

```
┌─────────────────────────────────────────────────────────────────┐
│                      探针三阶段                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [契约层] YAML (纯数据)                                          │
│  src/arsenals/probes/fs-exists/canonical.yaml                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  type: fs_exists                                         │   │
│  │  description: "检查文件系统中是否存在匹配的路径"            │   │
│  │  parameters:                                             │   │
│  │    - name: pattern                                        │   │
│  │      type: string                                         │   │
│  │      required: true                                      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼ 解析参数                            │
│  [能力层] Infra (I/O 触角)                                        │
│  src/infra/probes/fs-exists.ts                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  // 真正去触碰硬盘，返回匹配的文件列表                    │   │
│  │  async function executeFsExists(pattern: string):       │   │
│  │    Promise<string[]>                                     │   │
│  │    return await glob(pattern)                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼ 观测结果                            │
│  [评判层] Kernel (纯逻辑层)                                     │
│  src/kernel/probes/evaluator.ts                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  // 纯函数判定：不理解"文件"，只比较数量                  │   │
│  │  function evaluateFsExists(                              │   │
│  │    params: FsExistsParams,                               │   │
│  │    actualFiles: string[]                                 │   │
│  │  ): ProbeVerdict {                                       │   │
│  │    return {                                               │   │
│  │      passed: actualFiles.length > 0,                     │   │
│  │      message: passed ? 'Found files' : 'No files found' │   │
│  │    }                                                     │   │
│  │  }                                                       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 能力层探针类型

| 探针类型 | 能力层实现 | 评判层逻辑 |
|----------|-----------|-----------|
| `fs_exists` | `glob()` 扫描文件系统 | `found.length > 0` |
| `fs_not_exists` | `glob()` 扫描文件系统 | `found.length === 0` |
| `fs_match` | `readFile()` + `RegExp.test()` | `allPatterns.test(content)` |
| `shell_exec` | `spawn()` 执行命令 | `exitCode === 0` |

### 3.3 探针执行流程

```
AI 完成 Stage 工作
       │
       ▼
Daemon 提取 YAML 契约中的 Probe 定义
       │
       ├──▶ [能力层] Infra 执行物理观测
       │         │
       │         ▼
       │    actualFiles: string[] (物理事实)
       │
       └──▶ [评判层] Kernel 纯函数归约
                 │
                 ▼
            ProbeVerdict { passed: boolean, message: string }
                 │
                 ▼
       ┌────────────────────────────────────┐
       │  Daemon 追加到 task-trace.yaml     │
       └────────────────────────────────────┘
```

---

## 四、工序（Stage）机制

工序（Stage）是 AI 执行工作的基本单元。**Stage 不是用来"执行"的，Stage 是用来"评判"的**。

### 4.1 核心顿悟

```
┌─────────────────────────────────────────────────────────────────┐
│                Stage vs Probe 的本质区别                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Probe (探针)                                                     │
│  ├─ 本质: 物理世界的传感器                                        │
│  ├─ 时间: 瞬时 (毫秒级读取)                                       │
│  └─ 执行: Daemon 通过 Infra 触发                                 │
│                                                                  │
│  Stage (工序)                                                     │
│  ├─ 本质: 符号世界的判定门                                        │
│  ├─ 时间: 持续 (等待 AI 完成工作，可能几分钟)                      │
│  └─ 执行: AI 助手 (通过写代码/跑命令)                             │
│                                                                  │
│  关键区别:                                                        │
│  ├─ Probe 的"执行"是物理观测 (触碰硬盘/进程)                      │
│  └─ Stage 的"执行"是逻辑证伪 (验证观测结果是否匹配契约)            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Stage 的三层实现

```
┌─────────────────────────────────────────────────────────────────┐
│                      工序三层实现                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [契约层] Blueprint YAML                                          │
│  ├─ 定义 Stage 的依赖关系 (DAG 拓扑)                              │
│  ├─ 定义 Stage 包含的 Proofs 列表                                 │
│  └─ 定义 Proof 的归约策略 (AND/OR)                               │
│                                                                  │
│  [协调层] Daemon Engine (编排 - 非执行!)                          │
│  ├─ 当 AI 提交 step-manifest.json 时，阻塞 Stage                 │
│  ├─ 提取当前 Stage 的 Probes 列表                                │
│  ├─ 分发到 Kernel Probe 评判管道                                  │
│  └─ 收集 Verdict，进行逻辑 AND 归约                               │
│                                                                  │
│  [评判层] Kernel DAG Reducer (纯图论计算)                         │
│  ├─ 环检测 (死锁检测)                                            │
│  ├─ 依赖满足性验证 (如果 B 依赖 A，A 的 Verdict 必须是 PASSED)    │
│  └─ 拓扑状态推导 (READY -> RUNNING -> PASSED/FAILED)             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Stage 的归约策略

```yaml
# stages/install-laravel/canonical.yaml
proofs:
  - name: "Laravel 核心文件"
    policy: "AND"  # proof 内的探针是 AND 关系
    probes:
      - type: fs_exists
        parameters: { pattern: "artisan" }
      - type: fs_match
        parameters: { pattern: "composer.json", contains: "laravel/framework" }

blueprint:
  policy: "AND"  # stage 之间的归约策略
  stages:
    - id: "install-dependencies"
    - id: "run-migrations"
      dependsOn: ["install-dependencies"]  # DAG 依赖
```

```typescript
// Kernel 纯函数签名
function reduceStageVerdict(
  proofResults: ProofResult[],
  policy: 'AND' | 'OR'
): StageVerdict {
  if (policy === 'AND') {
    return proofResults.every(r => r.passed) ? 'PASSED' : 'FAILED'
  }
  if (policy === 'OR') {
    return proofResults.some(r => r.passed) ? 'PASSED' : 'FAILED'
  }
}

function reduceDAG(
  dag: DAGGraph,
  stageId: string,
  verdict: StageVerdict
): DAGGraph {
  // 纯图论推导：解锁下游节点
  // 返回新的不可变 DAG 对象
}
```

---

## 五、运行模式

OpenXenon 有两种运行模式。0.1 实现 CLI 直连，0.2 目标是实现 Daemon 裁决。

### 5.1 模式对比

```
┌─────────────────────────────────────────────────────────────────┐
│ 0.1 CLI 直连（当前）          │ 0.2 Daemon 裁决（目标）         │
├───────────────────────────────┼─────────────────────────────────┤
│                               │                                  │
│  CLI ──直接调用──▶ Infra      │  CLI ──Socket──▶ Daemon          │
│       ──直接调用──▶ Kernel    │                   ├─▶ Infra      │
│       ──直接读写──▶ 文件系统  │                   ├─▶ Kernel     │
│                               │                   └─▶ 文件系统   │
│                               │                                  │
│  无状态，无守护进程           │  有状态，Daemon 持有 DAG         │
│  无逃逸检测                   │  Radar 时钟 + 逃逸检测          │
│  无并发控制                   │  任务队列 + 锁                  │
│                               │                                  │
│  ✅ 0.1 默认模式              │  ⚠️ 依赖 Daemon 打包问题解决    │
│  所有核心命令可用             │  arsenal search 需要 Daemon      │
│                               │                                  │
└───────────────────────────────┴─────────────────────────────────┘
```

### 5.2 0.1 架构：CLI 直连

```
┌─────────────────────────────────────────────────────────────────┐
│ 0.1 CLI 直连模式                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  工程师/AI                                                       │
│     │                                                            │
│     ▼                                                            │
│  oxn CLI                                                         │
│     ├── oxn init              → Infra/fs: 创建 .openxenon/      │
│     ├── oxn forge probe       → Kernel/compiler: 返回约束        │
│     ├── oxn forge probe -s    → Infra/fs: 保存 Draft YAML       │
│     ├── oxn arsenal list      → Infra/fs: 扫描 arsenals/         │
│     ├── oxn arsenal promote   → Infra/fs: draft.yaml → canonical │
│     ├── oxn task submit       → Infra/fs: 写入 tasks/<id>/       │
│     ├── oxn task next         → Infra/fs: 读取 blueprint.yaml    │
│     ├── oxn task verify       → Infra/probes: 执行观测           │
│     │                        → Kernel/evaluator: 纯函数评判       │
│     │                        → Infra/fs: 追加 task-trace.yaml    │
│     └── oxn task status       → Infra/fs: 读取 task-trace.yaml  │
│                                                                  │
│  关键特征:                                                       │
│  ├── CLI 进程内直接调用 Kernel + Infra                           │
│  ├── 每个命令是独立进程，无共享状态                               │
│  ├── 文件系统是唯一的状态持久层                                  │
│  └── 无超时检测，依赖 AI 主动调用 verify                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 0.2 目标：Daemon 裁决

> ⚠️ 以下为 0.2 目标架构，当前尚未完全实现。
> Daemon 启动（`oxn daemon start`）依赖 `./src/server.ts`，编译后路径问题待解决。

CLI 和 Daemon 是两个完全独立的物理实体，它们唯一需要达成共识的，是流过 Unix Socket 的 JSON 字符串。

#### 5.3.1 禁止的拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│ 代码耦合（绝对禁止!）                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  错误示范:                                                       │
│                                                                  │
│  src/cli/handlers/                                               │
│       │                                                          │
│       ◄── 代码倒灌! Daemon 依赖这个目录                          │
│       ▼                                                          │
│  src/daemon/ipc/handlers.ts                                      │
│  import '../../cli/handlers/*' // ← 绝对禁止!                    │
│                                                                  │
│  这不是 IPC，这是内存共享。CLI 和 Daemon 必须代码隔离。           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.2 Daemon 调用链

```
┌─────────────────────────────────────────────────────────────────┐
│ CLI → Daemon 调用链                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ 重要：CLI 的一切物理 I/O 必须通过 Infra                       │
│  CLI 本身绝对不能直接调用 fs.readFileSync！                       │
│                                                                  │
│  [CLI] task submit                                               │
│     1. 调用 Infra/fs: 读取 blueprint YAML                         │
│     2. 调用 Kernel: compiler.pipe(yaml) → JSON Payload           │
│     3. 调用 Infra/socket: send(payload)                          │
│     4. 退出（开火即忘）                                          │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Unix Socket (~/.openxenon/daemon.sock)                  │    │
│  │ 只有纯 JSON 在流动，没有任何代码耦合                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Daemon] ipc/receiver.ts                                        │
│     1. 解析 JSON payload                                         │
│     2. 调用 Daemon Engine: orchestrate(payload)                   │
│                                                                  │
│  [Daemon] engine.ts (编排层)                                      │
│     1. 读取 canonical.yaml (通过 Infra)                          │
│     2. 提取 manifest.probeArgs (通过 Infra)                      │
│     3. 合并为完整 ProbeDefinition (Daemon 内部操作)               │
│     4. 调用 Infra 执行 → 拿到 actualFiles                       │
│     5. 调用 Kernel: evaluate(ProbeDefinition, actualFiles)         │
│     6. 调用 Kernel: reduceDAG(currentState, verdict)             │
│     7. 调用 Infra/fs: appendTrace(traceEvent)                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### 5.3.3 CLI 观测器模式

| 模式 | 命令 | 行为 |
|------|------|------|
| **开火即忘** | `oxn task submit` | 发送 JSON 后立即退出，不阻塞 |
| **观测器** | `oxn task status` | 读取 task-trace.yaml，输出当前状态 |
| **持续观测** | `oxn export` + tail | 导出并持续观察 |

CLI 永远不需要长时间阻塞占用资源。如果需要观察进度，使用观测器模式。

### 5.4 CLI 目录结构（实际）

```
src/cli/
├── entry.ts             # 入口，citty 框架
├── init.ts              # oxn init
├── daemon-start.ts      # oxn daemon start（0.2 目标）
├── task.ts              # oxn task (submit|next|verify|status)
├── task-filesystem.ts   # CLI-direct 模式实现
├── arsenal.ts           # oxn arsenal (list|inspect|promote|search|export|import|migrate)
├── arsenal-list.ts      # 不依赖 Daemon
├── arsenal-search.ts    # ⚠️ 依赖 Daemon
├── forge.ts             # oxn forge <type> [-s] [-n] [-g]
├── export.ts            # oxn export
└── gc.ts                # oxn gc
```

### 5.5 Daemon 目录结构（0.2 目标）

```
src/daemon/
├── server.ts            # 启动长驻进程（⚠️ 编译后路径问题待解决）
├── ipc/
│   └── receiver.ts      # 接收 Socket JSON（绝无共享 CLI 代码!）
├── engine.ts            # 编排: 收 JSON → kernel → infra
├── radar/
│   └── clock.ts         # 内存时钟（纯 HashMap，无 I/O）
└── trace/
    └── writer.ts        # 追加 task-trace.yaml（唯一的文件系统写入）
```

---

## 六、双层物理边界

OpenXenon 采用全局/项目双层物理隔离架构，通过严格的边界约束确保 AI 推理过程的可控性和可追溯性。

### 6.1 边界拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                      双层物理边界                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ~/.openxenon/ (全局沙箱)                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  daemon.sock        - 唯一通信通道                       │   │
│  │  daemon.pid         - 进程锁                             │   │
│  │  daemon.log         - 日志 (Infra 追加写)               │   │
│  │  proofs/            - 全局探针库 (ROM)                   │   │
│  │  └── common/                                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  <project>/.openxenon/ (项目法典区)                              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  config.json        - 静态配置                          │   │
│  │  arsenals/          - 用户自定义 Arsenal (RAM)           │   │
│  │  │   └── stages/xxx/                                    │   │
│  │  tasks/                                                  │   │
│  │  └── <task_id>/                                         │   │
│  │      ├── blueprint.yaml    - 任务蓝图 (AI 读取，只读)    │   │
│  │      ├── step-manifest.json - AI 舱单 (AI 原子写)       │   │
│  │      └── task-trace.yaml   - 物理案卷 (Daemon 追加写)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 边界职责

| 边界 | 内容 | 职责 |
|------|------|------|
| 全局 | `~/.openxenon/` | Daemon 进程管理，全局探针库 |
| 项目 | `<project>/.openxenon/` | 项目隔离的任务状态 |

**重要原则**：项目不是"注册"出来的，而是"发现"出来的。只要目录下存在 `.openxenon/config.json`，它就是一个项目。

### 6.3 文件系统作为通信介质

```
┌─────────────────────────────────────────────────────────────────┐
│                  文件系统作为通信介质                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  step-manifest.json (AI 写入)                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  {                                                        │   │
│  │    "stage": "install-laravel",                           │   │
│  │    "action": "submit",                                   │   │
│  │    "probeArgs": {                                        │   │
│  │      "fs_exists": { "pattern": "vendor/laravel" }       │   │
│  │    }                                                     │   │
│  │  }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲                                    │
│                            │ AI 单方面声索                       │
│                            │                                    │
│                            ▼                                    │
│  task-trace.yaml (Daemon 追加)                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  {"type":"TASK_START","taskId":"t123",...}              │   │
│  │  {"type":"STAGE_START","stageId":"install-laravel",...} │   │
│  │  {"type":"PROBE_RESULT","probeType":"fs_exists",...}    │   │
│  │  {"type":"STAGE_COMPLETE","status":"PASSED",...}       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            ▲                                    │
│                            │ Daemon 物理验证后的判决              │
│                                                                  │
│  多个 CLI 可以同时 tail -f task-trace.yaml，不会互相干扰。       │
│  它们通过共享的物理文件系统，实现了时间上的解耦。                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 七、Manifest 的职责

### 7.1 Manifest 不是证据，是寻址参数

```
┌─────────────────────────────────────────────────────────────────┐
│                 step-manifest.json 的契约                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AI 在 Manifest 里提供的是"地图"，不是"证据"。                    │
│                                                                  │
│  AI 提交:                                                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  {                                                        │   │
│  │    "stage": "install-laravel",                           │   │
│  │    "action": "submit",                                   │   │
│  │    "probeArgs": {                                        │   │
│  │      "fs_exists": { "pattern": "vendor/laravel" }       │   │
│  │    }                                                     │   │
│  │  }                                                        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ⚠️ probeArgs 合并职责属于 Daemon Engine (编排层)               │
│     这不是 Kernel 的职责！                                       │
│                                                                  │
│  Daemon Engine 编排流程:                                         │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  1. 读取 canonical.yaml (通过 Infra)                     │   │
│  │     获取默认参数: { pattern: "default/path" }             │   │
│  │                                                          │   │
│  │  2. 读取 manifest.probeArgs (通过 Infra)                │   │
│  │     获取覆盖参数: { pattern: "vendor/laravel" }          │   │
│  │                                                          │   │
│  │  3. 合并为完整 ProbeDefinition (Daemon 内部操作)         │   │
│  │     最终参数: { pattern: "vendor/laravel" } (被覆盖)      │   │
│  │                                                          │   │
│  │  4. 调用 Infra 执行物理观测                                │   │
│  │     actualFiles = await infra/fs.exists(pattern)         │   │
│  │                                                          │   │
│  │  5. 调用 Kernel 评判                                      │   │
│  │     verdict = kernel/evaluator.evaluate(def, actualFiles)│   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  地图可能是假的 (AI 撒谎)，但 Daemon 的脚是真的。                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Manifest 禁止的字段

| 字段 | 禁止原因 |
|------|----------|
| `status` | 只有 Daemon 写入 task-trace.yaml 的才是事实 |
| `artifacts` | 应该是 Probe 验证的结果，不是 AI 声称的结果 |
| `verdict` | 评判权属于 Kernel，不属于 AI |

---

## 八、逃逸检测 (暗线)（0.2 目标）

逃逸检测是通过文件系统变更监听实现的被动验证机制。

### 8.1 架构拓扑

```
┌─────────────────────────────────────────────────────────────────┐
│                      逃逸检测拓扑                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ⚠️ 重要澄清：Kernel 是被动调用，Daemon 是主动调用者              │
│     Kernel 绝对不能有 Event Listener 或主动订阅                  │
│                                                                  │
│  [感知层] Infra/watcher.ts                                       │
│  ├─ 封装 fs.watch()                                              │
│  ├─ 当 step-manifest.json 变更时发射事件                          │
│  └─ 不知道什么是超时，只知道"文件变了"                            │
│                                                                  │
│  [时钟层] Daemon/radar/clock.ts                                   │
│  ├─ 接收 Infra 的事件                                            │
│  ├─ 维护 HashMap: "最后收到事件的时间戳"                          │
│  ├─ 如果距今超过阈值，Daemon 主动调用 Kernel                      │
│  └─ 纯内存状态，无 I/O                                            │
│                                                                  │
│  [判断层] Kernel/dag-reducer.ts (被动调用)                        │
│  ├─ 被 Daemon 调用，TIMEOUT 作为参数传入                          │
│  │   reduceDAG(currentState, { type: 'TIMEOUT', stageId })      │
│  ├─ 纯图论计算: TIMEOUT -> Stage_Verdict = ESCAPED              │
│  └─ 不理解"逃逸"的语义，只做符号归约                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**关键约束**：
- Kernel **绝对不能**有 EventEmitter 或订阅函数
- Kernel **绝对不能**主动调用 Infra
- 所有调用链必须是：**Daemon → Kernel → Infra → 物理世界**

### 8.2 逃逸检测流程

```
T0: AI 提交 step-manifest.json，开始 Stage A
       │
       │ Daemon 启动 radar clock (超时计时器)
       ▼
T1: AI 正常提交验证
       │ Daemon 停止 radar clock
       │ Daemon 跑 Probe 验证
       │ Daemon 追加 task-trace.yaml
       ▼
T2: Stage A PASSED，解锁 Stage B
       │
       │ 如果 AI 在超时时间内没有提交...
       ▼
Tx: Radar 产生 TIMEOUT 事件
       │
       ▼
  ┌────────────────────────────────────┐
  │  Kernel DAG Reducer 计算:           │
  │  TIMEOUT -> Stage_A = ESCAPED       │
  └────────────────────────────────────┘
```

---

## 九、安全模型（0.2 目标）

### 9.1 核心命题

```
┌─────────────────────────────────────────────────────────────────┐
│               OpenXenon 是裁决系统，不是安全系统                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  OpenXenon 假设 AI 是善意的，只是不完美。                          │
│                                                                  │
│  它不做:                                                         │
│  ├─ 阻止 AI 写恶意代码                                           │
│  ├─ 理解 AI 代码的语义                                           │
│  ├─ 在 Kernel 层做安全防御                                       │
│  └─ 证明系统自身的"善意"                                         │
│                                                                  │
│  它只做:                                                         │
│  ├─ 验证 AI 声称的工作成果是否与物理事实一致                      │
│  ├─ 记录 AI 的每一步操作到 task-trace.yaml                       │
│  └─ 提供 Blueprint 作为 AI 执行的契约                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 三层防线

```
┌─────────────────────────────────────────────────────────────────┐
│                      安全三层防线                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [第一层: 契约层] Blueprint / Policy                              │
│  ├─ 定义 Stage 的副作用边界                                       │
│  └─ 示例:                                                       │
│     executionPolicy:                                             │
│       allowNetwork: false                                       │
│       allowWritePaths: ["/app"]                                 │
│       denyCommands: ["rm -rf"]                                  │
│                                                                  │
│  [第二层: 能力层] Infra/process.ts                                │
│  ├─ 如果 AI 试图执行禁止的命令，在 spawn 前拦截                  │
│  └─ 或者在 Docker/chroot 沙箱中执行，物理上绝缘                   │
│                                                                  │
│  [第三层: 逻辑层] Kernel                                         │
│  ├─ 绝对不能做安全防御                                           │
│  └─ 如果 Infra 放行了恶意操作，Kernel 只做逻辑归约               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 "AI 作恶"场景分析

```
场景: AI 执行 rm -rf /，Probe 验证 fs_not_exists("/") -> PASSED

系统运作是完美无缺的:
├─ Kernel (逻辑层): NOT EXISTS "/" == True -> PASSED
├─ Daemon (裁决层): 忠实地记录了 PASSED
└─ 裁决是正确的

但契约写错了!
├─ Blueprint 不应该允许 deploy stage 有 rm -rf 权限
└─ 或者 Infra 应该在 process.exec() 前拦截

结论:
Kernel 是盲目的判官，它不理解什么是"删除"，什么是"破坏"。
要求 Kernel 防御恶意代码，就像要求算术公式阻止子弹一样荒谬。
```

---

## 十、宪法强制执行（0.2 目标）

### 10.1 ESLint 物理铁丝网

TypeScript 无法在类型系统层面强制"纯函数不能有 I/O"。必须依赖架构层的物理隔离 + 工程层的强制拦截。

```javascript
// .eslintrc.cjs
module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        // 1. Kernel 绝对真空：不能触碰物理层
        {
          group: ['src/infra/*', 'node:fs', 'node:net', 'node:child_process'],
          message: '🚨 代码层违规：Kernel 是纯逻辑层，禁止 I/O 操作！'
        },
        // 2. CLI 与 Daemon 绝缘：不能互相导入
        {
          group: ['src/daemon/*'],
          target: 'src/cli/**',
          message: '🚨 宪法违规：CLI 不能导入 Daemon，它们只能通过 Socket 通信！'
        },
        {
          group: ['src/cli/*'],
          target: 'src/daemon/**',
          message: '🚨 宪法违规：Daemon 不能导入 CLI，它们只能通过 JSON Payload 交互！'
        },
        // 3. Infra 不能染指业务：不能反向依赖 Kernel 之外的逻辑
        {
          group: ['src/kernel/*', 'src/daemon/*', 'src/cli/*'],
          target: 'src/infra/**',
          message: '🚨 宪法违规：Infra 是纯物理电线，不能包含任何业务逻辑依赖！'
        }
      ]
    }]
  }
};
```

### 10.2 架构合规检查表

| 检查项 | 合规标准 |
|--------|----------|
| Kernel 无 I/O | `kernel/**/*.ts` 中不能有 `import.*fs`、`import.*process` |
| Infra 无业务逻辑 | `infra/**/*.ts` 中不能有 `import.*kernel`、`import.*daemon` |
| CLI/Daemon 隔离 | `daemon/**/*.ts` 中不能有 `import.*cli` |
| 纯函数签名 | Kernel 函数必须是有输入输出的变换函数，而非状态容器 |
| Manifest 验证 | 只有 `daemon/trace/writer.ts` 可以写 `task-trace.yaml` |

---

## 十一、当前状态与重构任务

### 11.1 已知问题

| 文件 | 问题 | 状态 |
|------|------|------|
| `kernel/lib/task-trace.ts` | 欺骗性纯函数（含 I/O） | ✅ 已修复：拆分为纯函数 + Infra/fs 写入 |
| `daemon/ipc/handlers.ts` | `import '../../cli/handlers/*'` | ⚠️ 残留：已有 `receiver.ts`，但 handlers.ts 仍存在 |
| `kernel/probes/executor.ts` | 硬编码 switch 路由 | ✅ 已修复：重构为 `evaluator.ts` (纯) + `infra/probes/` |
| `kernel/built-in-proofs-registry.ts` | 硬编码注册表 | ✅ 已删除：探针由 `infra/probes/` 动态路由 |
| `infra/staging/staging-manager.ts` | 反向依赖 Kernel | ⚠️ 待确认 |
| `core/daemon-config.ts` | 写配置 | ⚠️ 待确认 |

### 11.2 实际目录结构（0.1）

```
src/
├── kernel/                     # 🌟 [纯逻辑层] 纯函数，零副作用
│   ├── types.ts                # 纯代数类型
│   ├── schemas/                # Zod 校验器
│   │   ├── proof.ts
│   │   ├── stage.ts
│   │   ├── dag-validator.ts
│   │   └── probe.ts
│   ├── probes/
│   │   └── evaluator.ts       # 探针评判 (纯函数)
│   ├── lib/
│   │   ├── task-trace.ts      # ✅ 已净化为纯函数
│   │   ├── blueprint-parser.ts
│   │   └── proofs.ts
│   └── constants.ts
│
├── infra/                      # 🌟 [I/O 层] 唯一触碰硬件的电线
│   ├── fs.ts                   # 原子写、追加读
│   ├── socket.ts               # Unix Socket 收发
│   ├── process.ts              # Bun.spawn 执行
│   ├── probes/                 # 🌟 能力层探针实现
│   │   ├── fs-exists.ts
│   │   ├── fs-not-exists.ts
│   │   ├── fs-match.ts
│   │   └── shell-exec.ts
│   └── loader.ts
│
├── arsenals/                   # 🌟 [出厂 ROM] 纯数据定义
│   ├── builtin.ts              # ✅ 内置资产（TS 常量，编译进二进制）
│   ├── loader.ts
│   └── paths.ts
│
├── cli/                        # 🌟 [外壳 1] 编排器
│   ├── entry.ts
│   ├── task.ts                 # oxn task (submit|next|verify|status)
│   ├── task-filesystem.ts      # CLI-direct 模式实现
│   ├── forge.ts                # oxn forge <type> [-s] [-n] [-g]
│   ├── arsenal.ts              # oxn arsenal (list|inspect|promote|...)
│   ├── init.ts
│   └── skill-compiler.ts       # Skills 编译
│
├── daemon/                     # 🌟 [外壳 2] 裁决容器 (0.2 目标)
│   ├── server.ts               # ⚠️ 编译后路径问题未解决
│   ├── ipc/
│   │   ├── receiver.ts         # ✅ 接收 Socket JSON
│   │   ├── router.ts
│   │   ├── validation.ts
│   │   └── handlers/           # ⚠️ 残留，仍导入 cli/handlers
│   ├── radar/
│   │   └── clock.ts            # 内存时钟（未启用）
│   └── trace/
│       └── writer.ts           # 追加 task-trace.yaml
│
└── skills/                     # 🌟 [AI 语义层] TS 模块 → 编译为 .md
    ├── index.ts
    ├── types.ts
    ├── oxn-forge.ts
    ├── oxn-task.ts
    ├── oxn-init.ts
    ├── oxn-resume.ts
    ├── oxn-status.ts
    ├── oxn-stop.ts
    └── oxn-trace.ts
```

> 注：Skills 模块通过 `skill-compiler.ts` 编译为 `.opencode/skills/*.md` 供 AI 使用。

---

## 十二、术语表

| 术语 | 定义 |
|------|------|
| **Kernel** | 纯逻辑层，纯函数、无副作用、只做判定和归约 |
| **Infra** | I/O 层，唯一触碰文件系统和进程的组件 |
| **代码倒灌** | 上层组件反向依赖下层组件的架构问题 |
| **欺骗性纯函数** | 表面像纯函数，实际有隐藏副作用的代码 |
| **声索** | AI 在 Manifest 中单方面宣布的"我干完了" |
| **事实** | Infra 观测 + Kernel 纯函数判定后的验证结果 |
| **逃逸** | AI 在超时时间内未提交 Manifest 验证的状态 |
| **自举** | OpenXenon 用自己的机制验证自己（L1/L2/L3 三级） |

---

## 十三、结语

OpenXenon 要做的事情很简单：让工程师的经验能变成 AI 可执行的资产，同时让 AI 的执行结果可验证。

分层架构（Kernel 纯逻辑 + Infra 唯一 I/O）是目前的方案，不是信仰。如果实践证明更简单的方案也能达到目的，那就改。

0.1 的目标不是证明什么，而是把路走通。

---

*文档结束*
