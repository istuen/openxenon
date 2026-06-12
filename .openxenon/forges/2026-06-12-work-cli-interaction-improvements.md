# Work CLI 交互改进: 结构化路径获取 + 手写验证

> 日期: 2026-06-12
> 相关: `src/cli/work.ts`、`.opencode/skills/oxn-work/SKILL.md`

---

## 1. 动机

PR-1 工作流中暴露了一个操作缺陷：AI Agent 使用 `write` 工具时产生了 typo path（`.openxernon/`），原因是写路径时靠"猜"而非从 CLI 获取权威信息。根本原因：

- AI 没有**结构化的方式**从 CLI 获取 task.oxn 的绝对路径
- AI 手写 task.oxn 后**没有验证步骤**确认路径正确
- Skill 流程缺少"先查路径再落笔"的交互步骤

## 2. 改进方案

### 2.1 `list-task --path`（已完成）

原有 `list-task` 只输出 `name` / `blueprint` / `domain`，现在每个条目增加 `file` 字段（task.oxn 绝对路径）。

```json
{
  "tasks": [
    {
      "name": "diagnose",
      "file": "/Users/.../.openxenon/works/i18n-pr1-version-sync/tasks/diagnose/task.oxn",
      "blueprint": "fix-issue",
      "domain": "WorkContext"
    }
  ]
}
```

Human 输出也追加一行 `Path: /path/to/task.oxn`。

### 2.2 `verify-task-path` 新子命令（已实现）

验证手写后的 task.oxn 路径是否属于指定 work：

```
oxn work verify-task-path --work <name> <path>
```

校验链：
1. 文件是否存在
2. 文件名是否为 `task.oxn`
3. 父目录是否属于 work 的 `tasks/` 目录
4. 解析 task/blueprint/domain/partCount

输出示例：
```
✅ 路径验证通过
Work:     i18n-pr1-version-sync
Task:     diagnose
Dir:      diagnose
Blueprint: fix-issue
Domain:    WorkContext
Parts:     1
Path:      /Users/.../.openxenon/works/.../task.oxn
```

### 2.3 Skill 流程增强

见 `.opencode/skills/oxn-work/SKILL.md` 第 6 节《交互工作流》下方。

## 3. 使用流程（Skill 需嵌入）

原流程：
```
1. AI 收到 "写 task.oxn" 指令
2. AI 猜测路径 → write 工具写入
3. （无验证）→ 可能拼错
```

新流程：
```
1. AI 收到 "写 task.oxn" 指令
2. → 执行 `oxn work list-task <work> --json`
3. → 从返回的 `file` 字段获取权威绝对路径
4. → 用权威路径调用 write 工具写入内容
5. → 执行 `oxn work verify-task-path --work <name> <path>` 确认
6. → 确认后继续下一步
```

## 4. 未来可加项

- `verify-task-path --show-content`：显示 task.oxn 部分内容
- `edit-task --part-context`：直接改 skill_context 而不需要整文件重写
- `list-task --path-only`：只返回路径列表，方便脚本管道

## 5. ADRs

- **ADR-1**: `verify-task-path` 独立于 `edit-task`，因为验证是只读操作，不需要 P1 守卫
- **ADR-2**: path resolve 支持相对路径（相对项目根目录），但建议 AI 始终使用绝对路径
- **ADR-3**: 不在 `verify-task-path` 内做写操作（不修改文件），保持职责单一

## 6. 影响范围

| 文件 | 变更 |
|---|---|
| `src/cli/work.ts` | list-task 增加 `file` 字段；新增 `verify-task-path` 子命令 + 顶部描述更新 |
| `.opencode/skills/oxn-work/SKILL.md` | 增加"交互工作流"章节 |
| CI | 无影响（只读子命令） |
| Work v1.1 阶段 | `verify-task-path` 无阶段守卫，任意阶段可用 |
