# 2. 核心概念

## Blueprint

Blueprint 是 OpenXenon 的"工程图"，定义了任务的完整结构。

### Blueprint 结构

```yaml
name: 我的任务
stages:
  - id: build
    name: 构建
    proof:
      probes:
        - ref: shell_exec
          parameters:
            command: npm run build
  - id: test
    name: 测试
    dependsOn: [build]
    proof:
      probes:
        - ref: shell_exec
          parameters:
            command: npm test
```

### Blueprint 的两个视角

- **对工程师**：可读的 YAML，包含任务描述、阶段划分
- **对系统**：机器可解析的结构化数据，用于执行调度

## Arsenal

Arsenal 是 OpenXenon 的"资产库"，存放所有标准资产。

### 资产类型

| 类型 | 描述 | 示例 |
|------|------|------|
| **Probe** | 原子化检查 | `fs_exists`、`shell_exec` |
| **Proof** | 验证闭环 | 组合多个 Probe |
| **Stage** | 工序节点 | `install-laravel`、`run-tests` |

## Stage

Stage 是 Blueprint 中的"工序节点"，代表任务执行的一个阶段。

### Stage 结构

```yaml
- id: build
  name: 构建
  proof:
    probes:
      - ref: shell_exec
        parameters:
          command: npm run build
```

### Stage 执行流程

1. AI 通过 `oxn task next` 获取任务
2. 按 Blueprint 中的顺序执行 Stage
3. 每个 Stage 的 Proof 被 Kernel 判定
4. 验证结果通过 task-trace.yaml 记录

## Proof

Proof 是"验证闭环"，由一个或多个 Probe 组成。

### Proof 示例

```yaml
name: laravel_install_proof
probes:
  - ref: fs_exists
    parameters:
      pattern: "vendor/laravel"
  - ref: fs_match
    parameters:
      path: "composer.json"
      pattern: "laravel/framework"
```

## DRAFT / CANONICAL 生命周期

所有 Arsenal 资产必须经过两态生命周期：

- **DRAFT（草稿状态）**：AI 通过 `oxn forge` 生成，工程师审查后转正
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

| 术语 | 定义 |
|------|------|
| **工程师** | 提供高层意图和约束，不直接写代码 |
| **AI 助手** | 解析工程师意图，生成 Blueprint 和代码 |
| **oxn CLI** | 命令行入口，不依赖 Daemon 即可使用核心功能 |

### 核心概念

| 术语 | 定义 |
|------|------|
| **Blueprint** | 任务的完整结构定义，包含多个 Stage |
| **Stage** | 任务执行的一个阶段 |
| **Proof** | 验证闭环，由一个或多个 Probe 组成 |
| **Probe** | 原子化检查（如 fs_exists、shell_exec） |
| **Arsenal** | 存放所有标准资产的目录 |

### 生命周期

| 术语 | 定义 |
|------|------|
| **DRAFT** | AI 通过 `oxn forge` 生成的资产草稿 |
| **CANONICAL** | 审查通过、可被任务引用的正式资产 |
| **task-trace.yaml** | 任务执行过程的记录文件 |

## 概念关系图

```
Blueprint
  ├── name (任务名称)
  └── stages (阶段列表)
        └── [Stage Name]
              └── proof
                    └── probes

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
