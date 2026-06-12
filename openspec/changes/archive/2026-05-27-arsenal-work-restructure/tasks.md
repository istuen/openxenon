## 1. 建立宪法基础 - PartPort 接口定义

- [x] 1.1 新建 `src/kernel/contracts/part-port.ts`，定义纯净的 `PartPort` 接口
- [x] 1.2 接口方法：`fetchPartDefinition(logicalRef: string): Promise<PartDefinition>`
- [x] 1.3 验证接口不包含 `projectBoundary`、`path`、`cwd` 等物理路径参数
- [x] 1.4 验证 Kernel 的 namespace 解析器（`parsePartRef`）不依赖物理参数

## 2. Infra 收口 - 技术债务清理

- [x] 2.1 改造 `src/arsenals/promoter.ts`，所有 fs 操作改为通过 Infra 接口
- [x] 2.2 改造 `src/cli/draft.ts`，所有 fs 操作改为通过 Infra 接口
- [x] 2.3 改造 `src/oxn-dsl/loader/oxn-loader.ts`，所有 fs 操作改为通过 Infra 接口
- [x] 2.4 验证所有 IO 操作均通过 Infra，Kernel 无任何 fs import（⚠️ sandbox-manager.ts 除外，待 Port 注入改造）

## 3. Arsenal 重构 - PartPort 实现与 Forge 模块

- [x] 3.1 新建 `src/arsenals/forge.ts`，定义 `forgeAsset()` 函数
- [x] 3.2 实现 `forgeAsset()` 创建 draft 资产到 `.openxenon/forges/<type>/` 目录
- [x] 3.3 实现模板变量替换功能，支持 `{{name}}` 等占位符
- [x] 3.4 实现元 Forge 约束校验，校验生成的资产是否符合 constraints
- [x] 3.5 Arsenal 实现 `PartPort` 接口，封装 Builtin/Project/Global 优先级链寻址
- [x] 3.6 验证 `PartPort.fetchPartDefinition('oxn://parts/git-commit')` 返回内置 Part

## 4. Kernel 解绑 - BlueprintFreezer 改造

- [x] 4.1 改造 `src/kernel/processors/blueprint-freezer.ts`
- [x] 4.2 构造函数接受 `PartPort` 类型参数（依赖注入）
- [x] 4.3 移除对 `../../work/part-resolver.ts` 的直接 import
- [x] 4.4 验证 `src/kernel/` 目录无任何 import 指向 `work/` 模块

## 5. Work 层改造 - 调用 Arsenal 的 PartPort

- [x] 5.1 改造 `src/work/part-resolver.ts`，调用 Arsenal 的 `PartPort` 实现
- [x] 5.2 保留 `resolveBuiltinPart()` 函数作为 Arsenal 的 wrapper
- [x] 5.3 验证 Work 层不再直接访问文件系统

## 6. CLI Thin Wrapper - draft.ts 简化

- [x] 6.1 简化 `src/cli/draft.ts`，不超过 20 行代码
- [x] 6.2 draft.ts 只负责解析命令行参数，调用 `arsenals/forge.ts`
- [x] 6.3 验证所有资产创建逻辑收敛到 `arsenals/forge.ts`

## 7. 验证与测试

- [x] 7.1 验证 `forgeAsset()` 生成的资产可被 `arsenalLoadStandardByName()` 加载
- [x] 7.2 验证 `PartPort.fetchPartDefinition('oxn://parts/git-commit')` 返回正确的内置 Part
- [x] 7.3 验证 BlueprintFreezer 不再依赖 Work 模块
- [x] 7.4 运行现有测试，确保无回归