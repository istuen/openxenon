## 1. 分析当前 probe 实现

- [x] 1.1 列出所有 `src/infra/probes/*.ts` - 5 个文件
- [x] 1.2 检查每个文件是否导入了 `src/kernel/` 模块 - 无导入
- [x] 1.3 确认 probe 类型的消费者 - kernel/probes/evaluator.ts

## 2. 建立/确认 types.ts

- [x] 2.1 `src/infra/probes/types.ts` 不存在，类型定义在 `index.ts` 内联
- [x] 2.2 内联定义 `ProbeResult` 和 `ProbeContext` 接口（符合当前架构）
- [x] 2.3 确认接口被 evaluator.ts 导入使用（通过 infra/probes/index.ts）

## 3. 确认无反向依赖

- [x] 3.1 `grep -r "from.*kernel" src/infra/` 返回空
- [x] 3.2 无反向依赖

## 4. 验证

- [x] 4.1 运行 `pnpm run typecheck` 确认无类型错误
- [x] 4.2 确认 `src/infra/probes/` 独立于 kernel
