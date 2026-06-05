# /oxn-leader — 驱动 OpenXenon Work 状态机

## 目标

作为 AI Agent，使用 `oxn leader` 命令驱动一个 **Work + Task** 双层状态机：
- **work.oxn 级**：workspace 编排（ref 池 + task DAG）
- **task.oxn 级**：单 Blueprint 执行 + 显式 align 到 Domain

> **与 `/oxn-work` 的关系**：本 skill 教 AI 怎么 **驱动** 状态机。`/oxn-work` 教 AI 怎么 **创建** work + task。两者互补。

## 前置条件

- 已在 OXN 项目根目录（已运行 `oxn init`）
- 已有 Blueprint（`.openxenon/blueprints/<name>.oxn`）
- **已用 `oxn work task new` 为 work 创建了至少一个 task**

## Intent-Align 范式提醒

- Part align 到 Blueprint 的 slot
- Task align 到 Blueprint（1 个）+ 显式声明参与的 Domain（N 个）
- AI 通过 `get-context` 只看 task align 到的 domain（**全量隔离**）

## 核心循环（四阶段）

### 阶段 0：准备（每次 submit 前必做）

```bash
oxn get-context --work <work-name> --task <task-name> --json
```

读取响应中的：
- `injectedDomains[].name` — 参与本 task 的 domain
- `allowedLanguage.mustUseTerms` / `banned` — 必须用 / 禁用的词
- `taskParts[].name` + `skillContext` — 当前 task 的 part 列表

### 阶段 1：`run` — 启动 workspace 状态机

```bash
oxn leader run --work-file <path-to-work.oxn> --json
```

会做三件事：
1. 校验 work.oxn 声明的所有 task 都已建 task.oxn（fail-fast：`OXN_TASK_OXN_MISSING`）
2. 写 `works/<w>/state.json`（workspace 级 state）
3. 为每个 task 写 `works/<w>/tasks/<t>/state.json`（task 级 state）

读取响应中的 `tasks[]`，每个 task 含 `taskName / status / currentPart / partCount`。

### 阶段 2：Act — 执行当前 task 的当前 part

按 `taskParts[].name` 顺序推进：
- 读 `task.oxn` 内 `part "X" { skill_context = "..." }` 的指令
- 在文件系统中执行（读源码、写代码、跑测试）
- 严格遵守 `allowedLanguage` 里的硬约束

### 阶段 3：`submit` — 提交证据，推进 task 状态机

```bash
oxn leader submit --work-name <work-name> --task <task-name> [--run-probes] --json
```

会做：
1. 推进当前 part 到 completedParts
2. 写 task 级 state + workspace 级索引同步
3. 写 task 级 trace（`works/<w>/tasks/<t>/work-trace.jsonl`）
4. 当 task 所有 part 完成 → 写 `works/<w>/tasks/<t>/frozen.json`

### 阶段 4：`status` — 查询进度

```bash
oxn leader status --work-name <work-name> --json
```

返回示例：
```json
{
  "workName": "fix-issue",
  "workspace": { "status": "running", "taskCount": 4 },
  "tasks": [
    { "taskName": "diagnose", "status": "passed" },
    { "taskName": "locate",   "status": "running", "currentPart": "locate" },
    { "taskName": "fix",      "status": "pending" },
    { "taskName": "verify",   "status": "pending" }
  ]
}
```

### 循环直到

- `workspace.status === "passed"` → 全部 task 完成
- `loopMeta.iteration >= loopMeta.maxIterations` → 达到循环上限
- `workspace.status === "failed"` → 某个 task probe 失败

## 子命令速查

| 子命令 | 用途 | v0.1 行为 |
|---|---|---|
| `new` | 从 Blueprint 生成 work.oxn 骨架 | 生成 work.oxn（含 ref 池占位） |
| `run` | 启动 workspace + 每 task 状态机 | fail-fast 校验 task.oxn 齐备 |
| `submit` | 推进 task 内的 part | `--task` 必填 |
| `status` | 读 workspace 状态 | `tasks[]` 分解 |
| `start` | 复制内置 ldr-*.oxn 模板 | 兼容 |
| `next` | (alias) = `submit --run-probes` | 兼容（仍需 --task） |
| `list` | 列出内置 ldr 模板 | 兼容 |

## 错误码速查

| Code | 含义 | 修复 |
|---|---|---|
| `OXN_TASK_OXN_MISSING` | work 声明了 N 个 task 但 task.oxn 缺 | `oxn work task new --work X --task Y --blueprint B` |
| `OXN_TASK_NOT_FOUND` | submit 时 task 没启动 | 先 `oxn leader run` |
| `OXN_BLUEPRINT_NOT_IN_WORK` | work.oxn 没 ref 该 blueprint | 改 work.oxn |
| `OXN_DOMAIN_NOT_IN_WORK` | work.oxn 没 ref 该 domain | 改 work.oxn |
| `OXN_FILE_NOT_FOUND` | 蓝图或 work.oxn 不存在 | 创建或指定路径 |
| `OXN_DSL_PARSE_FAILED` | .oxn 语法错 | 看错误信息修正 |
| `OXN_WORK_ALREADY_EXISTS` | 重复 run | 用 `status` 看现有 |
| `OXN_WORK_NOT_FOUND` | submit/status 找不到 work | 确认 work 名 |

## 完成标准

当 `workspace.status === "passed"` 时：
1. **停下来告诉用户每个 task 的 frozen.json 路径**（`works/<w>/tasks/<t>/frozen.json`）
2. 让 ta 审查

你是 AI agent，不是验证者。Probe 由 kernel 跑（v0.2 接入），你只负责 submit。
