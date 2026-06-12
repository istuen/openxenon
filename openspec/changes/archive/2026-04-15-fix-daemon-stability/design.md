## Context

Daemon 进程管理存在以下问题：

1. **PID 文件残留**：进程意外退出后 PID 文件未被清理，导致 `isDaemonRunning()` 误判
2. **缺乏健康检查**：启动后未验证服务是否真正可用
3. **错误处理不完整**：`daemon_address` 数据库操作可能抛出异常导致进程崩溃

当前流程：
```
startDaemon() → Bun.spawn() → 写 PID 文件 → 返回成功
```

问题：Bun.spawn() 返回成功不代表进程真正启动成功，可能立即崩溃。

## Goals / Non-Goals

**Goals:**

- 修复 PID 残留检测，正确识别僵尸进程
- 添加启动后健康检查，确认服务可用
- 增强错误处理，确保异常时清理资源
- 确保 `daemon_address` 操作不会导致崩溃

**Non-Goals:**

- 不实现进程自动重启（由用户手动处理）
- 不实现远程监控

## Decisions

### 1. 健康检查机制

**决定**：启动后轮询 API 端点确认服务可用。

```typescript
async function waitForHealth(url: string, timeout: number): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(`${url}/api/v1/health`)
      if (response.ok) return true
    } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  return false
}
```

**理由**：
- 简单可靠，不依赖复杂机制
- 超时机制防止无限等待
- 100ms 轮询间隔足够快速检测

### 2. PID 清理策略

**决定**：在 server.ts 的所有退出路径（包括异常）中清理 PID 文件。

```typescript
// 注册所有退出处理器
process.on('SIGTERM', handleShutdown)
process.on('SIGINT', handleShutdown)
process.on('uncaughtException', handleFatalError)
process.on('unhandledRejection', handleFatalError)
```

**理由**：
- 覆盖所有可能的退出路径
- 确保 PID 文件不会残留

### 3. 数据库操作异常处理

**决定**：将 `daemon_address` 操作包装在 try-catch 中，失败时记录日志但不崩溃。

```typescript
function saveDaemonAddress(): void {
  try {
    const db = initCoreDb(CORE_DB_PATH)
    setDaemonAddress(db, DAEMON_ADDRESS)
  } catch (error) {
    daemonLogger.error(`Failed to save daemon address: ${error}`)
    // 不抛出异常，继续运行
  }
}
```

**理由**：
- `xn api base` 是辅助功能，不应阻止 daemon 启动
- 日志记录便于排查问题

## Risks / Trade-offs

### 风险：健康检查增加启动延迟

**风险**：健康检查可能增加 100-500ms 的启动延迟。

**缓解**：超时设置为 5 秒，正常情况下 100-300ms 内完成。

### 风险：数据库操作失败时 `xn api base` 不可用

**风险**：如果 `daemon_address` 写入失败，`xn api base` 命令会失败。

**缓解**：提示用户重启 daemon，问题通常会自愈。

## Migration Plan

无需迁移，修复后重新启动 daemon 即可：
```bash
xn daemon stop  # 清理残留 PID
xn daemon start # 使用修复后的逻辑启动
```
