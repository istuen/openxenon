问：对于如何使用的流程，有什么建议。

答：
基于架构文档的物理学宪法，我给出 OpenXenon 的完整使用流程建议：
---
## OpenXenon 使用流程指南
### 流程一：项目初始化（工程师首次使用）
```
工程师执行: oxn init
物理链路:
  CLI/commands/init.cmd.ts
    → 读取项目根目录
    → 调用 Kernel: 计算路径字符串 (.openxenon/config.json)
    → 调用 Infra/fs: 创建目录 + 写入配置
    → 退出
产出:
  <project>/.openxenon/
  ├── config.json          ← 项目身份证明
  ├── arsenals/            ← 空的 RAM 区（用户后续放入自定义资产）
  └── tasks/               ← 空的任务区
```
**关键约束**：CLI 不维护状态。`init` 执行完即退出，不启动 Daemon。
---
### 流程二：启动 Daemon（工程师后台启动）
```
工程师执行: oxn daemon start
物理链路:
  CLI/commands/daemon.cmd.ts
    → 构造 JSON: { action: "daemon_start" }
    → 调用 Infra/socket: 发送 JSON
    → 退出（或阻塞显示状态）
  如果 Daemon 未运行:
    → Bun.spawn('oxn-daemon')  ← 启动独立进程
    → Daemon/entry.ts:
        → 调用 Infra/socket: 监听 ~/.openxenon/daemon.sock
        → 调用 Infra/watcher: 监听 step-manifest.json 变更
        → 启动 RadarClock
        → 长驻运行
```
**关键约束**：Daemon 是全局唯一的。多个项目共享同一个 Daemon 实例。
---
### 流程三：创建任务（工程师或 AI 发起）
```
工程师执行: oxn task start --blueprint deploy-mysql.yaml
物理链路:
  CLI/commands/task.cmd.ts
    → 调用 Infra/fs: 读取 blueprint.yaml 字符串
    → 调用 Kernel/compiler: parseBlueprintYaml(yamlString) → JSON Payload
    → 调用 Infra/socket: 发送 JSON 到 Daemon
    → 退出
  Daemon/ipc/receiver.ts
    → 解析 JSON Payload
    → 调用 Kernel/dag-validator: 验证 DAG 无环
    → 调用 Infra/fs: 创建 <project>/.openxenon/tasks/<task_id>/
    → 调用 Infra/fs: 写入 blueprint.yaml（只读副本）
    → 调用 Daemon/trace/writer: 写入 TASK_START 事件
    → 返回 task_id + 首个 READY Stage 信息
```
**关键约束**：
- CLI 只负责"翻译"：YAML → JSON → Socket
- Daemon 只负责"裁决"：验证拓扑 + 创建案卷
- **谁也不负责"执行"**——那是 AI 的事
---
### 流程四：AI 执行工序（核心循环）
这是 OpenXenon 最核心的使用场景，分为 **AI 工作 → AI 声索 → Daemon 验证** 三个阶段：
```
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 A: AI 获取下一步指令                                        │
│                                                                  │
│  AI 调用: oxn task next                                          │
│                                                                  │
│  CLI → Socket → Daemon:                                          │
│    → 读取内存中的 currentDAGState                                 │
│    → 返回当前 READY 的 Stage 列表                                 │
│      { stageId: "install-laravel", proofs: [...], timeout: 300 } │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 B: AI 执行工作（黑盒）                                      │
│                                                                  │
│  AI 自主操作:                                                    │
│    → 写代码、编辑文件                                            │
│    → 运行 composer install / npm install                         │
│    → 执行任何它认为必要的操作                                     │
│                                                                  │
│  ⚠️ OpenXenon 不监控这个过程                                     │
│  ⚠️ RadarClock 在倒计时                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 C: AI 提交声索                                              │
│                                                                  │
│  AI 写入: <project>/.openxenon/tasks/<id>/step-manifest.json     │
│  {                                                               │
│    "stage": "install-laravel",                                   │
│    "action": "submit",                                           │
│    "probeArgs": {                                                │
│      "fs_exists": { "pattern": "artisan" },                     │
│      "fs_match": { "pattern": "composer.json",                  │
│                     "contains": "laravel/framework" }            │
│    }                                                             │
│  }                                                               │
│                                                                  │
│  🚨 禁止字段: status, verdict, artifacts                        │
│  ✅ 允许字段: stage, action, probeArgs                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 D: Daemon 自动验证                                          │
│                                                                  │
│  Infra/watcher → 检测到 manifest 变更                             │
│    → Daemon/radar/clock: 停止该 Stage 的计时器                    │
│    → Daemon/engine: 提取 Probe 列表                               │
│                                                                  │
│  对每个 Probe 执行三权分立:                                       │
│    ┌─ 契约层: arsenals/probes/fs-exists/canonical.yaml            │
│    ├─ 能力层: Infra/probes/fs-exists.ts → glob("artisan")        │
│    └─ 评判层: Kernel/probes/evaluator.ts → found.length > 0      │
│                                                                  │
│  归约:                                                           │
│    → Kernel/reduceStageVerdict(allProbeResults, "AND")            │
│    → Kernel/reduceDAG(currentDAGState, stageId, verdict)          │
│                                                                  │
│  写案卷:                                                         │
│    → Daemon/trace/writer.ts 追加:                                 │
│      PROBE_RESULT { type: "fs_exists", passed: true }             │
│      STAGE_COMPLETE { stageId: "install-laravel", status: "PASSED" } │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ 阶段 E: 解锁下游                                                 │
│                                                                  │
│  Daemon 内存更新: currentDAGState = newState                      │
│    → 下游 Stage 状态变为 READY                                    │
│    → AI 下次调用 task next 时获取新的 READY Stage                  │
└─────────────────────────────────────────────────────────────────┘
```
---
### 流程五：查看任务状态（工程师监控）
```
工程师执行: oxn task status
物理链路:
  CLI → Socket → Daemon
    → 读取内存中的 currentDAGState
    → 返回 JSON: 各 Stage 状态 (READY/RUNNING/PASSED/FAILED/ESCAPED)
或者:
工程师执行: oxn task trace
物理链路:
  CLI → Socket → Daemon
    → 调用 Infra/fs: 读取 task-trace.yaml 内容
    → 调用 Kernel: readTaskTraceFromContent(content)
    → 返回完整的案卷时间线
```
**关键约束**：CLI 不直接读文件。必须通过 Socket 请求 Daemon，Daemon 通过 Infra 读取。
---
### 流程六：Forge 资产（AI 或工程师创建资产）
```
工程师执行: oxn forge probe
物理链路:
  CLI/commands/forge.cmd.ts
    → 调用 Infra/fs: 读取 arsenals/forges/meta-probe/canonical.yaml
    → 输出元蓝图约束（给 AI 助手参考）
AI 使用 Skill:
  /oxn-forge 帮我写一个检查文件存在的 Probe
  → AI 读取 meta-probe/canonical.yaml 约束
  → AI 生成 YAML 内容
  → AI 调用 infra/fs: 写入 .openxenon/arsenals/probes/<name>/canonical.yaml
```
**关键约束**：Forge 只生成 DRAFT 状态的资产，不执行任何探针逻辑。
---
### 流程七：逃逸处理（AI 超时未提交）
```
T0: AI 获取 "install-laravel" Stage
    → Daemon/radar/clock: 启动计时器 (300s)
T1...T299: AI 工作中...（Daemon 不知道 AI 在干什么）
T300: 计时器触发
    → Daemon/radar/clock: 产生 TIMEOUT 事件
    → Kernel/dag-reducer: TIMEOUT → Stage_Verdict = ESCAPED
    → Daemon/trace/writer: 追加 STAGE_COMPLETE { status: "ESCAPED" }
    → Daemon 内存更新: currentDAGState 中该 Stage = ESCAPED
后续:
    → 工程师执行 oxn task status → 看到 ESCAPED
    → 工程师决定: 终止任务 or 重试 Stage
```
---
## 二、完整时序图
```
工程师          CLI           Daemon          Kernel          Infra          AI助手
  │              │              │               │               │              │
  │ oxn init     │              │               │               │              │
  │─────────────→│              │               │               │              │
  │              │──────────────────────────────────────────────→│              │
  │              │  mkdir .openxenon/ + write config.json       │              │
  │              │←─────────────────────────────────────────────│              │
  │              │              │               │               │              │
  │ oxn daemon   │              │               │               │              │
  │   start      │              │               │               │              │
  │─────────────→│─────────────→│               │               │              │
  │              │              │──────────────────────────────→│              │
  │              │              │  listen socket + watch fs     │              │
  │              │              │←─────────────────────────────│              │
  │              │              │               │               │              │
  │ oxn task     │              │               │               │              │
  │   start      │              │               │               │              │
  │─────────────→│              │               │               │              │
  │              │ read yaml ─────────────────────────────────→│              │
  │              │←────────────────────────────────────────────│              │
  │              │              │               │               │              │
  │              │ compile ───────────────────→│               │              │
  │              │←───────────────────────────│               │              │
  │              │              │               │               │              │
  │              │ send json ──→│               │               │              │
  │              │              │ validate dag ─→│               │              │
  │              │              │←──────────────│               │              │
  │              │              │ create dirs ─────────────────→│              │
  │              │              │ write trace ─────────────────→│              │
  │              │←─────────────│               │               │              │
  │  task_id     │              │               │               │              │
  │←─────────────│              │               │               │              │
  │              │              │               │               │              │
  │              │              │               │               │  oxn task next
  │              │              │←──────────────────────────────────────────────│
  │              │              │               │               │  READY stages
  │              │              │──────────────────────────────────────────────→│
  │              │              │               │               │              │
  │              │              │               │               │  [AI 工作...]
  │              │              │               │               │              │
  │              │              │               │               │  write manifest
  │              │              │               │               │←─────────────│
  │              │              │               │               │              │
  │              │              │ [watcher 检测到变更]            │              │
  │              │              │ stop radar    │               │              │
  │              │              │ run probes ──────────────────→│              │
  │              │              │←─────────────────────────────│              │
  │              │              │ evaluate ────→│               │              │
  │              │              │←─────────────│               │              │
  │              │              │ reduce dag ──→│               │              │
  │              │              │←─────────────│               │              │
  │              │              │ write trace ─────────────────→│              │
  │              │              │               │               │              │
  │ oxn task     │              │               │               │              │
  │   trace      │              │               │               │              │
  │─────────────→│─────────────→│               │               │              │
  │              │              │ read trace ──────────────────→│              │
  │              │              │←─────────────────────────────│              │
  │              │              │ parse trace ─→│               │              │
  │              │              │←─────────────│               │              │
  │  案卷内容    │←─────────────│               │               │              │
  │←─────────────│              │               │               │              │
```
---
## 三、关键使用建议
### 建议 1：AI 助手的标准工作循环
AI 助手应该遵循以下固定循环，**绝不跳步**：
```python
while True:
    # 1. 获取下一步
    stage = oxn_task_next()
    if not stage:
        break  # 任务完成
    
    # 2. 读取契约
    blueprint = read_blueprint(stage.blueprint_path)
    
    # 3. 执行工作
    do_work(stage)
    
    # 4. 提交声索（只填 probeArgs，绝不填 status/verdict）
    manifest = {
        "stage": stage.id,
        "action": "submit",
        "probeArgs": {
            "fs_exists": {"pattern": "artisan"},
            "fs_match": {"pattern": "composer.json", "contains": "laravel"}
        }
    }
    write_manifest(manifest)
    
    # 5. 等待验证结果
    result = oxn_task_status()
    if result.stage_status == "ESCAPED":
        raise TimeoutError("Stage escaped!")
    if result.stage_status == "FAILED":
        retry_or_abort()
```
### 建议 2：probeArgs 是寻址参数，不是结果声明
```json
// ✅ 正确：告诉 Daemon 去哪里找
{
  "probeArgs": {
    "fs_exists": { "pattern": "vendor/laravel" }
  }
}
// 🚨 错误：声称结果（Daemon 不信！）
{
  "status": "COMPLETED",
  "artifacts": ["vendor/laravel"],
  "verdict": "PASSED"
}
```
### 建议 3：工程师的监控策略
```bash
# 实时监控任务案卷（最推荐）
oxn task trace --watch
# 查看当前状态快照
oxn task status
# 查看特定 Stage 详情
oxn task trace --stage install-laravel
```
### 建议 4：Blueprint 设计原则
```yaml
# ✅ 好的 Blueprint：每个 Stage 有明确的 Proof 验证
stages:
  - id: install-deps
    proofs:
      - name: "dependencies installed"
        policy: AND
        probes:
          - type: fs_exists
            parameters: { pattern: "package-lock.json" }
          - type: shell_exec
            parameters: { command: "node -e \"require('express')\"" }
# 🚨 差的 Blueprint：没有 Proof，AI 可以声称完成但无法验证
stages:
  - id: install-deps
    # 没有 proofs! AI 可以直接 ESCAPE
```
### 建议 5：超时策略
| 场景                          | 推荐超时     | 原因          |
| ----------------------------- | ------------ | ------------- |
| `fs_exists` / `fs_match` 验证 | 60s          | 文件操作很快  |
| `shell_exec` 验证             | 120s         | 命令可能较慢  |
| AI 完成复杂 Stage             | 300s (5min)  | 代码编写+调试 |
| AI 完成部署 Stage             | 600s (10min) | 部署可能较慢  |
---
## 四、使用流程的终极原则
```
┌──────────────────────────────────────────────────────────────────┐
│                 OpenXenon 使用三原则                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. AI 只声索，Daemon 只验证                                      │
│     → AI 绝不自我宣布 PASSED                                      │
│     → Daemon 绝不信任 AI 的任何输出                               │
│                                                                   │
│  2. 案卷是唯一的真相来源                                          │
│     → task-trace.yaml 是不可变的物理事实                          │
│     → 如果案卷和 AI 说的不一致，信案卷                            │
│                                                                   │
│  3. Blueprint 是契约，不是脚本                                    │
│     → 它定义"期望什么"，不定义"怎么做"                            │
│     → AI 决定"怎么做"，Daemon 验证"做没做到"                     │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

--------------------------------
问：1、我原本想meta作为forge打造资产的“元制造”步骤或方法。应该把这些都当作一份blueprint的yaml吗。
2、AI模型如何“挑选”Arsenal作为Task的工具呢，包括Blueprint、Stage、Proof、Prube。
3、现在的架构设计与流程该如何“涌现”与“沉淀”出新的Arsenals。
4、关于Task里，我想到的是一份task，就在task目录下复制或新建一份blueprint，由AI根据task复杂度自行编写（但要依据blueprint schame，可以请求CLI验证）。这样一份task下应该包含blueprint、案卷等文档。

答：这四个问题直接刺穿了 OpenXenon 的"资产循环"核心——从创造、选择、演化到执行。让我逐一给出基于物理学宪法的裁决。
---
## 一、Meta 作为"元制造"：应该统一为 Blueprint YAML 吗？
**结论：不应该。Meta 和 Blueprint 是两个完全不同的物理实体。**
```
Meta (元模板)                    Blueprint (任务蓝图)
┌─────────────────────┐         ┌─────────────────────────┐
│ 本质: 工厂的模具      │         │ 本质: 产品的图纸          │
│ 用途: 生成资产的资产   │         │ 用途: 约束 Task 的执行    │
│ 消费者: Forge Skill  │         │ 消费者: Daemon Engine     │
│ 生命周期: 永久（ROM） │         │ 生命周期: 随 Task 生灭    │
└─────────────────────┘         └─────────────────────────┘
```
**关键区别**：
| 维度 | Meta                                           | Blueprint                             |
| ---- | ---------------------------------------------- | ------------------------------------- |
| 输入 | AI 的自然语言意图                              | 工程师/AI 的具体任务需求              |
| 输出 | 一个 Draft 资产（Probe/Proof/Stage/Blueprint） | 一组可执行的 Stage + DAG 拓扑         |
| 验证 | Schema 校验（结构是否合法）                    | DAG 验证 + Probe 验证（逻辑是否自洽） |
| 归属 | `arsenals/forges/meta-*` (全局 ROM)            | `<task>/blueprint.yaml` (任务级)      |
**正确的 Meta 结构**：
```yaml
# arsenals/forges/meta-probe/canonical.yaml
type: meta
targetAsset: probe          # 这个模具用来造什么
name: meta-probe
description: "用于生成新 Probe 探针的元模板"
# 定义生成物必须满足的 Schema
outputSchema:
  type: object
  required: [type, description, parameters]
  properties:
    type:
      type: string
      pattern: "^[a-z][a-z0-9_-]*$"
    description:
      type: string
    parameters:
      type: array
      items:
        type: object
        required: [name, type]
