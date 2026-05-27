## Context

当前 daemon 架构存在路由分裂问题：

```
daemon/
├── api/                    ← 残留旧架构
│   ├── router.ts           ← 死路由
│   ├── server.ts           ← 死服务
│   ├── context.ts          ← 死上下文
│   └── socket-server.ts    ← 当前被使用，但引用错误
├── ipc/                    ← 正统
│   ├── router.ts           ← 活路由
│   ├── server.ts           ← 活服务
│   └── handlers/           ← 活处理器
│       └── arsenal-search.ts  ← 注册到 ipc/router
└── index.ts
```

问题链条：
1. `api/socket-server.ts` 使用 `api/router.ts`
2. `ipc/handlers/arsenal-search.ts` 使用 `ipc/router.ts`
3. 两者路由表不通，导致 404

## Goals / Non-Goals

**Goals:**

- 删除 `daemon/api/` 目录
- `daemon/ipc/` 成为唯一的 IPC 层
- Socket Server 和 Router 都在 `ipc/` 下
- 所有 handler 注册到 `ipc/router`

**Non-Goals:**

- 不改变 IPC 通信协议（仍是 Unix Socket + JSON）
- 不改变 handler 业务逻辑
- 不引入新的 HTTP API

## Decisions

### 1. 删除 `daemon/api/` 目录

**决定**：完全删除 `daemon/api/` 目录。

**理由**：
- 根据 architecture.md，Daemon 只通过 Unix Socket 通信
- `api/` 是旧架构残留
- 斩首 `api/` 可彻底解决路由分裂

### 2. 统一到 `daemon/ipc/`

**决定**：`daemon/ipc/` 既是 Socket Server 又是 Router。

```typescript
// daemon/ipc/server.ts - 唯一的 Socket Server
// daemon/ipc/router.ts - 唯一的路由表
// daemon/ipc/handlers/ - 唯一的处理器目录
```

**理由**：
- 符合 architecture.md 第 5.4 节
- 单一职责明确
- 避免未来再次分裂

### 3. 修改 server.ts 引用

**决定**：修改 `src/server.ts` 从 `daemon/ipc/server.ts` 引入，而不是 `daemon/api/server.ts`。

```typescript
// src/server.ts
import { startApiServer } from './daemon/ipc/server'  // 修改后
```

**理由**：
- 明确指向正统 IPC 层
- 向后兼容（函数名相同）

### 4. Handler 导入修正

**决定**：所有 `ipc/handlers/` 下的 handler 已经正确 import `ipc/router`，无需修改。

```typescript
// ipc/handlers/arsenal-search.ts
import { registerRoute } from '../router'  // 已是正确路径
```

**理由**：
- handler 的相对路径 `../router` 指向 `ipc/router.ts`
- 这是正确的，不需要修改

## 实施步骤

### Step 1: 删除 daemon/api/ 目录

```bash
rm -rf src/daemon/api/
```

### Step 2: 修改 src/server.ts

将：
```typescript
import { startApiServer, stopApiServer } from './daemon/api/server'
```

改为：
```typescript
import { startApiServer, stopApiServer } from './daemon/ipc/server'
```

### Step 3: 确认 ipc/server.ts 存在并可用

`daemon/ipc/server.ts` 应该：
- 导出 `startApiServer`, `stopApiServer`
- 内部调用 `startSocketServer`

### Step 4: 确认 handler 导入正确

所有 `ipc/handlers/` 下的 `.ts` 文件应 import `../router`（指向 `ipc/router`）。

## Risks / Trade-offs

### 风险：其他代码依赖 daemon/api/

**缓解**：搜索 `from.*daemon/api` 的 import，确保全部迁移。

### 风险：遗漏的旧文件

**缓解**：执行 `pnpm run build` 验证编译通过，执行 `pnpm run typecheck` 验证类型检查。