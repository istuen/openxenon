## Why

当前 Arsenal 和 Work 模块的实现与架构指南存在偏差，导致代码结构不一致、模块间依赖混乱。主要问题：

1. **依赖倒置**：`kernel/blueprint-freezer.ts` 直接导入 `work/part-resolver.ts`，违反架构原则
2. **职责缺失**：`arsenals/` 缺少 `forge.ts`（资产铸造），资产创建逻辑散落在 CLI
3. **职责混淆**：`resolvePartRef` 被视为单体逻辑，实际上包含"逻辑解析"和"物理寻址"两个不同阶段，混在一起会导致 oxn-dsl 成为新的 IO 洼地
4. **Port 违宪**：`PartResolverPort` 接口设计传入 `projectBoundary` 物理路径参数，污染 Kernel 真空
5. **技术债务**：多个文件（`promoter.ts`、`cli/draft.ts` 等）直接使用原生 `fs`，违反"所有 IO 必须经由 Infra"原则

## What Changes

1. **新建 `arsenals/forge.ts`** — 资产铸造模块，将 CLI 中的 draft 创建逻辑收敛到 Arsenal 内部
2. **拆解 Part 解析职责** — 将 Part 引用解析拆分为：
   - 纯逻辑解析（L0 Kernel）：`oxn://parts/xxx` → `{ scope, name }`，留在 `kernel/processors/namespace.ts`
   - 物理寻址（L2 Runtime/Arsenal）：根据 scope 找到资产文件，封装在 Arsenal 的 `PartPort` 实现中
3. **消除反向依赖** — `blueprint-freezer.ts` 通过 `PartPort` 接口获取 Part 解析能力，接口不含任何物理参数
4. **技术债务清理** — `promoter.ts` 等文件改为通过 Infra 接口进行 IO 操作

## Capabilities

### New Capabilities

- `arsenal-forge-module`: 新建 Arsenal 内部的资产铸造模块，负责根据 DSL 模板生成符合规范的资产骨架
- `kernel-part-port`: Kernel 定义纯净的 `PartPort` 接口（只接收逻辑引用，不含物理路径参数）
- `arsenal-part-port-impl`: Arsenal 实现 `PartPort`，封装 Builtin/Project/Global 的统一寻址逻辑

### Modified Capabilities

- `builtin-arsenal-interface`: 调整 `BuiltinArsenal` 与新 `forge.ts` 的协作关系（接口不变）
- `arsenal-registry`: 配合 `forge.ts` 新增资产创建入口（Registry 本身接口不变）

## Impact

- **新增文件**：`src/arsenals/forge.ts`、`src/kernel/contracts/part-port.ts`
- **职责重分配**：`work/part-resolver.ts` 的解析逻辑被拆分，纯逻辑归 Kernel，寻址归 Arsenal
- **接口变更**：`kernel/blueprint-freezer.ts` 改用 `PartPort` 注入，接口不含 `projectBoundary`
- **技术债务清理**：涉及 `arsenals/promoter.ts`、`cli/draft.ts` 等文件的 IO 操作改造