# Forge Skill 的工作指引
forgeInstructions: |
  1. 询问工程师需要验证什么（文件/进程/网络）
  2. 确定探针类型名称
  3. 定义参数列表
  4. 生成 canonical.yaml
```
**如果强行统一为 Blueprint**：你会丧失"造资产"和"用资产"的边界。Blueprint 是给 Daemon 裁决用的，Meta 是给 AI 创造用的。把模具当产品用，系统会崩溃。
---
## 二、AI 如何"挑选" Arsenal 作为 Task 的工具？
这是整个系统最关键的"路由"问题。AI 不应该盲目挑选，而应该通过**"能力声明 + 语义匹配"**机制。
### 2.1 挑选机制：Arsenal Registry
```
┌─────────────────────────────────────────────────────────────────┐
│ Arsenal 挑选的三层架构                                           │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [索引层] Arsenal Registry (内存)                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 启动时从 arsenals/ 扫描所有 canonical.yaml                │   │
│  │ 构建: { type, name, description, tags, capabilities }    │   │
│  │                                                          │   │
│  │ probes:                                                  │   │
│  │   fs_exists    → "检查文件是否存在"    tags: [fs, 文件]   │   │
│  │   fs_match     → "检查文件内容匹配"    tags: [fs, 内容]   │   │
│  │   shell_exec   → "执行命令验证退出码"  tags: [shell, 命令]│   │
│  │                                                          │   │
│  │ stages:                                                  │   │
│  │   install-laravel → "安装 Laravel 框架" tags: [php, 安装] │   │
│  │   deploy-docker   → "部署 Docker 容器" tags: [docker, 部署]│   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│ [查询层] CLI 搜索命令                                            │
│  oxn arsenal search "安装PHP框架"                                │
│  → 匹配: install-laravel, install-symfony                       │
│                                                                  │
│ [使用层] AI Skill 调用                                           │
│  /oxn-forge 我需要验证 Laravel 是否安装                           │
│  → AI 读取 Registry → 挑选 fs_exists + fs_match                 │
│  → 组合成 Proof → 嵌入 Stage                                    │
└─────────────────────────────────────────────────────────────────┘
```
### 2.2 canonical.yaml 必须包含语义标注
```yaml
# arsenals/probes/fs-exists/canonical.yaml
type: fs_exists
description: "检查文件系统中是否存在匹配的路径"
# 🌟 新增：语义标注（供 AI 匹配）
semantics:
  intent: "验证文件/目录的存在性"
  tags: ["文件系统", "存在性检查", "fs"]
  useWhen: "当你需要确认某个文件或目录已被创建时"
  relatedProbes: ["fs_not_exists", "fs_match"]
