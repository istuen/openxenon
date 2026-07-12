# v0.6.1: 三边界框架 + Blueprint 提升组合模板 + External inline 收敛

> **版本**：v0.6.1
> **日期**：2026-07-10
> **作者**：opencode + user（协作）
> **关联 RFC**：[三边界框架 + Blueprint 提升组合模板 RFC](../pools/drafts/three-boundary-blueprint-elevation-rfc.md)
> **关联 ADR**：[0019 Superseded](../docs/adrs/0019-blueprint-type-paradigm.md)（Blueprint Type 范式废弃）, [0053 Superseded ADR-0048](../docs/adrs/0053-superseded-0048-library-external-scheme.md), [0054 三边界框架](../docs/adrs/0054-three-boundary-framework.md), [0055 Blueprint 组合模板](../docs/adrs/0055-blueprint-as-composition-template.md), [0056 External inline](../docs/adrs/0056-external-inline-and-status.md)

## 概述

本次重构确立 E1 Asset 的 3 边界框架 + Blueprint 提升为组合模板 + External 收敛为边界内 inline 声明。AssetKind 从 6 类型收敛为 5 类型，Work 引用模型简化，可扩展性问题消解。

## 核心变更

### 1. 三边界框架（ADR-0054）

**E1 Asset 的"边界类型"明确为 3 个**：

| 边界类型 | 约束 | IAP 角色 |
|---|---|---|
| **Domain** | 词汇 / 禁用词 / 不变量 | 业务边界（语义约束） |
| **Workflow** | slots / deps / observe | 执行边界（结构约束） |
| **Stack** | runtimes / linters / testers | 实现边界（环境约束） |

### 2. Blueprint 提升为组合模板（ADR-0055）

- **原 Blueprint**（slots/deps/observe 执行模板）→ 改名 **Workflow**
- **新 Blueprint** = 组合模板（`## Refs` 引用 Domain + Workflow + Stack + Blueprint）
- Work 只引用 Blueprint（一个 ref），不再直接引用 3 边界
- 单向依赖层级：`3 边界 → Blueprint → Work`

### 3. External inline 收敛（ADR-0056）

- **External 从 Asset 类型降级**为边界类型内的 `## Externals` H2 category
- 仅 Domain/Workflow/Stack 可声明 External；Blueprint 不支持
- `url`（网络）或 `path`（本地）二选一（互斥）
- `kind` enum 6 值：`rest-api | webhook | documentation | library | config | service`
- 状态管理：`.openxenon/.cache/external-status.json`（gitignore，4 状态：available/unavailable/stale/unknown）

### 4. AssetKind 收敛（6 → 5）

```ts
// Before
type AssetKind = 'domain' | 'blueprint' | 'stack' | 'roadmap' | 'library' | 'external'
// After
type AssetKind = 'domain' | 'workflow' | 'stack' | 'blueprint' | 'roadmap'
```

- `library` / `external` 删除
- `blueprint` 语义变更（执行模板 → 组合模板）
- `workflow` 新增（原 blueprint 改名）

### 5. 6 处硬编码数组收敛为 SSOT

`ALL_ASSET_KINDS` 常量在 `infra/paths.ts`，6 处重复数组替换为单点引用。

## 文件迁移

- 30 个 blueprint 资产文件迁移：`blueprints/*.oxn` + `.md` → `workflows/*.oxn` + `.md`，frontmatter `entity: blueprint` → `entity: workflow`
- `blueprints/` 目录保留（未来存放新语义组合模板）
- Langium grammar 保留 `blueprint` 关键字（避免破坏性变更），通过 AssetKind 区分

## 编译器变更

| 编译器 | 操作 |
|---|---|
| `domain-compiler.ts` | 修改：加 `## Externals` H2 category |
| `workflow-compiler.ts` | **新建**（从 blueprint-compiler 复制改名 + 加 Externals） |
| `blueprint-compiler.ts` | **重写**：新组合模板编译器（`## Refs`） |
| `stack-compiler.ts` | 修改：加 `## Externals` H2 category |
| `library-compiler.ts` | **删除** |
| `external-compiler.ts` | **删除** |
| `oxl-md-decompiler.ts` | 删除 library/external 映射分支 |

