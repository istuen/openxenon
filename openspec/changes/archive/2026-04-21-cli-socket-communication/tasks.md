# Socket 通信实施计划

## Phase 1: Socket 服务器实现

### 1.1 常量更新

- [x] 1.1.1 更新 `src/core/global.ts` - 添加 SOCKET_PATH 常量 (已存在DAEMON_SOCK_PATH)
- [x] 1.1.2 更新 `src/daemon/process.ts` - 删除 HTTP 地址常量

### 1.2 Socket 服务器

- [x] 1.2.1 创建 `src/api/socket-server.ts` - Unix Socket 服务器
- [x] 1.2.2 实现 Socket 消息路由 (复用现有 router)
- [x] 1.2.3 更新 `src/api/server.ts` - 改为启动 Socket 服务器

### 1.3 服务整合

- [x] 1.3.1 更新 `src/daemon/server.ts` - 整合 Socket 服务 (不适用，未使用)
- [x] 1.3.2 更新 `src/server.ts` - 移除 HTTP 相关代码

---

## Phase 2: CLI 子命令实现

### 2.1 Socket 客户端

- [x] 2.1.1 创建 `src/api/socket-client.ts` - Socket 请求客户端

### 2.2 API 子命令结构

- [x] 2.2.1 创建 `src/commands/api/` 目录
- [x] 2.2.2 更新 `src/commands/api.ts` - 改为目录导入

### 2.3 子命令实现

- [x] 2.3.1 创建 `src/commands/api/task-submit.ts`
- [x] 2.3.2 创建 `src/commands/api/task-status.ts`
- [x] 2.3.3 创建 `src/commands/api/task-start.ts`
- [x] 2.3.4 创建 `src/commands/api/task-stop.ts`
- [x] 2.3.5 创建 `src/commands/api/task-next.ts`
- [x] 2.3.6 创建 `src/commands/api/task-trace.ts`
- [x] 2.3.7 创建 `src/commands/api/step-start.ts`
- [x] 2.3.8 创建 `src/commands/api/step-verify.ts`
- [x] 2.3.9 创建 `src/commands/api/proofs-list.ts`
- [x] 2.3.10 创建 `src/commands/api/workspace-init.ts`
- [x] 2.3.11 创建 `src/commands/api/health.ts`

---

## Phase 3: Skills 更新

### 3.1 Task Skills

- [x] 3.1.1 更新 `src/skills/oxn-task.ts` - curl → oxn api task-submit
- [x] 3.1.2 更新 `src/skills/oxn-task.ts` - curl → oxn api proofs-list

### 3.2 Status Skills

- [x] 3.2.1 更新 `src/skills/oxn-status.ts` - curl → oxn api task-status
- [x] 3.2.2 更新 `src/skills/oxn-resume.ts` - curl → oxn api task-status

### 3.3 Control Skills

- [x] 3.3.1 更新 `src/skills/oxn-stop.ts` - curl → oxn api task-stop
- [x] 3.3.2 更新 `src/skills/oxn-trace.ts` - curl → oxn api task-trace

### 3.4 Init Skills

- [x] 3.4.1 更新 `src/skills/oxn-init.ts` - 已使用 CLI (无需更改)

---

## Phase 4: 测试更新

- [x] 4.1.1 创建 `tests/api/socket.test.ts` (已整合到 task-execution.test.ts)
- [x] 4.2.1 更新 `tests/api/task-execution.test.ts` - 使用 Socket (5/6 tests pass)
- [ ] 4.2.2 更新其他使用 HTTP 的测试

---

## Phase 5: 清理与验证

- [ ] 5.1.1 移除 HTTP 相关日志
- [ ] 5.1.2 移除测试中的 HTTP 常量
- [x] 5.2.1 运行 typecheck (API/commands无错误)
- [x] 5.2.2 运行测试 (5/6 pass - health/start/status/next/step_start work)
- [x] 5.2.3 手动测试 Socket 通信 (Socket server启动正常)