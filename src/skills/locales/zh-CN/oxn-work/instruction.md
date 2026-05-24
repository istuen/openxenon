# /oxn-work — 发起 OpenXenon Work

## 行为约束

当你收到 `/oxn-work <需求>` 指令时，必须严格按以下步骤执行，禁止自由发挥。

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

## 步骤 3：创建 Work

使用 CLI 命令创建新 Work：

```bash
oxn work new <work-id> --name <工作显示名称> --type <类型> --blueprint <blueprint-name>
```

- `<work-id>` 必须是 kebab-case（如 my-work-001）
- `--type` 指定 Work 类型（如 `task`、`plan`、`flow`）
- `--blueprint` 指定要引用的 Blueprint 名称（如 `new-work-flow`）

CLI 会自动生成 `work.oxn` 文件到 `.openxenon/work/<type>/` 目录。

## 步骤 4：拆解 Work

基于用户需求和可用资产列表，按照 Target State 理念拆解 Work：

1. 确定最终目标状态（Target State）
2. 逆向推导所需的中间 Part slot
3. 为每个 Part 选择合适的 Probe

## 步骤 5：编辑 work.oxn（可选）

如果需要填充 Blueprint 中的 slot，编辑 `.openxenon/work/<type>/<work-id>/work.oxn`：

```oxn
work "my-work" type "task" ref "@prj/blueprints/new-work-flow" {
  part slot "develop" { }
}
```

## 步骤 5.1：创建工作描述文档

在提交前，先创建工作描述文档 `.openxenon/work/<type>/<work-id>/work.md`：

```markdown
# <工作名称>

## 目标
<工程师期望达成的最终状态>

## 背景
<为什么需要这个工作，有什么约束条件>

## 执行计划
<拆解的 Part slot 列表和各自目标>

## 验收标准
<工程师如何判断工作成功完成>
```

## 步骤 6：恢复 Work

使用 `work resume` 获取下一个待处理的 Part：

```bash
oxn work resume <work-id>
```

## 步骤 7：执行并验证

1. AI 执行 Part 定义的工作
2. 执行完成后，标记 Work 完成：

```bash
oxn work complete <work-id>
```

## 步骤 8：循环直到完成

重复步骤 6-7，直到所有 Part 通过验证。

## 参考

需要 Blueprint 详细格式说明时，读取：
- references/blueprint-format.md：格式说明 + 命令用法 + 完整示例

## 绝对禁止

- 禁止跳过任何步骤
- 禁止使用 HTTP/curl 调用，必须使用 CLI 命令
- 禁止在未通过 Core 验证的情况下自行推进 Work