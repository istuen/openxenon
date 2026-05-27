## Context

### 背景现状

当前 OpenXenon 在两个层级使用 SQLite 数据库：

**全局层级**（`~/.openxenon/`）：
- `core.oxn`：存储已注册项目列表（projects 表）和 Daemon 配置（daemon_config 表）

**项目层级**（`.openxenon/`）：
- `project.oxn`：存储项目配置（config 表），包括 space mode

```typescript
// 当前实现
// src/core/global.ts:5
export const CORE_DB_PATH = join(GLOBAL_BOUNDARY_PATH, 'core.oxn')

// src/core/project.ts:7-8
export function getProjectDbPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'project.oxn')
}
```

这些数据库由以下模块管理：
- `src/db/init.ts` - 数据库初始化
- `src/db/schema/core.ts` - 表结构定义
- `src/db/operations/config.ts` - config 表 CRUD
- `src/db/operations/daemon-config.ts` - daemon_config 表 CRUD
- `src/core/boundary.ts` - core.oxn 初始化封装
- `src/core/boundary-project.ts` - project.oxn 初始化封装

### 约束条件

- 必须保持向后兼容：已有的 `.oxn` 文件应被忽略（v0.1.0 早期采用者需迁移）
- JSON 文件路径尽量保持与原数据库路径一致（便于定位）
- 配置读取失败时应有合理的默认值
- 需要支持 `oxn init` 和 `oxn daemon start` 的首次运行场景

---

## Goals / Non-Goals

**Goals:**
- 删除全部 SQLite 数据库依赖（`core.oxn`、`project.oxn`）
- 用 JSON 文件替代数据库的 CRUD 操作
- 保持 `.openxenon/` 目录结构不变，只替换文件格式
- 使 `openspec/changes/remove-database-layer` 成为其他所有 change 的前置依赖

**Non-Goals:**
- 不实现数据库迁移工具（已有 .oxn 文件的用户需手动删除）
- 不实现 JSON schema 验证（v0.1.0 保持简单）
- 不实现配置热重载（每次读取都从文件加载）
- 不实现多用户并发写入保护（daemon 是单进程模型）

---

## Decisions

### Decision 1: JSON 文件替代方案

| 原数据库表 | 替代 JSON 文件 | 路径 |
|-----------|---------------|------|
| `projects` | `projects.json` | `~/.openxenon/projects.json` |
| `daemon_config` | `daemon-config.json` | `~/.openxenon/daemon-config.json` |
| `config` | `config.json` | `.openxenon/config.json` |

**文件格式设计**：

```typescript
// ~/.openxenon/projects.json
interface ProjectsJson {
  version: 1
  projects: Array<{
    id: string
    path: string      // 项目绝对路径
    name: string
    status: 'active' | 'inactive'
    lastHeartbeat: number  // Unix ms
    createdAt: number
    updatedAt: number
  }>
}

// ~/.openxenon/daemon-config.json
interface DaemonConfigJson {
  version: 1
  address: string | null  // Unix socket path
  startedAt: number | null
}

// .openxenon/config.json
interface ProjectConfigJson {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
}
```

**为什么用单独文件而非单一 config**：
- 不同层级的配置（全局 vs 项目）
- 避免单一文件过大
- 便于 future extension（未来可独立更新某类配置）

---

### Decision 2: `src/core/global.ts` 改造

```typescript
// 修改前
export const CORE_DB_PATH = join(GLOBAL_BOUNDARY_PATH, 'core.oxn')

// 修改后
export const CORE_PROJECTS_PATH = join(GLOBAL_BOUNDARY_PATH, 'projects.json')
export const CORE_DAEMON_CONFIG_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon-config.json')

// 保留（不变）
export const GLOBAL_BOUNDARY_PATH = join(homedir(), '.openxenon')
export const DAEMON_SOCK_PATH = join(GLOBAL_BOUNDARY_PATH, 'daemon.sock')
```

---

### Decision 3: `src/core/project.ts` 改造

```typescript
// 修改前
export function getProjectDbPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'project.oxn')
}

// 修改后
export function getProjectConfigPath(projectRoot: string): string {
  return join(getProjectBoundaryPath(projectRoot), 'config.json')
}
```

`getProjectDbPath()` 函数删除，调用方全部改为 `getProjectConfigPath()`。

---

### Decision 4: 配置 CRUD 函数设计

**projects.json 操作**：

```typescript
// src/core/projects.ts (新建)
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { CORE_PROJECTS_PATH } from './global'

interface ProjectRecord {
  id: string
  path: string
  name: string
  status: 'active' | 'inactive'
  lastHeartbeat: number
  createdAt: number
  updatedAt: number
}

function readProjects(): ProjectRecord[] {
  if (!existsSync(CORE_PROJECTS_PATH)) return []
  return JSON.parse(readFileSync(CORE_PROJECTS_PATH, 'utf-8')).projects ?? []
}

function writeProjects(projects: ProjectRecord[]): void {
  writeFileSync(CORE_PROJECTS_PATH, JSON.stringify({ version: 1, projects }, null, 2))
}

export function registerProject(projectRoot: string, name: string): ProjectRecord {
  const projects = readProjects()
  const existing = projects.find(p => p.path === projectRoot)
  if (existing) {
    existing.lastHeartbeat = Date.now()
    existing.updatedAt = Date.now()
  } else {
    projects.push({
      id: crypto.randomUUID(),
      path: projectRoot,
      name,
      status: 'active',
      lastHeartbeat: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now()
    })
  }
  writeProjects(projects)
  return existing ?? projects[projects.length - 1]
}

export function getAllProjects(): ProjectRecord[] {
  return readProjects()
}
```

