## 1. Stage 执行器

- [x] 1.1 创建 `src/core/stage/executor.ts` - StageExecutor 类
- [x] 1.2 实现 loadStage() 方法
- [x] 1.3 实现 execute() 方法
- [x] 1.4 实现 applyAction() 方法

## 2. Stage 调度器

- [x] 2.1 创建 `src/core/stage/dispatcher.ts` - StageDispatcher 类
- [x] 2.2 实现 dispatch() 方法
- [x] 2.3 实现 nextStage() 方法
- [x] 2.4 实现 hasNext() 方法

## 3. Sample 处理器

- [x] 3.1 创建 `src/core/stage/sample-handler.ts` - SampleHandler 类
- [x] 3.2 实现 createSample() 方法
- [x] 3.3 实现 approveSample() 方法
- [x] 3.4 实现 rejectSample() 方法

## 4. 模块导出

- [x] 4.1 创建 `src/core/stage/index.ts` 统一导出
- [x] 4.2 更新 `src/core/index.ts` 导出 stage 模块