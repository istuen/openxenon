---
name: oxn-task
description: 发起 OpenXenon 任务，依据 Target State 拆解并提交 Blueprint
---
# /oxn-task — 发起 OpenXenon 任务

## 行为约束

当你收到 `/oxn-task <需求>` 指令时，必须严格按以下步骤执行，禁止自由发挥。

## 步骤 1：初始化项目围栏（如需要）

在终端执行以下命令确保项目围栏存在：

```bash
oxn init
```

## 步骤 2：列出可用资产

使用 CLI 命令列出可用的 Part/Probe 资产：

```bash
oxn arsenal list
```

该命令返回当前项目可用的 Arsenal 资产列表。

## 步骤 3：创建任务

使用 CLI 命令创建新任务：

```bash
oxn task new <task-id> --name <任务显示名称> [--blueprint <blueprint-name>]
```

- `<task-id>` 必须是 kebab-case（如 my-task-001）
- `--name` 可选，默认与 task-id 相同
- `--blueprint` 可选，指定要引用的 Blueprint 名称

创建后会在 `.openxenon/tasks/<task-id>/` 下生成 `task.oxn` 文件。

## 步骤 4：拆解任务

基于用户需求和可用资产列表，按照 Target State 理念拆解任务：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Part slot
3. 为每个 Part 选择合适的 Probe

## 步骤 5：编辑 task.oxn

task.oxn 是任务的核心定义文件，格式如下：

```oxn
task "my-task" {
  blueprint "new-task-flow"  // 引用已有 Blueprint
}
```

如果创建时没有指定 `--blueprint`，需要手动编辑 task.oxn 添加 blueprint 引用。

## 步骤 5.1：创建任务描述文档

在提交前，先创建任务描述文档 `.openxenon/tasks/<task-id>/task.md`：

```markdown
# <任务名称>

## 目标
<工程师期望达成的最终状态>

## 背景
<为什么需要这个任务，有什么约束条件>

## 执行计划
<拆解的 Part slot 列表和各自目标>

## 验收标准
<工程师如何判断任务成功完成>
```

## 步骤 6：提交任务

将 task.oxn 提交并生成 frozen.json：

```bash
oxn task submit --task-id <task-id>
```

该命令会读取 task.oxn，从 Arsenal 加载 Blueprint，生成 frozen.json。

## 步骤 7：获取下一个 Part

```bash
oxn task next --task-id <taskId>
```

## 步骤 8：执行并验证

1. AI 执行 Part 定义的工作
2. 执行完成后，提交验证：

```bash
oxn task verify --task-id <taskId> --part-id <partId>
```

## 步骤 9：循环直到完成

重复步骤 7-8，直到所有 Part 通过验证。

## 参考

需要 Blueprint 详细格式说明时，读取：
- references/blueprint-format.md：格式说明 + 命令用法 + 完整示例

## 绝对禁止

- 禁止跳过任何步骤
- 禁止使用 HTTP/curl 调用，必须使用 CLI 命令
- 禁止在未通过 Core 验证的情况下自行推进任务