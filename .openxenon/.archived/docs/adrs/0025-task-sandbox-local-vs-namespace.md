# ADR-0025: Task 沙箱豁免 + `./` vs `@` namespace 纪律

> **来源**：`docs_tmp/task-oxn-2.md`, `task-oxn-3.md` (2026-05-22)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L2-Work / L2-Builtin

## 决策

### Task 沙箱豁免

`works/<w>/task.oxn` 是 Work 入口，**允许包含本地 Part / Probe 定义**（不强制全部从 Arsenal 引用）。

```oxl
task "my-task" {
  blueprint ref "@prj/blueprints/dev-workflow"
  
  // ✅ 允许：本地 inline Part（仅在 Work 内可见）
  part "local-validator" { ... }
}
```

### 命名空间纪律

| 前缀 | 含义 | 例 |
|---|---|---|
| `./` | Work 沙箱内本地 | `./local-validator` |
| `@oxn/` | builtin | `@oxn/probe/fs-exists` |
| `@prj/` | 项目级 | `@prj/blueprints/dev-workflow` |
| `@gbl/` | 用户全局 | `@gbl/part/my-helper` |

**禁止** `@task/` 前缀（避免 namespace 膨胀）。

### 零拷贝覆写

`task.oxn` 不是 Blueprint fork，而是 **patch**：继承 Blueprint，本地覆写优先。OXL 编译时合并。

## 后果

- ✅ Work 期间 AI 可快速定义本地 Part（无需先建资产）
- ✅ namespace 简洁（3 种 + 本地）
- ✅ 本地 Part 不污染 Global Arsenal

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-22-task-oxn-2.md`