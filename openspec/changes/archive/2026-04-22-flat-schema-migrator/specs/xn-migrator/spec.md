## ADDED Requirements

### Requirement: XnMigrator 核心接口

XnMigrator 是一个跨运行时的增量迁移引擎，它不依赖任何特定运行时的 API（bun:sqlite / better-sqlite3 等），所有运行时差异通过构造函数注入的函数回调抹平。

系统 SHALL 定义 `XnMigrationUnit` 接口，包含：
- `version: string`：迁移版本号（如 "0001"）
- `up(dbExec: (sql: string) => void): void`：正向迁移函数
- `down?(dbExec: (sql: string) => void): void`：反向迁移函数（可选）

系统 SHALL 定义 `XnMigrator` 类，包含：
- `run(): XnMigrationResult`：执行所有待执行的迁移
- `rollback(version: string): { success: boolean; error?: string }`：回滚指定版本
- `getStatus(): { applied: string[]; pending: string[]; all: string[] }`：获取迁移状态
- `getCurrentVersion(): string | null`：获取当前数据库 schema 版本

#### Scenario: 迁移单元执行
- **WHEN** XnMigrator.run() 被调用且有待执行的迁移
- **THEN** 系统按版本号顺序执行每个迁移单元的 up() 函数

#### Scenario: 幂等执行
- **WHEN** XnMigrator.run() 被调用但迁移已全部执行
- **THEN** 系统跳过所有迁移，返回空 executed 列表

#### Scenario: 版本回滚
- **WHEN** XnMigrator.rollback(version) 被调用
- **THEN** 如果该版本有 down() 函数则执行，否则返回错误

### Requirement: 元数据表管理

系统 SHALL 在目标数据库中创建 `_oxn_migrations` 表用于记录已执行的迁移版本。

表结构：
- `version TEXT PRIMARY KEY`：迁移版本号
- `applied_at INTEGER DEFAULT (unixepoch())`：执行时间戳

#### Scenario: 首次初始化创建元数据表
- **WHEN** XnMigrator 首次操作一个空的数据库
- **THEN** 系统自动创建 `_oxn_migrations` 表

#### Scenario: 记录迁移执行
- **WHEN** 一个迁移单元的 up() 成功执行完成
- **THEN** 系统向 `_oxn_migrations` 插入该版本号记录

### Requirement: 迁移结果报告

XnMigrator.run() 返回 `XnMigrationResult`，包含：
- `executed: string[]`：成功执行的版本列表
- `skipped: string[]`：跳过的版本列表（已执行过的）
- `errors: Array<{ version: string; error: string }>`：执行失败的版本及错误信息

#### Scenario: 执行结果反馈
- **WHEN** XnMigrator.run() 执行完成
- **THEN** 系统返回包含 executed/skipped/errors 的结构化结果
