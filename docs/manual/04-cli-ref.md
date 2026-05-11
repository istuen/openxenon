# 3. CLI 命令参考

## oxn init

初始化项目，在当前目录创建 `.openxenon` 围栏。

```bash
oxn init
```

**输出示例：**

```
[OXN] 初始化项目围栏...
[OXN] 项目围栏已创建: /path/to/project/.openxenon/
[OXN] 初始化完成！
```

## oxn task

Task 相关命令的入口。

```bash
oxn task <subcommand>
```

### oxn task new

输出 Task JSON 模板（不创建实际任务）。

```bash
oxn task new
```

### oxn task list

列出所有已登记的任务。

```bash
oxn task list
```

### oxn task show

查看指定任务的 Blueprint 内容。

```bash
oxn task show <task-id> [--project <path>]
```

**参数：**

- `task-id`：任务 ID
- `--project`：项目路径（默认：当前目录）

### oxn task submit

提交任务到 Core 进行追踪。

```bash
oxn task submit <task-id> [--project <path>]
```

**参数：**

- `task-id`：任务 ID
- `--project`：项目路径（默认：当前目录）

### oxn task status

查询任务状态。

```bash
oxn task status <task-id> [--project <path>]
```

### oxn task start

开始执行任务。

```bash
oxn task start <task-id> [--project <path>]
```

### oxn task stop

停止执行任务。

```bash
oxn task stop <task-id> [--project <path>]
```

### oxn task next

获取下一个待执行的 Stage。

```bash
oxn task next <task-id> [--project <path>]
```

### oxn task trace

获取任务执行轨迹。

```bash
oxn task trace <task-id> [--project <path>]
```

## oxn arsenal

标准资产管理命令的入口。

```bash
oxn arsenal <subcommand>
```

### oxn arsenal list

列出标准资产。

```bash
oxn arsenal list [DRAFT|CANONICAL]
```

**参数：**

- 可选：`DRAFT` 或 `CANONICAL` 筛选状态

**输出示例：**

```
## PROBES
  [CANONICAL] fs_exists
  [CANONICAL] fs_content_match
  [CANONICAL] exec_exit_zero

## PROOFS
  [DRAFT] laravel_install_proof

## STAGES
  [CANONICAL] build_stage

Total: 6 assets
```

### oxn arsenal inspect

查看标准资产内容。

```bash
oxn arsenal inspect <asset-path>
```

**参数：**

- `asset-path`：资产路径（如 `arsenal/proofs/DRAFT/my-proof.yaml`）

**输出示例：**

```
# laravel_install_proof
Type: proofs
State: DRAFT
Path: /home/user/.openxenon/arsenal/proofs/DRAFT/laravel_install_proof.yaml

--- Content ---
name: laravel_install_proof
description: 验证 Laravel 安装成功
target: Laravel 框架已成功安装
proofs:
  - check_composer_json
  - check_vendor_exists
```

### oxn arsenal promote

将 DRAFT 资产转正为 CANONICAL。

```bash
oxn arsenal promote <asset-path>
```

**参数：**

- `asset-path`：DRAFT 资产路径

**输出示例：**

```
Asset promoted successfully!
  Name: laravel_install_proof
  Type: proofs
  New State: CANONICAL
  New Path: /home/user/.openxenon/arsenal/proofs/CANONICAL/laravel_install_proof.yaml
```

## oxn prove

执行指定路径的 Proof 验证。

```bash
oxn prove <proof-name> [--params <json>]
```

**参数：**

- `proof-name`：Proof 名称
- `--params`：Proof 参数（JSON 格式）

**示例：**

```bash
oxn prove fs_exists --params '{"path": "package.json"}'
```

## oxn proof-list

列出所有可用的 Proof。

```bash
oxn proof-list
```

## oxn trace

查看当前任务的 task-trace.yaml 原始内容。

```bash
oxn trace [--project <path>]
```

## oxn inspect

查看当前任务的 step-manifest.json 原始内容。

```bash
oxn inspect [--project <path>]
```

## oxn daemon

管理全局 Core 引擎的生命周期。

```bash
oxn daemon start   # 启动 daemon
oxn daemon stop   # 停止 daemon
oxn daemon status  # 查看状态
```

## oxn migrate

迁移旧版本数据库到新 Schema。

```bash
oxn migrate
```

## oxn force-pass

强制通过指定步骤（仅用于 Proof 探针错误的情况）。

```bash
oxn force-pass <step-id> [--project <path>]
```

**警告**：此命令极其危险，可能导致工程契约失效。

## oxn rollback

回滚指定步骤。

```bash
oxn rollback <step-id> [--project <path>]
```

**警告**：此命令极其危险，可能导致数据丢失。

## 全局选项

| 选项 | 描述 |
|------|------|
| `-v, --verbose` | 启用详细输出 |
| `-j, --json` | 以 JSON 格式输出 |

## 下一章

下一章将介绍 [Arsenal 资产生成](./04-arsenal.md)。