parameters:
  - name: pattern
    type: string
    required: true
    description: "glob 匹配模式，如 **/*.php 或 artisan"
```
### 2.3 AI 的挑选流程
```
AI 收到任务: "部署一个 Laravel 应用"
步骤1: 分解意图
  → 需要验证: 文件存在、内容匹配、命令执行成功
  → 需要工序: 安装依赖、配置环境、运行迁移
步骤2: 查询 Registry
  → oxn arsenal search --intent "验证文件存在" → fs_exists
  → oxn arsenal search --intent "安装PHP框架" → install-laravel stage
  → oxn arsenal search --intent "执行命令"    → shell_exec
步骤3: 组合资产
  → 从 Stage 中提取 Proof
  → 从 Proof 中提取 Probe
  → 构建依赖图 (DAG)
步骤4: 生成 Blueprint
  → 写入 <task>/blueprint.yaml
  → 调用 oxn task start 验证
```
---
## 三、Arsenal 的"涌现"与"沉淀"机制
这是系统自我演化的核心。我称之为**"三态循环"**：
```
┌──────────────────────────────────────────────────────────────────┐
│                    Arsenal 三态循环                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  [DRAFT 态] ──验证──→ [PROMOTED 态] ──复用──→ [ROM 态]          │
│  (涌现)                  (沉淀)                 (固化)            │
│                                                                   │
│  ┌─────────┐         ┌──────────┐          ┌─────────┐          │
│  │  DRAFT  │         │ PROMOTED │          │   ROM   │          │
│  │         │         │          │          │         │          │
│  │ AI 生成  │──通过──→│ 工程师审核│──多次使用─→│ 内置发行 │          │
│  │ 未验证   │ Schema  │ 项目级可用│  跨项目复用 │ 全局可用  │          │
│  │ 临时性   │ 校验    │ 可修改   │  稳定可靠   │ 不可修改  │          │
│  └─────────┘         └──────────┘          └─────────┘          │
│       │                   │                                      │
│       │ 验证失败          │ 发现问题                              │
│       ▼                   ▼                                      │
│    [废弃]              [回退修改]                                 │
│                                                                   │
│  物理位置:                                                       │
│  DRAFT:   .openxenon/arsenals/probes/<name>/draft.yaml           │
│  PROMOTED: .openxenon/arsenals/probes/<name>/canonical.yaml      │
│  ROM:     src/arsenals/probes/<name>/canonical.yaml (随代码发布)  │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```
### 3.1 涌现：从 Task 中诞生新 Arsenal
```
场景: AI 完成了一个 Task，其中包含一个特殊的验证逻辑
T0: Task 执行中
  → AI 在 blueprint.yaml 中写了一个自定义 Proof
  → Proof 包含: type: "custom_http_check"
  → Daemon 用 shell_exec 临时替代验证
