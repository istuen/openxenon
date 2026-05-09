## Probe 类型设计

```
┌─────────────────────────────────────────────────────────────┐
│                    Probe 三层架构                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐     契约 YAML      ┌─────────────┐        │
│  │  Blueprint  │ ───────────────▶ │   Probe     │        │
│  └─────────────┘                   └─────────────┘        │
│        │                                │                   │
│        │ "评判"                         │ "能力"            │
│        ▼                                ▼                   │
│  ┌─────────────┐                   ┌─────────────┐        │
│  │   Kernel    │                   │    Infra    │        │
│  │  evaluator  │                   │   probes/   │        │
│  └─────────────┘                   └─────────────┘        │
│                                          │                   │
│                                          ▼                   │
│                                   ┌─────────────┐        │
│                                   │   硬件 I/O   │        │
│                                   └─────────────┘        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Probe 接口（Infra 层定义）

```typescript
// src/infra/probes/types.ts

export interface ProbeResult {
  passed: boolean
  actual?: string
  expected?: string
  message?: string
}

export interface Probe {
  name: string
  capacity: 'fs-exists' | 'fs-not-exists' | 'fs-match' | 'shell-exec'
  args: Record<string, string>
}
```

### Kernel evaluator 只消费接口

```typescript
// src/kernel/probes/evaluator.ts

import type { Probe, ProbeResult } from '../../infra/probes/types'

export function evaluateProbe(
  probe: Probe,
  workspaceRoot: string
): ProbeResult {
  // 纯函数，不直接执行 I/O
  // 通过 Infra 层执行
}
```

### 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| Infra 不导入 Kernel | `grep -r "from.*kernel" src/infra/` 返回空 |
| Kernel 不直接执行 I/O | `grep -r "fs\." src/kernel/` 返回空 |
