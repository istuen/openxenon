# physics-constitutional-refactor - Tasks

## Phase 1: Kernel 清洁 (兰姆达真空)

### 1.1 task-dir.ts 拆分
- [x] 1.1.1 修改 `kernel/lib/task-dir.ts` - 移除 I/O import，只保留纯函数 `getTaskDirectory()`
- [x] 1.1.2 在 `infra/fs.ts` 新增 `ensureDirectory()`, `directoryExists()`
- [x] 1.1.3 更新所有导入 `task-dir.ts` 的文件

### 1.2 custom-proofs-scanner.ts 重构
- [x] 1.2.1 创建 `kernel/lib/custom-proofs-resolver.ts` - 移除所有 I/O，只做纯逻辑
- [x] 1.2.2 创建 `infra/scanner.ts` - 实现物理扫描函数
- [x] 1.2.3 更新 `kernel/lib/custom-proofs-resolver.ts` 使用 Infra 扫描结果
- [x] 1.2.4 更新所有导入

### 1.3 blueprint-parser.ts 拆分
- [x] 1.3.1 修改 `kernel/lib/blueprint-parser.ts` - 移除 I/O，只保留 `parseBlueprintYaml()`
- [x] 1.3.2 在 `infra/fs.ts` 新增 `readFile()`, `fileExists()`
- [x] 1.3.3 更新 `daemon/ipc/handlers/task-next.ts`, `step-start.ts` 使用新的读取方式

## Phase 2: Infra 清洁 (图灵机边界)

### 2.1 infra/blueprint 清理
- [x] 2.1.1 检查 `infra/blueprint/blueprint.ts` 是否被引用
- [x] 2.1.2 如果未被引用，删除该目录
- [x] 2.1.3 如果被引用，将业务逻辑移至 kernel，保留 I/O 在 infra

### 2.2 infra/staging 清理
- [x] 2.2.1 检查 `infra/staging/staging-manager.ts` 是否被引用
- [x] 2.2.2 如果未被引用，删除该目录

## Phase 3: CLI 清洁 (一次性扳机)

### 3.1 合并 cli/handlers
- [x] 3.1.1 创建/修改 `cli/commands/task.ts` - 合并 task-submit, task-start, task-status, task-trace, task-next, task-stop
- [x] 3.1.2 创建/修改 `cli/commands/step.ts` - 合并 step-start, step-verify
- [x] 3.1.3 创建/修改 `cli/commands/fs.ts` - 合并 fs-execute
- [x] 3.1.4 删除 `cli/handlers/` 目录

## Phase 4: Arsenals 净化 (纯 YAML)

### 4.1 移动 Zod Schemas
- [x] 4.1.1 移动 `arsenals/proofs/probe.ts` → `kernel/schemas/probe.ts`
- [x] 4.1.2 移动 `arsenals/proofs/proof.ts` → `kernel/schemas/proof.ts`
- [x] 4.1.3 移动 `arsenals/proofs/stage.ts` → `kernel/schemas/stage.ts`
- [x] 4.1.4 移动 `arsenals/proofs/index.ts` → `kernel/schemas/index.ts`
- [x] 4.1.5 更新 `cli/draft.ts` 导入路径
- [x] 4.1.6 删除 `arsenals/proofs/` 目录

## Phase 5: 删除 core/

### 5.1 拆分 core/daemon-config.ts
- [x] 5.1.1 检查 `core/daemon-config.ts` 的使用位置
- [x] 5.1.2 移动 `CORE_DAEMON_CONFIG_PATH` 到 `infra/global.ts`
- [x] 5.1.3 移动配置读写函数到 `daemon/status.ts`
- [x] 5.1.4 删除 `src/core/` 目录

## Phase 6: 修复 server.ts

### 6.1 修复 import
- [x] 6.1.1 删除 `server.ts:6` 的 `import './api/handlers'`

## Phase 7: 验证

- [x] 7.1 `pnpm run typecheck` 通过
- [x] 7.2 `pnpm run lint` 通过 (无 lint 脚本)
- [x] 7.3 `pnpm build` 通过

## Phase 8: 提交

- [x] 8.1 `git add -A && git commit`