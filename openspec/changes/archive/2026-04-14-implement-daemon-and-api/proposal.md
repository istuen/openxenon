## Why

Xenonix 的核心运转机制依赖于全局唯一的 Core Daemon 进程，该进程通过 HTTP API 为 AI 助手提供验证、状态管理、任务调度等服务。当前代码库中 `xn daemon` 命令仅有 placeholder 实现，HTTP API 服务器完全缺失，导致系统无法运行，AI 助手无法与 Core 交互。现在实现 Daemon 和 API 服务器，是系统从静态架构转向动态运行的关键一步。

## What Changes

- 实现 `xn daemon start` - 启动后台守护进程（使用 Bun.spawn detached 模式）
- 实现 `xn daemon stop` - 停止守护进程
- 实现 `xn daemon status` - 查询守护进程状态
- 创建 HTTP API 服务器（基于 Bun.serve，监听 127.0.0.1:8420）
- 实现 7 个 API 端点：
  - `POST /api/v1/workspace/init` - 项目初始化
  - `GET /api/v1/proofs/list` - 获取 Proof 列表
  - `POST /api/v1/task/submit` - 提交 Playbook
  - `POST /api/v1/step/verify` - 验证步骤
  - `GET /api/v1/task/status` - 查询任务状态
  - `POST /api/v1/task/stop` - 停止任务
  - `GET /api/v1/task/trace` - 导出任务轨迹
- 创建 Daemon 日志系统（同时输出到文件和控制台）
- 通过 `X-Project-Path` HTTP Header 传递项目上下文

## Capabilities

### New Capabilities

- `daemon-process`: 守护进程管理能力，支持后台运行、状态监控、进程生命周期管理
- `http-api`: HTTP API 服务器能力，提供 RESTful 接口供 AI 助手调用

### Modified Capabilities

无现有能力需要修改。

## Impact

- 影响整个系统的运行机制，从静态代码变为可运行的系统
- 引入后台进程管理，需要处理进程间通信和状态同步
- 引入 HTTP 服务，需要处理并发请求和错误处理
- 影响所有 AI Assistant Skills 的实现（需要调用这些 API）
- 增加日志文件管理（`~/.xenonix/daemon.log`）
- 增加进程状态文件（`~/.xenonix/daemon.pid`）
