## 1. 验证 executor.ts 是死代码

- [x] 1.1 `grep -r "executeProbe\|executeProbeList\|reduceToVerdict" src/` - executor.ts 只被自身和 index.ts 引用，无实际调用
- [x] 1.2 确认 `daemon/engine/executor.ts` 使用的是 `infra/probes`

## 2. 删除 executor.ts

- [x] 2.1 删除 `src/kernel/probes/executor.ts`

## 3. 更新 index.ts

- [x] 3.1 更新 `src/kernel/probes/index.ts` - 移除 executor 导出，改为导出 evaluator
- [x] 3.2 更新 `src/kernel/index.ts` - 移除 executor 导出，改为导出 evaluator

## 4. 验证

- [x] 4.1 `pnpm run typecheck` 通过
- [x] 4.2 确认 `grep -r "from.*executor" src/kernel/` 返回空
- [x] 4.3 确认 daemon 仍正常工作（使用 infra/probes）
