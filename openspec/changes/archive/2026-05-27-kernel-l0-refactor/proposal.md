## Why

当前 `src/kernel/` 目录存在严重的架构混乱：Schema、Contract、Processor 三者职责边界不清，导致：

1. `lib/` 目录同时包含类型定义(`lib/types/`)和逻辑函数(`lib/project.ts`)，混淆了 L0-Schema 与 L0-Processor 的边界
2. `lib/types/task-state.ts` 与 `lib/types/task-trace.ts` 功能重复
3. `enums.ts` 与 `lib/types/core.ts` 的状态枚举重复定义
4. `project.ts` 路径函数直接使用 `path.join`，将宿主环境依赖直接耦合进 Kernel
5. 无 `path-port.ts`，Kernel 无法通过 Contract 获取路径计算能力

本次重构将确立 Kernel L0 的清晰三元结构：Schema(types+validators) / Contract(probe-port+path-port) / Processor。

## What Changes

### 目录重组
- 废止 `kernel/lib/` 目录，将其类型定义移入 `kernel/schemas/types/`
- 废止 `kernel/lib/types/` 目录，其内容重组为 `kernel/schemas/types/`
- 将 `kernel/explore/types.ts` 移入 `kernel/schemas/explore.types.ts`
- 将 `kernel/compiler/`、`kernel/task/` 重组进 `kernel/processors/`

### 类型清理
- 删除 `lib/types/core.ts`，状态枚举统一到 `schemas/types/enums.ts`
- 删除 `lib/types/task-state.ts`，以 `task-trace.ts` 为唯一真相源
- 移除 `XnTaskStatus`、`XnPartStatus` 别名，统一使用 `TaskStatus`、`StepStatus`

### 新增 Contract
- 创建 `kernel/contracts/path-port.ts`，定义路径解析接口
- Runtime 层注入 Infra 实现，Kernel 不直接依赖 `node:path`

### 架构验证
- 更新 `scripts/validate-dependencies.ts` 识别新的目录结构
- 确保验证脚本输出 0 违规

## Capabilities

### New Capabilities
- `kernel-l0-structure`: 定义 Kernel L0 三元结构 (Schema/Contract/Processor) 的物理目录布局
- `kernel-path-port`: 新增 PathPort Contract，Kernel 通过接口获取宿主路径计算能力

### Modified Capabilities
- `kernel-no-infra-import`: 扩展约束范围，新增 `path-port.ts` 的位置验证

## Impact

### 受影响代码
- `src/kernel/index.ts` - 重新导出路径调整
- `src/kernel/lib/` - 整体移动或删除
- `src/kernel/explore/types.ts` - 移动到 `kernel/schemas/`
- `scripts/validate-dependencies.ts` - 更新目录结构识别

### 依赖关系
- Kernel L0 依赖宿主环境的能力全部通过 Contract 注入
- Runtime (Arsenal/Work/CLI/Daemon) 负责组装 Infra 实现到 Kernel Contract