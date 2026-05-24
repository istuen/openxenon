# /oxn-plan — 规划模式

## 行为约束

当你收到 `/oxn-plan <name>` 指令时，使用 oxn work 命令执行规划流程。

## 流程

```
init → next → execute → verify → (repeat) → complete
```

## 步骤 1：创建规划 Work

在终端执行以下命令创建新规划 Work：

```bash
oxn work init <name> --type plan --blueprint plan-flow
```

这会在 `.openxenon/work/plan/<name>.oxn` 创建 work 文件：

```oxn
work "<name>" type "plan" ref "@prj/blueprints/plan-flow" {
  part slots[] "analyze" { }
  part slots[] "design" { }
  part slots[] "estimate" { }
  part slots[] "review" { }
}
```

数据存储在 `.openxenon/plans/<name>/`：
- `requirements.md` - 需求分析
- `design.md` - 技术方案设计
- `estimate.md` - 工作量估算
- `review.md` - 评审记录

## 步骤 2：获取下一个 Part

```bash
oxn work next --work-id <name> --type plan
```

返回当前需要执行的 part（analyze → design → estimate → review）。

## 步骤 3：执行 Part

根据返回的 part 执行相应工作：

### Analyze Slot

收集需求信息和约束条件，编辑 `.openxenon/plans/<name>/requirements.md`。

### Design Slot

进行技术方案设计，编辑 `.openxenon/plans/<name>/design.md`。

### Estimate Slot

评估工作量和资源需求，编辑 `.openxenon/plans/<name>/estimate.md`。

### Review Slot

最终评审确认，编辑 `.openxenon/plans/<name>/review.md`。

## 步骤 4：验证 Part

```bash
oxn work verify --work-id <name> --part-id <part-id>
```

## 步骤 5：循环直到完成

重复步骤 2-4，直到所有 part 通过验证。

## 其他命令

### 列出所有规划 Work

```bash
oxn work list
```

### 查看规划状态

```bash
oxn plan list
```

## Blueprint 格式说明

规划 Blueprint 使用 `slots[]` 表示多实例 Slot（每个阶段可独立执行）：

```oxn
blueprint "plan-flow" type "plan" {
  version = 1

  part slots[] "analyze" {
    deps = []
  }
  part slots[] "design" {
    deps = ["analyze"]
  }
  part slots[] "estimate" {
    deps = ["design"]
  }
  part slots[] "review" {
    deps = ["estimate"]
  }
}
```

## 绝对禁止

- 禁止在未创建 work 前进行操作
- 禁止跳过 analyze 直接进行 design
- 禁止未完成 estimate 直接进行 review