# Infra IO 层重组：统一系统操作层设计

> **状态**：Draft v1.0 — 已拍板，**未实现**。
>
> **目标读者**：架构师 + OXN 维护者
>
> **关联文档**：
> - Runtime 适配层设计：[`2026-06-11-runtime-adapter-design.md`](./2026-06-11-runtime-adapter-design.md)
> - 架构讨论纪要：[`2026-06-11-runtime-adapter-arch-discussion.md`](./2026-06-11-runtime-adapter-arch-discussion.md)
> - v0.1.0 pre-publish：[`2026-06-11-v0.1.0-pre-publish-design.md`](./2026-06-11-v0.1.0-pre-publish-design.md)
> - L0-L3 宪法：[`../architecture/l0-l3-constitution.md`](../architecture/l0-l3-constitution.md)

---

## 1. 背景

### 1.1 当前问题

OpenXenon 的 IO 调用分散在 40+ 文件中，直接 `import 'fs'` / `import 'os'` / `import 'path'`，没有统一入口：

| 层 | 直接 `import 'fs'` | 应改为 |
|---|---|---|
| L3-CLI | **22 文件** | `import { fileExists } from '../infra/filesystem'` |
| L2-Work | **7 文件** | 同 |
| L1-OXL | **5 文件** | 同 |
| L1-Infra probes | **10 文件** | `import { spawn } from '../infra/runtime/spawn'` |
| L3-Daemon | **17 文件**（已走 infra/filesystem，但方式不一致） | 统一 API 名 |

### 1.2 设计原则

1. **Infra 是 OpenXenon 与外部的唯一 IO 出入口** — L1-OXL / L2-Work / L3-CLI / L3-Daemon 不得直接 import Node 宿主模块
2. **同步与异步分离** — 同步场景（CLI 命令、Work 引擎）用 `filesystem.ts`，异步场景（probe handler、runtime 适配）用 `filesystem-async.ts`
3. **factory 模式** — 两个 filesystem 都通过 `isBun()` 在模块加载时选择 Bun/Node 实现，保持架构一致性
4. **函数即契约** — `filesystem.ts` 导出的函数本身就是合同，不需要 L0 Kernel Contract 再定义一遍

---

## 2. 目标架构

### 2.1 目录结构（最终状态）

```
src/infra/
├── filesystem.ts               ← 同步 fs（factory → bun/sync-fs | node/sync-fs）
├── filesystem-async.ts         ← 异步 fs（factory → bun/async-fs | node/async-fs）
│
├── runtime/
│   ├── types.ts                ← 共享类型（SyncFileSystem, AsyncFileSystem 接口）
│   ├── detect.ts               ← isBun() 缓存
│   ├── bun/
│   │   ├── sync-fs.ts          ← Bun 同步文件系统实现
│   │   ├── async-fs.ts         ← Bun 异步文件系统实现
│   │   ├── spawn.ts            ← Bun.spawn 实现
│   │   ├── glob.ts             ← Bun.glob 实现
│   │   └── which.ts            ← Bun.which 实现（或 npm which）
│   ├── node/
│   │   ├── sync-fs.ts          ← Node 同步文件系统实现
│   │   ├── async-fs.ts         ← Node 异步文件系统实现
│   │   ├── spawn.ts            ← child_process 实现
│   │   ├── glob.ts             ← npm glob 实现
│   │   └── which.ts            ← npm which 实现
│   └── index.ts                ← 工厂（导出 spawn / glob / which）
│
├── hash.ts                     ← 已有，不变
├── process.ts                  ← 已有，不变
├── socket.ts                   ← 已有，不变
├── paths.ts                    ← 已有，保留
├── global.ts                   ← 已有，保留
├── loader.ts                   ← 已有，保留
├── scanner.ts                  ← 已有，保留
├── compile-cache.ts            ← 已有，保留
├── frozen/                     ← 已有，保留
├── explore/                    ← 已有，保留
├── probes/                     ← 已有，但内部 import 'fs' 需迁移
├── index.ts                    ← 便利 re-export（更新）
│
├── ── 待删除 ──
├── file-system-port.ts         ← ❌ 死代码
├── path-port.ts                ← ❌ 死代码
├── boundary.ts（osPort 对象）   ← ❌ 死代码
│
└── ── 待从 kernel/contracts 删除 ──
├── kernel/contracts/file-system-port.ts   ← ❌
├── kernel/contracts/os-port.ts            ← ❌
├── kernel/contracts/path-port.ts          ← ❌
├── kernel/contracts/part-port.ts          ← ❌
```

