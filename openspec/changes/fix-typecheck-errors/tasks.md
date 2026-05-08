## 1. 修复 kernel/lib/project.ts - 添加缺失的路径函数

- [x] 1.1 添加 `getProjectBoundaryPath(projectRoot: string): string` 函数
- [x] 1.2 添加 `getProjectConfigPath(projectRoot: string): string` 函数
- [x] 1.3 添加 `getProjectProofsPath(projectRoot: string): string` 函数
- [x] 1.4 添加 `getTasksPath(projectRoot: string): string` 函数
- [x] 1.5 添加 `getTaskPath(projectRoot: string, taskId: string): string` 函数
- [x] 1.6 添加 `getStepManifestPath(projectRoot: string, taskId: string, stepId: string): string` 函数
- [x] 1.7 添加 `getProjectArsenalPath(projectRoot: string): string` 函数
- [x] 1.8 添加 `getTaskTracePath(projectRoot: string, taskId: string): string` 函数

## 2. 修复 kernel/lib/task-trace.ts - 导出类型

- [x] 2.1 在 `src/kernel/lib/task-trace.ts` 导出 TaskTraceState 类型
- [x] 2.2 导出 StageState 类型
- [x] 2.3 导出 TraceEvent 类型
- [x] 2.4 导出 ProbeResult 类型

## 3. 修复 kernel/lib/types/index.ts - 解决重复导出冲突

- [x] 3.1 修改为命名导出而非 `export *`，避免与 enums 冲突

## 4. 修复 kernel/lib 内部导入

- [x] 4.1 修复 `src/kernel/lib/custom-proofs-scanner.ts` 导入路径
- [x] 4.2 修复 `src/kernel/lib/proofs-project.ts` 导入路径，添加缺失的函数导出
- [x] 4.3 修复 `src/kernel/lib/types/stage.ts` 导入路径
- [x] 4.4 修复 `src/kernel/lib/project.ts` 的 `./core` 导入

## 5. 修复 kernel/index.ts - 解决导出冲突和导入路径

- [x] 5.1 解决 `./enums` 和 `./lib/types` 的命名冲突
- [x] 5.2 解决 `./schemas/blueprint.schema` 和 `./lib/types` 的命名冲突
- [x] 5.3 修正所有导入路径

## 6. 修复 infra 模块

- [x] 6.1 修复 `src/infra/blueprint/types.ts` 导入路径
- [x] 6.2 修复 `src/infra/process.ts` 类型问题（cwd, Response, exitCode）
- [x] 6.3 修复 `src/infra/socket.ts` 未使用导入

## 7. 修复 daemon 模块

- [x] 7.1 修复 `src/daemon/api/context.ts` 的 kernel 常量导入
- [x] 7.2 修复 `src/daemon/ipc/context.ts` 的 common 常量导入
- [x] 7.3 修复 `src/daemon/trace/writer.ts` 的 common 类型导入
- [x] 7.4 修复 `src/daemon/engine/executor.ts` 的 blueprint schema 导入

## 8. 修复 cli 和 server 模块

- [x] 8.1 修复 `src/cli/draft.ts` 缺失的导入（getProjectBoundaryPath, randomUUID）
- [x] 8.2 修复 `src/server.ts` 的 daemon-config 导入

## 9. 验证

- [ ] 9.1 运行 `pnpm build` 确认构建成功
- [ ] 9.2 运行 `pnpm run typecheck` 确认无类型错误