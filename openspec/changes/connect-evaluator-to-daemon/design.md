## 探针执行流程（修正后）

```
┌─────────────────────────────────────────────────────────────────┐
│                    完整三权分立流程                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [编排层] Daemon engine                                          │
│  │                                                              │
│  │  1. 提取 Blueprint 中的 Probe 定义                             │
│  │  2. 调用 Infra 执行物理观测                                  │
│  ▼                                                              │
│  [能力层] Infra/probes                                          │
│  │                                                              │
│  │  return { probeType, result: 'PASSED'|'FAILED', output }    │
│  ▼                                                              │
│  [评判层] Kernel/evaluator  ←───────────── 现在连接到这里!        │
│  │                                                              │
│  │  verdict = evaluateProbe(definition, actualResult)           │
│  │  verdict = reduceProbeResults(results, policy)              │
│  ▼                                                              │
│  [编排层] Daemon engine                                          │
│  │                                                              │
│  │  根据 verdict 追加到 task-trace.yaml                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## daemon/engine/executor.ts 修正

```typescript
// 修正后
import { evaluateProbe, reduceProbeResults, type ProbeResult, type ProbeDefinition } from '../../kernel/probes/evaluator'
import { getProbeHandler, type ProbeContext } from '../../infra/probes'

export async function executeStage(stage: Stage, options: ExecutorOptions) {
  const probeResults: ProbeResult[] = []

  for (const probe of stage.proof.probes) {
    // 1. 能力层：Infra 执行物理观测
    const handler = getProbeHandler(probe.type)
    const actualResult = await handler(probeParams, context)

    // 2. 评判层：Kernel 纯函数归约
    const definition: ProbeDefinition = {
      type: probe.type,
      params: { pattern: probe.pattern, command: probe.command }
    }
    const verdict = evaluateProbe(definition, actualResult)

    // 3. 编排层：收集结果
    probeResults.push(actualResult)
  }

  // 4. 评判层：归约最终 verdict
  const verdict = reduceProbeResults(probeResults, stage.proof.policy)

  return { success: verdict.passed, stageId, probeResults, verdict }
}
```

## ProbeResult 接口统一

```typescript
// infra/probes/index.ts (当前)
interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: number
}

// kernel/probes/evaluator.ts (当前)
interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: number
}

// 两者已经一致! ✓
```

接口已经一致，只需要让 daemon/engine/executor.ts 调用 evaluator 即可。