## Work schema 变化

- **BirthCert**：Blueprint asset entry 含 `domainRefs`/`workflowRefs`/`stackRefs` 字段
- **PlanLock**：`blueprintsHash` 包含 Blueprint + 3 边界的 composite hash（drift 检测范围扩大）
- **per-work-blueprints-merger**：从 Blueprint `## Refs` 提取 3 边界 refs + 嵌套 Blueprint refs
- **Work 引用路径**：默认 `@prj/workflows/X`（保留 `@prj/blueprints/X` fallback 兼容）

## 新增 CLI 命令

```bash
oxn external check        # 扫描 + 检查可达性 + 更新状态
oxn external status       # 显示所有 external 状态
oxn external mark <name> --status <s> [--reason "..."]  # 手动标记
```

## 关联 ADR（本次新增/更新）

| ADR | 状态 | 主题 |
|---|---|---|
| 0019 | ⛔ Superseded | Blueprint Type 范式废弃正式记录（由 ADR-0054~0056 触发） |
| 0053 | ⛔ Superseded | Superseded ADR-0048（library/external Asset 类型收敛正式记录） |
| 0054 | ✅ Adopted | 三边界框架（Domain/Workflow/Stack 正交维度） |
| 0055 | ✅ Adopted | Blueprint 提升为组合模板（E1 Asset 内的隔离层） |
| 0056 | ✅ Adopted | External inline 收敛 + 状态管理 |

## ADR-0019 / ADR-0048 正式废弃记录

- **ADR-0019**（Blueprint Type 范式）：v0.6.1-alpha.0 已移除 `type "task"` 字段但 ADR 未标 Superseded；本次由 ADR-0054~0056 的采纳正式记录废弃状态
- **ADR-0048**（library/ + external/）：本次由 ADR-0053 正式记录 Superseded

## Breaking Changes

| # | 变更 | 迁移路径 |
|---|---|---|
| BC-1 | Blueprint → Workflow 改名 | 资产文件已迁移至 `workflows/` |
| BC-2 | 新 Blueprint 语义（组合模板） | `blueprints/` 目录保留给新组合模板 |
| BC-3 | Work `## Refs` 仍兼容 domain + blueprint + stack（向后兼容） | — |
| BC-4 | Library/External entity 删除 | `.openxenon/assets/libraries/` + `externals/` 已无文件 |
| BC-5 | `@md/` scope 新增 `workflows` | 向后兼容（不影响旧引用） |
| BC-6 | Roadmap scene 表 kind 列已为 4 值 | 无变化 |
| BC-7 | 6 处硬编码数组收敛为 `ALL_ASSET_KINDS` | 自动同步 |

## 实施时间线

| 阶段 | 版本 | 任务 | 工作量 |
|---|---|---|---|
| Phase 0 | v0.6.1-alpha.2 | DRY 修复 + Workflow 改名 + 编译器重写 + 目录迁移 | 4 天 |
| Phase 1 | v0.6.1-alpha.3 | Blueprint 组合模板 + Work 引用简化 + schema 扩展 | 5 天 |
| Phase 2 | v0.6.1-alpha.4 | External inline + 状态管理 + Library/External 删除 | 5 天 |
| Phase 3 | v0.6.1 finalize | ADR 处置 + 文档更新 + changelog | 2 天 |

**总工作量**：约 16 工作日。

## 后续工作（v0.6.2+）

- `oxn migrate external-assets` 迁移命令（如有历史 library/external 资产需迁移）
- external-cli-e2e 集成测试
- `oxn-asset` Skill 更新支持 `## Externals` 创建
- Daemon 自动 TTL 检测（v0.6.2）