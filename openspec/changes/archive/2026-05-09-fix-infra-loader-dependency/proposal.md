## Why

`infra/loader.ts` 存在**物理倒灌**违规：它从 `kernel/lib/project` 导入 `getProjectBoundaryPath`，导致 Infra（物理能力层）反向依赖了 Kernel（业务逻辑层）。根据 architecture.md 第 10.1 节 ESLint 铁丝网，Infra 绝对不能包含任何业务逻辑依赖。

## What Changes

- 重构 `infra/loader.ts` 的所有函数签名，改为只接收**原始路径字符串参数**，不再自己计算路径
- `getProjectBoundaryPath(cwd)` 的调用权归还给 CLI/Daemon
- 添加 ESLint 规则验证 `src/infra/**` 不能导入 `src/kernel/**`
- 更新所有调用 `infra/loader.ts` 的代码，确保调用方负责路径计算

## Capabilities

### New Capabilities
- `infra-scanner-protocol`: 定义 Infra 层扫描器的标准接口——只接收路径字符串，返回资产列表，绝不自己计算路径

### Modified Capabilities
- `pure-filesystem-state`: 需要更新，澄清 Infra 层函数的路径参数规范

## Impact

- **影响的文件**: `src/infra/loader.ts`（重构）
- **破坏性变更**: `infra/loader.ts` 的函数签名全部改变，需要更新所有调用方
- **新增约束**: ESLint 配置添加 `no-kernel-imports-in-infra` 规则