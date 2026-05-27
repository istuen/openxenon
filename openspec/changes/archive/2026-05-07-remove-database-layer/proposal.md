## Why

当前 OpenXenon 在 `~/.openxenon/` 和 `.openxenon/` 目录下使用 SQLite 数据库（`core.oxn`、`project.oxn`）存储项目配置、Daemon 配置等信息。根据物理架构宪法第一条（零数据库原则），Task 执行生命周期中绝对禁止引入任何形式的磁盘数据库。

状态应该是文件系统目录树排布与 YAML 内容的自然投影：`ls` 即列表，`cat` 即详情。

## What Changes

- **删除全部 `src/db/` 目录**：包括 init.ts、schema/、operations/、migrator.ts
- **删除 `src/core/boundary.ts`**：封装 core.oxn 的初始化逻辑
- **删除 `src/core/boundary-project.ts`**：封装 project.oxn 的初始化逻辑
- **重写 `src/core/project.ts`**：移除 `getProjectDbPath()`，只用路径拼接
- **重写 `src/core/global.ts`**：移除 `CORE_DB_PATH`
- **删除 `src/commands/api/base.ts`** 中的全部 db 导入
- **重写配置存储**：用 JSON 文件替代数据库表

| 原数据库功能 | 替代方案 |
|-------------|---------|
| `projects` 表 | `.openxenon/projects.json`（项目列表） |
| `daemon_config` 表 | `.openxenon/daemon-config.json` |
| `config` 表（space mode） | `.openxenon/config.json` |

- **更新 `src/server.ts`**：删除 initCoreDb 调用
- **更新 `src/api/context.ts`**：删除 initProjectDb 调用
- **更新 `src/commands/init.ts`**：改为写入 JSON 配置文件
- **更新 `src/runtimes/bun.adapter.ts`**：删除 XnMigrator 导入

## Capabilities

### New Capabilities

- `file-based-config`: 基于 JSON 文件的配置管理。项目级配置存储在 `.openxenon/config.json`，全局配置存储在 `~/.openxenon/` 目录下的 JSON 文件。

### Modified Capabilities

- `global-structure`: 当前 global-structure spec 描述的是 `.openxenon/` 目录结构。需要修改为：`.openxenon/` 下不再包含任何 `.oxn` 数据库文件，改为纯 JSON 配置文件。
- `database-schema`: 此 capability 将被完全废弃（REMOVED）。不再有数据库 schema 的概念。

## Impact

- **删除 8 个文件**：`src/db/` 下全部文件
- **修改 12+ 处引用**：删除所有 db 相关的 import 和调用
- **配置迁移**：已存在的 `.oxn` 数据库文件需要被忽略或迁移到 JSON
- **API 兼容性**：`src/server.ts` 的启动逻辑变更，`/api/v1/daemon/*` 接口需要适配 JSON 文件读取
- **测试更新**：`tests/db/` 目录下全部测试文件需要删除或重构
