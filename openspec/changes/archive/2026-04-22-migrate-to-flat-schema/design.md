## Context

当前 OpenXenon 存在两套不兼容的数据库 Schema：

**代码期望的 Migration Schema** (`db/operations/` 层):
```
tasks: id, name, status, active_blueprint_id (FK→blueprints)
blueprints: id, task_id (FK), name, status
stages: id, blueprint_id (FK), deps (JSON), target, spec, proof, status
```

**实际 `initProjectDb()` 创建的扁平 Schema**:
```
tasks: id, name, blueprint (JSON blob), status
steps: id, task_id, name, spec, proof, target_state, status
```

代码中 `createTask(db, name)` / `createBlueprint()` / `createStage()` 等操作期望 Migration Schema，但 `loadProjectContext()` 返回的是扁平 Schema 的数据库实例。

## Goals / Non-Goals

**Goals:**
- 让 `initProjectDb()` 创建正确的三表正规化 Schema
- 提供旧数据迁移路径（playbook JSON → blueprints + stages）
- 保持向后兼容，不破坏现有功能

**Non-Goals:**
- 不修改 `initCoreDb()`（全局数据库结构不在本次范围）
- 不迁移全局数据库 `~/.openxenon/core.oxn`（仅处理项目级 `project.oxn`）
- 不修改现有 API endpoints 的接口定义

## Decisions

### Decision 1: 修改 `initProjectDb()` 而非创建新函数

**选择**: 修改 `initProjectDb()` 直接使用 Migration Schema SQL

**理由**:
- 避免引入新函数造成代码混乱
- `loadProjectContext()` 调用链简洁
- 迁移成本低，只需修改 schema 定义

### Decision 2: 数据迁移使用"检测后迁移"模式

**选择**: 在 `loadProjectContext()` 中检测 Schema 版本，自动触发迁移

**理由**:
- 用户无感知，自动完成
- 可通过 `--dry-run` 预览迁移内容
- 避免手动执行额外命令

### Decision 3: 保留 `steps.ts` 作为 `stages.ts` 的别名

**选择**: `steps.ts` 继续作为兼容层，将调用委托给 `stages.ts`

**理由**:
- 代码中仍有引用 `steps.ts`（如 `task-submit.ts`）
- 避免大量 import 路径修改
- 已在文件头注释标记 `@deprecated`

### Decision 4: 使用 SQL `ALTER TABLE` 实现 Schema 升级

**选择**: 不重建表，通过迁移 SQL 将旧表结构转为新表

**理由**:
- 保留现有数据
- 避免删除数据库重建

## Risks / Trade-offs

- [Risk] 迁移过程数据丢失 → [Mitigation] 迁移前创建备份，提供 rollback
- [Risk] 迁移过程中新数据写入 → [Mitigation] 使用事务包裹迁移操作
- [Risk] 迁移后发现不兼容代码 → [Mitigation] 保留旧 Schema 兼容层，直到所有 handlers 适配完成

## Migration Plan

### 阶段 1: 修改 Schema 定义
1. 将 `src/db/schema/project.ts` 中的 `CREATE_TASKS_TABLE` 和 `CREATE_STEPS_TABLE` 替换为 Migration Schema（tasks/blueprints/stages）
2. 验证 `initProjectDb()` 创建正确的三表结构

### 阶段 2: 实现数据迁移逻辑
1. 在 `src/core/legacy-migration.ts` 补充 `migrateProjectDb()` 函数
2. 检测 `playbook` 列存在时触发迁移
3. 将 playbook JSON 拆分为 blueprints + stages 记录

### 阶段 3: 集成迁移触发
1. 在 `loadProjectContext()` 中调用 Schema 检测
2. 如检测到旧 Schema，自动执行迁移
3. 提供 `oxn migrate --dry-run` 预览迁移内容

### 阶段 4: 验证和清理
1. 运行 `oxn task new` 测试创建流程
2. 运行 `oxn task list` 验证数据读取
3. 确认所有 handlers 使用正确的表结构

## Open Questions

1. 迁移过程中是否需要锁定写入操作？
2. 迁移失败后的 rollback 策略？
3. `task-submit` handler 中 `createTask(db, name, blueprint)` 的第二个参数如何使用？