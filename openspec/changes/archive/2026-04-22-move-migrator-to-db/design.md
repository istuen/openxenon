## Context

当前 XnMigrator 放在 `src/core/migrator.ts`，迁移文件放在 `src/migrations/`。从架构分层来看：
- `src/core/` 存放核心业务逻辑（如 dag.validator.ts、export.service.ts）
- `src/db/` 存放数据访问层（如 operations 文件夹）

迁移逻辑本质上是数据库 Schema 版本管理，属于数据访问层范畴，与数据库操作紧密相关。

## Goals / Non-Goals

**Goals:**
- 将 `src/core/migrator.ts` 移动到 `src/db/migrator.ts`
- 将 `src/migrations/` 移动到 `src/db/migrations/`
- 确保所有 import 路径正确更新

**Non-Goals:**
- 不改变 XnMigrator 的任何接口或功能
- 不修改迁移文件内容（0001_init_schema.sql 保持不变）
- 不涉及其他模块的重组

## Decisions

**1. 目标目录结构**
```
src/
  db/
    migrator.ts          # 从 core/migrator.ts 移动
    migrations/
      0001_init_schema.sql  # 从 migrations/ 移动
    operations/
      ...
```

**2. 导入路径更新**
- `src/runtimes/bun.adapter.ts` 中的 import 需更新
- `tests/core/migrator.test.ts` 中的 import 需更新（路径改为 `src/db/migrator`）

## Risks / Trade-offs

- **风险**: 如果有其他文件引用了 `src/core/migrator.ts` 或 `src/migrations/`，移动后需要同步更新
- ** Mitigation**: 通过全局搜索确认所有引用位置，一次性更新

## Migration Plan

1. 移动文件：
   - `mv src/core/migrator.ts src/db/migrator.ts`
   - `mv src/migrations src/db/migrations`
2. 全局搜索并更新 import 路径
3. 运行 `bun run build` 和 `bun test` 验证
4. 提交 Git

## Open Questions

无
