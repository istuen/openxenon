## Why

XnMigrator 和迁移文件目前放在 `src/core/` 和 `src/migrations/` 下，但从架构角度看，数据库迁移逻辑属于数据访问层（DAO）的一部分，与数据库操作（`src/db/operations/`）紧密相关。将其放到 `src/db/` 目录下更符合分层架构原则，也更易维护。

## What Changes

- 将 `src/core/migrator.ts` 移动到 `src/db/migrator.ts`
- 将 `src/migrations/` 目录移动到 `src/db/migrations/`
- 更新所有相关的 import 路径
- 保持 XnMigrator 的接口和功能不变

## Capabilities

### Modified Capabilities

- `database-schema`: 迁移文件位置从 `src/migrations/` 调整为 `src/db/migrations/`

## Impact

- 需要更新 `src/runtimes/bun.adapter.ts` 中的 import 路径
- 需要更新 `src/cli.ts` 中的相关引用
- 测试文件 `tests/core/migrator.test.ts` 路径不变，但内部 import 需要更新
