# Probe 挂载系统（Probe Mount System）设计文档

> **状态**：Draft v0.1 — 设计评审稿，**未实现**
>
> **物理归属**：本文档位于 `docs/architecture/`，对应未来 L1-Infra 新增模块 `src/infra/resources/`（详见 §13 路线图）。
>
> **宪法基线**：完整 L0–L3 分层与依赖规则见 [L0-L3 宪法](./l0-l3-constitution.md)。本文所有边界设计均以宪法为前置约束。

## 目录

- [1. 背景与动机](#1-背景与动机)
- [2. 目标与非目标](#2-目标与非目标)
- [3. 核心思想：一切皆路径，由 MountRegistry 路由](#3-核心思想一切皆路径由-mountregistry-路由)
- [4. 概念模型与术语](#4-概念模型与术语)
- [5. 架构总览](#5-架构总览)
- [6. 数据模型](#6-数据模型)
- [7. 关键流程](#7-关键流程)
- [8. 配置文件规范（`mounts.yaml`）](#8-配置文件规范mountsyaml)
- [9. CLI 命令设计](#9-cli-命令设计)
- [10. 错误模型](#10-错误模型)
- [11. 与 frozen.json 的关系](#11-与-frozenjson-的关系)
- [12. 架构边界（L0–L3 不变量）](#12-架构边界l0l3-不变量)
- [13. 与 Mirage 的对照与定位差异](#13-与-mirage-的对照与定位差异)
- [14. 实施路线图（仅规划，v0.1 不执行代码）](#14-实施路线图仅规划v01-不执行代码)
- [15. 决策记录（ADR）](#15-决策记录adr)
- [16. 开放问题与待评审项](#16-开放问题与待评审项)
- [17. 参考资料](#17-参考资料)

---

## 1. 背景与动机

### 1.1 现状

OpenXenon 当前 Probe 体系（`fs-exists` / `fs-contains` / `http-status` / `shell-exec` / `git-*` 等）的"事实获取"能力**局限于两类来源**：

| 来源 | 现状 | 局限 |
|------|------|------|
| **本地文件系统** | 通过 `FileSystemPort` 直读 | 仅限本地 fs，无远程后端抽象 |
| **直连 HTTP** | 通过 `http-responds` 拉取 URL | 单一请求，缺缓存、缺认证复用、缺指标化挂载 |

随着 OXN 进入验证真实业务系统的阶段（部署产物、S3 日志、GitHub 仓库、Slack 消息……），需要验证的"事实"不再局限于本地 fs。

### 1.2 痛点

1. **每新增一种后端要写一个 Probe**——把 `fs-contains` 的实现复制粘贴 7 遍，分别走 `fs` / `s3` / `github` / `slack` / `db` / `redis` / `http`
2. **Probe 逻辑被 IO 细节污染**——L0 Kernel 应当只关心"路径是否存在 / 内容是否匹配"，不应当关心后端协议
3. **缺乏统一的缓存层**——每次 Proof 重跑都重新拉取，Token 消耗与延迟不可控
4. **缺乏统一的快照语义**——当前 frozen.json 只记录 probe 通过/失败事实，不记录"事实来源的状态"

### 1.3 灵感来源

[strukto-ai/mirage](https://github.com/strukto-ai/mirage) 的"统一虚拟文件系统"思想：将 S3 / Google Drive / Slack / Gmail / Redis / PostgreSQL 等后端统一挂载为一棵文件系统树，Agent 用 bash 命令跨服务操作。

**OXN 不需要 Mirage 本身作为依赖**（详见 §13），但其"Resource 抽象 + 路径语义统一 + 命令覆写 + 两层缓存"思想高度契合 OXN 的扩展需求。

---

## 2. 目标与非目标

### 2.1 目标

| ID | 目标 | 验证标准 |
|----|------|----------|
| G1 | **统一路径语义** | Probe 用同一种路径写法访问任意后端：`fs-exists /mnt/s3/bucket/key.json` |
| G2 | **L0 零侵入** | L0 Kernel 不感知挂载源类型，`target` 字段保持路径字符串 |
| G3 | **声明式配置** | 用户写 YAML，OXN 加载，无需改动代码 |
| G4 | **可快照** | frozen.json 默认只存哈希；`--replay` 才重 IO |
| G5 | **可测试** | ResourcePort 可在测试中用 fake 替换，与宪法"Port 可被 mock 替换"约束一致 |

### 2.2 非目标（v0.1 范围外）

| ID | 非目标 | 理由 |
|----|--------|------|
| N1 | **不做通用 bash 沙箱** | Mirage 的核心能力；OXN 的输入是声明式 Probe，不是命令 |
| N2 | **不做工作空间级别快照** | OXN 用 Proof 不可变快照替代；tar/快照是 Mirage 的产物模型 |
| N3 | **不开放第三方插件注册** | v0.1 阶段先内置 `local` + `http`，API 稳定后再开放 |
| N4 | **不做分布式缓存** | Redis 后端留作 v0.2+，v0.1 仅 RAM 缓存 |
| N5 | **不做 Probe 管道组合** | `fs-fetch→grep→count` 等组合语义留作 v0.2+ |

---

## 3. 核心思想：一切皆路径，由 MountRegistry 路由

**核心命题**：

> **Probe 接收的是路径，返回的是事实——它不应当关心这条路径落在磁盘上还是 S3 上还是 Slack 频道里。**

**路由模型**：

```
┌────────────────────────────────────────────────────────────┐
│  Probe: fs-exists({ target: "/repo/mirage/README.md" })    │
└────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  MountRegistry.resolve(target)        │
        │  → 匹配最长 prefix 的 MountDecl       │
        │  → 返回 { mount, relative, port }     │
        └───────────────────────────────────────┘
                            │
                ┌───────────┼───────────┐
                ▼           ▼           ▼
         /local/...    /cdn/...    /s3/...   ← 多个 mount 并存
                │           │           │
                ▼           ▼           ▼
          LocalFsPort  HttpPort    S3Port   ← 不同 Port 实现
```

**关键不变量**：

- `target` 永远是**绝对路径**字符串（v0.1 与 OXN 既有约定一致）
- `MountRegistry` 是**纯前缀树**，无业务字段
- `ResourcePort` 是**异步 IO 抽象**，可被 fake 替换
- L0 Kernel 调用 `port.exists(relative)` 与调 `fs.existsSync` **语义等价**

---

## 4. 概念模型与术语

| 术语 | 定义 | 所在层 | 例子 |
|------|------|--------|------|
| **Mount（挂载）** | 一条"路径前缀 → 资源后端"的路由声明 | L0-Contract（声明）+ L1-Infra（实例化） | `prefix=/cdn/, scheme=http` |
| **MountDecl** | Mount 的类型化声明（YAML 解析产物） | L0-Contract | 见 §6.1 |
| **ResourceScheme** | 挂载源类型枚举 | L0-Contract | `"local"` / `"http"` |
| **ResourcePort** | 资源访问接口（`exists` / `read` / `list` / `hash`） | L1-Infra | `LocalFsPort` / `HttpPort` |
| **MountRegistry** | 路径前缀 → Port 映射表 | L1-Infra | 单例 |
| **ResolvedPath** | 路径解析结果（mount + relative + port） | L1-Infra | `{ mount, relative: "key.json", port }` |
| **CachePort** | 缓存抽象（RAM 默认，Redis 可选） | L1-Infra | `RamCachePort` |
| **MountsYAML** | 用户声明文件 | L3-CLI 加载 | `.openxenon/mounts.yaml` |
| **Mount Snapshot** | 挂载内容的不可变哈希快照 | L0-Contract | `sha256:abc...` |

### 4.1 与 OXN 既有术语的关系

| OXN 既有术语 | 与 Mount 系统关系 |
|-------------|------------------|
| **Probe** | 不变；Mount 是 Probe 的"事实来源路由层" |
| **Port** | 不变；ResourcePort 是新增的 Port 类型，遵循 Port 可被 mock 替换宪法 |
| **frozen.json** | 不变；Mount Snapshot 作为 `probe.actual.mountSnapshot` 字段嵌入 |
| **Domain / Blueprint / Work** | 不变；挂载声明与 Blueprint 解耦，Work 引用 Blueprint 不感知挂载 |
| **OXN DSL（.oxn）** | v0.1 不变；未来 v0.2 可在 DSL 中支持 `mount 块`，详见 §15 ADR-001 |

---

## 5. 架构总览

### 5.1 分层视图

```
┌──────────────────────────────────────────────────────────────┐
│  L3 CLI / Daemon                                              │
│    oxn mount add/list/remove/test                            │
│    加载 .openxenon/mounts.yaml → MountDecl[]                  │
│    构造 Port 实例 → MountRegistry.register                   │
└──────────────────────────────────────────────────────────────┘
                          ↓ MountDecl[]
┌──────────────────────────────────────────────────────────────┐
│  L1 Infra: src/infra/resources/                               │
│    ┌──────────────────────┐   ┌──────────────────────┐        │
│    │  LocalFsPort         │   │  HttpPort            │        │
│    │  (v0.1 内置)         │   │  (v0.1 内置)         │        │
│    └──────────┬───────────┘   └──────────┬───────────┘        │
│               └──────────┬───────────────┘                   │
│                  MountRegistry (path → ResourcePort)         │
│                          │                                    │
│                  CachePort (RAM, v0.1)                        │
│                  Key = mount.id + ":" + relative + ":" + etag │
└──────────────────────────────────────────────────────────────┘
                          ↑ ResolvedPath
┌──────────────────────────────────────────────────────────────┐
│  L0 Kernel: src/kernel/processors/                            │
│    MountRegistry.resolve(target) → port.exists/read/hash     │
│    委托 IO,返回事实; 不感知后端实现                           │
└──────────────────────────────────────────────────────────────┘
                          ↑ frozen.json
┌──────────────────────────────────────────────────────────────┐
│  L0 Contract: src/kernel/contracts/                          │
│    MountDecl / ResourcePort / CachePort / ResolvedPath       │
│    纯类型 + 校验 schema                                       │
└──────────────────────────────────────────────────────────────┘
```

### 5.2 模块依赖图（详细）

```
        ┌──────────────────────────────────────────┐
        │  src/kernel/contracts/mount.ts           │  (L0-Contract)
        │  - MountDecl                             │
        │  - ResourceScheme (enum)                 │
        │  - CachePolicy                           │
        │  - ResourcePort (interface)              │
        │  - CachePort (interface)                 │
        │  - ResolvedPath (interface)              │
        └────────────────┬─────────────────────────┘
                         │ (L1/L2/L3 走 kernel/index 唯一公开面)
        ┌────────────────▼─────────────────────────┐
        │  src/kernel/index.ts                     │  (re-exports)
        └────────────────┬─────────────────────────┘
                         │
        ┌────────────────▼─────────────────────────┐
        │  src/kernel/processors/mount-resolver.ts │  (L0-Processor)
        │  - MountRegistry.resolve(target)         │  (纯逻辑,零 IO)
        │  - 长前缀匹配                            │
        │  - 路径规范化                            │
        └────────────────┬─────────────────────────┘
                         │ (运行时调用)
        ┌────────────────▼─────────────────────────┐
        │  src/infra/resources/                    │  (L1-Infra)
        │  ├─ port.ts           (ResourcePort)     │
        │  ├─ registry.ts       (MountRegistry)    │
        │  ├─ local.ts          (LocalFsPort)      │
        │  ├─ http.ts           (HttpPort)         │
        │  ├─ cache.ts          (RamCachePort)     │
        │  └─ loader.ts         (MountsYamlLoader) │
        └────────────────┬─────────────────────────┘
                         │
        ┌────────────────▼─────────────────────────┐
        │  src/cli/mount.ts                        │  (L3-CLI)
        │  - oxn mount add/list/remove/test        │
        │  - 4 档退出分类器                        │
        └──────────────────────────────────────────┘
```

---

## 6. 数据模型

### 6.1 `MountDecl` (L0-Contract)

```typescript
// src/kernel/contracts/mount.ts
import type { JsonValue } from './json'

export type ResourceScheme = 'local' | 'http'

export interface CachePolicy {
  readonly ttlMs?: number          // 默认 60_000
  readonly maxBytes?: number       // 默认 10 * 1024 * 1024 (10 MiB)
  readonly disabled?: boolean      // 显式关闭缓存（用于快照严格模式）
}

export interface MountDecl {
  readonly id: string                                  // 唯一 id
  readonly prefix: string                              // 必须 "/" 开头和结尾
  readonly scheme: ResourceScheme                      // v0.1: local | http
  readonly config: Readonly<Record<string, JsonValue>> // 由 Port schema 校验
  readonly cache?: CachePolicy
  readonly readOnly?: boolean                          // 默认 true（v0.1 强制只读）
}
```

**约束**：

- `id` 必须全局唯一；冲突时启动失败
- `prefix` 必须以 `/` 开头和结尾；多个 mount 的 `prefix` 不能互相覆盖（长前缀优先）
- `config` 是**业务字段透传**，OXN 自身不解析，由对应 Port 的 schema 校验
- `readOnly` 在 v0.1 **强制为 true**（Mount 系统只读，不支持写）

### 6.2 `ResourcePort` (L0-Contract → L1-Infra 实现)

```typescript
// src/kernel/contracts/mount.ts
export interface ResourcePort {
  readonly scheme: ResourceScheme
  exists(relative: string): Promise<boolean>
  read(relative: string): Promise<Buffer>
  list(relative: string): Promise<EntryInfo[]>
  hash(relative: string): Promise<string>          // SHA-256 十六进制
}

export interface EntryInfo {
  readonly name: string
  readonly relative: string
  readonly size?: number
  readonly mtime?: string
  readonly etag?: string
  readonly kind: 'file' | 'dir' | 'unknown'
}
```

**v0.1 最小实现**：

| Port | scheme | 实现要点 |
|------|--------|---------|
| `LocalFsPort` | `local` | 通过 `FileSystemPort` 直读本地 fs；prefix 内的路径在 `config.root` 下做沙箱 |
| `HttpPort` | `http` | 通过 `fetch` 拉取；带 ETag / Last-Modified 缓存键；可选 Bearer Token 头 |

### 6.3 `CachePort` (L0-Contract → L1-Infra 实现)

```typescript
// src/kernel/contracts/mount.ts
export interface CachePort {
  get(key: string): Promise<{ value: Buffer; etag?: string } | undefined>
  set(key: string, value: Buffer, etag?: string, ttlMs?: number): Promise<void>
  invalidate(prefix: string): Promise<void>   // 按 mount.id 前缀失效
}
```

**v0.1 实现**：RAM（`Map` + LRU + TTL 清理），`src/infra/resources/cache.ts`。

### 6.4 `ResolvedPath` (L0-Contract)

```typescript
// src/kernel/contracts/mount.ts
export interface ResolvedPath {
  readonly mount: MountDecl
  readonly relative: string        // 去掉 mount.prefix 后的相对路径
  readonly port: ResourcePort
}
```

### 6.5 `MountSnapshot` (L0-Contract — 嵌入 frozen.json)

```typescript
// src/kernel/contracts/mount.ts
export interface MountSnapshot {
  readonly mountId: string
  readonly scheme: ResourceScheme
  readonly prefix: string
  readonly relative: string
  readonly hash: string             // SHA-256 十六进制
  readonly size?: number
  readonly etag?: string            // 来源 etag（HTTP 时）
  readonly capturedAt: string       // ISO 8601
  readonly cacheHit?: boolean       // v0.1: 仅 informational
}
```

---

## 7. 关键流程

### 7.1 Probe 执行（fs-exists 示例）

```
1. Kernel: judge({ probeType: "fs-exists", params: { target: "/cdn/mirage/README.md" } })
2. MountRegistry.resolve("/cdn/mirage/README.md")
   → 匹配 prefix "/cdn/" 的 MountDecl (scheme=http, config.baseUrl="...")
   → relative = "mirage/README.md"
   → port = HttpPort
   → 返回 ResolvedPath
3. CachePort.get("cdn:" + relative + ":" + etag)
   → 命中 → 直接返回 exists=true
   → 未命中 → 走 port.exists(relative)
4. port.exists(relative) → fetch HEAD /cdn/mirage/README.md → 200 → true
5. CachePort.set("cdn:" + relative + ":" + etag, ..., etag, ttlMs)
6. 返回 ProbeVerdict { passed: true, actual: MountSnapshot, ... }
7. 写 frozen.json: probes[].actual = MountSnapshot
```

### 7.2 挂载注册（CLI 加载流程）

```
1. oxn mount add --scheme http --prefix /cdn/ --id http-cdn
2. CLI: prompts 用户输入 baseUrl / headers
3. MountsYamlLoader.append(decl) → 写入 .openxenon/mounts.yaml
4. CLI: validate MountsYAML schema
   - prefix 冲突 → IAPError(E_MOUNT_PREFIX_CONFLICT)
   - scheme 不支持 → IAPError(E_MOUNT_UNKNOWN_SCHEME)
   - config schema 失败 → isCliInputError
5. MountsYamlLoader.load() → MountDecl[]
6. 构造 Port 实例（scheme 决定） → MountRegistry.register
7. 返回成功
```

### 7.3 快照 verify 流程

```
oxn proof verify <name>             (默认, 快速路径)
├─ 读 .openxenon/proofs/<name>/frozen.json
├─ 对每条 probe.actual.mountSnapshot:
│  └─ 比对 currentHash vs frozen.hash
│     - 一致 → PASS
│     - 不一致 → FAIL (输出 diff)
└─ 不重 IO

oxn proof verify <name> --replay    (严格模式, 重 IO)
├─ 同上,但对每条 mountSnapshot:
│  └─ 重新 port.hash(relative)
│     - 拉取内容 → SHA-256 → 比对
│     - 失败 (网络/认证) → OXNCrash
└─ 与 frozen.json 严格一致才算 PASS
```

### 7.4 长前缀匹配算法

```typescript
// src/kernel/processors/mount-resolver.ts (伪代码,纯函数)
export function resolve(target: string, registry: MountDecl[]): ResolvedPath | null {
  // 1. 规范化 target (去 trailing slash)
  const norm = target.replace(/\/+$/, '')
  // 2. 按 prefix 长度降序排列,匹配最长
  const sorted = [...registry].sort((a, b) => b.prefix.length - a.prefix.length)
  for (const mount of sorted) {
    if (norm === mount.prefix.slice(0, -1) || norm.startsWith(mount.prefix)) {
      const relative = norm.slice(mount.prefix.length - 1)  // 保留前导 /
      return { mount, relative, port: ... }                  // port 由 L1 注入
    }
  }
  return null  // 未匹配
}
```

**L0 Kernel 仅持有纯函数**；`port` 字段在运行时由 L1 注入，保持 L0 零 IO。

---

## 8. 配置文件规范（`mounts.yaml`）

### 8.1 文件位置

```
.openxenon/
├── domains/
├── blueprints/
├── works/
├── proofs/
├── mounts.yaml       ← 新增（v0.1 范围外,本文档规划）
└── ...
```

**全局可见性**：v0.1 决定 mounts 是**全局共享**而非按 Blueprint 隔离（决策见 ADR-001）。

### 8.2 YAML Schema

```yaml
# .openxenon/mounts.yaml
version: 1

mounts:
  # ────── local mount（默认挂载到 workspace）──────
  - id: local-root
    prefix: /local/
    scheme: local
    config:
      root: "${workspaceDir}"   # 支持环境变量插值
    cache: { ttlMs: 1000 }

  # ────── http mount ──────
  - id: http-cdn
    prefix: /cdn/
    scheme: http
    config:
      baseUrl: "https://cdn.example.com"
      headers:
        Authorization: "Bearer ${CDN_TOKEN}"
      timeoutMs: 5000
    cache: { ttlMs: 300000, maxBytes: 52428800 }   # 5min, 50MiB

  # ────── http mount with ETag 复用 ──────
  - id: http-public-api
    prefix: /api/
    scheme: http
    config:
      baseUrl: "https://api.example.com/v1"
      followRedirects: true
      validateStatus: [200, 304]
    cache: { ttlMs: 60000 }
    readOnly: true   # 默认即只读,显式声明以增强可读性
```

### 8.3 校验规则

| 规则 | 失败行为 |
|------|----------|
| `version` 必须为整数 | `isCliInputError`（用户输入错） |
| `prefix` 必须以 `/` 开头和结尾 | `isCliInputError` |
| 多个 mount 的 `prefix` 互相覆盖（一方是另一方的子串） | 允许；长前缀优先；启动日志 WARN |
| `prefix` 完全相同 | `IAPError(E_MOUNT_PREFIX_DUPLICATE)` |
| `scheme` 不在 v0.1 白名单 | `IAPError(E_MOUNT_UNKNOWN_SCHEME)` |
| `config` 与对应 Port schema 不符 | `IAPError(E_MOUNT_CONFIG_INVALID)` |
| 环境变量插值失败 | `isCliInputError` |
| `id` 重复 | `IAPError(E_MOUNT_ID_DUPLICATE)` |

### 8.4 环境变量插值

支持 `${VAR}` 和 `${VAR:-default}` 两种语法，**仅在 `config` 字符串字段中生效**：

```yaml
config:
  root: "${workspaceDir}"
  token: "${CDN_TOKEN:-anonymous}"
```

**安全约束**：
- 插值在 `MountsYamlLoader.load()` 时执行，**不写入 yaml 文件**（避免敏感信息泄露）
- 错误码：`isCliInputError(E_MOUNT_ENV_MISSING)` 当变量未定义且无默认值

---

## 9. CLI 命令设计

### 9.1 命令矩阵

| 命令 | 作用 | 输出 |
|------|------|------|
| `oxn mount list` | 列出所有 mount | 表格（id / prefix / scheme / status） |
| `oxn mount add <id>` | 交互式添加 mount | 写入 mounts.yaml + 校验 |
| `oxn mount add --from-yaml <file>` | 从 YAML 文件导入 | 同上 |
| `oxn mount remove <id>` | 移除 mount | 修改 mounts.yaml |
| `oxn mount test <id> <path>` | 测试路径解析与连通性 | 命中哪个 mount + exists 结果 |
| `oxn mount validate` | 校验 mounts.yaml | 错误码 + 行号 |

### 9.2 示例

```bash
# 列出
$ oxn mount list
ID              PREFIX        SCHEME  READONLY  CACHE_TTL
local-root      /local/       local   true      1000ms
http-cdn        /cdn/         http    true      300000ms

# 添加（交互式）
$ oxn mount add http-api
? Scheme: http
? Prefix: /api/
? Base URL: https://api.example.com/v1
? Headers (JSON): {}
✓ Mount 'http-api' registered

# 测试
$ oxn mount test http-api /api/health
Mount:   http-api (prefix=/api/, scheme=http)
Path:    health → https://api.example.com/v1/health
Exists:  true (200 OK, etag="abc123")

# 校验
$ oxn mount validate
✓ mounts.yaml valid (2 mounts)
```

### 9.3 退出分类

遵循宪法 §CLI 架构 4 档退出分类器：

| 场景 | 错误类型 | 退出码 | 输出 |
|------|---------|--------|------|
| mounts.yaml 解析失败 | `isCliInputError` | 1 | stdout JSON |
| prefix 冲突 / id 重复 | `IAPError` | 1 | stdout JSON |
| Port 认证失败 | `IAPError` | 1 | stdout JSON |
| 网络超时 | `OXNCrash` | 2 | stderr |
| 路径未匹配任何 mount | `isCliInputError` | 1 | stdout JSON |
| 未知异常 | `Error` | 2 | stderr |

---

## 10. 错误模型

### 10.1 IAPError 错误码（业务流，AI 消费）

| 错误码 | 场景 | 修复建议（IAPAction） |
|--------|------|----------------------|
| `E_MOUNT_ID_DUPLICATE` | `id` 重复 | 改用唯一 id |
| `E_MOUNT_PREFIX_CONFLICT` | 两个 mount 的 prefix 互为子串且语义冲突 | 调整 prefix |
| `E_MOUNT_PREFIX_DUPLICATE` | 两个 mount 的 prefix 完全相同 | 合并或改名 |
| `E_MOUNT_UNKNOWN_SCHEME` | scheme 不在白名单 | 改用支持的 scheme |
| `E_MOUNT_CONFIG_INVALID` | config 与 Port schema 不符 | 按文档修正 |
| `E_MOUNT_NOT_FOUND` | 引用了不存在的 mount id | 确认 mount 已注册 |
| `E_MOUNT_AUTH_FAILED` | Port 认证失败（401/403） | 检查 credentials |
| `E_MOUNT_NETWORK_ERROR` | Port 网络层错误（非超时） | 重试或换源 |
| `E_MOUNT_TIMEOUT` | Port 超时 | 增加 timeoutMs |
| `E_MOUNT_PATH_NOT_RESOLVED` | 路径未匹配任何 mount | 添加 mount 或修正路径 |
| `E_MOUNT_SNAPSHOT_MISMATCH` | frozen.json 哈希与当前不一致 | `--replay` 重新拉取 |

### 10.2 OXNCrash 错误码（引擎崩溃，人类消费）

| 错误码 | 场景 |
|--------|------|
| `E_MOUNT_LOADER_PANIC` | mounts.yaml 解析器自身崩溃（非 schema 错） |
| `E_MOUNT_CACHE_CORRUPTION` | 缓存后端数据损坏 |

### 10.3 isCliInputError（用户输入错）

- YAML 语法错误
- 必填字段缺失
- 环境变量未定义且无默认值
- prefix 格式错误（非 `/` 开头结尾）

---

## 11. 与 frozen.json 的关系

### 11.1 现状

当前 `FrozenProofProbeResultSchema`（`src/kernel/schemas/proof-schema.ts`）：

```typescript
export const FrozenProofProbeResultSchema = z.object({
  probeName: z.string().min(1),
  ref: z.string().min(1),
  passed: z.boolean(),
  output: z.unknown().optional(),
  errorMessage: z.string().optional(),
  durationMs: z.number().int().min(0),
})
```

`output` 字段是 `unknown`，目前用于 Probe 自定义输出。

### 11.2 v0.1 范围（**不变 schema**）

v0.1 **不修改** `FrozenProofProbeResultSchema`，仅约定：

- 当 probe 涉及 mount 时，`output` 字段填入 `MountSnapshot` 对象
- 现有 `frozen.json` 验证流程不变（`content_hash` 仍覆盖整个对象）
- `proof verify` 默认**不重 IO**，仅比对 `output.hash` 与 frozen 时记录的 hash

### 11.3 v0.2+ 展望（**可选改进**）

如未来需要更细粒度的快照验证，可扩展 schema：

```typescript
// 草案,非 v0.1 范围
export const FrozenProofProbeResultSchema = z.object({
  // ... 现有字段
  mountSnapshot: MountSnapshotSchema.optional(),  // 新增
})
```

**本文档 v0.1 不承诺此扩展**，待 P3 实施后根据实际需求评审。

---

## 12. 架构边界（L0–L3 不变量）

### 12.1 边界表

| 层 | 能做 | 不能做 |
|----|------|--------|
| **L0-Contract** (`src/kernel/contracts/mount.ts`) | 定义 `MountDecl` / `ResourcePort` / `CachePort` / `ResolvedPath` / `MountSnapshot` 类型 | 包含 IO 实现；解析 `config` 业务字段 |
| **L0-Processor** (`src/kernel/processors/mount-resolver.ts`) | 实现 `resolve()` 纯函数（长前缀匹配） | 直接 `import fs` / `net`；运行时实例化 Port |
| **L1-Infra** (`src/infra/resources/`) | 实现 `LocalFsPort` / `HttpPort` / `RamCachePort` / `MountRegistry` / `MountsYamlLoader` | 解析 `config` 业务字段语义（只做 schema 校验） |
| **L3-CLI** (`src/cli/mount.ts`) | 加载 `mounts.yaml`、暴露 `mount` 子命令、4 档退出分类 | 自定义 IO（必须走 L1） |
| **L3-Daemon** | 维护 `MountRegistry` 单例，跨 CLI 调用复用 | 直接 `import fs`（AGENTS.md 硬性约束） |

### 12.2 依赖规则验证

- `bun scripts/validate-dependencies.ts` 必须通过（**L1-Infra 不能依赖 L2-Work / L3-CLI**）
- `bun run lint` 必须通过（`no-restricted-imports`）
- `tests/architectural/` 中新增 `mount-layer-guard.test.ts`：
  - L0 Kernel 不允许导入 `infra/resources/`
  - L1-Infra 不允许导入 `L2-Work` / `L3-CLI`
  - L3-Daemon 不允许直接 `import fs`

### 12.3 L0-Contract 公开面收敛

按宪法 §3（v0.1.4 PR-K）规则，所有 Mount 相关 contract 必须通过 `src/kernel/index.ts` 唯一公开：

```typescript
// src/kernel/index.ts 新增 export
export type {
  MountDecl,
  ResourceScheme,
  ResourcePort,
  CachePort,
  CachePolicy,
  ResolvedPath,
  MountSnapshot,
  EntryInfo,
} from './contracts/mount'
```

L1/L2/L3 调 Mount contract 时**只能**：

```typescript
// ✅ 合法
import type { MountDecl, ResourcePort } from '../../kernel/index'

// ❌ 黑名单
import type { MountDecl } from '../../kernel/contracts/mount'
```

---

## 13. 与 Mirage 的对照与定位差异

### 13.1 设计哲学对比

| 维度 | Mirage | OXN Mount System |
|------|--------|------------------|
| 核心定位 | 通用数据访问层 | **验证引擎的输入源** |
| 用户接口 | Bash 命令 | **OXN Probe（声明式）** |
| 扩展模型 | 命令 + Resource 插件 | **内置 Port（v0.1 暂不开放插件）** |
| 缓存模型 | Index + File 两层 | **事实级 + 哈希快照** |
| 快照模型 | workspace tar | **Proof frozen.json（不可变哈希）** |
| 哲学 | "一切皆文件" | **"一切皆路径，由 MountRegistry 路由"** |
| 约束 | 无强分层 | **L0–L3 宪法** |

### 13.2 OXN 不直接依赖 Mirage 的理由

1. **定位差异**：Mirage 是数据访问层，OXN 是验证引擎——OXN 只需"验证事实从哪里来"，不需要"任意命令执行"
2. **架构冲突**：Mirage 完整运行时会成为 L1-Infra 的重依赖，可能破坏 OXN 分层边界
3. **范围爆炸**：Mirage 支持 S3/GCS/Slack/Gmail/Notion 等十余种后端，OXN v0.1 只需 `local` + `http`
4. **可演进性**：OXN 可借鉴思想，在 L1-Infra 内自建轻量版，保持架构纯洁性

### 13.3 可借鉴的 Mirage 特性（v0.1 取舍）

| Mirage 特性 | OXN v0.1 取舍 | 理由 |
|-------------|--------------|------|
| Resource 抽象 | ✅ 采纳（Port 模型） | 与宪法 Port 模式天然契合 |
| 命令覆写 | ❌ 不采纳 | OXN 用 Probe 类型而非命令 |
| 跨资源管道 | ❌ 留 v0.2+ | 范围爆炸；先做事实层 |
| Index + File 两层缓存 | ⚠️ 部分采纳 | v0.1 仅事实级缓存 + TTL |
| 工作空间快照 | ❌ 不采纳 | OXN 用 frozen.json 替代 |
| RAM + Redis 双模式 | ⚠️ 仅 RAM | v0.1 简化；Redis 留 v0.2+ |
| 嵌入式 SDK + 框架适配 | ❌ 不采纳 | OXN 走 CLI + Skill |

---

## 14. 实施路线图（仅规划，v0.1 不执行代码）

> **注**：本文档为设计评审稿，**v0.1 阶段不执行代码**。以下路线图供评审通过后参考。

### 14.1 阶段划分

| 阶段 | 内容 | 涉及层 | 验收标准 |
|------|------|--------|----------|
| **P0** | 定义 contract（`MountDecl` / `ResourcePort` / `CachePort` / `ResolvedPath`） + `kernel/index.ts` re-export + 架构护栏测试 | L0-Contract + L0-Processor（纯函数 resolver） | `bun run typecheck` + `bun run lint` + `bun test` 全绿；新增 `mount-layer-guard.test.ts` |
| **P1** | 实现 `LocalFsPort` + `HttpPort` + `RamCachePort` + `MountRegistry` + `MountsYamlLoader` | L1-Infra | 单元测试覆盖：`local` 沙箱逃逸防护、`http` 缓存键生成、`etag` 复用 |
| **P2** | `oxn mount add/list/remove/test/validate` 子命令 + mounts.yaml 加载 | L3-CLI | E2E：`mount add → mount list → mount test → proof run` 闭环 |
| **P3** | 把现有 `fs-exists` / `fs-contains` 迁移到走 `MountRegistry.resolve` 路径（向后兼容，默认 mount `/` → `local-root`） | L1-Infra + L0-Processor | 现有 Proof 全部回归通过；二次运行（命中缓存）< 100ms |
| **P4** | frozen.json 嵌入 `MountSnapshot`（**先复用 `output` 字段，不破 schema**） + `proof verify --replay` | L0-Contract + L3-CLI | 快照哈希比对 E2E；replay 模式严格验证 E2E |

### 14.2 P3 兼容性策略

v0.1 默认自动注册一个 `local-root` mount（prefix `/`），把现有 `fs-exists /workspace/foo.txt` 路由到 `LocalFsPort`。

**好处**：
- 现有 Proof **零修改** 通过新路径
- 渐进式迁移：用户可显式声明 `prefix=/local/` 把本地 fs 隔离

**风险**：
- 现有 Probe 实现（`src/infra/probes/fs-exists.ts`）需要改成"先 resolve 再调 port"，而非直接调 `fs.existsSync`
- 必须保证 resolver 在没有 mounts.yaml 时也能 fallback 到 local（默认 mount 注入）

### 14.3 每阶段必跑命令

```bash
bun scripts/validate-dependencies.ts
bun run lint
bun run typecheck
bun run check
bun test
```

### 14.4 不在 v0.1 路线图

- ❌ `s3` / `github` / `shell` / `git` 等新 Port（v0.2+）
- ❌ 第三方插件 Port（v0.2+）
- ❌ Redis 缓存后端（v0.2+）
- ❌ Probe 管道组合（v0.2+）
- ❌ `FrozenProofProbeResultSchema` 扩展（v0.2+，按需）

---

## 15. 决策记录（ADR）

### ADR-001：Mount 声明的全局可见性

- **状态**：✅ 已决策（v0.1）
- **决策**：mounts 存储于全局 `.openxenon/mounts.yaml`，所有 work 共享
- **备选**：
  - A. 全局 mounts.yaml（采纳）
  - B. 按 Blueprint 隔离（`blueprints/<id>/mounts.yaml`）
  - C. OXN DSL 内 `mount` 块
- **理由**：
  1. Mount 是 IO 路由，不是业务规则——跨 Blueprint 共享更符合"事实层"语义
  2. 避免 Blueprint 之间的 mount 重复声明
  3. 与现有 `.openxenon/{domains,blueprints}/` 平行组织一致
- **后果**：
  - 多 Blueprint 引用同一 mount 时，ID 冲突需全局协调
  - v0.2+ 可考虑按 namespace 隔离

### ADR-002：首批内置 Port 范围

- **状态**：✅ 已决策（v0.1）
- **决策**：v0.1 仅实现 `local` + `http`
- **备选**：
  - A. `local` + `http`（采纳）
  - B. `local` + `http` + `s3`
  - C. `local` + `http` + `s3` + `github` + `shell`
- **理由**：
  1. `local` 覆盖现有所有 fs-based Probe（向后兼容）
  2. `http` 覆盖远程资源验证（部署产物 / 公开 API）
  3. `s3` / `github` 等需更复杂的认证与限流设计，留 v0.2+
- **后果**：
  - v0.1 不能验证 S3 日志等场景
  - 必须确保 Port 接口（`ResourcePort`）足够通用，v0.2+ 新 Port 是纯增量

### ADR-003：frozen.json 快照策略

- **状态**：✅ 已决策（v0.1）
- **决策**：frozen.json 只存 `MountSnapshot.hash`（SHA-256），默认 `verify` 不重 IO，`--replay` 才重 IO
- **备选**：
  - A. 哈希 + 默认 verify 不重 IO（采纳）
  - B. 完整内容写入 frozen.json
  - C. 两种模式可选（在 `MountDecl.cache` 中配置）
- **理由**：
  1. 哈希快照符合 OXN 不可变特性（_xenon_meta.content_hash 同源）
  2. 默认 verify 快速（< 100ms），适合 CI 频繁跑
  3. `--replay` 提供严格模式，按需启用
- **后果**：
  - frozen.json 体积小（每条 probe 仅 +1 hash 字段）
  - 缓存失效场景需用户主动 `--replay`

### ADR-004：第三方插件 Port 的开放时机

- **状态**：✅ 已决策（v0.1）
- **决策**：v0.1 **不开放**第三方插件注册，仅内置 Port
- **备选**：
  - A. 不开放（采纳）
  - B. P0 即预留接口
  - C. 允许 import('oxn-mount-notion') 式动态加载
- **理由**：
  1. 早期 API 容易锁死；先观察 `local` + `http` 真实使用模式
  2. OXN 宪法"Port 由 L1 实现"暗示 Port 是基础设施而非插件——避免与 Layer 边界冲突
  3. 第三方 Port 的认证 / 限流 / 缓存策略需要专门设计，v0.1 简化
- **后果**：
  - v0.1 用户只能等官方 Port
  - 未来开放时需重新评审 Port 注册 API 的稳定性

### ADR-005：Local Port 的路径沙箱

- **状态**：⏳ 待评审
- **决策**：v0.1 Local Port 必须限制 `root` 范围内，禁止 `..` 逃逸和 symlink 链
- **备选**：
  - A. 严格沙箱（推荐）—— `path.resolve` 后必须以 `root` 开头；遇 symlink 报错
  - B. 宽松沙箱 —— 仅禁止 `..`；允许 symlink
  - C. 无沙箱 —— 由用户负责
- **理由**：
  - AI Agent 可能构造恶意路径（如 `../../../etc/passwd`）
  - 严格沙箱符合"LLM 沙箱化执行"哲学（Mirage §适用场景 3）
- **影响**：
  - 现有 `/local/foo/../bar` 写法需用户改为 `/local/foo/bar`
  - 真实 symlink 场景需 `--allow-symlinks` 显式启用

---

## 16. 开放问题与待评审项

### 16.1 v0.1 文档评审待办

| ID | 问题 | 建议方案 |
|----|------|----------|
| Q1 | `local` Port 是否需要强制 `readOnly=true`（v0.1 Mount 系统只读）？ | ✅ 已决策：强制 |
| Q2 | `http` Port 是否需要支持重定向跟随（follow redirects）？ | 建议默认 `true`，可配置 |
| Q3 | `mount test <id> <path>` 是否需要 `--fetch` 选项（拉取前 N 字节）？ | 建议默认 HEAD 探测，`--fetch` 才 GET |
| Q4 | 默认 `local-root` mount 是否在 mounts.yaml 不存在时自动注入？ | 建议**自动注入**（保证向后兼容） |
| Q5 | mounts.yaml 是否需要支持 `${include:other.yaml}`？ | 建议 v0.1 不支持，v0.2+ 按需 |

### 16.2 v0.2+ 待跟踪

- Redis 缓存后端的多 Daemon 共享
- Probe 管道组合（`fs-fetch→grep→count`）
- 第三方 Port 插件 API 设计
- `FrozenProofProbeResultSchema` 是否需要 `mountSnapshot` 字段（脱离 `output`）
- 按 Blueprint/Work 隔离 mount 的 namespace 设计
- 路径沙箱在 symlink 场景的 UX（提示 vs 报错）

### 16.3 跨文档影响

| 受影响文档 | 影响 |
|-----------|------|
| `l0-l3-constitution.md` §3 | 需新增 `src/infra/resources/` 物理归属（实施时同步） |
| `state.md` §6 frozen.json | `output` 字段新增约定（嵌入 `MountSnapshot`） |
| `docs/reference/probe-types.md` | 新增"路径挂载"章节（实施时同步） |
| AGENTS.md | 实施后补充 `infra/resources/` 层描述 |

---

## 17. 参考资料

- [strukto-ai/mirage](https://github.com/strukto-ai/mirage) — Unified Virtual Filesystem for AI Agents（思想来源）
- [L0-L3 宪法](./l0-l3-constitution.md) — 完整分层与依赖规则
- [State 详解](./state.md) — frozen.json 当前 Schema
- [`src/kernel/contracts/probe-port.ts`](../../src/kernel/contracts/probe-port.ts) — 现有 Probe Port 契约
- [`src/kernel/schemas/proof-schema.ts`](../../src/kernel/schemas/proof-schema.ts) — 现有 frozen.json Schema
- [AGENTS.md](../../AGENTS.md) §硬性规则 — CLI 4 档退出分类器
- [FrozenProof Schema v0.1.2](../../src/kernel/schemas/proof-schema.ts) — `_xenon_meta.content_hash` 签名机制

---

**文档结束。** 本文档 v0.1 仅作为设计评审稿，待架构师评审通过后再进入 P0 实施阶段。