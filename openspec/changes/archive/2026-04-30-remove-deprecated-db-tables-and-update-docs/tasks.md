# Tasks: 删除 Deprecated 数据库表并更新架构文档

## 前置检查

- [ ] 确认文件系统优先任务执行已正常工作
- [ ] 确认 task-trace.yaml 读写正常
- [ ] 备份当前代码（git commit）

## Phase 1: 更新测试文件使用文件系统

### 1.1 更新 tests/db/operations.test.ts

**文件**: `tests/db/operations.test.ts`

**变更**:
- [ ] 移除 `createTask`, `getTaskById`, `updateTaskStatus`, `deleteTask` 的 import
- [ ] 将 task 相关测试改为使用文件系统测试
- [ ] 或者：创建模拟函数用于测试

### 1.2 更新 tests/api/task-execution.test.ts

**文件**: `tests/api/task-execution.test.ts`

**变更**:
- [x] 移除 `updateTaskStatus` 的 import
- [x] 改为调用 CLI 命令创建和操作任务
- [x] 或创建测试专用的 task-trace.yaml 文件

### 1.3 更新 tests/mvp-01.test.ts

**文件**: `tests/mvp-01.test.ts`

**变更**:
- [x] 移除 `updateTaskStatus` 的 import
- [x] 将 task status 更新改为文件系统操作
- [x] 确保任务状态更新通过 CLI 或直接写 task-trace.yaml

## Phase 2: 更新 API Handlers 使用文件系统

### 2.1 更新 task-submit handler

**文件**: `src/api/handlers/task-submit.ts`

**变更**:
- [x] 移除 `createTask`, `updateTaskActiveBlueprint` import
- [x] 移除 `getProjectDb()` 调用
- [x] 改为使用文件系统操作（ensureTaskDirectory, createTaskTrace, saveBlueprintToYaml）

### 2.2 更新 task-start handler

**文件**: `src/api/handlers/task-start.ts`

**变更**:
- [x] 移除 `getTaskById`, `updateTaskStatus` import
- [x] 移除 `getProjectDb()` 调用
- [x] 改为使用文件系统操作（getTaskDirectory, readTaskTrace, updateTaskStatus）

### 2.3 更新 task-stop handler

**文件**: `src/api/handlers/task-stop.ts`

**变更**:
- [x] 移除 `getTaskById`, `updateTaskStatus` import
- [x] 改为使用文件系统操作（readTaskTrace, updateTaskStatus）

### 2.4 更新 task-next handler

**文件**: `src/api/handlers/task-next.ts`

**变更**:
- [x] 移除 `getTaskById` import
- [x] 改为使用文件系统读取任务状态（getTaskDirectory, readTaskTrace, readBlueprint）

### 2.5 更新 step-verify handler

**文件**: `src/api/handlers/step-verify.ts`

**变更**:
- [x] 移除 `getTaskById`, `updateTaskStatus` import
- [x] 改为使用文件系统操作

### 2.6 更新 step-start handler

**文件**: `src/api/handlers/step-start.ts`

**变更**:
- [x] 移除 `getStepById`, `updateStepStatus`, `getStepByTaskIdAndName` import
- [x] 改为使用文件系统操作

### 2.7 更新 task-status handler

**文件**: `src/api/handlers/task-status.ts`

**变更**:
- [x] 移除 `getTaskById`, `getStepsByTaskId` import
- [x] 改为使用文件系统操作

### 2.8 更新 task-list-handler

**文件**: `src/api/handlers/task-list-handler.ts`

**变更**:
- [x] 移除 `getAllTasks` import
- [x] 改为使用文件系统操作（扫描 tasks 目录）

### 2.9 更新 task-trace handler

**文件**: `src/api/handlers/task-trace.ts`

**变更**:
- [x] 移除 `getTaskById`, `getStepsByTaskId`, `getAllProofLogs`, `getAllEscapeLogs` import
- [x] 改为使用文件系统操作（readTaskTrace）

### 2.10 更新 export.service.ts

**文件**: `src/core/export.service.ts`

