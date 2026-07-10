---
title: CLI 参考
---

# CLI 参考

> `oxn` 是工程师与 AI 操作 OpenXenon 的唯一入口。所有命令以 `oxn` 为前缀。

## 全局选项

| 选项 | 描述 |
|---|---|
| `-v, --verbose` | 详细输出 |
| `-j, --json` | JSON 格式输出 |
| `-y, --yaml` | YAML 格式输出 |
| `--help` | 帮助信息 |

## 项目级 vs 全局

| 范围 | 用法 | 作用 |
|---|---|---|
| 项目级 | `oxn <command>` | 操作当前项目 `.openxenon/` |
| 全局 | `oxn global <command>` | 操作 `~/.openxenon/`（跨项目共享） |

> AI agent 应使用项目级命令。全局命令主要为工程师使用。

---

## 初始化

### `oxn init`

初始化项目，创建 `.openxenon/` 边界。

```bash
oxn init
oxn init --ai cursor     # 生成 Cursor Skill
oxn init --ai opencode   # 生成 OpenCode Skill
oxn init --ai codex      # 生成 Codex Skill
```

---

## Proof 命令（Proof-First 入口）

| 命令 | 作用 |
|---|---|
| `oxn proof create <name>` | 创建 Proof 空间 |
| `oxn proof probe add <probe> --target <path>` | 添加 Probe |
| `oxn proof run <name>` | 运行证明，产出 frozen.json |
| `oxn proof list` | 列出所有 Proof |
| `oxn proof show <name>` | 查看指定 Proof 详情 |

见 [Proof](./proof.md) 了解 Proof 轴完整概念。

---

## Work 命令（v1.1 完整流程）

### 生命周期

> **v0.6.1+**：新 `oxn work create` 默认写 `works/<n>/work.md`（canonical .md），同时保留 `.oxn` 作 v0.6.x fallback；
> 切回 .oxn 写：加 flag `--oxn-legacy`。

| 命令 | 作用 |
|---|---|
| `oxn work create <id> --blueprint <bp>` | 创建 Work 骨架（默认 .md）|
| `oxn work add-task --work <w> --task-name <t> --blueprint <bp> [--domain <d>]` | 创建 Task |
| `oxn work validate <w> [--json]` | 校验 work.oxn + 写 .work 门禁卡 |
| `oxn work lock <w> [--json]` | 锁 work（planLock + 4 组件 hash） |
| `oxn work unlock <w>` | 解锁 work |
| `oxn work run --work-file <path> [--json]` | 启动状态机 |
| `oxn work submit --work <w> --task <t> [--json]` | 推进 task 内 part |
| `oxn work status --work <w> [--json]` | 查询 work 状态 |
| `oxn work complete --work-name <w>` | 完成 work |

### 列表与查看

| 命令 | 作用 |
|---|---|
| `oxn work list` | 列出所有 Work |
| `oxn work list-tasks --work <w>` | 列出 Work 下所有 Task |
| `oxn work task-status --work <w> --task <t>` | 查看单 Task 状态 |
| `oxn work context --work <w> --task <t> [--json]` | 获取 AI 可见上下文 |

### 其他

| 命令 | 作用 |
|---|---|
| `oxn work task-edit --work <w> --task <t> [--objective S]` | 编辑 Task |
| `oxn work task-delete --work <w> --task <t> --force` | 删除 Task |
| `oxn work migrate [--dry-run] [--work-name <w>]` | V0→V1 布局迁移 |
| `oxn work resume --work-name <w>` | 恢复 work |

见 [Align](./align.md) 了解 v1.1 8 阶段流程。

---

## Intent 命令

### Blueprint

| 命令 | 作用 |
|---|---|
| `oxn blueprint create <name> [--slots <list>]` | 创建 Blueprint 骨架 |
| `oxn blueprint validate <name>` | 校验 Blueprint |
| `oxn blueprint list` | 列出所有 Blueprint |

### Domain

| 命令 | 作用 |
|---|---|
| `oxn domain create <DomainName>` | 创建 Domain 骨架（默认 .md，可加 `--oxn-legacy`）|
| `oxn domain validate <DomainName>` | 校验 Domain |
| `oxn domain list` | 列出所有 Domain |
| `oxn domain sync --all` | **v0.6.1**：批量 .oxn → .md 同步（保留 .oxn 作 v0.6.x fallback）|

### Asset 路径查找（v0.6.1）

CLI 解析 Asset 时按以下顺序：
1. `<primary>/<name>.md`     — v0.6 canonical
2. `<primary>/<name>.oxn`    — v0.6.x fallback（v0.7.0 切割）
3. `<fallback>/<name>.md`   — v0.5 layout .md（如果存在）
4. `<fallback>/<name>.oxn`  — v0.5 legacy（兼容期）

观察 .oxn 数量：`bun run check:md-fallback`

见 [Intent](./intent.md) 了解 Domain + Blueprint 完整语法。

---

## External 状态管理（v0.6.1-alpha.4）

External inline 声明（Domain/Workflow/Stack body 内 `## Externals`）的可用性状态管理：

### `oxn external check`