T1: Task 完成
  → 工程师查看 task-trace.yaml
  → 发现这个自定义验证很实用
T2: 涌现触发
  → 工程师执行: oxn arsenal promote --from-task <task_id> --proof "http-check"
  → CLI:
      1. 调用 Infra: 读取 task 的 blueprint.yaml
      2. 调用 Kernel: 提取指定 Proof 的定义
      3. 调用 Kernel/Schema: 校验结构合法性
      4. 调用 Infra: 写入 .openxenon/arsenals/probes/http-check/draft.yaml
T3: DRAFT → PROMOTED
  → 工程师审核 draft.yaml
  → 工程师执行: oxn arsenal promote http-check
  → draft.yaml → canonical.yaml
```
### 3.2 沉淀：从 PROMOTED 到 ROM
```
场景: 一个 Arsenal 被多个项目使用，足够稳定
工程师执行: oxn arsenal export http-check --output ./src/arsenals/probes/http-check/
  → 将项目级的 canonical.yaml 复制到代码仓库
  → 下次发布时，它成为内置 ROM
  → 同时需要提交对应的 Infra 能力层代码 (infra/probes/http-check.ts)
```
### 3.3 Arsenal 目录结构的完整形态
```
src/arsenals/                          # ROM (随代码发布)
├── probes/
│   ├── fs-exists/canonical.yaml
│   ├── fs-match/canonical.yaml
│   └── shell-exec/canonical.yaml
└── forges/
    ├── meta-probe/canonical.yaml
    ├── meta-proof/canonical.yaml
    ├── meta-stage/canonical.yaml
    └── meta-blueprint/canonical.yaml
