# physics-constitutional-refactor - Design

## 1. Kernel 清洁 - task-dir.ts

### 当前状态
```typescript
// kernel/lib/task-dir.ts - 违规！
import { existsSync, mkdirSync } from 'fs'  // ← I/O 副作用

export function getTaskDirectory(root, id)  // ← 纯函数，应该留在 kernel
export function ensureTaskDirectory(dir)    // ← I/O，移至 infra
export function taskDirectoryExists(dir)     // ← I/O，移至 infra
```

### 重构后

**kernel/lib/task-dir.ts** (只保留纯函数):
```typescript
// 无 I/O import
export function getTaskDirectory(root: string, id: string): TaskDirectory {
  const root = join(root, '.openxenon', 'tasks', id)
  return { root, taskId: id, blueprintPath: ..., tracePath: ..., manifestPath: ... }
}
```

**infra/fs.ts** (新增 I/O 操作):
```typescript
export function ensureDirectory(path: string): void { ... }
export function directoryExists(path: string): boolean { ... }
```

## 2. Kernel 清洁 - custom-proofs-scanner.ts

### 当前状态
```typescript
// kernel/lib/custom-proofs-scanner.ts - 违规！
import { readdirSync, statSync, existsSync } from 'fs'  // ← I/O

export function scanProjectProofs(root)  // ← 自己调用 I/O，应该接收参数
export function scanGlobalProofs()       // ← 自己调用 I/O
```

### 重构后

**kernel/lib/custom-proofs-resolver.ts** (纯函数):
```typescript
// 无 I/O import
export function resolveCustomProofs(paths: string[]): CustomProofConfig[] {
  // 纯逻辑：接收路径列表，组装为内存对象
}
```

**infra/scanner.ts** (新增，物理扫描):
```typescript
export function scanDirectory(dir: string): string[] { ... }
export function scanProjectProofsSync(root: string): string[] { ... }
export function scanGlobalProofsSync(): string[] { ... }
```

## 3. Kernel 清洁 - blueprint-parser.ts

### 当前状态
```typescript
// kernel/lib/blueprint-parser.ts - 违规！
import { existsSync, readFileSync } from 'fs'  // ← I/O

export function readBlueprint(taskDir)  // ← I/O，移至 infra
export function parseBlueprintYaml(yaml) // ← 纯函数，留在 kernel
```

### 重构后

**kernel/lib/blueprint-parser.ts** (只保留纯解析):
```typescript
// 无 I/O import
export function parseBlueprintYaml(yaml: string): ParsedBlueprint { ... }
export function blueprintToPayload(parsed: ParsedBlueprint): BlueprintPayload { ... }
```

**infra/fs.ts** (新增文件读取):
```typescript
export function readFileSync(path: string): string { ... }
export function fileExists(path: string): boolean { ... }
```

## 4. CLI handlers 清理

### 当前结构
```
cli/
├── handlers/           ← 全部删除
│   ├── task-submit.ts
│   ├── task-start.ts
│   ├── task-status.ts
│   ├── task-trace.ts
│   ├── task-next.ts
│   ├── task-stop.ts
│   ├── step-start.ts
│   ├── step-verify.ts
│   ├── proofs-list.ts
│   ├── fs-execute.ts
│   └── health.ts
└── commands/          ← 保留
    ├── task.ts
    ├── arsenal.ts
    └── ...
```

### 重构后
```
cli/
├── commands/
│   ├── task.ts         ← 合并 handlers/task-*.ts
│   ├── step.ts         ← 合并 handlers/step-*.ts
│   └── fs.ts           ← 合并 handlers/fs-execute.ts
└── ...
```

每个 command 文件只做：参数解析 → JSON 构造 → socket.send()

## 5. Arsenals 净化

### 当前状态
```
arsenals/
├── proofs/             ← 有 TS 代码，违规！
│   ├── index.ts
│   ├── probe.ts        ← Zod Schema
│   ├── proof.ts
│   └── stage.ts
└── ...
```

### 重构后
```
arsenals/
├── proofs/             ← 只有 YAML 文件
│   └── README.md
└── ...

kernel/schemas/        ← Zod Schemas 新位置
├── index.ts
├── probe.ts
├── proof.ts
└── stage.ts
```

## 6. 删除 core/

### 当前 core/daemon-config.ts
```typescript
import { writeFileSync, unlinkSync, existsSync } from 'fs'
import { CORE_DAEMON_CONFIG_PATH } from '../infra/global'

export function setDaemonAddress(socketPath: string) { ... }
export function clearDaemonAddress() { ... }
export function getDaemonAddress() { ... }
```

### 重构后
- `CORE_DAEMON_CONFIG_PATH` → `infra/global.ts`
- `setDaemonAddress`, `getDaemonAddress` → `daemon/status.ts` (内存状态)
- `clearDaemonAddress` → 删除（unlinkSync 不应该在内存状态管理中）

## 7. 修复 server.ts

```typescript
// server.ts 当前 (错误)
import './api/handlers'  // ← 目录不存在！

// server.ts 重构后 (正确)
import { startApiServer } from './daemon/api/server'
import { startIpcServer } from './daemon/ipc/server'
// 删除这行 import './api/handlers'
```

## 文件迁移映射

| 原位置 | 新位置 | 操作 |
|--------|--------|------|
| `kernel/lib/task-dir.ts` | `kernel/lib/task-dir.ts` + `infra/fs.ts` | 拆分 |
| `kernel/lib/custom-proofs-scanner.ts` | `kernel/lib/custom-proofs-resolver.ts` + `infra/scanner.ts` | 重命名+拆分 |
| `kernel/lib/blueprint-parser.ts` | `kernel/lib/blueprint-parser.ts` + `infra/fs.ts` | 拆分 |
| `cli/handlers/*.ts` | `cli/commands/task.ts`, `step.ts`, `fs.ts` | 合并 |
| `arsenals/proofs/*.ts` | `kernel/schemas/*.ts` | 移动 |
| `infra/blueprint/blueprint.ts` | 删除 | 业务逻辑移 kernel |
| `infra/staging/staging-manager.ts` | 删除 | 未被引用 |
| `core/daemon-config.ts` | `infra/global.ts` + `daemon/status.ts` | 拆分 |
| `src/server.ts:6` | (删除该行) | 修复 |