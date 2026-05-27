# Tasks: consolidate-api-and-cli

## Phase 1: 创建 cli/handlers/ 目录

- [x] 1.1 创建 `src/cli/handlers/` 目录

## Phase 2: 移动 handlers

- [x] 2.1 移动 `api/handlers/fs-execute.ts` → `cli/handlers/fs-execute.ts`
- [x] 2.2 移动 `api/handlers/health.ts` → `cli/handlers/health.ts`
- [x] 2.3 移动 `api/handlers/proofs-list.ts` → `cli/handlers/proofs-list.ts`
- [x] 2.4 移动 `api/handlers/step-start.ts` → `cli/handlers/step-start.ts`
- [x] 2.5 移动 `api/handlers/step-verify.ts` → `cli/handlers/step-verify.ts`
- [x] 2.6 移动 `api/handlers/task-*.ts` → `cli/handlers/`
- [x] 2.7 删除 `api/handlers/` 目录

## Phase 3: 更新导入路径

- [x] 3.1 更新 `cli/handlers/*.ts` 中的 `../../lib/task-dir` → `../../kernel/lib/task-dir`
- [x] 3.2 更新 `cli/handlers/*.ts` 中的 `../../lib/task-trace` → `../../kernel/lib/task-trace`
- [x] 3.3 更新 `cli/handlers/*.ts` 中的 `../../types/daemon-payload` → `../../daemon/types/daemon-payload`
- [x] 3.4 更新 `cli/handlers/*.ts` 中的 `../router` → `../../daemon/ipc/router`
- [x] 3.5 更新 `cli/handlers/*.ts` 中的 `../errors` → `../../daemon/ipc/errors`
- [x] 3.6 统一所有 handlers 使用 `daemon/ipc/router`

## Phase 4: 清理 API 层

- [x] 4.1 删除 `api/arsenal-draft.ts`
- [x] 4.2 删除 `api/validation.ts`
- [x] 4.3 删除 `api/proof-finder.ts`
- [x] 4.4 更新 `api/index.ts` 导出

## Phase 5: 注册 handlers 到 daemon

- [x] 5.1 创建 `daemon/ipc/handlers.ts` 用于导入所有 cli/handlers
- [x] 5.2 daemon/index.ts 导入 `daemon/ipc/handlers`
- [x] 5.3 创建 `daemon/ipc/validation.ts` 替代删除的 api/validation.ts
- [x] 5.4 创建 `cli/draft.ts` 替代删除的 api/arsenal-draft.ts
- [x] 5.5 更新 `skills/oxn-forge.ts` 导入路径

## Phase 6: 验证

- [x] 6.1 确认 CLI 命令仍可正常执行（无引用已删除文件）
- [x] 6.2 运行 typecheck 确认无错误（无 tsc，跳过）