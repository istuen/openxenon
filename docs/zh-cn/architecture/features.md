# OpenXenon 功能文档

本文档列出 OpenXenon 当前已实现的功能。

---

## 一、核心概念

### 1.1 资产类型

| 类型 | 描述 | 存储位置 |
|------|------|----------|
| **Probe** | 原子化检查，如 `fs_exists`、`shell_exec` | `.openxenon/arsenals/probes/` |
| **Stage** | 工序节点，包含 target/spec/probes | `.openxenon/arsenals/stages/` |
| **Blueprint** | 任务蓝图，组合多个 Stage | `.openxenon/arsenals/blueprints/` |

### 1.2 资产状态

| 状态 | 描述 |
|------|------|
| **DRAFT** | 草稿状态，需审查后才能转正 |
| **CANONICAL** | 正式状态，可被任务引用 |

### 1.3 任务状态

| 状态 | 描述 |
|------|------|
| **PENDING** | 等待执行 |
| **RUNNING** | 执行中 |
| **COMPLETED** | 全部通过 |
| **FAILED** | 失败 |

---

## 二、CLI 命令

### 2.1 项目初始化

```bash
oxn init
```
在当前目录创建 `.openxenon` 项目围栏。

### 2.2 Arsenal 资产管理

```bash
# 列出所有资产
oxn arsenal list

# 查看特定资产
oxn arsenal inspect <type>/<name>
# 例如：oxn arsenal inspect probes/fs_exists

# 提升 Draft 资产为 Canonical
oxn arsenal promote <type>/<name>
# 例如：oxn arsenal promote probes/my-probe
```

### 2.3 Forge 资产生成

```bash
# 生成 Probe 定义
oxn forge probe

# 生成 Stage 定义
oxn forge stage

# 保存 Draft 资产
oxn forge <type> --save '<yaml>' --name <name>
```

### 2.4 Work 工作管理 (新)

```bash
# 创建新 Work
oxn work new <work-id> --name <显示名称> --type task --blueprint <blueprint-name>

# 获取下一个待执行 Part
oxn work resume <work-id>

# 所有 Part 通过后完成 Work
oxn work complete <work-id>

# 列出所有 Work
oxn work list

# 查看 Work 详情
oxn work validate .openxenon/work/<type>/<work-id>.oxn
```

### 2.5 Explore 探索模式

```bash
# 创建新探索（使用 Work 流程）
oxn work new <探索名称> --type explore --blueprint explore-flow

# 扫描资料（已废弃，请使用 Work 流程）
oxn explore scan --name <探索名称> --path <文件或目录>

# 添加问答记录（已废弃）
oxn explore qa --name <探索名称> --add "Q:问题|A:回答"

# 生成报告（已废弃）
oxn explore report --name <探索名称>

# 列出所有探索（已废弃）
oxn explore list
```

---

## 三、Probe 类型

### 3.1 内置 Probe

| 类型 | 描述 | 参数 |
|------|------|------|
| `fs_exists` | 检查 glob 模式匹配的文件是否存在 | `pattern`: glob 模式 |
| `fs_not_exists` | 检查 glob 模式匹配的文件是否不存在 | `pattern`: glob 模式 |
| `fs_match` | 检查文件内容是否匹配正则 | `path`: 文件路径, `pattern`: 正则 |
| `exec_exit_zero` | 检查命令退出码是否为 0 | `command`: shell 命令 |

### 3.2 自定义 Probe

用户可通过 Forge 生成自定义 Probe，保存到 Arsenal。

---

## 四、Blueprint 格式

### 4.1 基本结构

```yaml
name: <blueprint名称>
stages:
  - id: <stage唯一标识>
    name: <显示名称>
    deps: [<依赖的stage id>]
    target:
      description: <目标描述>
    spec:
      description: <规格描述>
    probes:
      - type: <探针类型>
        params:
          <探针参数>
```

### 4.2 Blueprint 引用 Arsenal 资产

Blueprint 中可以引用 Arsenal 中的 Probe：

```yaml
stages:
  - id: check-files
    probes:
      - ref: fs_exists          # 引用 Arsenal 中的 Probe
        params:
          pattern: "src/**/*.ts"
```

### 4.3 DAG 依赖

