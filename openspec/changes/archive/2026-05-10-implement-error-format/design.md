## Context

当前错误输出问题：

```
❌ CLI 炸了 → stderr 输出堆栈 → AI 看到 TypeError → 傻了
✅ 目标     → stdout 输出 JSON → AI 看到 { ok: false, error: {...} } → 知道该做什么
```

## Goals / Non-Goals

**Goals:**

- 所有 CLI 输出都是 JSON（正常 + 错误）
- Daemon Socket 响应格式统一为 `{ ok, data }` / `{ ok, error }`
- Kernel 只放枚举（纯符号），不组装 Error 实例
- CLI 用枚举比对，不用字符串

**Non-Goals:**

- 不改 handler 业务逻辑
- 不引入 Error 类（0.2 再吵）
- 不做完整的错误分类（0.1 只覆盖最高频场景）

## Decisions

### 1. Kernel 只放枚举

```typescript
// kernel/enums.ts
export enum OxnErrorCode {
  SOCKET_REFUSED = 'OXN_SOCKET_REFUSED',
  SOCKET_TIMEOUT = 'OXN_SOCKET_TIMEOUT',
  BLUEPRINT_INVALID = 'OXN_BLUEPRINT_INVALID',
  INTERNAL_ERROR = 'OXN_INTERNAL_ERROR',
  UNKNOWN = 'OXN_UNKNOWN',
}

export enum ErrorCategory {
  USER = 'USER',
  CONTRACT = 'CONTRACT',
  INFRA = 'INFRA',
  SYSTEM = 'SYSTEM',
}
```

**理由**：纯符号，零耦合。CLI/Daemon 组装 Error 实例时 import 这些枚举。

### 2. Daemon 统一响应格式

`daemon/ipc/server.ts` 的 socket 写入处统一包装：

```typescript
if (response.status >= 200 && response.status < 300) {
  socket.write(JSON.stringify({ ok: true, data: response.body }) + '\n')
} else {
  socket.write(JSON.stringify({
    ok: false,
    error: {
      code: response.body.code || 'OXN_INTERNAL_ERROR',
      message: response.body.message || 'Unknown error',
      category: response.body.category || 'SYSTEM',
      recoverable: response.body.recoverable ?? false,
      suggestion: response.body.suggestion || ''
    }
  }) + '\n')
}
```

**理由**：handler 继续抛 Response，server.ts 统一包装格式。不改 handler。

### 3. CLI 入口 try-catch 铁幕

```typescript
async function main() {
  try {
    const result = await runCommand(args)
    console.log(JSON.stringify({ ok: true, data: result }))
  } catch (err) {
    console.log(formatError(err))
    process.exit(1)
  }
}
```

formatError() 检测：
- 已知错误（有 `code` 字段）→ 直接 JSON 序列化
- Socket 连接失败（ECONNREFUSED/ENOENT）→ OXN_SOCKET_REFUSED
- Socket 超时（timed out/ETIMEDOUT）→ OXN_SOCKET_TIMEOUT
- 其他错误 → OXN_UNKNOWN + debug info

### 4. CLI 用枚举比对

```typescript
import { OxnErrorCode, ErrorCategory } from '../kernel/enums'

if (err.code === OxnErrorCode.SOCKET_REFUSED) {
  // 重试逻辑
}
```

**理由**：编译时检查，拼错会报红。

## 错误码表（0.1 覆盖场景）

| 错误码 | category | recoverable | 触发条件 |
|--------|----------|-------------|----------|
| OXN_SOCKET_REFUSED | INFRA | true | socket 文件不存在 |
| OXN_SOCKET_TIMEOUT | INFRA | true | Daemon 响应超时 |
| OXN_UNKNOWN | SYSTEM | false | 未 catch 的异常 |

## Risks / Trade-offs

### 风险：formatError 检测不够精准

**缓解**：0.1 只检测最常见的 3 种错误模式，其他归类为 OXN_UNKNOWN

### 风险：handler 返回的 body 可能没有 error 字段

**缓解**：server.ts 的包装使用 `|| '默认值'` 兜底