<project>/.openxenon/arsenals/         # RAM (项目级，可修改)
├── probes/
│   ├── http-check/
│   │   ├── draft.yaml               # DRAFT 态（AI 生成，未审核）
│   │   └── canonical.yaml           # PROMOTED 态（已审核）
│   └── db-connection/
│       └── canonical.yaml
├── stages/
│   └── deploy-k8s/
│       └── canonical.yaml
└── blueprints/                        # 🌟 完整蓝图模板（可复用）
    └── laravel-stack/
        └── canonical.yaml
```
---
## 四、Task 下的 Blueprint：复制 vs 新建
**结论：采用"模板复制 + AI 改写"的混合模式。**
### 4.1 Blueprint 的物理学地位
```
Blueprint 有两个来源:
来源 A: 从 Arsenal 模板复制
  → .openxenon/arsenals/blueprints/laravel-stack/canonical.yaml
  → 复制到 .openxenon/tasks/<id>/blueprint.yaml
  → AI 根据具体任务修改参数
来源 B: AI 自行编写
  → AI 根据 Task 需求从零构建
  → 必须符合 Blueprint Schema
  → 可以请求 CLI 验证
```
### 4.2 Task 目录的完整结构
```
<project>/.openxenon/tasks/<task_id>/
├── blueprint.yaml          # 任务蓝图（AI 可改写）
├── step-manifest.json      # AI 舱单（AI 原子写）
└── task-trace.yaml         # 物理案卷（Daemon 追加写）
```
### 4.3 Blueprint 生成流程
```
场景: 工程师说 "帮我部署一个 Laravel 应用到生产环境"
步骤1: AI 查询 Arsenal
  → oxn arsenal search --type blueprint --intent "Laravel部署"
  → 找到: laravel-stack 模板
