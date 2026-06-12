## 1. 迁移 oxn-assembly.schema.ts

- [x] 1.1 创建 `src/oxn-dsl/schemas/` 目录
- [x] 1.2 移动 `src/kernel/schemas/oxn-assembly.schema.ts` → `src/oxn-dsl/schemas/oxn-assembly.schema.ts`
- [x] 1.3 更新 `oxn-dsl/generator/oxn-generator.ts` 的 import 路径
- [x] 1.4 更新 `oxn-dsl/compiler/oxn-adapter.ts` 的 import 路径
- [x] 1.5 更新 `oxn-dsl/loader/oxn-loader.ts` 的 import 路径
- [x] 1.6 更新 `oxn-dsl/evaluator/param-evaluator.ts` 的 import 路径
- [x] 1.7 更新 `oxn-dsl/compiler/bundle-compiler.ts` 的 import 路径
- [x] 1.8 更新 `oxn-dsl/flattener/bundle-flattener.ts` 的 import 路径
- [x] 1.9 更新 `oxn-dsl/validator/mutation-validator.ts` 的 import 路径
- [x] 1.10 更新 `oxn-dsl/validator/rule-validator.ts` 的 import 路径
- [x] 1.11 更新 `oxn-dsl/scope/oxn-scope.ts` 的 import 路径
- [x] 1.12 更新 `kernel/explore/evaluator.ts` 的 import 路径（仅引用 `OxnAssemblyProp`）

## 2. 迁移 expectation-runner.ts

- [x] 2.1 创建 `src/oxn-dsl/executor/` 目录
- [x] 2.2 移动 `src/kernel/executor/expectation-runner.ts` → `src/oxn-dsl/executor/expectation-runner.ts`
- [x] 2.3 更新 `oxn-dsl/__tests__/phase4.test.ts` 的 import 路径

## 3. 清理 kernel 层

- [x] 3.1 删除 `src/kernel/executor/` 目录（如果变空）
- [x] 3.2 确认 `kernel/task/sandbox-manager.ts` 引用 `oxn-assembly.schema.ts`（待后续 Phase 迁 Work 层，暂保留在 kernel）

## 4. 验证

- [x] 4.1 运行 `bun test` 确保所有测试通过
- [x] 4.2 运行 `bun run typecheck` 确保无类型错误
- [x] 4.3 运行 `bun run lint` 确保无 lint 错误