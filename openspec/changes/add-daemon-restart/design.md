## Context

当前 daemon 命令支持 `start`, `stop`, `status` 三个子命令。用户重启 daemon 需要手动执行两次命令：

```bash
xn daemon stop
xn daemon start
```

这在开发调试场景下不够便捷。`restart` 命令是一个常见的 CLI 模式，可以简化这个操作。

## Goals / Non-Goals

**Goals:**

- 实现 `xn daemon restart` 命令
- 复用现有的 `stopDaemon()` 和 `startDaemonWithHealthCheck()` 函数
- 提供清晰的状态反馈

**Non-Goals:**

- 不实现自动重启（守护进程模式）
- 不实现延迟重启
- 不实现配置文件重载

## Decisions

### 1. 命令实现方式

**决定**：在 `src/commands/daemon.ts` 中添加 `restartCommand`，依次调用 `stopDaemon()` 和 `startDaemonWithHealthCheck()`。

```typescript
const restartCommand = defineCommand({
  meta: {
    name: 'restart',
    description: '重启全局 Core 引擎'
  },
  async run() {
    // 停止 daemon（忽略"未运行"错误）
    // 启动 daemon
  }
})
```

**理由**：
- 复用现有代码，无需修改 `src/daemon/process.ts`
- 保持与手动执行 stop/start 相同的行为
- 实现简单，风险低

### 2. 未运行时的行为

**决定**：如果 daemon 未运行，`stopDaemon()` 会返回错误，但 restart 命令继续执行启动。

```typescript
const stopResult = await stopDaemon()
// 忽略 "Daemon is not running" 错误，继续启动
if (!stopResult.success && !stopResult.error?.includes('not running')) {
  console.error(`✗ Failed to stop daemon: ${stopResult.error}`)
  process.exit(1)
}
```

**理由**：
- 用户期望 restart 最终结果是 daemon 运行
- 类似 systemd 的 `systemctl restart` 行为

## Risks / Trade-offs

### 风险：停止失败导致重复进程

**风险**：如果停止失败但未正确检测，可能导致多个 daemon 进程。

**缓解**：`stopDaemon()` 已实现 PID 检测和进程信号发送，且有健康检查机制确保新进程正常启动。
