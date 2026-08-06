---
id: infra-ports
theme: Infra 扩展：ResourcePort / CachePort / WorkSnapshot
priority: high
status: planned
created-at: 2026-07-28
scheduled-version: ~
synced-at: 2026-08-06
note: |
  从 dev/versions/infra-ports（按 0-X-Y-<slug> 命名）回滚（去版本化）。
  scheduling 时由工程师判定版本号 + git mv 到 dev/versions/<slug>.md。
rfc:
  - dev/versions/0-7-0-emergence.md
adr:
  - docs/adrs/0028-resource-port-cache-port-work-snapshot.md
promoted-from: .openxenon/drafts/.archived/rfc/v0.7.0-infra-ports-rfc.md
---

# Infra 扩展：ResourcePort / CachePort / WorkSnapshot

> **状态**：📝 Draft（待 review）
> **目标版本**：~（scheduling 决定）（首个 v0.7 minor，与 emergence RFC 并行）
> **前置依赖**：v0.6.1（信任链就位；原 v0.6.5 已并入 v0.7，见 dev/meta/version-unification.md）
> **核心交付**：Infra Port 扩展 — ResourcePort（虚拟 FS）+ CachePort（RAM/Redis）+ WorkSnapshot（序列化）
> **来源**：[ADR-0028](/Users/issac/pro/openxenon/docs/adrs/0028-resource-port-cache-port-work-snapshot.md) · docs_tmp/mirage-1.md (2026-06-11)
> **原路径**：`.openxenon/drafts/rfc/v0.7.0-infra-ports-rfc.md`（已归档）

---

## 0. 背景与动机

当前 L1-Infra 仅支持**本地 fs**（`packages/engine/src/infra/filesystem.ts`）。v0.7.0 引入 3 个 Port，让 Work 能挂载外部资源 / 共享内存 / 可序列化快照：

```
Work → ResourcePort  → S3 / Slack / Gmail / GitHub  # 外部资源虚拟 FS
Work → CachePort     → RAM (default) / Redis        # 共享内存缓存
Work → WorkSnapshot  → 序列化全状态                 # 跨进程 / 跨设备传输
```

应用场景：
1. **跨域 Work 共享缓存**：`fs-exists` 重复调用 → CachePort 命中
2. **远程资源审计**：Slack 频道消息作为 Probe 目标 → ResourcePort
3. **CI/CD 集成**：Work 状态可序列化 → 跨 CI 节点传输

---

## 1. ResourcePort（虚拟 FS）

### 1.1 契约

```ts
// packages/engine/src/kernel/contracts/resource-port.ts
export interface ResourcePort {
  // 路径 → 远端资源（S3 / Slack / Gmail 等）
  read(path: string): Promise<Buffer>
  list(prefix: string): Promise<string[]>
  exists(path: string): Promise<boolean>
  // 元数据
  metadata(path: string): Promise<{ size: number; modifiedAt: string; etag?: string }>
}
```

### 1.2 实现

```
packages/engine/src/infra/resource/
├── resource-port.ts            # 接口（已在 contracts/）
├── s3-resource.ts              # AWS S3 backend
├── slack-resource.ts           # Slack 文件 backend
├── fs-resource.ts              # 本地 fs 包装（与现有 filesystem-async 集成）
└── resource-router.ts          # 路由 path 前缀到具体 backend
```

### 1.3 路径语法

```oxl
probe "check-s3-config" {
  ref = "@oxn/probe/fs-content-match"
  params = {
    path: "s3://my-bucket/config.json"   // 走 S3Resource
    pattern: '"version": "1\\.[0-9]+"'
  }
}
```

### 1.4 反模式

- ❌ ResourcePort 写入操作（只读，**仅**审计）
- ❌ ResourcePort 跨域 hardlink（安全）

---

## 2. CachePort（RAM / Redis 双模式）

### 2.1 契约

```ts
// packages/engine/src/kernel/contracts/cache-port.ts
export interface CachePort {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  // 批量
  mget<T>(keys: string[]): Promise<Map<string, T>>
  mset<T>(entries: Map<string, T>, ttlMs?: number): Promise<void>
}
```

### 2.2 实现

```
packages/engine/src/infra/cache/
├── cache-port.ts               # 接口
├── ram-cache.ts                # 默认（Map + LRU + TTL）
├── redis-cache.ts              # 可选（ioredis 客户端）
└── cache-factory.ts            # 选 RAM 或 Redis
```

### 2.3 集成 Probe-stats

`packages/engine/src/infra/probes/probe-stats-store.ts` 改造：

```ts
// v0.6.x：纯 JSON 文件 IO
// v0.7.0：通过 CachePort 读写（RAM 优先 + 异步落盘）
const cache = await getCachePort('probe-stats')
const stats = await cache.get('probe-stats') ?? emptyStats
const updated = updateProbeStats(stats, frozen)
await cache.set('probe-stats', updated, 86400_000)  // 24h TTL
await persistToDisk(updated)  // async write
```

### 2.4 性能预期

| 操作 | v0.6.x（文件 IO） | v0.7.0（RAM Cache） |
|---|---|---|
| `get probe-stats` | 5-20ms | < 0.1ms |
| 100 Probe 并发 update | 50ms 串行 | 5ms 并行 |

