## Context

Xenonix 需要一个全局唯一的 Core Daemon 进程来提供 HTTP API 服务，实现 AI 助手与底层引擎的交互。当前项目已完成核心架构（类型定义、数据库操作、文件监听、验证系统），但 Daemon 进程和 HTTP API 完全缺失，系统无法运行。

**当前状态：**
- 核心模块已实现：types、db、core、watcher、verification
- CLI 框架已搭建：citty + commands
- Daemon 命令仅为 placeholder：`console.log('提示: 守护进程功能将在后续版本实现')`
- HTTP API 服务器未实现

**约束：**
- 运行时：Bun（原生支持 HTTP 服务器）
- 通信方式：HTTP API（本地 127.0.0.1:8420）
- 进程模型：全局唯一 Daemon（后台运行）
- 项目识别：通过 HTTP Header `X-Project-Path` 传递项目路径

## Goals / Non-Goals

**Goals:**

- 实现 Daemon 进程管理（start/stop/status）
- 实现 HTTP API 服务器（基于 Bun.serve）
- 实现 7 个 API 端点
- 实现日志系统（文件 + 控制台）
- 实现项目上下文切换机制
- 支持并发请求处理
- 提供错误处理和响应格式标准化

**Non-Goals:**

- 不实现 WebSocket 或长连接（仅需 REST API）
- 不实现 API 认证（本地服务，信任本地调用者）
- 不实现 HTTPS（本地 HTTP 足够）
- 不实现 API 限流（本地服务，无需限流）
- 不实现其他 CLI 命令（inspect、trace、rollback、force-pass）

## Decisions

### 1. Daemon 进程管理方式

**决策：使用 Bun.spawn detached 模式**

```typescript
// xn daemon start
const proc = Bun.spawn(['bun', 'run', serverPath], {
  detached: true,
  stdio: ['ignore', 'ignore', 'ignore']
})
proc.unref()
```

**理由：**
- Bun 原生支持，无需额外依赖
- detached 模式允许父进程退出后子进程继续运行
- 简单可靠，适合本地 Daemon 场景

**备选方案：**
- 方案 B: 使用 PM2 - 拒绝理由：引入外部依赖，过度设计
- 方案 C: 使用 systemd/launchd - 拒绝理由：平台依赖，复杂度高
- 方案 D: 前台运行 + nohup - 拒绝理由：不够优雅，需要额外步骤

### 2. 项目上下文传递方式

**决策：通过 HTTP Header `X-Project-Path` 传递项目路径**

```typescript
// AI 助手调用 API
fetch('http://127.0.0.1:8420/api/v1/task/status', {
  headers: {
    'X-Project-Path': '/path/to/project'
  }
})

// 服务器端获取
const projectPath = request.headers.get('X-Project-Path')
```

**理由：**
- 显式传递，清晰明了
- 不侵入 URL 路径
- 不侵入请求体（适用于 GET 请求）
- 符合 RESTful 最佳实践

**备选方案：**
- 方案 B: URL 查询参数 `?project=/path` - 拒绝理由：污染 URL
- 方案 C: 请求体传递 - 拒绝理由：不适用于 GET 请求
- 方案 D: 每个 daemon 只服务一个项目 - 拒绝理由：资源浪费，违背全局唯一原则

### 3. HTTP 服务器实现

**决策：使用 Bun.serve 原生 HTTP 服务器**

```typescript
Bun.serve({
  port: 8420,
  hostname: '127.0.0.1',
  async fetch(request) {
    // 路由分发
    const url = new URL(request.url)
    const projectPath = request.headers.get('X-Project-Path')
    
    // 动态加载项目上下文
    const db = loadProjectDb(projectPath)
    
    // 处理请求
    return handleRequest(url.pathname, request, db)
  }
})
```

**理由：**
- Bun 原生支持，零依赖
- 毫秒级启动，性能极佳
- 支持 async/await，代码简洁
- 自动处理请求解析

**备选方案：**
- 方案 B: 使用 Express - 拒绝理由：引入 npm 依赖，违背 Bun 原生原则
- 方案 C: 使用 Fastify - 拒绝理由：过度设计，本地服务无需框架

### 4. 路由设计

**决策：基于 URL pathname 的简单路由映射**