**daemon-config.json 操作**：

```typescript
// src/core/daemon-config.ts (新建)
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { CORE_DAEMON_CONFIG_PATH } from './global'

interface DaemonConfig {
  version: 1
  address: string | null
  startedAt: number | null
}

function readDaemonConfig(): DaemonConfig {
  if (!existsSync(CORE_DAEMON_CONFIG_PATH)) {
    return { version: 1, address: null, startedAt: null }
  }
  return JSON.parse(readFileSync(CORE_DAEMON_CONFIG_PATH, 'utf-8'))
}

export function getDaemonAddress(): string | null {
  return readDaemonConfig().address
}

export function setDaemonAddress(address: string): void {
  const config = readDaemonConfig()
  config.address = address
  writeFileSync(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2))
}

export function clearDaemonAddress(): void {
  const config = readDaemonConfig()
  config.address = null
  writeFileSync(CORE_DAEMON_CONFIG_PATH, JSON.stringify(config, null, 2))
}
```

**config.json 操作**（项目级）：

```typescript
// src/core/config.ts (新建或改造)
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { getProjectConfigPath } from './project'

interface ProjectConfig {
  version: 1
  mode: 'PRODUCTION' | 'SANDBOX'
}

function readConfig(projectRoot: string): ProjectConfig {
  const configPath = getProjectConfigPath(projectRoot)
  if (!existsSync(configPath)) {
    return { version: 1, mode: 'PRODUCTION' }
  }
  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

export function getSpaceMode(projectRoot: string): 'PRODUCTION' | 'SANDBOX' {
  return readConfig(projectRoot).mode
}

export function setSpaceMode(projectRoot: string, mode: 'PRODUCTION' | 'SANDBOX'): void {
  const configPath = getProjectConfigPath(projectRoot)
  const config = readConfig(projectRoot)
  config.mode = mode
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}
```

---

### Decision 5: 删除 vs 保留的文件

**必须删除**：
```
src/db/                           # 整个目录
src/core/boundary.ts              # 封装 core.oxn 初始化
src/core/boundary-project.ts      # 封装 project.oxn 初始化
```

**需要修改**：
```
src/core/global.ts                # 移除 CORE_DB_PATH，添加 JSON 路径常量
src/core/project.ts               # 移除 getProjectDbPath()，添加 getProjectConfigPath()
src/server.ts                     # 移除 initCoreDb 调用
src/api/context.ts                # 移除 initProjectDb 调用
src/commands/api/base.ts          # 移除全部 db 导入
src/commands/init.ts              # 改用 JSON 文件
src/runtimes/bun.adapter.ts       # 移除 XnMigrator 导入
src/runtimes/interfaces/store.interface.ts  # 移除 XnMigrator
```

**新增**：
```
src/core/projects.ts              # projects.json CRUD
src/core/daemon-config.ts         # daemon-config.json CRUD
src/core/config.ts                # config.json CRUD
```

---

## Risks / Trade-offs

| Risk | 描述 | Mitigation |
|------|------|------------|
| **已有 .oxn 文件残留** | 旧用户升级后 `.oxn` 文件仍在，代码不再使用 | 在 `oxn init` 时检查并警告用户删除旧数据库文件 |
| **JSON 文件损坏** | 如果写入时崩溃，可能读到 partial JSON | 写入前先写 .tmp，然后 rename（复用 atomic-manifest-write 的模式） |
| **并发写入冲突** | 如果多个进程同时写 projects.json | v0.1.0 假设单 daemon 进程，暂无此问题 |
| **删除 CORE_DB_PATH 后测试失败** | 测试代码直接引用 `initCoreDb` | 删除测试文件或 mock 新的 JSON 函数 |

---

## Migration Plan

### 对于新用户（无旧数据）
1. 运行 `oxn init` 或 `oxn daemon start`
2. 系统创建 `~/.openxenon/` 目录结构
3. JSON 文件按需创建（首次写入时）

### 对于已有 .oxn 文件的旧用户
1. **检测**：如果 `~/.openxenon/core.oxn` 存在，在首次运行新版本时输出警告
2. **迁移**（可选）：运行 `oxn migrate --from-db` 命令将现有数据导出为 JSON
3. **清理**：用户手动删除 `.oxn` 文件

```bash
# 迁移命令（如果用户需要）
oxn migrate --to-json
# 读取 core.oxn → 写入 projects.json
# 删除 core.oxn
```

### 执行顺序
1. 先实现 JSON CRUD 函数（`projects.ts`, `daemon-config.ts`, `config.ts`）
2. 更新 `global.ts` 和 `project.ts`
3. 更新所有引用方（server.ts, context.ts, base.ts 等）
4. 删除废弃文件
5. 运行测试

---

## Open Questions

1. **是否需要在 projects.json 中保留 lastHeartbeat 字段**？
   - 原数据库有 `last_heartbeat` 字段，但 Daemon 心跳检测现在由内存 Map 维护
   - projects.json 中的 heartbeat 可能已无实际用途

2. **daemon-config.json 的 `startedAt` 字段是否需要**？
   - 原 daemon_config 只有 `daemon_address` 一项
   - `startedAt` 是新加的，用于追踪 daemon 最后启动时间

3. **是否需要 version 字段**？
   - 添加 `version: 1` 便于未来 JSON schema 升级
   - 读取时检查 version，如果不兼容可以提示用户