---

## 3. WorkSnapshot（序列化全状态）

### 3.1 契约

```ts
// packages/engine/src/Work/work-snapshot.ts
export interface WorkSnapshot {
  version: '0.7.0'
  workName: string
  capturedAt: string  // ISO 8601
  // 全状态可序列化
  state: WorkspaceState
  frozen: FrozenJson
  trace: TraceEvent[]
  // 引用
  domains: string[]
  blueprints: string[]
}
```

### 3.2 实现

```ts
export async function captureWorkSnapshot(workName: string): Promise<Buffer> {
  const state = await readWorkState(workName)
  const frozen = await readWorkFrozen(workName)
  const trace = await readWorkTrace(workName)
  const domains = await readWorkDomainsIndex(workName)
  const blueprints = await readWorkBlueprintsIndex(workName)

  const snapshot: WorkSnapshot = { version: '0.7.0', workName, capturedAt: now(), state, frozen, trace, domains, blueprints }
  return Buffer.from(JSON.stringify(snapshot, null, 2))
}

export async function restoreWorkSnapshot(snapshotBuf: Buffer): Promise<void> {
  const snapshot = JSON.parse(snapshotBuf.toString()) as WorkSnapshot
  // 原子写入 .run/ + .work
  // ...
}
```

### 3.3 CLI

```bash
oxn work snapshot <work>              # → .openxenon/works/<w>/.snapshot.json
oxn work snapshot <work> --export     # → stdout（Base64）
oxn work restore <work> --from <file> # 从 snapshot 恢复
```

---

## 4. 物理布局（v0.7.0 新增/修改）

### 4.1 新增

```
packages/engine/src/kernel/contracts/
├── resource-port.ts                    # ResourcePort 接口
└── cache-port.ts                       # CachePort 接口

packages/engine/src/infra/
├── resource/
│   ├── resource-port.ts                # 实现 + Router
│   ├── fs-resource.ts                  # 本地 fs 包装
│   ├── s3-resource.ts                  # AWS S3 backend (可选)
│   ├── slack-resource.ts               # Slack backend (可选)
│   └── __tests__/resource-port.test.ts # 8 cases
├── cache/
│   ├── cache-port.ts                   # 实现
│   ├── ram-cache.ts                    # 默认
│   └── __tests__/cache-port.test.ts    # 10 cases

packages/engine/src/Work/
├── work-snapshot.ts                    # captureWorkSnapshot + restoreWorkSnapshot
└── __tests__/work-snapshot.test.ts     # 6 cases

packages/cli/src/commands/
├── work-snapshot.ts                    # oxn work snapshot
├── work-restore.ts                     # oxn work restore
└── __tests__/work-snapshot-e2e.test.ts # 4 cases
```

### 4.2 修改

- `packages/engine/src/infra/probes/probe-stats-store.ts` — 集成 CachePort
- `packages/engine/src/Work/index.ts` — 导出 snapshot 函数
- `packages/cli/src/commands/work.ts` — 注册 snapshot / restore 子命令

### 4.3 可选依赖

- `@aws-sdk/client-s3`（仅启用 S3 backend 时）
- `ioredis`（仅启用 Redis cache 时）
- **npm 发包约束**：v0.7.0 不强制依赖 → 工程师按需安装（避免 bloat）

---

## 5. 测试统计

| 类型 | 文件 | 数量 |
|---|---|---|
| 单元 | resource-port + fs-resource | 8 |
| 单元 | cache-port + ram-cache | 10 |
| 单元 | work-snapshot | 6 |
| E2E | work-snapshot CLI | 4 |
| 集成 | probe-stats + cache | 3 |
| **合计** | — | **31** |

**验收门槛**（含 emergence RFC 的 31）：≥ 2,058 pass（前置版本末 1,996 + 31 + 31）

---

## 6. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| Cache 与 disk 数据不一致 | 中 | 中 | 启动时 disk-rehydrate cache + 异步落盘 |
| ResourcePort 远程 IO 慢 | 中 | 中 | Probe-level timeout（默认 30s） |
| WorkSnapshot 大文件（>10MB） | 低 | 低 | gzip 压缩 + 分片 |
| S3 / Redis 凭据泄露 | 低 | 高 | 仅从 `OXN_*` env 读取，**不**入 git |

---

## 7. v0.7.0 不做

- ResourcePort 写入 / 修改（**只读**，写仍走 fs）
- 跨设备 WorkSnapshot 同步（v0.8 WebSocket）
- Redis Cluster / 多层 Cache（v1.0）

---

## 8. 参考

- [ADR-0028](../adrs/0028-resource-port-cache-port-work-snapshot.md)
- [v0.7 Emergence RFC](./v0.7-emergence-rfc.md) §0 关键决策（CachePort 为可观测性 hot path）
- [v0.7+ Roadmap Overview](../v0.7-plus-roadmap/overview.md) §2 v0.7 阶段

---

**作者**：docs-tmp-cleanup work @ 2026-07-05
**目标发布**：v0.7.0 = 2026-11-15（与 emergence RFC 并行）