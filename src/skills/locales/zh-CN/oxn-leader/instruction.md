# /oxn-leader — 驱动 OpenXenon Work 状态机

## 目标
作为 AI Agent，使用 `oxn leader` 命令驱动一个 Work 的状态机：生成 work 文件、启动状态机、提交证据、读取状态。

> **本 skill 由 `oxn init` 自动编译到 `.opencode/skills/oxn-leader/SKILL.md`**。同时由 `oxn install-skill` 嵌入到编译后的 binary 中，可在任何项目里通过 `oxn install-skill --force` 更新。

## 前置条件
- 必须在 OXN 项目根目录下执行（已运行 `oxn init`）
- 必须有 Blueprint（参见 `/oxn-forge` 或手写在 `.openxenon/blueprints/<name>.oxn`）

## 核心循环（三阶段）

### 阶段 1: `run` — 启动 work 状态机

```bash
oxn leader run --work-file <path-to-work.oxn> --json
```

读取响应中的 `skillContext.overallGoal`、`skillContext.constraints`、`currentFocus` 和 `parts[].stepSkillContext`。

### 阶段 2: Act — 执行当前 part 的 objective

按照 `parts[].stepSkillContext.objective` 描述的步骤执行（读文件、写代码、跑命令等）。
**严格遵守 `skillContext.constraints` 中列出的所有硬性约束**。

### 阶段 3: `submit` — 提交证据，推进状态机

```bash
# 基础版（mvp 风格）
oxn leader submit --work-name <name> --json

# 带探针执行（reference 风格验证）
oxn leader submit --work-name <name> --run-probes --json
```

**`--run-probes` 标志**：让 CLI 自动执行该 part 在 `observe = [...]` 中声明的探针，结果持久化到 `state.json` 的 `partExecutions[].probes` 字段。

### 循环直到

- `overallStatus === "passed"` → 任务完成，`frozen` 字段含 frozen.json 路径
- `loopMeta.iteration >= loopMeta.maxIterations` → 达到用户定义的循环上限
- `overallStatus === "failed" | "error"` → 不可恢复，停下来报告用户

## 子命令速查

| 子命令 | 用途 |
|--------|------|
| `new` | 从蓝图生成 work.oxn 骨架（默认找 `.openxenon/blueprints/<name>.oxn`） |
| `run` | 启动 work 状态机 |
| `submit` | 推进 part；`--run-probes` 可触发探针 |
| `status` | 读 work 当前状态 |
| `start` | (reference 别名) 复制内置 `ldr-*.oxn` 模板 |
| `next` | (reference 别名) = `submit --run-probes` |
| `list` | (reference 别名) 列出内置 ldr 模板 |

## 项目级配置 `.oxnrc`

可写 `.oxnrc` 来 pin 项目使用的 leader 模式（统一后 mvp/reference 等价）：

```json
{ "version": 1, "leaderMode": "reference" }
```

优先级链：`--leader-mode` CLI flag > `OXN_LEADER_MODE` env > `.oxnrc` > 默认 `reference`

## 反模式

- **不要忽略 `constraints`** —— 硬性规则，不是建议
- **不要在脑里读 `stepSkillContext` 就行动** —— 必须真正执行（读文件、跑命令等）
- **不要无限循环** —— 尊重 `loopMeta.maxIterations`
- **不要绕过 JSON** —— 总是用 `--json` 解析
- **不要直接编辑 `.openxenon/`** —— 让 CLI 统一管理
- **不要找 `parts.oxn` 文件** —— 统一后只有 `work.oxn`，part 实体已内联

## 错误码速查

| Code | 含义 | 修复 |
|------|------|------|
| `OXN_FILE_NOT_FOUND` | 蓝图或 .oxn 文件不存在 | 创建蓝图或用 `--blueprint-file` |
| `OXN_DSL_PARSE_FAILED` | .oxn 语法错 | 给用户看错误，让 ta 修 |
| `OXN_WORK_ALREADY_EXISTS` | 重复 run | 用 `leader status` 看现有状态 |
| `OXN_WORK_NOT_FOUND` | 提交/查询不存在的 work | 确认 work 名 |
| `OXN_NO_BLUEPRINT` | `new` 找不到 blueprint 声明 | 传 `--blueprint-file` |
| `OXN_INVALID_BLUEPRINT` | blueprint 缺 name/slot | 修 blueprint |
| `OXN_OUTPUT_DIR_EXISTS` | 输出目录已存在 | `--force` 或 `--output-dir` |

## 完成标准

`overallStatus === "passed"` 时 → **停下来告诉用户 `frozen.json` 路径**，让 ta 审查。
你是 AI agent，不是验证者。探针由 kernel 跑，你只负责 submit。
