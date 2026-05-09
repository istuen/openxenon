## 当前代码问题

```typescript
// fs-execute.ts line 215-226
function executeProbe(probeType: string, pattern: string, projectRoot: string): ProbeResult {
  switch (probeType) {
    case 'fs_exists':
      return executeFsExistsProbe(pattern, projectRoot)
    case 'fs_content_match':
      return executeFsContentMatchProbe(pattern, projectRoot)
    case 'exec_exit_zero':
      return executeExecExitZeroProbe(pattern, projectRoot)
    default:
      return { passed: false, error: `Unknown probe type: ${probeType}` }
  }
}
```

本地函数直接执行 I/O，绕过了 kernel evaluator。

## 修正后

```typescript
import { getProbeHandler, type ProbeResult } from '../../../infra/probes'
import { evaluateProbe, type ProbeDefinition } from '../../../kernel/probes/evaluator'

function executeProbe(probeType: string, pattern: string, projectRoot: string): ProbeResult {
  const handler = getProbeHandler(probeType)
  if (!handler) {
    return { probeType, result: 'FAILED', error: `Unknown probe type: ${probeType}`, executedAt: Date.now() }
  }

  let params: Record<string, unknown>
  let actualType = probeType

  switch (probeType) {
    case 'fs_content_match': {
      actualType = 'fs_match'
      const [file, regex] = pattern.split(':')
      params = { file, regex }
      break
    }
    case 'exec_exit_zero': {
      actualType = 'shell_exec'
      params = { command: pattern }
      break
    }
    default:
      params = { pattern }
  }

  const context = { projectRoot }

  const result = await handler(params, context) as ProbeResult
  const definition: ProbeDefinition = { type: actualType, params }
  const verdict = evaluateProbe(definition, result)

  return {
    ...result,
    result: verdict.passed ? 'PASSED' : 'FAILED',
    executedAt: Date.now()
  }
}
```

## 移除的导出

- `executeFsExistsProbe` (line 228)
- `executeFsContentMatchProbe` (line 236)
- `executeExecExitZeroProbe` (line 260)
- 本地 `ProbeResult` interface (line 209)