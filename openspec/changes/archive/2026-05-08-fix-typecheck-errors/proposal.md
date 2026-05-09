## Why

`pnpm build` 成功但 `pnpm run typecheck` 失败，55 个错误分布在 15 个文件中。问题分为以下几类：

### 类别 1：缺失的模块（Cannot find module）
- `src/daemon/api/context.ts` → `../kernel/constants` 不存在
- `src/daemon/engine/executor.ts` → `../../common/schemas/blueprint.schema` 不存在
- `src/daemon/ipc/context.ts` → `../../common/constants` 不存在
- `src/daemon/trace/writer.ts` → `../../common/types/task-state` 和 `../../common/enums` 不存在
- `src/infra/blueprint/types.ts` → `./core` 不存在
- `src/kernel/lib/custom-proofs-scanner.ts` → `../types/proof` 不存在
- `src/kernel/lib/project.ts` → `./core` 不存在
- `src/kernel/lib/proofs-project.ts` → `../types` 不存在
- `src/kernel/lib/types/stage.ts` → `./arsenal/blueprint` 不存在
- `src/server.ts` → `./core/daemon-config` 不存在

### 类别 2：缺失的导出（Module has no exported member）
- `src/kernel/index.ts` 尝试从 `./lib/project` 导出函数，但该项目只导出了 interface
- `src/kernel/index.ts` 尝试从 `./lib/task-trace` 导出类型，但那些类型未导出
- `src/kernel/index.ts` 尝试从 `./lib/proofs-project` 导出函数，但未正确导出

### 类别 3：重复导出冲突（Module has already exported a member）
- `src/kernel/index.ts`：`./enums` 和 `./lib/types` 导出相同名称的类型
- `src/kernel/lib/types/index.ts`：`./task-state` 和 `./task-trace` 导出相同名称的类型

### 类别 4：其他问题
- `src/cli/draft.ts`：缺少 `getProjectBoundaryPath` 和 `randomUUID` 导入
- `src/infra/process.ts`：类型不匹配（Response 处理、exitCode 可能为 null）
- `src/infra/socket.ts`：未使用的导入

## What Changes

### 阶段 1：修复 kernel 模块
1. 修复 `src/kernel/lib/project.ts` - 添加缺失的路径函数导出
2. 修复 `src/kernel/lib/task-trace.ts` - 导出 TaskTraceState, StageState, TraceEvent, ProbeResult 类型
3. 修复 `src/kernel/lib/types/index.ts` - 解决重复导出冲突
4. 修复 `src/kernel/lib/custom-proofs-scanner.ts` - 修正导入路径
5. 修复 `src/kernel/lib/proofs-project.ts` - 修正导入路径并正确导出函数
6. 修复 `src/kernel/index.ts` - 解决导出冲突，修正导入路径

### 阶段 2：修复 infra 模块
1. 修复 `src/infra/blueprint/types.ts` - 修正导入路径
2. 修复 `src/infra/process.ts` - 修复类型问题
3. 修复 `src/infra/socket.ts` - 移除未使用的导入

### 阶段 3：修复 daemon 模块
1. 修复 `src/daemon/api/context.ts` - 创建或修正 kernel 常量导入
2. 修复 `src/daemon/ipc/context.ts` - 创建 common 常量或修正导入
3. 修复 `src/daemon/trace/writer.ts` - 创建 common 类型定义
4. 修复 `src/daemon/engine/executor.ts` - 创建或修正 blueprint schema 导入

### 阶段 4：修复 cli 和 server
1. 修复 `src/cli/draft.ts` - 添加缺失导入
2. 修复 `src/server.ts` - 创建或修正 daemon-config 模块

## Impact

修复后 `pnpm run typecheck` 应全部通过。

## High Risk

- 内核模块（kernel/index.ts）的导出体系需要全面审查，可能需要创建缺失的模块
- 多个类型定义文件相互引用，可能存在循环依赖风险