## Why

`src/kernel/probes/executor.ts` 是"辐射狗"——表面看是 probe 执行器，实际内部导入了 `fs` 和 `process`，违反了 Kernel 是"兰姆达真空"的宪法原则。

**更严重的是**：这个文件是**死代码**——没有人调用它导出的函数。

**问题**：
- 违规导入 I/O 模块
- 导出但未被使用
- 造成架构混淆（两个不兼容的 ProbeResult 接口）

## What Changes

1. **删除** `src/kernel/probes/executor.ts`
2. **更新** `src/kernel/probes/index.ts` - 移除对 executor 的导出
3. **更新** `src/kernel/index.ts` - 移除对 executor 的导出
4. **验证** typecheck 通过

## Impact

- Kernel 层不再有 I/O 违规
- 消除死代码
- 统一 ProbeResult 接口（使用 evaluator 版本）

## High Risk

- 低风险 - executor.ts 无人调用，删除不会影响功能