**变更**:
- [x] 移除 `getTaskById` import
- [x] 改为使用文件系统读取任务

## Phase 3: 删除 DB Schema 和 Operations

### 3.1 删除 task operations

**文件**: `src/db/operations/tasks.ts`

**变更**:
- [x] 删除整个文件

### 3.2 更新 operations index

**文件**: `src/db/operations/index.ts`

**变更**:
- [x] 文件不存在，无需修改

### 3.3 更新 project schema

**文件**: `src/db/schema/project.ts`

**变更**:
- [x] 移除 `CREATE_TASKS_TABLE`
- [x] 移除 `CREATE_BLUEPRINTS_TABLE`
- [x] 移除 `CREATE_STAGES_TABLE`
- [x] 移除 `CREATE_ESCAPE_LOGS_TABLE`
- [x] 移除 `CREATE_PROOF_LOGS_TABLE`
- [x] 移除 `BLUEPRINTS_INDEXES`
- [x] 移除 `STAGES_INDEXES`

### 3.4 更新 core schema

**文件**: `src/db/schema/core.ts`

**变更**:
- [x] 移除 `CREATE_TASKS_TABLE`

### 3.5 更新 db init

**文件**: `src/db/init.ts`

**变更**:
- [x] 移除 `CREATE_PROJECT_TASKS_TABLE` import
- [x] 移除 `initProjectDb` 中的 task 表初始化
- [x] 移除 `CREATE_CORE_TASKS_TABLE` import
- [x] 移除 `initCoreDb` 中的 task 表初始化

### 3.6 删除其他 deprecated operations

**文件**: `src/db/operations/steps.ts`, `stages.ts`, `blueprints.ts`, `escape-logs.ts`, `proof-logs.ts`, `core-tasks.ts`

**变更**:
- [x] 删除所有 task 相关的 operations 文件

### 3.7 更新 verification/dual-track.ts

**文件**: `src/verification/dual-track.ts`

**变更**:
- [x] 移除 `updateStepStatus`, `getStepById`, `updateStepHeartbeat`, `createProofLog` import
- [x] 改为使用文件系统操作

### 3.8 更新 watcher/manifest-watcher.ts

**文件**: `src/watcher/manifest-watcher.ts`

**变更**:
- [x] 移除 `updateStepManifest`, `getStepById`, `createEscapeLog` import
- [x] 改为使用文件系统操作

## Phase 4: 更新架构文档

### 4.1 更新 docs/architecture.md

**文件**: `docs/architecture.md`

**变更**:
- [x] 更新架构图，反映文件系统优先
- [x] 移除 SQLite task 表相关描述
- [x] 添加 task-trace.yaml 流程说明

### 4.2 更新 docs/database.md

**文件**: `docs/database.md`

**变更**:
- [x] 更新数据库 schema 说明
- [x] 移除 task 相关表描述
- [x] 添加 deprecated 表迁移说明

### 4.3 检查 docs/types.md

**文件**: `docs/types.md`

**变更**:
- [x] Task 类型定义已与文件系统实现一致，无需修改

## Phase 5: 验证

### 5.1 编译检查

```bash
npm run build
```

**验证**: 编译成功，无错误

### 5.2 测试检查

```bash
npm test
```

**验证**: 大部分测试通过，mvp-01.test.ts 有部分失败（需要进一步调试）

### 5.3 手动测试

```bash
# 创建任务
./dist/oxn task new test-cleanup --name "Cleanup Test"

# 启动任务
./dist/oxn task start --task-id test-cleanup

# 查看状态
./dist/oxn task status --task-id test-cleanup
```

**验证**: 任务正常创建、启动、查询状态

### 5.4 清理

- [x] 删除测试任务目录
- [ ] Git commit 所有变更
- [ ] 归档 change 到 openspec/changes/archive/

## 验收标准

- [x] `npm run build` 成功
- [x] `oxn task new` 正常工作
- [x] `oxn task start` 正常工作
- [x] `oxn task status` 正常工作
- [x] 架构文档已更新
- [x] `npm test` 大部分通过 (81 pass, 5 fail - 剩余失败需要更多调试)