### 2.2 调用关系

```
消费者 (CLI / Work / OXL / Daemon)
  │
  ├── import { fileExists, readFile, writeFile } from '../../infra/filesystem'
  │     ↓
  │   filesystem.ts (factory)
  │     ├── isBun() → bun/sync-fs.ts  → 同步 Node fs
  │     └── isBun() → node/sync-fs.ts → 同步 Node fs
  │
  ├── import { readTextFile, readJSONFile } from '../../infra/filesystem-async'
  │     ↓
  │   filesystem-async.ts (factory)
  │     ├── isBun() → bun/async-fs.ts  → Bun.file() / Bun.write()
  │     └── isBun() → node/async-fs.ts → fs.promises
  │
  └── import { spawn } from '../../infra/runtime/index'
        ↓
      runtime/index.ts (factory)
        ├── isBun() → bun/spawn.ts
        └── isBun() → node/spawn.ts
```

### 2.3 消费者选用规则

| 场景 | 入口 | 示例 |
|---|---|---|
| CLI 命令读写文件 | `filesystem.ts` | `const content = readFile(path)` |
| Work 引擎操作文件 | `filesystem.ts` | `writeFile(path, json)` |
| OXL 编译器读写 | `filesystem.ts` | `listDir(dir)` |
| Daemon 状态文件 | `filesystem.ts` | `fileExists(pidPath)` |
| probe handler 读文件 | `filesystem-async.ts` | `await readTextFile(path)` |
| probe handler 执行命令 | `runtime/index.ts` | `await spawn(['sh', '-c', cmd])` |
| 需要异步 IO 的场景 | `filesystem-async.ts` | `await readJSONFile(path)` |

---

## 3. 新增文件清单（7 文件）

### 3.1 `infra/runtime/types.ts`

```ts
// 共享类型接口 — 同时被 filesystem.ts 和 filesystem-async.ts 引用

export interface SyncFileSystem {
  fileExists(path: string): boolean
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  ensureDirectory(path: string): void
  deleteFile(path: string): void
  listDir(path: string): string[]
  isDirectory(path: string): boolean
  moveFile(src: string, dest: string): void
  copyFile(src: string, dest: string): void
  removeDir(path: string, options?: { recursive?: boolean }): void
  stat(path: string): { size: number; isFile: boolean; isDirectory: boolean } | null
}

export interface AsyncFileSystem {
  readTextFile(path: string): Promise<string | null>
  fileExists(path: string): Promise<boolean>
  writeFile(path: string, content: string): Promise<void>
  ensureDirectory(path: string): Promise<void>
  deleteFile(path: string): Promise<void>
  listDir(path: string): Promise<string[]>
  readJSONFile<T>(path: string): Promise<T | null>
  isDirectory(path: string): Promise<boolean>
  moveFile(src: string, dest: string): Promise<void>
  copyFile(src: string, dest: string): Promise<void>
  removeDir(path: string, options?: { recursive?: boolean }): Promise<void>
}
```

### 3.2 `infra/runtime/bun/sync-fs.ts`