步骤2: AI 读取模板
  → 读取 .openxenon/arsenals/blueprints/laravel-stack/canonical.yaml
  → 模板包含: install-deps → config-env → run-migrations → deploy
步骤3: AI 根据任务改写
  → 修改: deploy stage 的参数（从 docker 改为 k8s）
  → 增加: health-check stage
  → 修改: 超时时间（生产环境需要更长）
步骤4: AI 提交验证
  → oxn task start --blueprint ./blueprint.yaml
  → CLI:
      1. 调用 Infra/fs: 读取 YAML
      2. 调用 Kernel/compiler: 编译成 JSON
      3. 调用 Kernel/dag-validator: 验证拓扑
      4. 调用 Kernel/schemas: 验证结构
      5. 如果验证失败 → 返回错误，AI 修改后重试
      6. 如果验证通过 → 发送到 Daemon，创建 Task
```
### 4.4 Blueprint 的可改写性约束
```yaml
# blueprint.yaml 的元信息
meta:
  source: "arsenal:laravel-stack"     # 来源（可追溯）
  modifiedBy: "AI"                    # 谁改的
  verifiedBy: "oxn task start"        # 验证方式
# 主体内容（AI 可改写）
stages:
  - id: install-deps
    proofs:
      - name: "依赖已安装"
        policy: AND
        probes:
          - type: fs_exists
            parameters: { pattern: "vendor/autoload.php" }
          - type: shell_exec
            parameters: { command: "php artisan --version" }
  - id: deploy-production           # AI 改写的 stage
    timeout: 600                    # 生产环境加长超时
    proofs:
      - name: "服务健康"
        policy: AND
        probes:
          - type: shell_exec
            parameters: { command: "curl -f http://localhost:8000/health" }
          - type: fs_match
            parameters: { pattern: ".env", contains: "APP_ENV=production" }
