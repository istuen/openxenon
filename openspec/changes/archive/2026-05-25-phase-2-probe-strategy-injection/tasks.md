## 1. 改造 ProbeEvaluator 支持注入

- [x] 1.1 修改 `kernel/probes/evaluator.ts`，新增 `ProbeEvaluator` class
- [x] 1.2 将硬编码 strategy 移至静态默认映射 `ProbeEvaluator.defaultStrategies`
- [x] 1.3 保留静态方法 `evaluateProbe` 兼容现有调用方式
- [x] 1.4 运行测试验证行为一致

## 2. 导出类型供组合根使用

- [x] 2.1 确认 `ProbeStrategy` 类型导出
- [x] 2.2 确认 `ProbeEvaluator` class 导出

## 3. CLI 组合根注入（可选，后续阶段）

- [x] 3.1 在 CLI 入口注入 Infra 策略（当前阶段可跳过，运行测试通过即可）