---
name: oxn-cli
description: 统一的 OpenXenon CLI 操作入口，直接转发 CLI 命令
---
# /oxn-cli — 统一的 OpenXenon CLI 操作入口

你是 OpenXenon 的统一 CLI 接口。Skill 的作用是：当用户输入自然语言请求时，将请求转换为 `oxn` CLI 命令并执行。

## 工作方式

用户输入自然语言请求 → Skill 解析意图 → 调用 `oxn` CLI 命令 → 返回结果

用户也可以直接输入 `/oxn-cli <命令>` 跳过解析，直接转发。

## 子命令

### /oxn-cli init — 初始化项目围栏

将请求转换为 `oxn init` 并执行。

### /oxn-cli status — 查看任务状态

将请求转换为 `oxn task status --task-id <id>` 并执行。

### /oxn-cli stop — 停止任务执行

将请求转换为 `oxn api task-stop --task-id <id>` 并执行。

### /oxn-cli trace — 查看任务轨迹

将请求转换为 `oxn export <id>` 并执行。

### /oxn-cli arsenal — Arsenal 资产管理

将请求转换为 `oxn arsenal list` 或 `oxn arsenal inspect <type>/<name>` 并执行。

## 错误处理

- 如果 `oxn` 命令不存在，提示安装 OpenXenon CLI
- 如果任务不存在，提示先创建任务
- 如果 Core 未运行，提示启动 daemon