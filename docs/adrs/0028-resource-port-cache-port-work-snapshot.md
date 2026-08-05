# ADR-0028: ResourcePort（外部服务虚拟 FS）+ CachePort + WorkSnapshot（待办）

> **来源**：`docs_tmp/mirage-1.md` (2026-06-11)
> **抽取日**：2026-07-04
<!-- allow-version -->
> **状态**：Proposed → v0.7-emergence 待办
<!-- /allow-version -->
> **影响层**：L1-Infra

## 决策（提案）

OXN Infra 引入 3 个新 Port，让 Work 可挂载外部资源：

### 1. ResourcePort（虚拟 FS）

```ts
interface ResourcePort {
  // 路径 → 远端资源（S3 / Slack / Gmail 等）
  read(path: string): Promise<Buffer>
  list(prefix: string): Promise<string[]>
}
```

### 2. CachePort（RAM / Redis 双模式）

```ts
interface CachePort {
  get<T>(key: string): T | undefined
  set<T>(key: string, value: T, ttlMs?: number): void
}
```

### 3. WorkSnapshot（Work 全状态可序列化）

```ts
interface WorkSnapshot {
  state: WorkState
  trace: TraceEvent[]
  frozen: FrozenJSON
  // 可塞进 S3 / 邮件 / 任意外部
  serialize(): Buffer
}
```

## 当前状态

- ❌ 均未实现
<!-- allow-version -->
- 🔗 候选落地：v0.7-emergence RFC 增补 §Future Work
<!-- /allow-version -->
- 🔗 `packages/sdk` 嵌入式 SDK 路径可在 monorepo split 时承接

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-11-mirage-1.md`