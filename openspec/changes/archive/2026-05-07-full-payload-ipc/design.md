## Context

### 背景现状

当前 IPC 通信存在不一致：

**不一致的调用方式**：

```typescript
// step-start.ts - 不传 projectPath
socketRequest(DAEMON_SOCK_PATH, 'POST', '/api/v1/step/start',
  { taskId: args['task-id'], stepId: args['step-id'] }
)

// step-verify.ts - 不传 projectPath
socketRequest(DAEMON_SOCK_PATH, 'POST', '/api/v1/step/verify',
  { taskId: args['task-id'], stepId: args['step-id'] }
)

// task-trace.ts - 传递 projectPath
socketRequest(DAEMON_SOCK_PATH, 'GET', `/api/v1/task/trace?taskId=${taskId}`,
  undefined,
  process.cwd()  // ← 显式传递
)
```

**Handler 签名不一致**：

```typescript
// handler 接收 _db: Database 参数（即将废弃）
async function handleStepStart(
  request: Request,
  _db: Database,        // ← 第二个参数，但即将无用
  projectPath: string   // ← 从 socket 连接隐式获取
): Promise<Response>
```

### 约束条件

- 必须保持向后兼容：Daemon 重启后能继续处理已有 task 的请求
- `socketRequest` 的签名不变（`body` 和 `projectPath` 分离）
- Handler 必须是真正无状态的：每次请求处理完不保留任何内存状态
- 删除 `_db` 参数需要在 `remove-database-layer` 之后才完全可行

---

## Goals / Non-Goals

**Goals:**
- 统一所有 CLI 命令的 `socketRequest` 调用方式
- 确保所有 handler 都显式接收 `projectPath`
- 为 `remove-database-layer` 铺路（移除 `_db` 参数）

**Non-Goals:**
- 不改变 socket 通信的协议（仍然 JSON over Unix socket）
- 不实现请求重试或幂等性保障
- 不改变 handler 的业务逻辑（只改变参数传递方式）

---

## Decisions

### Decision 1: 统一 projectPath 传递

**修改 `step-start.ts`**：
```typescript
// 修改前
socketRequest(DAEMON_SOCK_PATH, 'POST', '/api/v1/step/start',
  { taskId: args['task-id'], stepId: args['step-id'] }
)

// 修改后
socketRequest(DAEMON_SOCK_PATH, 'POST', '/api/v1/step/start',
  { taskId: args['task-id'], stepId: args['step-id'] },
  process.cwd()  // ← 添加第5参数
)
```

**修改 `step-verify.ts`**：
```typescript
// 同样添加 process.cwd() 作为第5参数
```

**修改 `task-trace.ts`**：
```typescript
// 修改前：taskId 在 query param
`/api/v1/task/trace?taskId=${args['task-id']}`

// 修改后：taskId 在 body，projectPath 作为第5参数
socketRequest(DAEMON_SOCK_PATH, 'GET', '/api/v1/task/trace',
  { taskId: args['task-id'] },
  process.cwd()
)
```

---

### Decision 2: 移除 _db 参数

**当前 handler 签名**：
```typescript
async function handleStepStart(
  request: Request,
  _db: Database,        // ← 第二个参数
  projectPath: string
): Promise<Response>
```

**修改后 handler 签名**：
```typescript
async function handleStepStart(
  request: Request,
  projectPath: string   // ← 只保留 projectPath
): Promise<Response>
```

**影响范围**：
- `src/api/handlers/step-start.ts`
- `src/api/handlers/step-verify.ts`
- `src/api/handlers/task-start.ts`
- `src/api/handlers/task-submit.ts`
- `src/api/handlers/task-stop.ts`
- `src/api/handlers/task-trace.ts`
- `src/api/handlers/task-status.ts`
- `src/api/handlers/task-next.ts`
- `src/api/handlers/fs-execute.ts`

**执行时机**：`remove-database-layer` 完成后，db 引用全部删除，`_db` 参数自然不需要。

---

### Decision 3: Blueprint 读取策略

**当前方式**：
```typescript
// handler 内每次从文件系统读取
const parsed = readBlueprint(taskDir)
if (!parsed) {
  return notFound('Blueprint YAML not found')
}
```

**两种选项**：

| 选项 | 做法 | 优缺点 |
|------|------|--------|
| A | 继续从文件系统读取 | 简单，但 handler 依赖文件系统存在 |
| B | CLI 传递 blueprintPayload | 真正无状态，但 CLI 需要完整解析 blueprint |

**选择**：选项 A（当前保持不变）

**理由**：
- Blueprint 文件是 Task 的固有组成部分，放在文件系统是合理的
- CLI 在 `task-start` 时已经读取过 blueprint，重复传递浪费带宽
- "无状态"指的是 Daemon 不维护 Task 执行状态，不是说不能读取文件系统

**注意**：如果未来需要支持 "离线 Daemon"（不访问项目文件），可以切换到选项 B，但这超出 v0.1.0 范围。

---

## Risks / Trade-offs

| Risk | 描述 | Mitigation |
|------|------|------------|
| **projectPath 错误** | CLI 传递了错误的 cwd，导致 Daemon 找不到文件 | CLI 应始终使用真实的 process.cwd() |
| **_db 参数移除后编译失败** | 如果有遗漏的 import 或类型引用 | 依赖 TypeScript 编译检查 |
| **Handler 内仍依赖 db** | remove-database-layer 完成后，某些 handler 内部仍试图访问 db | 检查所有 handler，确保无 db 引用 |

---

## Open Questions

1. **是否需要传递 `policy`（PRODUCTION/SANDBOX）到 handler**？
   - 目前 `policy` 存储在 `config.json` 中，handler 通过 `projectPath` + `getSpaceMode()` 读取
   - 如果要完全无状态，CLI 需要传递 `policy` 到 body 中
   - v0.1.0 暂不改变，保持 handler 读取配置文件的方式

2. **task-trace.ts 从 GET 改为 POST 是否合理**？
   - GET 通常用于查询，body 带数据不够 RESTful
   - 但 Unix socket 通信不是标准 HTTP，保持灵活性更重要
   - v0.1.0 允许 GET 带 body
