## ADDED Requirements

### Requirement: 数据库迁移模块位于 db 目录

XnMigrator 和迁移文件 SHALL 位于 `src/db/` 目录下，以符合分层架构原则。

#### Scenario: migrator.ts 位置正确
- **WHEN** 代码引用 `src/db/migrator.ts`
- **THEN** XnMigrator 类可用

#### Scenario: migrations 目录位置正确
- **WHEN** 代码引用 `src/db/migrations/*.sql`
- **THEN** 迁移文件可用
