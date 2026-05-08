## 1. 斩首 kernel/lib/task-trace.ts 副作用

- [x] 1.1 创建 `src/daemon/trace/writer.ts` 作为唯一写入点
  - 导入 `kernel.buildTraceEvent` 输出的数据
  - 调用 `Infra/fs.appendOnly()` 写入
  - **验收**：此文件是项目中唯一能写 `task-trace.yaml` 的地方

- [x] 1.2 重构 `src/kernel/lib/task-trace.ts` 为纯函数
  - 移除所有 `import { fs }` 和 `appendFileSync`/`writeFileSync`
  - 保留 `buildTraceEvent()` 函数（返回 TraceEvent[]）
  - 保留 `reduceTraceEvents()` 函数（纯归约）
  - 保留 `computeNextStage()` 函数（纯计算）
  - **验收**：`grep -r "appendFileSync\|writeFileSync" src/kernel/` 返回空

- [x] 1.3 更新所有 `task-trace.ts` 调用方
  - 找到所有调用 `createTaskTrace`/`appendTaskStatus` 等函数的地方
  - 改为：调用 Kernel 纯函数获取事件 → 调用 `daemon/trace/writer.appendTrace()`
  - 可能包括：`daemon/engine.ts`, `cli/handlers/*`

## 2. 重构 kernel/probes/executor.ts → evaluator.ts

- [x] 2.1 创建 `src/kernel/probes/evaluator.ts`（纯函数）
  - `evaluateProbe(definition, actualResult): ProbeVerdict`
  - `reduceProbeResults(results, policy): ProbeVerdict`
  - **验收**：此文件无任何 `import.*fs` 或 `import.*process`

- [x] 2.2 创建 `src/infra/probes/` 目录（能力层）
  - `src/infra/probes/fs-exists.ts` - 执行 glob
  - `src/infra/probes/fs-not-exists.ts` - 执行 glob
  - `src/infra/probes/fs-match.ts` - 读取文件 + regex
  - `src/infra/probes/shell-exec.ts` - 执行命令
  - `src/infra/probes/index.ts` - 运行时路由表

- [x] 2.3 更新 `daemon/engine.ts` 的探针执行逻辑
  - 改为：调用 `infra/probes[type]()` 获取 actualResult
  - 调用 `kernel/evaluator.evaluateProbe()` 获取 verdict
  - **验收**：engine.ts 中无 switch-case 硬编码探针类型

- [x] 2.4 删除 `src/kernel/built-in-proofs-registry.ts`

## 3. 修正 infra/staging/staging-manager.ts 反向依赖

- [x] 3.1 重构 `StagingManager` 构造函数
  - 将 `taskPath` 改为原始 `string` 参数传入
  - 删除 `import { getTaskPath } from '../../kernel'`
  - **验收**：`grep -r "from.*kernel" src/infra/` 返回空

- [ ] 3.2 更新所有 `StagingManager` 调用方
  - 找到所有 `new StagingManager(...)` 的地方
  - 传入计算好的路径字符串，而非让 StagingManager 自己计算

## 4. 建立宪法强制 ESLint 规则

- [x] 4.1 在项目根目录创建 `.eslintrc.cjs`
  - 添加 `no-restricted-imports` 规则
  - 阻止 `kernel/**` 导入 `infra/**`, `node:fs`, `node:net`, `node:child_process`
  - 阻止 `infra/**` 导入 `kernel/**`, `daemon/**`, `cli/**`
  - 阻止 `cli/**` 导入 `daemon/**`
  - 阻止 `daemon/**` 导入 `cli/**`

- [ ] 4.2 验证规则有效性
  - 运行 ESLint 确认能检测现有违规

## 5. 验证

- [ ] 5.1 运行 `pnpm run typecheck` 确认无类型错误
- [ ] 5.2 运行 `pnpm build` 确认构建成功
- [ ] 5.3 确认 `grep -r "appendFileSync\|writeFileSync" src/kernel/` 返回空
- [ ] 5.4 确认 `grep -r "from.*kernel" src/infra/` 返回空

## 依赖关系

```
Phase 1 (无依赖，可并行):
├─ 任务 1.1 (创建 writer.ts)
├─ 任务 1.2 (重构 task-trace.ts)
└─ 任务 2.1 (创建 evaluator.ts)
    │
    ▼
Phase 2 (依赖 Phase 1):
├─ 任务 1.3 (更新调用方)
├─ 任务 2.2 (创建 infra/probes/)
└─ 任务 2.3 (更新 engine.ts)
    │
    ▼
Phase 3 (依赖 Phase 2):
├─ 任务 3.1 (修正 staging-manager)
├─ 任务 4 (ESLint 规则)
└─ 任务 5 (验证)
```