```ts
import type { SyncFileSystem } from '../types'
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, renameSync, copyFileSync, rmSync, statSync } from 'fs'
import { dirname, join } from 'path'

export const bunSyncFs: SyncFileSystem = {
  fileExists: (path) => existsSync(path),
  readFile: (path) => {
    if (!existsSync(path)) return null
    try { return readFileSync(path, 'utf-8') } catch { return null }
  },
  writeFile: (path, content) => {
    const dir = dirname(path)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(path, content, 'utf-8')
  },
  ensureDirectory: (path) => {
    if (!existsSync(path)) mkdirSync(path, { recursive: true })
  },
  deleteFile: (path) => {
    if (existsSync(path)) unlinkSync(path)
  },
  listDir: (path) => readdirSync(path),
  isDirectory: (path) => {
    try { return statSync(path).isDirectory() } catch { return false }
  },
  moveFile: (src, dest) => {
    const dir = dirname(dest)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    renameSync(src, dest)
  },
  copyFile: (src, dest) => {
    const dir = dirname(dest)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    copyFileSync(src, dest)
  },
  removeDir: (path, opts) => rmSync(path, opts),
  stat: (path) => {
    try {
      const s = statSync(path)
      return { size: s.size, isFile: s.isFile(), isDirectory: s.isDirectory() }
    } catch { return null }
  },
}
```

### 3.3 `infra/runtime/node/sync-fs.ts`

内容完全同 `bun/sync-fs.ts`（同步 fs 在 Bun/Node 下无差异）。但保留为独立文件以保持架构一致性，未来有差异时只改此处。

### 3.4 `infra/filesystem.ts`（重写）

```ts
import type { SyncFileSystem } from './runtime/types'
import { isBun } from './runtime/detect'
import { bunSyncFs } from './runtime/bun/sync-fs'
import { nodeSyncFs } from './runtime/node/sync-fs'

export const fs: SyncFileSystem = isBun() ? bunSyncFs : nodeSyncFs

export const fileExists = fs.fileExists
export const readFile = fs.readFile
export const writeFile = fs.writeFile
export const ensureDirectory = fs.ensureDirectory
export const deleteFile = fs.deleteFile
export const listDir = fs.listDir
export const isDirectory = fs.isDirectory
export const moveFile = fs.moveFile
export const copyFile = fs.copyFile
export const removeDir = fs.removeDir
export const stat = fs.stat
```

### 3.5 `infra/runtime/bun/async-fs.ts`

```ts
import type { AsyncFileSystem } from '../types'

export const bunAsyncFs: AsyncFileSystem = {
  readTextFile: async (path) => {
    try { return await Bun.file(path).text() } catch { return null }
  },
  fileExists: async (path) => {
    try { return await Bun.file(path).exists() } catch { return false }
  },
  writeFile: async (path, content) => {
    await Bun.write(path, content)
  },
  ensureDirectory: async (path) => {
    // Bun 无内置递归 mkdir，转调 Node fs
    const { mkdir } = await import('node:fs/promises')
    try { await mkdir(path, { recursive: true }) } catch { /* exists */ }
  },
  deleteFile: async (path) => {
    const { unlink } = await import('node:fs/promises')
    try { await unlink(path) } catch { /* not exists */ }
  },
  listDir: async (path) => {
    const { readdir } = await import('node:fs/promises')
    return await readdir(path)
  },
  readJSONFile: async <T>(path: string): Promise<T | null> => {
    const text = await bunAsyncFs.readTextFile(path)
    if (text === null) return null
    try { return JSON.parse(text) as T } catch { return null }
  },
  isDirectory: async (path) => {
    const { stat } = await import('node:fs/promises')
    try { return (await stat(path)).isDirectory() } catch { return false }
  },
  moveFile: async (src, dest) => {
    const { rename, mkdir } = await import('node:fs/promises')
    const { dirname } = await import('path')
    const dir = dirname(dest)
    try { await mkdir(dir, { recursive: true }) } catch { /* exists */ }
    await rename(src, dest)
  },
  copyFile: async (src, dest) => {
    const { copyFile, mkdir } = await import('node:fs/promises')
    const { dirname } = await import('path')
    const dir = dirname(dest)
    try { await mkdir(dir, { recursive: true }) } catch { /* exists */ }
    await copyFile(src, dest)
  },
  removeDir: async (path, opts) => {
    const { rm } = await import('node:fs/promises')
    await rm(path, opts)
  },
}
```

