## Why

用户在使用 Xenonix 时遇到三个核心问题：

1. **Daemon 启动依赖工作目录**：`xn daemon start` 必须从 xenonix 源码目录运行，否则找不到 `src/server.ts`
2. **Proof 验证需要手动指定路径**：`/api/v1/step/verify` 强制要求 `proofPath` 参数，无法自动执行 step 关联的 proof
3. **Target state 未存储**：Playbook 中的 `target_state` 字段未保存到数据库，验证条件丢失

## What Changes

- 修复 daemon 启动逻辑，自动检测 server.ts 路径
- 增强 step-verify 端点，自动执行 step.proof 对应的内置 proof
- 添加 `target_state` 字段到 Step 类型和数据库表
- step-verify 端点 proofPath 参数改为可选

## Capabilities

### New Capabilities

无

### Modified Capabilities

- `daemon-process`: 修复启动路径检测
- `task-execution`: step-verify 自动执行内置 proof，支持 target_state
- `http-api`: step-verify 参数变更

## Impact

- 修改 `src/daemon/process.ts` - 自动检测 server.ts 路径
- 修改 `src/api/handlers/step-verify.ts` - 自动执行内置 proof
- 修改 `src/db/schema/project.ts` - 添加 target_state 列
- 修改 `src/db/operations/steps.ts` - 支持 target_state
- 修改 `src/types/playbook.ts` - Step 接口添加 target_state