```
---
## 五、终极闭环：资产循环的完整拓扑
```
┌──────────────────────────────────────────────────────────────────────┐
│                     OpenXenon 资产循环                                │
├──────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  [创造层] Forge                                                       │
│  ├─ AI 使用 Meta 模板生成 Draft 资产                                  │
│  ├─ AI 使用 Blueprint 模板生成 Task 蓝图                              │
│  └─ 工程师手动编写                                                    │
│       │                                                               │
│       ▼ Schema 验证                                                   │
│  [验证层] Kernel                                                      │
│  ├─ 校验 Draft 结构合法性                                             │
│  ├─ 校验 Blueprint DAG 无环                                           │
│  └─ 校验 Probe 参数完整性                                             │
│       │                                                               │
│       ▼ 审核通过                                                      │
│  [存储层] Arsenal                                                     │
│  ├─ DRAFT → PROMOTED (项目级可用)                                     │
│  ├─ PROMOTED → ROM (全局内置)                                        │
│  └─ Blueprint 模板存入 arsenals/blueprints/                           │
│       │                                                               │
│       ▼ 任务触发                                                      │
│  [执行层] Daemon                                                      │
│  ├─ Blueprint 复制到 Task 目录                                        │
│  ├─ AI 改写 Blueprint（可选）                                         │
│  ├─ Daemon 逐 Stage 验证                                             │
│  └─ 结果写入 task-trace.yaml                                          │
│       │                                                               │
│       ▼ 经验提取                                                      │
│  [涌现层] Promote                                                     │
│  ├─ 从 Task 中提取有价值的 Proof → 新 Probe                           │
│  ├─ 从 Task 中提取有价值的 Stage → 新 Stage                           │
│  └─ 从 Task 中提取完整流程 → 新 Blueprint 模板                        │
│       │                                                               │
│       └──────────────→ 回到 [创造层]，形成闭环                        │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
```
---
## 六、核心建议总结
| 问题                       | 建议                                | 原因                                                  |
| -------------------------- | ----------------------------------- | ----------------------------------------------------- |
| Meta 是否统一为 Blueprint  | **否**                              | Meta 是"模具"，Blueprint 是"图纸"。物理本质不同       |
| AI 如何挑选 Arsenal        | **Registry + 语义标注**             | canonical.yaml 增加 `semantics` 字段，AI 通过意图匹配 |
| Arsenal 如何涌现/沉淀      | **DRAFT → PROMOTED → ROM 三态循环** | 保证质量过滤，避免未验证资产污染全局                  |
| Task 下 Blueprint 如何生成 | **模板复制 + AI 改写 + CLI 验证**   | 兼顾复用性和灵活性                                    |
最后一条原则：**Arsenal 是系统知识的结晶，Task 是知识的消费场景，Forge 是知识的创造工具。三者必须分离，但循环必须闭环。**



--------------------------------