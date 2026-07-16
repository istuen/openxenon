---
entity: domain
version: 0.3.0
name: MonorepoContext
oxn-source-sha: 570912b00ee729c53de52071693f89c1df9e34a0ed88d6716612994320b1c5e7
synced-at: 2026-07-08T13:52:19.204Z
---

<!-- v0.7 MIGRATION BANNER · 2026-07-16
     This Domain has been migrated to [`oxn-engine-domain`](./oxn-engine-domain.md)
     as part of v0.7 domain hierarchy restructure (RFC W3).
     terms 已迁移（Monorepo / PackageCli / PackageEngine / Barrel / EntityLayer /
     CodeLayer / EngineInternal / SocketBridge / Worktree / BuiltinAsset /
     LayeredNarrative / OXNPackageScope）。
     文件保留供历史审计，不接受新 term 添加。W8 收尾时删除。
-->

# Domain: MonorepoContext

> v0.6 双包 Monorepo 限界上下文：packages/cli (L3 薄调用层) + packages/engine (L1-L2 业务实现)；E1-E4 实体四层 + L0-L3 代码四层双层叙事；cli↔daemon socket 互隔离 + engine barrel 入口约束

## Terms

### Monorepo
- desc: Bun workspaces 多包仓库: packages/cli + packages/engine 两包;锁文件统一为 bun.lock;CLI thin + Engine thick

### PackageCli
- desc: packages/cli — L3 入口薄调用层: citty 命令路由 + 顶层 catch 4 档分流 + Skill/Work 入口;无业务实现

### PackageEngine
- desc: packages/engine — L1-L2 业务实现层: Asset/Work/Pool/Proof/Insight 模块 + infra/oxl/kernel/errors 等子域;被 cli 依赖

### Barrel
- desc: packages/engine barrel 入口: src/index.ts 集中 re-export 公共 API;cli 仅走 barrel import 禁止穿透内部路径

### EntityLayer
- desc: E1-E4 实体四层叙事: E1=Asset (Domain/Blueprint/Stack/Library/External) / E2=Intent (Work/Task) / E3=Align (Part/Probe) / E4=Proof (frozen.json/verdict);与代码 L0-L3 维度正交

### CodeLayer
- desc: L0-L3 代码四层叙事: L0=kernel (Schema/Contract/Processor) / L1=infra+oxl / L2=builtin+work / L3=cli+daemon+hall+skills+watcher+core+i18n;ESLint + validate-deps 强制

### EngineInternal
- desc: engine 内部模块 (src/engine/Asset/create.ts 等);禁止 cli 直接 import;仅通过 barrel 暴露公共 API

### SocketBridge
- desc: cli↔daemon 通信: 仅走 unix socket + JSON payload;禁止 cli 直接 import daemon 模块 (反之亦然)

### Worktree
- desc: Bun workspace 单 git 仓库: 根 package.json workspaces=['packages/*'];两包共享锁文件 + 共享 TypeScript 配置

### BuiltinAsset
- desc: engine 编译时内置资产: src/builtin/ 目录的 .oxn 文件 (@oxn scope 引用);与项目资产 (@prj scope) 隔离

### LayeredNarrative
- desc: v0.6 起双层叙事: 实体维 (E1-E4) 描述业务对象, 代码维 (L0-L3) 描述代码分层;两者映射由 validate-deps.yml 强制

### OXNPackageScope
- desc: engine 暴露给 cli 的 public API 命名空间: @openxenon/engine/...;cli 严禁 import @openxenon/engine/src/... 穿透

## Bans

### forbidden-constructs
- items:
  - monolithic-cli
  - monolithic-engine
  - package-coupled
  - engine-internal-import
  - daemon-direct-import-from-cli
  - cli-direct-import-from-daemon
  - cross-package-circular
  - import-from-src
  - @engine-internal
- desc: monolithic-cli, monolithic-engine, package-coupled, engine-internal-import, daemon-direct-import-from-cli, cli-direct-import-from-daemon, cross-package-circular, import-from-src, @engine-internal

## Invariants

### inv-1
- value: packages/cli 不能 import packages/engine 内部模块;仅走 @openxenon/engine barrel (src/index.ts re-export)

### inv-2
- value: packages/engine 不能 import packages/cli (engine 是被依赖方);违反 → CI 失败

### inv-3
- value: packages/cli 与 packages/daemon (L3) 仅通过 socket + JSON payload 通信;禁止 import 对方模块

### inv-4
- value: packages/daemon 不允许直接 import 'fs'/'node:fs';必须走 L1-Infra filesystem.ts 收口

### inv-5
- value: Bun workspaces 配置唯一权威: 根 package.json workspaces=['packages/*'];禁止新建 npm/pnpm workspace

### inv-6
- value: 锁文件唯一权威: bun.lock;pnpm-lock.yaml / package-lock.json / yarn.lock 一律不得出现

### inv-7
- value: TypeScript 路径别名 @openxenon/engine/* 指向 packages/engine/src/*;tsconfig.json 的 paths 是唯一权威

### inv-8
- value: engine barrel 入口 src/index.ts 集中 re-export 公共 API;新增 public API 必须先更新 barrel 再被 cli 引用

### inv-9
- value: v0.6 双层叙事: E1-E4 (实体层) 与 L0-L3 (代码层) 是两个正交维度;E1 资产 → L0-L2 代码;E4 证明 → L0 Kernel + L1 Infra

### inv-10
- value: OXN 元域 (L0L3Context) 约束代码分层;Monorepo 约束包结构;两者正交: Monorepo 是包边界,L0L3 是层边界

### inv-11
- value: builtin 资产 (@oxn scope) 与 project 资产 (@prj scope) 严格隔离: builtin 不得依赖 @prj;project 不得修改 builtin

### inv-12
- value: cli↔daemon socket 通信 payload schema 唯一权威: src/daemon/protocol.ts;cli 必须 import 共享类型,不得自造

### inv-13
- value: 新增 package 必须在 workspaces 数组 + tsconfig paths 同时声明;缺一则 ESLint 拒绝

### inv-14
- value: engine 内部模块 (src/engine/Asset/internal/* 等) 严禁 cli 引用;--max-warnings 0 配 ESLint no-restricted-imports 守卫
