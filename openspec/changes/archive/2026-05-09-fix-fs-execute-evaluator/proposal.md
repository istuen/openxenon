## 问题

`daemon/ipc/handlers/fs-execute.ts` 有本地 `executeProbe` 函数（line 215），它直接执行 probe 并返回结果，绕过了 kernel evaluator。

### 当前流程（错误）
```
handleExecuteTask
  → executeProbe() [本地函数, 直接 I/O 并返回 passed]
  → createProbeResult() [包装为 ProbeResult]
  → 不调用 kernel.evaluateProbe()
```

### 正确流程（应该）
```
handleExecuteTask
  → getProbeHandler() [获取 infra handler]
  → handler(params, context) [infra 执行 I/O]
  → evaluateProbe() [kernel 评判]
  → createProbeResult() [可选, 如果需要 trace]
```

## 修复方案

1. 让 `executeProbe` 使用 `infra/probes` 的 handler（而不是本地实现）
2. 执行后调用 `kernel/probes/evaluator.evaluateProbe` 进行评判
3. 移除本地 `executeFsExistsProbe`, `executeFsContentMatchProbe`, `executeExecExitZeroProbe` 函数

## Probe 类型映射

| fs-execute.ts | infra/probes | 备注 |
|----------------|--------------|------|
| `fs_exists` | `fs_exists` | 相同 |
| `fs_content_match` | `fs_match` | 需转换 params |
| `exec_exit_zero` | `shell_exec` | 需转换 params |

## Params 转换

### fs_content_match → fs_match
- fs-execute: `pattern` = `file.txt:regex`
- infra: `params = { file: 'file.txt', regex: 'regex' }`

### exec_exit_zero → shell_exec
- fs-execute: `pattern` = `command`
- infra: `params = { command: 'command' }`

## 验证

```bash
pnpm run typecheck
pnpm build
```