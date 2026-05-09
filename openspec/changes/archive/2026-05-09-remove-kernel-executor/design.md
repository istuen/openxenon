## 当前状态

```
kernel/probes/
├── executor.ts      ← 违规 + 死代码
│   ├── import { fs } from '../../infra/fs'  // ← 违规!
│   ├── import { process } from '../../infra/process'  // ← 违规!
│   └── export executeProbe, executeProbeList, reduceToVerdict
│
└── evaluator.ts     ← 纯函数 (正确)
    └── export evaluateProbe, reduceProbeResults
```

## 验证 executor.ts 是否被调用

```bash
# 应该返回空 - executor.ts 无人调用
grep -r "executeProbe\|executeProbeList\|reduceToVerdict" src/
```

## 修正后状态

```
kernel/probes/
├── evaluator.ts     ← 唯一的 probe 处理
│   └── export evaluateProbe, reduceProbeResults
└── index.ts        ← 只导出 evaluator
```

## ProbeResult 接口统一

```typescript
// kernel/probes/evaluator.ts (保留)
interface ProbeResult {
  probeType: string
  result: 'PASSED' | 'FAILED'
  output?: string
  error?: string
  executedAt: number
}
```

删除 executor.ts 中重复的 ProbeResult 定义。
