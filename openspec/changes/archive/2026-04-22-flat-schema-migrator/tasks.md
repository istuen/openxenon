## 1. XnMigrator 核心实现

- [x] 1.1 创建 `src/core/migrator.ts`，实现 `XnMigrationUnit` 接口和 `XnMigrator` 类
- [x] 1.2 实现 `run()` 方法：版本比对、按序执行、结果报告
- [x] 1.3 实现 `rollback(version)` 方法：单版本回滚
- [x] 1.4 实现 `getStatus()` 方法：返回 applied/pending/all 列表
- [x] 1.5 实现 `getCurrentVersion()` 方法：返回最新版本号

## 2. 数据库 Schema 实现

- [x] 2.1 创建 `src/migrations/0001_init_schema.sql` 迁移文件
- [x] 2.2 实现 `tasks` 表（包含 active_blueprint_id 外键）
- [x] 2.3 实现 `blueprints` 表
- [x] 2.4 实现 `stages` 表
- [x] 2.5 实现 `step_manifests` 表
- [x] 2.6 实现 `_oxn_migrations` 元数据表
- [x] 2.7 创建必要的索引（blueprint_id、status 等）

## 3. Zod Schema 更新

- [x] 3.1 更新 `src/types/schemas/task.schema.ts`：移除 blueprints 嵌套，添加 activeBlueprintId
- [x] 3.2 更新 `src/types/schemas/blueprint.schema.ts`：Blueprint 独立 Schema，移除 stages
- [x] 3.3 更新 `src/types/schemas/stage.schema.ts`：Stage 独立 Schema，添加 blueprintId 和 deps
- [x] 3.4 更新 `src/types/schemas/index.ts` 导出
- [x] 3.5 更新 `src/types/core.ts`：新增 BlueprintStatus 枚举

## 4. XnStore 接口扩展

- [x] 4.1 更新 `src/runtimes/interfaces/store.interface.ts`：新增迁移相关方法
- [x] 4.2 更新 `src/runtimes/index.ts` 导出

## 5. Bun 运行时适配器

- [x] 5.1 实现 `src/runtimes/bun.adapter.ts` 中的 `BunStore` 类
- [x] 5.2 实现迁移加载器：从 `src/migrations/*.sql` 解析 `-- @up` 和 `-- @down` 块
- [x] 5.3 实现 `getMigrator()` 单例管理
- [x] 5.4 实现 `runMigrations()` 自动调用
- [x] 5.5 修复类型问题：dbQuery 参数类型断言

## 6. 数据库操作层更新

- [x] 6.1 创建 `src/db/operations/blueprints.ts`：Blueprint CRUD
- [x] 6.2 创建 `src/db/operations/stages.ts`：Stage CRUD（适配新 Schema）
- [x] 6.3 更新 `src/db/operations/tasks.ts`：适配 activeBlueprintId
- [x] 6.4 更新 `src/db/operations/steps.ts`：适配扁平 Stage 结构（deprecated wrapper）

## 7. 草案系统 CLI

- [x] 7.1 创建 `src/commands/draft.ts`：draft 命令入口
- [x] 7.2 创建 `src/commands/draft-apply.ts`：`oxn draft apply` 实现
- [x] 7.3 实现 Zod Schema 校验（第一道 Proof）
- [x] 7.4 实现 DAG 拓扑校验（第二道 Proof）
- [x] 7.5 实现探针存在性扫描（第三道 Proof）
- [x] 7.6 实现 `--dry-run` 参数支持
- [x] 7.7 创建 `src/commands/draft-diff.ts`：`oxn draft diff` 实现
- [x] 7.8 创建 `src/commands/draft-list.ts`：`oxn draft list` 实现
- [x] 7.9 创建 `src/commands/draft-extract.ts`：`oxn draft extract` 实现

## 8. 导出系统 CLI

- [x] 8.1 创建 `src/commands/export.ts`：export 命令入口
- [x] 8.2 创建 `src/core/export.service.ts`：导出核心逻辑
- [x] 8.3 实现 Mermaid DAG 图生成
- [x] 8.4 实现 YAML 代码块生成
- [x] 8.5 创建 `src/commands/export-active.ts`：`oxn export active` 实现
- [x] 8.6 创建 `src/commands/export-archive.ts`：`oxn export archive` 实现

## 9. GC 清理命令

- [x] 9.1 创建 `src/commands/gc.ts`：gc 命令入口
- [x] 9.2 创建 `src/commands/gc-prune.ts`：`oxn gc prune` 实现
- [x] 9.3 实现按日期/状态过滤待清理任务

## 10. 旧数据迁移

- [ ] 10.1 创建迁移脚本解析旧 `tasks.playbook` JSON Blob
- [ ] 10.2 实现旧数据到新 Schema 的映射和插入
- [ ] 10.3 在 `oxn init` 时检测旧版本数据库并提示迁移

## 11. 类型定义更新

- [x] 11.1 更新 `src/types/task.ts`：适配新 Schema（移除 blueprint，添加 activeBlueprintId）
- [x] 11.2 更新 `src/types/blueprint.ts`：新增独立接口
- [x] 11.3 更新 `src/types/stage.ts`：新增 blueprintId 和 deps
- [x] 11.4 更新 `src/types/core.ts`：BlueprintStatus 已添加

## 12. 测试

- [ ] 12.1 编写 XnMigrator 单元测试
- [ ] 12.2 编写 DAG 拓扑校验测试
- [ ] 12.3 编写 Zod Schema 校验测试
- [ ] 12.4 编写草案 apply/diff 集成测试
- [x] 12.5 运行 `bun run typecheck` 确保类型正确
- [x] 12.6 运行 `bun run build` 确保编译通过

## 13. 文档

- [ ] 13.1 更新 README 或相关文档说明新的目录结构
- [ ] 13.2 在代码中添加必要的注释
