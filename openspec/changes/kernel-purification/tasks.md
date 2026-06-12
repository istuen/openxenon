## 1. 创建目标模块结构

- [x] 1.1 创建 `src/work/probe-evaluator.ts` 空文件框架
- [x] 1.2 创建 `src/work/task-trace.ts` 空文件框架
- [x] 1.3 创建 `src/work/policies/` 目录和空文件框架
- [x] 1.4 创建 `src/oxn-dsl/compiler.ts` 空文件框架

## 2. 迁移探针评判逻辑至 Work

- [x] 2.1 复制 `kernel/processors/probes/evaluator.ts` 至 `work/probe-evaluator.ts`
- [x] 2.2 更新 import 从 `../../contracts/probe-port` 调整为 `kernel/contracts/probe-port`
- [x] 2.3 更新 `kernel/index.ts` 导出重定向至 `work/probe-evaluator.ts`
- [x] 2.4 验证 Work 层无 I/O import

## 3. 迁移蓝图编译至 OXN DSL

- [x] 3.1 复制 `kernel/processors/blueprint-compiler.ts` 至 `oxn-dsl/compiler.ts`
- [x] 3.2 移除 `computeContentHash`、`createXenonMeta` 等 crypto 相关逻辑（crypto 应在 Infra 层）
- [x] 3.3 更新 `kernel/index.ts` 导出移除 `compile` 相关
- [x] 3.4 验证 OXN DSL 层无 I/O import

## 4. 迁移任务状态机至 Work

- [x] 4.1 复制 `kernel/processors/task-trace.ts` 至 `work/task-trace.ts`
- [x] 4.2 更新 import 从 `../enums` 调整为 `kernel/enums`
- [x] 4.3 更新 `kernel/index.ts` 导出重定向至 `work/task-trace.ts`
- [x] 4.4 验证 Work 层无 I/O import

## 5. 迁移执行策略至 Work

- [x] 5.1 复制 `kernel/processors/policies/execution-policy.ts` 至 `work/policies/`
- [x] 5.2 创建 `work/policies/index.ts` 统一导出
- [x] 5.3 更新 `kernel/index.ts` 导出重定向至 `work/policies/`
- [x] 5.4 验证 Work 层无 I/O import

## 6. 重构 Kernel Processor 层

- [x] 6.1 实现 `evaluatePredicate(expected, actual, operator)` 通用谓词求值器
- [x] 6.2 保留 `topologicalSort` 但泛化（不依赖 Blueprint 类型）
- [x] 6.3 保留 `validateSchema` 泛化实现
- [x] 6.4 实现 `transformData` 数据变换管道
- [x] 6.5 清理 `kernel/index.ts` 移除已迁移的导出

## 7. 验证 Kernel 零 I/O 约束

- [x] 7.1 运行 `grep -r "from 'fs'" src/kernel/` 确认无结果（仅 sandbox-manager.ts 保留）
- [x] 7.2 运行 `grep -r "from 'path'" src/kernel/` 确认无结果（除 constants.ts、project.ts、task-dir.ts、sandbox-manager.ts）
- [x] 7.3 运行 `grep -r "from 'os'" src/kernel/` 确认无结果（仅 constants.ts 保留）
- [x] 7.4 运行 `grep -r "from 'crypto'" src/kernel/` 确认无结果（仅 frozen-schema.ts 保留）

## 8. 重构 frozen.json 范式

- [ ] 8.1 修改 Work 执行流程：先产出 Artifact，再生成 frozen.json
- [ ] 8.2 实现 `frozen-snapshot` 能力：执行后生成不可变快照
- [ ] 8.3 更新 CLI/Daemon 交互协议支持快照生成
- [ ] 8.4 验证快照存储在 `.openxenon/frozen/` 目录

## 9. 清理与整合

- [x] 9.1 删除原始 `kernel/processors/probes/evaluator.ts`（保留迁移确认后）
- [x] 9.2 删除原始 `kernel/processors/blueprint-compiler.ts`
- [x] 9.3 删除原始 `kernel/processors/task-trace.ts`
- [x] 9.4 删除原始 `kernel/processors/policies/execution-policy.ts`
- [x] 9.5 运行 lint 检查确保无遗留问题
- [x] 9.6 运行 typecheck 确保类型正确

## 待处理问题

### 已知残留 I/O 依赖（需要进一步决策）
- `sandbox-manager.ts`: 使用 `fs` - 违反 L0 零 I/O 约束
- `constants.ts`: 使用 `os.homedir` - 用于构建 BOUNDARY_DIR
- `frozen-schema.ts`: 使用 `crypto` - 用于 content_hash