扫描所有边界类型文件（Domain/Workflow/Stack）中的 `## Externals` 声明，检查每个 external 的 url/path 可达性，更新 `.openxenon/.cache/external-status.json`。

```bash
oxn external check              # 检查所有 external
oxn external check --name "stripe-api"  # 只检查指定 external
```

**4 状态值**：
- `available`：资源可达 / 文件存在
- `unavailable`：资源不可达 / 文件不存在
- `stale`：TTL 过期
- `unknown`：尚未检测

输出示例：

```
Scanned 3 externals:
  available:   2
  unavailable: 1
  stale:       0

  [available  ] domain::TestDomain::local-doc
  [unavailable] domain::TestDomain::stripe-api — Unable to connect. Is the computer able to access the url?
  [available  ] domain::TestDomain::invalid-kind
```

### `oxn external status`

显示 `.openxenon/.cache/external-status.json` 当前所有 external 状态。

```bash
oxn external status             # human-readable
oxn external status --json      # JSON 输出
```

### `oxn external mark`

手动标记某条 external 的 status（不检查可达性）。

```bash
oxn external mark --name "stripe-api" --status stale --reason "API 维护中"
```

**status 取值**：`available` | `unavailable` | `stale` | `unknown`

详见 [ADR-0056 External inline + 状态管理](./.openxenon/docs/adrs/0056-external-inline-and-status.md)。

---

## 开发者命令

| 命令 | 作用 |
|---|---|
| `oxn dev compile <file.oxn> [-o DIR]` | 编译 .oxn 文件 |
| `oxn dev unpack <file.bundle.oxn> [-o DIR]` | 解包 bundle |
| `oxn dev validate [--standard]` | 标准校验 |
| `oxn dev migrate-yaml <file> [--all]` | YAML 迁移 |
| `oxn dev promote <task-dir> [--as-new N]` | Promote 资产 |

---

## Skill 初始化

```bash
oxn init --ai opencode      # 生成 OpenCode Skill（一键初始化）
oxn init --ai claude        # Claude Code Skill
```

> v0.6+ 统一 Skill：`/oxn-work`（IAP 范式统一入口）。原 `/oxn-proof`、`/oxn-cli` 已删除。

---

## 退出码

| 退出码 | 含义 |
|---|---|
| 0 | 成功 |
| 1 | IAPError — 可恢复的业务错误（JSON 输出到 stdout） |
| 2 | OXNCrash — 不可恢复的系统错误（输出到 stderr） |

### AI 消费 IAPError

当 CLI 以退出码 1 返回时，JSON 输出格式：

```json
{
  "error": {
    "type": "IAPError",
    "code": "IAP_ALIGN_LOCK_HASH_MISMATCH",
    "message": "work.oxn 已漂移：hash 不匹配",
    "context": { "component": "workOxn", "locked": "...", "current": "..." },
    "action": "YIELD_TO_HUMAN"
  }
}
```

---

## 错误码速查

| Code | 含义 | 行动 |
|---|---|---|
| `OXN_NO_PROJECT` | 项目未初始化 | `oxn init` |
| `OXN_INVALID_NAME` | 名称格式错误 | 用 kebab-case / PascalCase |
| `OXN_TASK_OXN_MISSING` | task.oxn 缺失 | `oxn work add-task` |
| `OXN_TASK_NOT_FOUND` | task 未找到 | 先 `oxn work run` |
| `OXN_BLUEPRINT_NOT_IN_WORK` | blueprint 未在 work.oxn 声明 | 改 work.oxn |
| `OXN_DOMAIN_NOT_IN_WORK` | domain 未在 work.oxn 声明 | 改 work.oxn |
| `OXN_DSL_PARSE_FAILED` | .oxn 语法错误 | 看错误信息修正 |
| `OXN_WORK_ALREADY_EXISTS` | 重复 run | 用 status 看现有 |
| `OXN_WORK_NOT_FOUND` | work 未找到 | 确认 work 名 |
| `IAP_ALIGN_LOCK_NOT_FOUND` | .work.planLock 缺失 | 先 `oxn work lock` |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | 锁后资产漂移 | 检查漂移源，或 unlock → 重锁 |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn 失踪 | YIELD_TO_HUMAN |

---

## 典型工作流

```bash
# CLI 参考
oxn init

# CLI 参考
oxn domain create MemberContext
# CLI 参考
oxn domain validate MemberContext

# CLI 参考
oxn blueprint create dev-workflow --slots build,test
oxn blueprint validate dev-workflow

# CLI 参考
oxn work create onboarding --blueprint dev-workflow

# CLI 参考
oxn work add-task --work onboarding --task-name register \
  --blueprint dev-workflow --domain MemberContext

# CLI 参考
oxn work validate onboarding --json
oxn work lock onboarding --json

# CLI 参考
oxn work context --work onboarding --task register --json

# CLI 参考
oxn work run onboarding --json
oxn work submit --work onboarding --task register --json

# CLI 参考
oxn work status --work onboarding --json
```

## → 参考

- [Quickstart](./quickstart.md) — Proof-First 入门
- [Align](./align.md) — v1.1 8 阶段详解