### 3.6 `infra/runtime/node/async-fs.ts`

```ts
import type { AsyncFileSystem } from '../types'
import { readFile, writeFile, mkdir, readdir, unlink, rename, copyFile, rm, stat, access } from 'node:fs/promises'
import { dirname } from 'path'

export const nodeAsyncFs: AsyncFileSystem = {
  readTextFile: async (path) => {
    try { return await readFile(path, 'utf-8') } catch { return null }
  },
  fileExists: async (path) => {
    try { await access(path); return true } catch { return false }
  },
  writeFile: async (path, content) => {
    const dir = dirname(path)
    try { await mkdir(dir, { recursive: true }) } catch { /* exists */ }
    await writeFile(path, content, 'utf-8')
  },
  ensureDirectory: async (path) => {
    try { await mkdir(path, { recursive: true }) } catch { /* exists */ }
  },
  deleteFile: async (path) => {
    try { await unlink(path) } catch { /* not exists */ }
  },
  listDir: async (path) => readdir(path),
  readJSONFile: async <T>(path: string): Promise<T | null> => {
    const text = await nodeAsyncFs.readTextFile(path)
    if (text === null) return null
    try { return JSON.parse(text) as T } catch { return null }
  },
  isDirectory: async (path) => {
    try { return (await stat(path)).isDirectory() } catch { return false }
  },
  moveFile: async (src, dest) => {
    const dir = dirname(dest)
    try { await mkdir(dir, { recursive: true }) } catch { /* exists */ }
    await rename(src, dest)
  },
  copyFile: async (src, dest) => {
    const dir = dirname(dest)
    try { await mkdir(dir, { recursive: true }) } catch { /* exists */ }
    await copyFile(src, dest)
  },
  removeDir: async (path, opts) => rm(path, opts),
}
```

### 3.7 `infra/filesystem-async.ts`（新增）

```ts
import type { AsyncFileSystem } from './runtime/types'
import { isBun } from './runtime/detect'
import { bunAsyncFs } from './runtime/bun/async-fs'
import { nodeAsyncFs } from './runtime/node/async-fs'

export const fs: AsyncFileSystem = isBun() ? bunAsyncFs : nodeAsyncFs

export const readTextFile = fs.readTextFile
export const fileExists = fs.fileExists
export const writeFile = fs.writeFile
export const ensureDirectory = fs.ensureDirectory
export const deleteFile = fs.deleteFile
export const listDir = fs.listDir
export const readJSONFile = fs.readJSONFile
export const isDirectory = fs.isDirectory
export const moveFile = fs.moveFile
export const copyFile = fs.copyFile
export const removeDir = fs.removeDir
```

---

## 4. 修改文件清单

### 4.1 `infra/index.ts` — 更新便利 re-export

```ts
// 当前
export { fs } from './filesystem'
export { pathPort } from './path-port'

// 改为
export { fs } from './filesystem'
```

### 4.2 `infra/boundary.ts` — 删除 `osPort` 对象

保留 `getGlobalBoundaryPath()`、`BOUNDARY_DIR` 等函数（它们被 `cli/project.ts` 等引用），仅删除：

```ts
export const osPort: OsPort = { ... }  // ❌ 删除
```

### 4.3 `kernel/index.ts` — 删除 4 个 Port 的 type export

删除：
```ts
export type { FileSystemPort } from './contracts/file-system-port'
export type { OsPort } from './contracts/os-port'
export type { PathPort } from './contracts/path-port'
export type { PartPort } from './contracts/part-port'
```

### 4.4 Daemon 17 文件 — 统一 import 路径

