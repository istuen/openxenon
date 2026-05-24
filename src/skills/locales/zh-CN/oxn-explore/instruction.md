# /oxn-explore — 探索模式

## 行为约束

当你收到 `/oxn-explore <name>` 指令时，使用 oxn work 命令执行探索流程。

## 流程

```
init → next → execute → verify → (repeat) → complete
```

## 步骤 1：创建探索 Work

在终端执行以下命令创建新探索 Work：

```bash
oxn work init <name> --type explore --blueprint explore-flow
```

这会在 `.openxenon/work/explore/<name>.oxn` 创建 work 文件：

```oxn
work "<name>" type "explore" ref "@prj/blueprints/explore-flow" {
  part slot[] "scan" { }
  part slot[] "qa" { }
  part slot[] "report" { }
}
```

数据存储在 `.openxenon/explores/<name>/`（保持与旧命令兼容）：
- `docs/` - 扫描的资料文档
- `ai-qa.json` - AI 问答记录
- `engineer-qa.json` - 工程师问答记录
- `report.md` - 最终报告

## 步骤 2：获取下一个 Part

```bash
oxn work next --work-id <name> --type explore
```

返回当前需要执行的 part（scan → qa → report）。

## 步骤 3：执行 Part

根据返回的 part 执行相应工作：

### Scan Slot

扫描资料到 `.openxenon/explores/<name>/docs/`：

```bash
oxn explore scan --name <name> --path <文件或目录>
```

### QA Slot

进行 AI-工程师问答：

```bash
oxn explore qa <name> --type ai --ask "问题内容"
oxn explore qa <name> --type engineer --ask "问题内容"
```

查看待回答问题：

```bash
oxn explore qa <name> --type ai --pending
oxn explore qa <name> --type engineer --pending
```

记录回答：

```bash
oxn explore qa <name> --type ai --answer id|回答内容
```

### Report Slot

生成报告：

```bash
oxn explore report <name>
```

## 步骤 4：验证 Part

```bash
oxn work verify --work-id <name> --part-id <part-id>
```

## 步骤 5：循环直到完成

重复步骤 2-4，直到所有 part 通过验证。

## 其他命令

### 列出所有探索 Work

```bash
oxn work list
```

### 查看探索状态

```bash
oxn explore list
```

### 删除探索

```bash
oxn explore delete <name>
```

## 绝对禁止

- 禁止在未创建 work 前进行操作
- 禁止跳过 scan 直接进行 qa
- 禁止 AI 未阅读资料就提问
- 禁止一次性读取所有 docs/* 文件

## 旧命令兼容

以下旧命令仍然可用（已标记为 DEPRECATED）：

- `oxn explore new <name>` — 推荐使用 `oxn work init <name> --type explore`
- `oxn explore scan --name <name> --path <path>`
- `oxn explore qa <name> ...`
- `oxn explore report <name>`
- `oxn explore list`
- `oxn explore delete <name>`

数据路径保持不变，都在 `.openxenon/explores/<name>/` 下。