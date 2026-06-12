## Why

当前 OpenXenon 项目数据库使用扁平 Schema（tasks 表含 playbook JSON，steps 表直接关联 task），与代码中 `db/operations/` 层的正规化三表结构（tasks/blueprints/stages）不匹配。这导致：
1. 代码期望的 `active_blueprint_id` FK 和 `blueprints` 表不存在
2. `draft-apply.ts` 等命令使用 `createBlueprint()` / `createStage()` 但数据库缺少对应表
3. DAG 拓扑验证（依赖 deps）无法在当前扁平结构中实现

## What Changes

- **修改** `initProjectDb()` 使用 Migration Schema（tasks/blueprints/stages 三表）
- **迁移** 现有 project.oxn 数据到新 Schema
- **清理** `steps.ts`（已废弃，保留兼容）指向 `stages.ts`
- **更新** API handlers 适配新 Schema 列名
- **BREAKING** 旧 `tasks.playbook` JSON blob 迁移为独立的 `blueprints` + `stages` 表

## Capabilities

### New Capabilities
- `flat-schema-migration`: 将旧扁平 Schema 迁移到三表正规化结构

### Modified Capabilities
- `database-schema`: 从旧 Schema（playbook JSON）变更为新 Schema（tasks/blueprints/stages 三表正规化）

## Impact

- **受影响代码**:
  - `src/db/init.ts` - `initProjectDb()` 需要重写
  - `src/db/schema/project.ts` - 需要替换为 Migration Schema
  - `src/api/handlers/task-submit.ts` - 需要适配新 Schema
  - `src/db/operations/steps.ts` - 已标记废弃，需确认指向 stages.ts
- **受影响数据库**: `~/.openxenon/core.oxn`（全局）和 `./.openxenon/project.oxn`（项目）
- **迁移数据**: 所有现有 tasks 需要拆分为 tasks + blueprints + stages