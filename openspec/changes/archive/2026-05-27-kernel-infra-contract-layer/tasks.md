## 1. 建立契约层

- [x] 1.1 创建 `src/kernel/contracts/` 目录
- [x] 1.2 创建 `src/kernel/contracts/probe.ts` 文件
- [x] 1.3 定义 `ProbeObservation` 接口（从 Kernel 和 Infra 迁移）
- [x] 1.4 定义 `ProbeStrategy` 类型别名
- [x] 1.5 定义 `ProbeHandler` 类型别名
- [x] 1.6 定义 `ProbeVerdict` 接口
- [x] 1.7 定义 `ProbeStrategyMapping` 接口

## 2. 重构 Kernel 探针层

- [x] 2.1 更新 `kernel/probes/evaluator.ts` 引用 `kernel/contracts/probe.ts` 的 `ProbeObservation`
- [x] 2.2 移除 `globalEvaluator` 全局变量，改用依赖注入
- [x] 2.3 导出 `defaultEvaluator` 作为默认参数
- [x] 2.4 更新 `kernel/probes/index.ts` 导出
- [x] 2.5 验证 Kernel 无 I/O import（无 `fs`, `child_process`, `http` 等）— 注意：`kernel/task/sandbox-manager.ts` 有预存的 fs 导入，超出本次变更范围

## 3. 重构 Infra 探针层

- [x] 3.1 更新 `infra/probes/index.ts` 引用 `../../kernel/contracts/probe`
- [x] 3.2 移除 `infra/probes/index.ts` 中重复的 `ProbeObservation` 定义
- [x] 3.3 确保 `probeHandlers` 返回值兼容 `kernel/contracts` 定义
- [x] 3.4 更新 `infra/probes/fs-exists.ts` 使用统一的 `ProbeContext` 接口

## 4. 清理重复类型定义

- [x] 4.1 更新 `kernel/probes/namespace.ts` 导出给 Infra 使用（已导出）
- [x] 4.2 移除 `infra/loader.ts` 中重复的 `ProbeNamespace`, `ParsedProbeRef`, `parseProbeNamespace` 定义
- [x] 4.3 更新 `infra/loader.ts` 引用 `kernel/probes/namespace.ts`

## 5. 重构探索模块类型转换

- [x] 5.1 创建 `kernel/explore/converters.ts` 定义类型转换函数
- [x] 5.2 实现 `toExplorationContext()` 函数
- [x] 5.3 实现 `toProjectDir()`, `toProbeInfo()` 等辅助函数
- [x] 5.4 更新 `infra/explore/collector.ts` 调用 Kernel 转换函数
- [x] 5.5 移除 `infra/explore/collector.ts` 中的 `as` 类型断言

## 6. 验证与测试

- [x] 6.1 运行 TypeScript 类型检查确保无错误
- [x] 6.2 运行现有测试确保无回归
- [x] 6.3 验证 Kernel 层确实无全局可变状态
- [x] 6.4 验证所有 Probe 类型正常工作

## 7. Arsenal-BUILTIN-Infra 依赖约束（根据三方 AI 审查新增）

- [ ] 7.1 验证 `infra/loader.ts` 不 import `arsenals/builtin.ts`
- [ ] 7.2 验证 `infra/loader.ts` 中无 `require('../arsenals/builtin')`
- [ ] 7.3 `preloadCompileDependencies` 改为接收 BUILTIN_* 参数
- [ ] 7.4 更新所有调用 `preloadCompileDependencies` 的点，传入 BUILTIN_*
- [ ] 7.5 `work/part-resolver.ts` 改为通过 ArsenalResolver 获取 Part，不直接 import BUILTIN_PARTS
- [ ] 7.6 验证无其他模块违反禁止的依赖方向
