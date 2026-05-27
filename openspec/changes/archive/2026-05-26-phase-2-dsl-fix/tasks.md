## 1. 接口设计

- [x] 1.1 在 `src/oxn-dsl/compiler/oxn-adapter.ts` 定义 `IPartResolver` 接口
- [x] 1.2 定义 `AdapterContext` 接口，包含 `boundary` 字段

## 2. 移除 part-resolver 依赖

- [x] 2.1 移除 `import { resolvePartRef } from '../../work/part-resolver.js'`
- [x] 2.2 修改 `OxnKernelAdapter` 构造函数，接受可选的 `IPartResolver`
- [x] 2.3 修改 `adapt()` 方法，从 `ctx.partResolver` 获取解析器
- [x] 2.4 验证所有 Slot 处理逻辑使用注入的 resolver

## 3. 移除 project boundary 依赖

- [x] 3.1 移除 `import { getProjectBoundaryPath } from '../../kernel/lib/project.js'`
- [x] 3.2 修改 Slot 处理逻辑，从 `AdapterContext.boundary` 获取而非直接调用
- [x] 3.3 验证 `getProjectBoundaryPath` 调用点已全部迁移

## 4. 调用方更新

- [x] 4.1 检查所有调用 `OxnKernelAdapter` 的地方
- [ ] 4.2 在 CLI 层 (L3) 提供 PartResolver 实例注入 (可选，当前向后兼容)

## 5. 验证

- [x] 5.1 运行 `pnpm build` 确保无编译错误
- [x] 5.2 运行 `pnpm test` 确保测试通过
- [x] 5.3 验证 DSL 只依赖 Schema 类型