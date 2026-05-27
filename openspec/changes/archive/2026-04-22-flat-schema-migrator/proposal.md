## Why

OpenXenon 当前采用 Task 1:1 Blueprint（Blueprint 作为 JSON blob 嵌入 Task）的嵌套结构，以及缺乏版本化的数据库迁移机制。这两个设计缺陷导致：

1. **无法支持"旁路演化"**：当 AI 触发演化流（Draft Blueprint）时，旧 Blueprint 无法被保留为历史参考，新旧交替会导致工程案卷断裂。
2. **无法支持"不可变铁律"**：当前 Schema 支持 UPDATE 操作，但"不可变性"是整个系统的哲学基石，写时_COPY 比写时_UPDATE 更安全。
3. **数据库结构无法跨版本演进**：随着 OpenXenon 升级，已有的 `space.oxn` 无法平滑升级，必须重建围栏，资产面临丢失风险。

## What Changes

- **数据库 Schema 扁平化改造**：将 Task 1:1 Blueprint 翻转为 Task 1:N Blueprint、Blueprint 1:N Stage 的三表扁平拓扑
- **新增 XnMigrator 迁移引擎**：内置版本追踪与增量执行机制，支持跨版本平滑升级
- **扩展 XnStore 运行时接口**：集成 Migrator 实例管理，新增迁移生命周期方法
- **新增草案系统**：`oxn draft apply/diff` 支持工程师直接编辑和对比草案
- **新增导出系统**：`oxn export` 支持将数据库状态反编译为 Markdown 文档
- **新增物理目录规范**：`drafts/`、`active/`、`archive/` 三个隔离区的职责划分

## Capabilities

### New Capabilities

- `xn-migrator`: 跨运行时的增量迁移引擎，纯逻辑层，通过 DI 注入 `dbExec/dbQuery/loader`
- `flat-schema`: Task、Blueprint、Stage 三表扁平拓扑，支持不可变插入与旁路演化
- `draft-system`: 草案生命周期管理，支持 apply、diff、extract 操作
- `export-system`: 数据库到 Markdown/YAML/Mermaid 的单向反编译导出
- `runtime-store-v2`: XnStore 接口扩展，新增 `getMigrator/runMigrations/getMigrationStatus` 方法

### Modified Capabilities

- `database-schema`: **BREAKING** - 重新设计表结构，从嵌套 JSON 翻转为三表扁平外键关联，新增 `blueprints` 表和 `_oxn_migrations` 元数据表
- `type-definitions`: **BREAKING** - 重新定义 Task/Blueprint/Stage/BlueprintStatus/StageStatus 等类型，移除 `playbook` JSON blob，新增 `activeBlueprintId` 引用
- `global-structure`: 新增 `.openxenon/drafts/` 入站目录、`.openxenon/active/` 和 `.openxenon/archive/` 出站目录的职责定义

## Impact

- **数据库**：现有 `project.oxn` 无法向前兼容，需要迁移脚本
- **运行时适配层**：需要为 Bun 适配器实现 `XnMigrator` 实例化和迁移加载逻辑
- **CLI**：新增 `oxn draft` 和 `oxn export` 两组命令
- **API handlers**：需要适配扁平 Schema 的数据库操作