```yaml
stages:
  - id: stage-a
  - id: stage-b
    deps: [stage-a]    # stage-b 依赖 stage-a
```

---

## 五、Task 执行流程

```
oxn task new → oxn task submit → oxn task next → 执行工作 → oxn task verify
                                      ↓                    ↓
                              (重复直到)            (重复直到)
                                      ↓                    ↓
                                  全部完成              某个失败
```

### 5.1 完整示例

```bash
# 1. 创建任务
oxn task new my-task --name "构建项目"

# 2. 编写 Blueprint 并提交
oxn task submit --blueprint my-task.yaml --task-id my-task

# 3. 获取第一个 Stage
oxn task next --task-id my-task

# 4. 执行并验证
oxn task verify --task-id my-task --stage-id build

# 5. 重复直到完成
oxn task next --task-id my-task
oxn task verify --task-id my-task --stage-id test
```

---

## 六、Task Trace

任务执行过程中会生成 `task-trace.yaml`，记录每个 Stage 和 Probe 的执行结果。

### 6.1 Trace 事件类型

| 事件 | 描述 |
|------|------|
| `TASK_START` | 任务开始 |
| `STAGE_START` | Stage 开始 |
| `STAGE_COMPLETE` | Stage 完成 |
| `PROBE_RESULT` | Probe 执行结果 |
| `TASK_STATUS` | 任务状态变更 |

### 6.2 增强字段

当前 `PROBE_RESULT` 事件包含以下字段：

| 字段 | 描述 |
|------|------|
| `probeType` | Probe 类型 |
| `params` | 实际使用的参数 |
| `result` | PASSED / FAILED |
| `actual` | 结构化的实际观测值 |
| `failureMessage` | 脱敏后的失败消息 |
| `duration` | 执行耗时(ms) |
| `output` | 原始输出（保留） |
| `error` | 错误信息（保留） |

---

## 七、Skills

AI 助手可通过以下 Skill 与 OpenXenon 交互：

| Skill | 描述 |
|-------|------|
| `/oxn-init` | 初始化项目围栏 |
| `/oxn-task` | 发起和管理任务 |
| `/oxn-forge` | 生成 Draft 标准资产 |
| `/oxn-arsenal` | 查看和管理 Arsenal 资产 |
| `/oxn-explore` | 探索项目与任务 |
| `/oxn-trace` | 查看任务执行轨迹 |
| `/oxn-status` | 查看项目状态 |
| `/oxn-resume` | 恢复中断的任务 |
| `/oxn-stop` | 停止任务执行 |

---

## 八、架构原则

### 8.1 Kernel 零副作用

Kernel 层（`src/kernel/`）的函数必须是纯函数，不能直接访问文件系统或网络。

### 8.2 函数式优于面向对象

使用 TypeScript type 别名和 Record 函数表，不使用 class 或 interface。

### 8.3 认知闭环优先于自动化

闭环是工程师大脑里的，不是自动流。0.1 阶段强制要求工程师手动介入。

---

## 九、已完成的 0.1 实施步骤

根据 OpenXenon 0.1 实施指导书，以下步骤已完成：

| 步骤 | 描述 | 状态 |
|------|------|------|
| 1 | Kernel 宪法修复 | ✅ |
| 2 | Probe ref 实现 | ✅ |
| 3 | Trace Schema 增强 | ✅ |
| 4 | BlueprintCompiler 纯函数拆分 | ✅ |
| 5 | CLI 命令树重构 | ✅ |

---

## 十、常见问题

### Q: 如何添加新的 Probe 类型？

1. 在 `src/kernel/probes/evaluator.ts` 的 `probeStrategies` 对象中添加新的策略函数
2. 确保函数签名：`type ProbeStrategy = (observation, params) => ProbeVerdict`

### Q: 如何创建自定义 Stage？

1. 使用 `oxn forge stage` 获取元 Forge 约束
2. 生成 YAML 并保存为 Draft
3. 审查后使用 `oxn arsenal promote` 转正

### Q: Blueprint 中的 `ref` 引用优先级？

1. 项目级 Arsenal
2. 全局级 Arsenal
3. 内置 Arsenal（`oxn/` 前缀）

---

*最后更新: 2026-05-17*