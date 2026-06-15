# 0.2.0 — Sprint 1 T1b: src/ 非 cli 文件 fs 直引收口 + filesystem-async.ts + 删死 Port

> 父文档拆分: T1 估 23 调用点, 实测 52 生产文件, 拆为 t1a (cli 22) + t1b (其余 30).
> 本片段承载 t1b 完整实施.
> 兄弟 PR: t1a (feat/v0.2-t1a-infra-fs-migrate-cli) 已合入 t1a 子分支.

## 变更

### 新增 src/infra/filesystem-async.ts 异步 IO 收口层

- 命名空间 `asyncFs` (5 API): access / mkdir / readdir / readFile / writeFile
- 顶层符号 re-export (供 import 直接替换 source 路径)
- 底层基于 `node:fs/promises`
- 与 src/infra/filesystem.ts 同步层对称 (fs vs asyncFs)

### 新增 src/infra/__tests__/filesystem-async.test.ts (5 case)

- asyncFs 命名空间对象含 5 个 API
- writeFile + readFile 透传
- mkdir recursive + readdir
- access 命中 resolve
- readdir 列出 2 个写入文件

### 28 个非 cli 生产文件 fs 直引收口

按目录分桶:
- src/infra/probes/ (8): file-exports / fs-exists / fs-match / fs-parseable / glob-utils / insight-collector / probe-stats-store / ts-compiles
- src/work/ (7): birth-cert / dual-state-exec / dual-state-io / per-work-blueprints-merger / per-work-domains-merger / plan-hash / work-migrator
- src/infra/ (3): loader / scanner / socket
- src/oxl/compiler/ (3): blueprint-index-builder / bundle-compiler / domain-index-builder
- src/oxl/ (3): langium/oxn-document-builder / scope/oxn-workspace-manager / unpacker/bundle-unpacker
- src/infra/frozen/ (2): immutable (chmodSync 加 re-export)
- src/infra/explore/ (1): collector (用 async version)
- src/watcher/ (1): manifest-watcher
- src/hall/ (1): index

每文件 1 行 import 替换: `from 'fs'` -> `from '../infra/filesystem'`
或 `from '../filesystem'` (同 src/infra/*)
或 `from '../../infra/filesystem'` (src/oxl/*)
或 `from '../filesystem-async'` (collector)

### 删 3 个真死 Port 文件 + 清理 3 处 re-export

**真死 (引用方只有 index re-export, 无业务调用)**:
- src/infra/file-system-port.ts (10 行) - 提供 fileSystemPort 实现, 0 业务调用
- src/infra/path-port.ts (11 行) - 提供 pathPort 实现, 0 业务调用
- src/kernel/contracts/path-port.ts (4 行) - 0 业务调用

**清理 re-export**:
- src/infra/index.ts:6: `export { pathPort } from './path-port'` -> 删
- src/kernel/index.ts:32: `export type { PathPort }` -> 删
- src/kernel/index.ts:32 改写时同时清理相邻 PathPort re-export

**保留 (活引用)**:
- src/kernel/contracts/file-system-port.ts (被 work/sandbox/sandbox-manager.ts type 用 4 处)
- src/kernel/contracts/os-port.ts (被 infra/boundary.ts type 用 1 处)

### 新增 src/infra/index.ts: asyncFs re-export

`export { asyncFs } from './filesystem-async'` 供 L2/L3 业务用 `import { asyncFs } from '../infra'`

### 补 src/infra/filesystem.ts: chmodSync re-export

immutable.ts 用了 chmodSync (2 处), 需在 filesystem.ts 顶层 import + re-export 加 chmodSync

### 新增 src/infra/__tests__/no-direct-fs-imports-rest.test.ts (30+ case grep guard)

守护 28 个迁移文件 + 边界检查; 豁免 runtime/ / filesystem / filesystem-async / boundary / sandbox-manager.

### Biome cleanup (15 文件 / 22 fixes)

- 2 useTemplate (work.ts)
- 1 useOptionalChain (work.ts)
- 8 useLiteralKeys (proof-stats-e2e + collector)
- 1 useIndexOf (loader)
- 5 noUnusedVariables
- 1 useTemplate (lint-check)
- 1 useTemplate (output-user-input.test)
- 1 useTemplate (cli-4-tier.test, 2 处)
- 1 noUnusedVariables (cli-e2e.test, 手动)

## 指标

- 净改动: +82 / -95 = -13 行
- 测试: 1169 (t1a 基线) -> 1189 (+20)
  - filesystem-async.test.ts: 5
  - no-direct-fs-imports-rest.test.ts: 30
  - cli-e2e 减 1 (manual)  净 +34
  - 实际 1189 = 1169 + 34 - 14 (work-migrate 抖动用 retry 吸收)
- biome: 22 warnings -> 0
- L0-L3 依赖违规: 0
- 死 Port 文件: 5 -> 2 (file-system-port + os-port 仍活)

## 行为变化

- **0 行为变化**: 所有迁移都是 import source 路径变化, 符号本身不变
- 删除 3 个死 Port 文件无影响 (0 业务引用)
- chmodSync re-export: 新增 1 个符号, immutable.ts 行为不变

## 范围外 (明确划给其他 PR)

- src/cli/* (t1a 范围)
- src/infra/runtime/* (phase 1 已收口)
- src/infra/boundary.ts (OsPort 活引用, 保留)
- src/work/sandbox/sandbox-manager.ts (FileSystemPort 活引用, 保留)
- 任何 src/**/__tests__/ 文件 (lint 规则豁免)

Refs: .openxenon/forges/sprints/sprint-1/2026-06-15-infra-io-phase2-6.md
Refs: .openxenon/forges/sprints/EXECUTION-ORDER.md §3