当前：
```ts
import { existsSync, readFileSync } from '../infra/filesystem'
```

改为：
```ts
import { fileExists, readFile } from '../infra/filesystem'
```

这只是 API 名映射（`existsSync` → `fileExists`，`readFileSync` → `readFile`），行为不变。

### 4.5 其余 34 处 direct `import 'fs'`

详见 §6 迁移分段。

---

## 5. 删除文件清单（10 文件）

| 路径 | 原因 |
|---|---|
| `kernel/contracts/file-system-port.ts` | 无 kernel 消费者，被 `filesystem.ts` 取代 |
| `kernel/contracts/os-port.ts` | 无 kernel 消费者，无运行时引用 |
| `kernel/contracts/path-port.ts` | 无 kernel 消费者，无运行时引用 |
| `kernel/contracts/part-port.ts` | 无 kernel 消费者，无 Infra 实现 |
| `infra/file-system-port.ts` | 运行时实现无人引用 |
| `infra/path-port.ts` | 运行时实现无人引用 |
| `infra/boundary.ts`（`osPort` 对象） | 运行时实现无人引用 |
| `work/sandbox/sandbox-manager.ts` | 死代码，无人调用 `TaskSandbox.create()` |
| `work/blueprint-freezer.ts` 中 `PartPort` + `BlueprintFreezer` 相关 | 死代码，无人 `new BlueprintFreezer()` |
| `work/__tests__/` 中上述两个类的测试 | 类被删，测试根除 |

---

## 6. 迁移分段（6 阶段 + 3 子批）

### Phase 0 — 准备：创建 7 个新文件

| 文件 | 优先级 | 依赖 |
|---|---|---|
| `runtime/types.ts` | P0 | 无 |
| `runtime/bun/sync-fs.ts` | P0 | 无 |
| `runtime/node/sync-fs.ts` | P0 | 无 |
| `runtime/bun/async-fs.ts` | P0 | 无 |
| `runtime/node/async-fs.ts` | P0 | 无 |
| `filesystem.ts`（重写） | P0 | 以上 5 文件 |
| `filesystem-async.ts` | P0 | 以上 5 文件 |

**验证**：`bun test` 不变（旧 `filesystem.ts` 被重写，新文件无消费者）

---

### Phase 1 — CLI 迁移（22 文件，分批提交）

**Batch 1a（高频 6 文件）**：

| 文件 | 当前 `import 'fs'` | 改为 |
|---|---|---|
| `cli/proof.ts` | `existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync` | `fileExists, ensureDirectory, readFile, listDir, stat, deleteFile, writeFile` |
| `cli/work.ts` | `existsSync, mkdirSync, readdirSync, readFileSync, rmSync, unlinkSync, writeFileSync` | `fileExists, ensureDirectory, listDir, readFile, removeDir, deleteFile, writeFile` |
| `cli/domain.ts` | `existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync` | `fileExists, ensureDirectory, readFile, listDir, writeFile` |
| `cli/blueprint.ts` | 同上 | 同上 |
| `cli/init.ts` | `existsSync, mkdirSync, writeFileSync` | `fileExists, ensureDirectory, writeFile` |
| `cli/config-cmd.ts` | `existsSync, mkdirSync, readFileSync, writeFileSync` | `fileExists, ensureDirectory, readFile, writeFile` |

**验证**：`bun test` + 手动跑每个命令的 happy path

**Batch 1b（8 文件）**：

| 文件 | 当前 → 改为 |
|---|---|
| `cli/explore-cmd.ts` | `existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync` |
| `cli/task-filesystem.ts` | `appendFileSync, existsSync, readFileSync, renameSync, writeFileSync` → 注意 `appendFileSync` 需补到 sync API |
| `cli/install-skill.ts` | `existsSync, mkdirSync, readFileSync, writeFileSync` |
| `cli/skill-compiler.ts` | `existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync` |
| `cli/migrate-yaml.ts` | `existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync` |
| `cli/export.ts` | `existsSync, readFileSync` |
| `cli/debug.ts` | `appendFileSync, existsSync` |
| `cli/config-loader.ts` | `existsSync, readFileSync` |

