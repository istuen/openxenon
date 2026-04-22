## ADDED Requirements

### Requirement: XnStore 接口扩展

XnStore 接口 SHALL 在原有 CRUD 方法基础上扩展迁移生命周期管理方法。

新增方法：
- `getMigrator(): XnMigrator`：获取 migrator 实例
- `runMigrations(): XnMigrationResult`：执行所有待执行的迁移
- `getMigrationStatus(): { applied: string[]; pending: string[]; all: string[] }`：获取迁移状态
- `getCurrentVersion(): string | null`：获取当前数据库 schema 版本
- `rollbackMigration(version: string): { success: boolean; error?: string }`：手动回滚指定版本

#### Scenario: 初始化时自动执行迁移
- **WHEN** XnStore.initialize() 被调用
- **THEN** 系统自动执行 runMigrations()

#### Scenario: 获取迁移状态
- **WHEN** 用户或系统需要查询迁移状态
- **THEN** XnStore 返回当前数据库的 applied/pending/all 版本列表

### Requirement: 运行时适配器注入

XnStore 的具体实现 SHALL 由运行时适配器提供，不同运行时（Bun/Node）有不同的适配器实现。

系统 SHALL 提供：
- `BunStore`（在 bun.adapter.ts 中）：使用 bun:sqlite 作为底层数据库
- 未来可扩展 `NodeStore`（在 node.adapter.ts 中）：使用 better-sqlite3

#### Scenario: Bun 运行时适配
- **WHEN** OpenXenon 运行在 Bun 运行时
- **THEN** 系统使用 BunStore 作为 XnStore 实现

### Requirement: Migrator 单例管理

XnStore SHALL 对 XnMigrator 实例进行单例管理。

- `getMigrator()` 第一次调用时创建实例
- 后续调用返回同一实例

#### Scenario: Migrator 单例保证
- **WHEN** 多次调用 getMigrator()
- **THEN** 系统返回同一个 XnMigrator 实例

### Requirement: 迁移加载器实现

运行时适配器 SHALL 实现迁移加载器，将迁移文件（.sql）加载为 XnMigrationUnit 列表。

Bun 适配器的加载器 SHALL：
- 使用 `import.meta.glob` 加载内置迁移文件
- 从 SQL 文件内容中解析 `-- @up` 和 `-- @down` 注释块
- 从文件名提取版本号（如 `0001_init_schema.sql` -> `0001`）

#### Scenario: 迁移文件解析
- **WHEN** BunStore 初始化时
- **THEN** 迁移加载器扫描 migrations/ 目录，加载所有 .sql 文件

### Requirement: 迁移错误处理

当迁移执行失败时，系统 SHALL：
- 记录错误到 `result.errors` 数组
- 继续执行后续迁移（不中断）
- 在控制台输出错误信息

#### Scenario: 部分迁移失败
- **WHEN** 多个迁移中有一个失败
- **THEN** 已执行的迁移不被回滚，失败的迁移记录到 errors 数组
