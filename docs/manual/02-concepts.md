# 2. 核心概念

## Blueprint

Blueprint 是 OpenXenon 中的"工程图"，定义了任务的完整结构。

### Blueprint 结构

```yaml
# Task Information
task:
  id: my-task
  name: 我的任务
  description: 这是一个示例任务
  createdAt: 2026-04-28T00:00:00Z

# Stage Selection
stages:
  available:
    - name: Build
      description: 构建阶段
    - name: Test
      description: 测试阶段
  selected:
    - Build
    - Test

# Stage Definitions
stageDefinitions:
  Build:
    description: 构建阶段
    steps:
      - id: build-step-1
        name: 执行构建
        proof:
          type: exec_exit_zero
          params:
            command: npm run build
  Test:
    description: 测试阶段
    steps:
      - id: test-step-1
        name: 执行测试
        proof:
          type: exec_exit_zero
          params:
            command: npm test
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

### Probe 类型

OpenXenon 内置以下 Probe 类型：

#### fs_exists
检查文件是否存在。

```yaml
type: fs_exists
params:
  path: dist/index.js
```

#### fs_content_match
检查文件内容是否匹配正则。

```yaml
type: fs_content_match
params:
  path: package.json
  pattern: '"@openxenon/core"'
```

#### exec_exit_zero
检查命令执行是否成功（退出码为 0）。

```yaml
type: exec_exit_zero
params:
  command: npm test
```

## Stage

Stage 是 Blueprint 中的"工序节点"，代表任务执行的一个阶段。

### Stage 结构

```yaml
Build:
  description: 构建阶段
  steps:
    - id: build-step-1
      name: 执行构建
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
description: 验证 Laravel 安装成功
target: Laravel 框架已成功安装
proofs:
  - check_composer_json
  - check_laravel_dependency
  - check_vendor_exists
```

## DRAFT / CANONICAL 生命周期

所有 Arsenal 资产必须经过两态生命周期：

### DRAFT（草稿状态）

- AI 通过 `/oxn-forge` 生成
- 等待工程师审查
- **不执行任何验证逻辑**

### CANONICAL（正式状态）

- 工程师执行 `oxn standards promote` 转正
- 可在实际任务中被 Core 执行
- 代表经过确权的工程标准

### 状态转换

```
DRAFT ──[oxn standards promote]──▶ CANONICAL
  │                                 │
  │                                 │
  └──[oxn standards reject]─────────┘ (可选)
```

## Task

Task 是 OpenXenon 的任务实例，绑定一个 Blueprint。

### Task 生命周期

1. **CREATED** - 任务已创建，Blueprint 已保存
2. **IN_PROGRESS** - 任务正在执行
3. **PASSED** - 所有 Stage 和 Proof 通过
4. **FAILED** - 某个 Proof 失败

## 概念关系图

```
Blueprint
  ├── task (任务信息)
  ├── stages (阶段选择)
  │     ├── available
  │     └── selected
  └── stageDefinitions (阶段定义)
        └── [Stage Name]
              └── steps
                    └── proof (引用 Proof)

Arsenal
  ├── probes/ (原子检查)
  │     ├── fs_exists
  │     ├── fs_content_match
  │     └── exec_exit_zero
  ├── proofs/ (验证闭环)
  │     └── [Proof Name]
  └── stages/ (工序节点)
        └── [Stage Name]

Task
  ├── id
  ├── blueprint (引用 Blueprint)
  └── status (CREATED | IN_PROGRESS | PASSED | FAILED)
```

## 下一章

下一章将介绍 [CLI 命令参考](./03-cli.md)。