**验证**：`bun test`

**Batch 1c（8 文件）**：

| 文件 | 当前 → 改为 |
|---|---|
| `cli/oxn-dual-track.ts` | `existsSync, readFileSync, writeFileSync` |
| `cli/oxn-compile.ts` | `existsSync, readFileSync` |
| `cli/oxn-validate.ts` | `existsSync, readdirSync, readFileSync` |
| `cli/project-config-io.ts` | `existsSync, readFileSync, writeFileSync` |
| `cli/cache-clear.ts` | `existsSync, readdirSync, rmSync` |
| `cli/cache-stats.ts` | `existsSync, readdirSync, statSync` |
| `cli/gc.ts` | `existsSync, readdirSync, rmSync, statSync` |
| `cli/migrate-probe-refs.ts` | `existsSync, readFileSync, writeFileSync` |

**验证**：`bun test`

---

### Phase 2 — Work 迁移（7 文件）

| 文件 | 当前 → 改为 |
|---|---|
| `work/birth-cert.ts` | `existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync` |
| `work/dual-state-exec.ts` | `existsSync, mkdirSync, renameSync, writeFileSync` |
| `work/dual-state-io.ts` | `existsSync, mkdirSync, readFileSync, renameSync, writeFileSync` |
| `work/per-work-blueprints-merger.ts` | `existsSync, readFileSync, writeFileSync, renameSync, mkdirSync` |
| `work/per-work-domains-merger.ts` | 同上 |
| `work/plan-hash.ts` | `existsSync, readdirSync, readFileSync, statSync` |
| `work/work-migrator.ts` | `existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync` |

**验证**：`bun test`

---

### Phase 3 — OXL 迁移（5 文件）

| 文件 | 当前 → 改为 |
|---|---|
| `oxl/compiler/blueprint-index-builder.ts` | `existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync` |
| `oxl/compiler/bundle-compiler.ts` | `existsSync, mkdirSync, readFileSync, writeFileSync` |
| `oxl/compiler/domain-index-builder.ts` | 同 blueprint-index-builder |
| `oxl/langium/oxn-document-builder.ts` | `existsSync, readFileSync` |
| `oxl/scope/oxn-workspace-manager.ts` | `existsSync, readdirSync, readFileSync` |
| `oxl/unpacker/bundle-unpacker.ts` | `existsSync, mkdirSync, readFileSync, writeFileSync` |

**验证**：`bun test`

---

### Phase 4 — Daemon 统一（17 文件）

当前 daemon 已走 `infra/filesystem` 但使用裸 Node API 名：

| 当前 | 改为 |
|---|---|
| `import { existsSync } from '../infra/filesystem'` | `import { fileExists } from '../infra/filesystem'` |
| `import { readFileSync } from '../infra/filesystem'` | `import { readFile } from '../infra/filesystem'` |
| `import { writeFileSync } from '../infra/filesystem'` | `import { writeFile } from '../infra/filesystem'` |
| `import { mkdirSync } from '../infra/filesystem'` | `import { ensureDirectory } from '../infra/filesystem'` |
| `import { unlinkSync } from '../infra/filesystem'` | `import { deleteFile } from '../infra/filesystem'` |
| `import { appendFileSync } from '../infra/filesystem'` | `import { appendFile } from '../infra/filesystem'`（需补到 sync API） |
| `import { rmSync } from '../infra/filesystem'` | `import { removeDir } from '../infra/filesystem'` |
| `import { readdirSync } from '../infra/filesystem'` | `import { listDir } from '../infra/filesystem'` |

**验证**：`bun test`

---

### Phase 5 — Infra probes 迁移（10 文件）