```typescript
const routes = {
  '/api/v1/workspace/init': handlers.workspaceInit,
  '/api/v1/proofs/list': handlers.proofsList,
  '/api/v1/task/submit': handlers.taskSubmit,
  '/api/v1/step/verify': handlers.stepVerify,
  '/api/v1/task/status': handlers.taskStatus,
  '/api/v1/task/stop': handlers.taskStop,
  '/api/v1/task/trace': handlers.taskTrace
}

async function handleRequest(pathname: string, request: Request, db: Database) {
  const handler = routes[pathname]
  if (!handler) {
    return new Response('Not Found', { status: 404 })
  }
  return handler(request, db)
}
```

**理由：**
- 简单直接，无需路由库
- 路由数量少（7个），手动映射足够
- 类型安全，易于维护

### 5. 错误响应格式

**决策：统一 JSON 错误响应格式**

```typescript
interface ErrorResponse {
  error: string        // 错误类型（如 "TaskNotFound"）
  message: string      // 人类可读的错误信息
  statusCode: number   // HTTP 状态码
}

// 示例
{
  "error": "TaskNotFound",
  "message": "Task 'task-123' not found in project",
  "statusCode": 404
}
```

**理由：**
- 结构化错误信息
- 便于 AI 助手解析和处理
- 统一格式，一致性好

### 6. 日志系统

**决策：同时输出到文件和控制台**

```typescript
const logFile = Bun.file('~/.xenonix/daemon.log')

function log(level: string, message: string) {
  const timestamp = new Date().toISOString()
  const logLine = `[${timestamp}] ${level}: ${message}\n`
  
  // 输出到控制台
  console.log(logLine)
  
  // 追加到文件
  await logFile.write(logLine, { append: true })
}
```

**理由：**
- 文件日志：持久化，便于排查问题
- 控制台输出：实时查看，便于开发调试
- 两者兼顾，满足不同场景

### 7. PID 文件管理

**决策：使用 PID 文件记录守护进程状态**

```typescript
const PID_FILE = join(GLOBAL_BOUNDARY_PATH, 'daemon.pid')

// 启动时写入 PID
await Bun.write(PID_FILE, process.pid.toString())

// 停止时读取 PID 并删除文件
const pid = parseInt(await Bun.file(PID_FILE).text())
process.kill(pid, 'SIGTERM')
await unlink(PID_FILE)
```

**理由：**
- 简单可靠，标准的 Unix 守护进程模式
- 便于 stop 命令定位进程
- status 命令可快速判断运行状态

## Risks / Trade-offs

**风险 1: 端口冲突**
- 风险：8420 端口可能被其他服务占用
- 缓解：启动时检查端口，提供配置选项（环境变量 XENONIX_PORT）

**风险 2: 进程僵尸**
- 风险：异常退出时 PID 文件未清理
- 缓解：启动时检查 PID 是否真实运行，清理过期 PID 文件

**风险 3: 并发写入冲突**
- 风险：多个请求同时写入 project.db
- 缓解：SQLite WAL 模式已启用，支持并发读写

**风险 4: 日志文件过大**
- 风险：长期运行日志文件无限增长
- 缓解：实现日志轮转（rotate），保留最近 7 天日志

**权衡: 简单性 vs 功能性**
- 选择：优先简单性，牺牲高级功能（如认证、限流）
- 理由：本地服务场景，简单可靠优先

**权衡: 性能 vs 可靠性**
- 选择：优先可靠性，每次请求加载 project.db
- 理由：牺牲部分性能，换取项目隔离性和数据一致性

## Migration Plan

**部署步骤：**

1. 创建 `src/daemon/` 目录结构
2. 实现 Daemon 进程管理模块
3. 创建 `src/api/` 目录结构
4. 实现 HTTP 服务器和路由
5. 实现 7 个 API 端点处理器
6. 更新 `src/commands/daemon.ts` 调用真实逻辑
7. 测试 Daemon 启动、停止、状态查询
8. 测试所有 API 端点

**回滚策略：**
- 删除 `src/daemon/` 和 `src/api/` 目录
- 恢复 `src/commands/daemon.ts` 为 placeholder
- 系统回到不可运行状态

## Open Questions

1. 是否需要支持 API 版本演进？
   - 当前决策：先支持 v1，后续可扩展 v2

2. 是否需要支持健康检查端点？
   - 当前决策：暂不需要，可通过 `/api/v1/task/status` 判断服务可用性

3. 是否需要支持优雅关闭（graceful shutdown）？
   - 当前决策：简单实现，收到 SIGTERM 直接退出，不等待请求完成

4. 日志格式是否需要结构化（JSON）？
   - 当前决策：使用简单文本格式，便于人类阅读
