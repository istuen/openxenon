## 1. 修改 Schema 定义

- [x] 1.1 备份现有 `src/db/schema/project.ts`
- [x] 1.2 将 `CREATE_TASKS_TABLE` 替换为 Migration Schema（添加 `active_blueprint_id` 列，移除 `blueprint` JSON 列）
- [x] 1.3 删除 `CREATE_STEPS_TABLE`，新增 `CREATE_BLUEPRINTS_TABLE`
- [x] 1.4 新增 `CREATE_STAGES_TABLE`（替代 steps 表）
- [x] 1.5 添加外键约束 SQL（tasks.active_blueprint_id → blueprints.id, blueprints.task_id → tasks.id, stages.blueprint_id → blueprints.id）
- [x] 1.6 验证 `initProjectDb()` 创建正确的三表结构

## 2. 实现数据迁移逻辑

- [x] 2.1 在 `src/core/legacy-migration.ts` 中补充 `migrateProjectDb()` 函数
- [x] 2.2 实现 Schema 版本检测函数 `isOldSchema()`
- [x] 2.3 实现 `migrateTaskToNewSchema()` 单任务迁移
- [x] 2.4 将 playbook JSON 拆分为 blueprints + stages 记录
- [x] 2.5 添加事务包裹确保原子性
- [x] 2.6 迁移完成后删除旧 `playbook` 列

## 3. 集成迁移触发

- [x] 3.1 在 `loadProjectContext()` 中调用 Schema 版本检测
- [x] 3.2 检测到旧 Schema 时自动执行迁移
- [x] 3.3 保留迁移回滚逻辑
- [x] 3.4 提供 `oxn migrate --dry-run` 预览迁移内容

## 4. 验证和清理

- [x] 4.1 运行 `oxn task new` 测试 Task 创建流程
- [x] 4.2 运行 `oxn task list` 验证数据读取
- [x] 4.3 运行 `oxn draft apply` 测试 Blueprint 和 Stage 创建
- [x] 4.4 确认 `task-start` / `task-next` / `step-verify` handlers 工作正常
- [x] 4.5 确认所有 handlers 使用正确的表结构和列名
- [x] 4.6 修复 socket-server 路由和请求解析 bug