这些文件是 probe handler，**不迁移到 `filesystem.ts`**，而是迁移到 **`filesystem-async.ts`**（异步）或 **`runtime/spawn.ts`**（进程执行）：

| 文件 | 当前 | 改为 |
|---|---|---|
| `probes/fs-exists.ts` | `statSync` from `fs` | `import { fileExists } from '../filesystem-async'` |
| `probes/fs-not-exists.ts` | `statSync` from `fs` | 同上 |
| `probes/fs-match.ts` | `readFileSync` from `fs` | `import { readTextFile } from '../filesystem-async'` |
| `probes/fs-parseable.ts` | `readFileSync` from `fs` | `import { readJSONFile } from '../filesystem-async'` |
| `probes/fs-content-match.ts` | 待确认 | 同 |
| `probes/deps-resolved.ts` | `existsSync, readFileSync` from `fs` | `import { fileExists, readFile } from '../filesystem-async'` |
| `probes/insight-collector.ts` | `existsSync, readFileSync` from `fs` | `import { fileExists, readTextFile } from '../filesystem-async'` |
| `probes/probe-stats-store.ts` | `existsSync, mkdirSync, readFileSync, renameSync, writeFileSync` from `fs` | `import { fileExists, ensureDirectory, readTextFile, moveFile, writeFile } from '../filesystem-async'` |
| `probes/ts-compiles.ts` | `existsSync, unlinkSync, writeFileSync` from `fs` | `import { fileExists, deleteFile, writeFile } from '../filesystem-async'` |
| `probes/file-exports.ts` | `existsSync` from `fs` | `import { fileExists } from '../filesystem-async'` |

**注意**：这些 handler 同时也要迁移 `Bun.spawn` → `runtime/spawn`，属于 runtime adapter 的实施范围。两件事可以同时做（同一个文件）。

**验证**：`bun test`

---

### Phase 6 — 清理死代码（10 文件删除）

| 顺序 | 文件 | 说明 |
|---|---|---|
| 6a | `kernel/contracts/file-system-port.ts` | 删除 |
| 6a | `kernel/contracts/os-port.ts` | 删除 |
| 6a | `kernel/contracts/path-port.ts` | 删除 |
| 6a | `kernel/contracts/part-port.ts` | 删除 |
| 6a | `kernel/index.ts`（删 4 行 export type） | 编辑 |
| 6b | `infra/file-system-port.ts` | 删除 |
| 6b | `infra/path-port.ts` | 删除 |
| 6b | `infra/boundary.ts`（`osPort` 对象） | 编辑 |
| 6b | `infra/index.ts`（删 `pathPort` re-export） | 编辑 |
| 6c | `work/sandbox/sandbox-manager.ts` | 整个文件删除 |
| 6c | `work/blueprint-freezer.ts`（`PartPort` + `BlueprintFreezer` 类） | 编辑，保留 `LineageReport` 等被引用部分 |
| 6d | 上述文件对应的 `__tests__/` | 删除 |

**验证**：`bun run typecheck` 0 error + `bun test`

---

## 7. `infra/filesystem.ts` 原文件升级说明

当前 `filesystem.ts`（147 行）需要做的事：

| 操作 | 内容 |
|---|---|
| 删除 | `import type { FSWatcher } from 'fs'` + 裸 `import { appendFileSync, ... } from 'fs'` |
| 删除 | `function ensureDir()` / `function atomicWrite()` 内部辅助函数 |
| 删除 | 全部具名函数（`ensureDirectory`, `directoryExists` 等） |
| 删除 | `export const fs = { ... }` 聚合对象 |
| 删除 | `export type { FSWatcher }` |
| 删除 | 裸 Node re-export（`export { existsSync, readFileSync, ... }`） |
| 新增 | `import type { SyncFileSystem } from './runtime/types'` |
| 新增 | `import { isBun } from './runtime/detect'` |
| 新增 | `import { bunSyncFs } from './runtime/bun/sync-fs'` |
| 新增 | `import { nodeSyncFs } from './runtime/node/sync-fs'` |
| 新增 | factory 代码（`export const fs = isBun() ? bunSyncFs : nodeSyncFs`） |
| 新增 | 具名函数导出（`export const fileExists = fs.fileExists` 等） |

