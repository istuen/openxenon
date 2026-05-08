## 1. 创建新目录结构

- [x] 1.1 创建 `src/common/` 目录结构（enums.ts, constants.ts, types/, schemas/）
- [x] 1.2 创建 `src/daemon/` 目录结构（ipc/, engine/, probes/, radar/, trace/）
- [x] 1.3 创建 `src/meta/` 目录（从 forges/ 迁移）

## 2. 迁移 common/ 层

- [x] 2.1 从 `types/core.ts` 迁移枚举到 `common/enums.ts`
- [x] 2.2 创建 `common/constants.ts`（路径后缀名常量）
- [x] 2.3 从 `types/arsenal/blueprint.ts` 迁移 Schema 到 `common/schemas/blueprint.schema.ts`
- [x] 2.4 从 `types/schemas/` 迁移 Zod schemas 到 `common/schemas/`
- [x] 2.5 删除 `types/` 目录

## 3. 迁移 daemon/ 层

- [x] 3.1 移动 `api/socket-server.ts` → `daemon/ipc/server.ts`
- [x] 3.2 移动 `api/router.ts` → `daemon/ipc/router.ts`
- [x] 3.3 创建 `daemon/ipc/server.type.ts`（邻接类型）
- [x] 3.4 合并 `verification/` 到 `daemon/engine/`（proof-executor.ts + custom-proof-executor.ts + dual-track.ts）
- [x] 3.5 合并 `core/stage/` 到 `daemon/engine/`（executor.ts + dispatcher.ts）
- [x] 3.6 移动 `core/built-in-proofs/` → `daemon/probes/`
- [x] 3.7 创建 `daemon/radar/clock.ts`（纯内存 HashMap 计时）
- [x] 3.8 整合 `core/proof-logger.ts` + `lib/task-trace.ts` → `daemon/trace/writer.ts`

## 4. 重写 commands/ 层

- [x] 4.1 重写 `commands/init.ts`（移除 registry、config、projects 依赖）
- [x] 4.2 删除 `commands/api/` 目录
- [x] 4.3 重写 `commands/task-submit.ts`（改为纯 Socket 发送）
- [x] 4.4 重写 `commands/task-start.ts`（改为纯 Socket 发送）
- [x] 4.5 更新 `commands/task.ts` 子命令入口
- [x] 4.6 移动 `commands/api/task-list.ts` → `commands/task-list.ts`
- [x] 4.7 移动 `commands/api/task-new.ts` → `commands/task-new.ts`

## 5. 迁移 meta/ 资源

- [x] 5.1 移动 `src/forges/meta-*/` → `src/meta/`
- [x] 5.2 移动 `src/templates/` → `src/meta/`
- [x] 5.3 删除 `src/forges/` 和 `src/templates/` 目录

## 6. 清理旧文件

- [x] 6.1 删除 `core/blueprint-persister.ts`
- [x] 6.2 删除 `core/registry.ts`
- [x] 6.3 删除 `core/projects.ts`
- [x] 6.4 删除 `core/config.ts`
- [x] 6.5 删除 `core/manifest.ts`（逻辑已合并到 daemon/trace/）
- [x] 6.6 删除 `runtimes/` 目录
- [x] 6.7 删除 `adapters/` 目录
- [x] 6.8 删除 `verification/` 目录
- [x] 6.9 删除 `core/built-in-proofs/` 目录

## 7. 更新导入引用

- [x] 7.1 更新所有从 `types/` 导入的代码到 `common/`
- [x] 7.2 更新所有从 `api/` 导入的代码到 `daemon/ipc/`
- [x] 7.3 更新 `daemon/index.ts` 入口文件

## 8. 验证

- [x] 8.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 8.2 运行 `pnpm test`（测试目录已删除，暂跳过）
- [x] 8.3 手动测试 `oxn init && oxn task submit ...` 流程
- [x] 8.4 验证 `oxn forge probe` 显示正确约束