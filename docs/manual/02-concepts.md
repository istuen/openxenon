# 2. 核心概念

## Blueprint

Blueprint 是 OpenXenon 中的"工程图"，定义了任务的完整结构。

> **注意**：以下为简化示例。完整的 Blueprint Schema 尚未定义，proof 字段格式将在 BlueprintSchema 定义后更新。

### Blueprint 结构

```yaml
task:
  id: my-task
  name: 我的任务
stages:
  available:
    - name: Build
    - name: Test
  selected:
    - Build
    - Test
stageDefinitions:
  Build:
    steps:
      - id: build-step-1
        name: 执行构建
        proof:
          type: exec_exit_zero
          params:
            command: npm run build
```

### Blueprint 的二象性

- **对工程师**：可读的 Markdown/YAML，包含任务描述、业务意图
- **对 Core**：机器可解析的结构化数据，用于状态机执行

## Arsenal

Arsenal 是 OpenXenon 的"武器库"，存放所有标准资产。

### 资产类型

| 类型 | 描述 | 示例 |
|------|------|------|
| **Probe** | 原子化检查 | `fs_exists`、`exec_exit_zero` |
| **Proof** | 验证闭环 | 组合多个 Probe |
| **Stage** | 工序节点 | `install-laravel`、`run-tests` |

## Stage

Stage 是 Blueprint 中的"工序节点"，代表任务执行的一个阶段。

### Stage 结构

```yaml
Build:
  steps:
    - id: build-step-1
      proof:
        type: exec_exit_zero
        params:
          command: npm run build
```

### Stage 执行流程

1. Core 加载 Blueprint
2. 按 selected 顺序执行 Stage
3. 每个 Stage 内的 steps 顺序执行
4. 每个 step 的 proof 被 Core 执行验证

## Proof

Proof 是"验证闭环"，由一个或多个 Probe 组成。

### Proof 示例

```yaml
name: laravel_install_proof
proofs:
  - check_composer_json
  - check_vendor_exists
```

## DRAFT / CANONICAL 生命周期

所有 Arsenal 资产必须经过两态生命周期：

- **DRAFT（草稿状态）**：AI 通过 `/oxn-forge` 生成，工程师审查后转正
- **CANONICAL（正式状态）**：执行 `oxn arsenal promote` 转正，可被任务引用

```
DRAFT ──[oxn arsenal promote]──▶ CANONICAL
```

## Task

Task 是 OpenXenon 的任务实例，绑定一个 Blueprint。

### Task 生命周期

1. **CREATED** - 任务已创建，Blueprint 已保存
2. **IN_PROGRESS** - 任务正在执行
3. **PASSED** - 所有 Stage 和 Proof 通过
4. **FAILED** - 某个 Proof 失败

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

## 核心原语

| 术语 | 英文 | 定义 |
|------|------|------|
| **样本分支** | Sample | 动态逃生机制，当 AI 在 Stage 中受挫时探索变体 |
| **拓扑蓝图** | Blueprint | 由多个 Stage 组成的有向无环图（DAG） |

## 概念关系图

```
Blueprint
  ├── task (任务信息)
  ├── stages (阶段选择)
  └── stageDefinitions
        └── [Stage Name]
              └── steps
                    └── proof

Arsenal
  ├── probes/ (原子检查)
  ├── proofs/ (验证闭环)
  └── stages/ (工序节点)

Task
  ├── id
  ├── blueprint (引用 Blueprint)
  └── status (CREATED | IN_PROGRESS | PASSED | FAILED)
```

## 下一章

下一章将介绍 [CLI 命令参考](./04-cli-ref.md)。