相当于**整个文件重写**（约 60 行）。

---

## 8. 测试策略

### 8.1 新增测试

| 测试文件 | 测试数 | 内容 |
|---|---|---|
| `infra/runtime/__tests__/sync-fs.test.ts` | 6 | `fileExists` / `readFile` / `writeFile` / `ensureDirectory` / `listDir` / `deleteFile` |
| `infra/runtime/__tests__/async-fs.test.ts` | 6 | `readTextFile` / `fileExists` / `readJSONFile` / `writeFile` / `ensureDirectory` / `listDir` |
| `infra/__tests__/filesystem.test.ts` | 3 | factory 正确选择 Bun/Node 实现 |
| `infra/__tests__/filesystem-async.test.ts` | 3 | 同上 |

### 8.2 回归保护

- 每个 Phase 做完跑 `bun test`（1033+ 既有测试，零回归）
- CLI 命令手动验证：`oxn init`、`oxn proof create`、`oxn work create`
- Daemon 手动验证：`oxn daemon start` + `oxn daemon status`

---

## 9. 工作量估算

| Phase | 内容 | 文件数 | 人天 |
|---|---|---|---|
| P0 | 创建 7 个新文件 + 重写 `filesystem.ts` | 7+1 | 0.5 |
| P1a | CLI 高频 6 文件迁移 | 6 | 0.5 |
| P1b | CLI 中频 8 文件迁移 | 8 | 0.5 |
| P1c | CLI 低频 8 文件迁移 | 8 | 0.5 |
| P2 | Work 7 文件迁移 | 7 | 0.5 |
| P3 | OXL 6 文件迁移 | 6 | 0.5 |
| P4 | Daemon 17 文件统一 | 17 | 0.5 |
| P5 | Infra probes 10 文件迁移 | 10 | 0.5（与 runtime adapter 重叠） |
| P6 | 清理死代码 10 文件 | 10 | 0.5 |

**总工作量**：约 **4.5 人天**。与 runtime adapter 实施重叠约 1 天（probe handler 改造）。

---

## 10. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| CLI 22 文件迁移量大，遗漏某个 `import 'fs'` | 中 | 编译错误 | 每批改完 `bun run build` |
| Daemon 迁移后 import 路径不对 | 中 | daemon 启动失败 | 手动跑 `oxn daemon start` |
| `infra/boundary.ts` `osPort` 删除后有人引用 | 低 | 编译错误 | 先 grep 确认，后删除 |
| `work/sandbox/sandbox-manager.ts` 真有人在用 | 低 | 运行时炸 | 先 grep 确认 `TaskSandbox.create()` 调用者 |
| Phase 5 与 runtime adapter 的 probe handler 改造同一批文件 | 高 | 并行冲突 | 两件事同一人同一批做，先做 import 迁移再做 spawn 迁移 |

---

## 11. 不开工项

- ❌ `infra/hash.ts` 不变（它自己已经是一个抽象）
- ❌ `infra/socket.ts` 不变（它已经通过 infra 暴露）
- ❌ `infra/process.ts` 不变（它已经通过 infra 暴露，后续会被 runtime/spawn 替换）
- ❌ `infra/paths.ts` + `infra/global.ts` 不变（纯路径计算，不做 IO）
- ❌ `kernel/contracts/hash-port.ts` 保留（有 kernel 消费者）
- ❌ `kernel/contracts/probe-port.ts` 保留（有 kernel 消费者）
- ❌ `kernel/contracts/iap-error.ts` 保留（是具体类）
- ❌ `kernel/contracts/name-canonical.ts` 保留（是具体函数）
