## CLI Commands 职责

```
┌─────────────────────────────────────────────────────────────┐
│                    CLI 架构分层                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    参数解析     ┌─────────────┐            │
│  │  commands/  │ ──────────────▶ │  handlers/  │            │
│  │   *.ts     │                 │   *.ts      │            │
│  └─────────────┘                 └─────────────┘            │
│        │                              │                      │
│        │ "薄"                         │ "逻辑"                │
│        │ 只解析参数                    │ 调用 socket-client   │
│        ▼                              ▼                      │
│  ┌─────────────┐                 ┌─────────────┐            │
│  │     yargs   │                 │ socket-client│            │
│  │   parser   │                 │             │            │
│  └─────────────┘                 └─────────────┘            │
│                                        │                     │
│                                        ▼                     │
│                                 ┌─────────────┐            │
│                                 │ Unix Socket │            │
│                                 │ (纯 JSON)   │            │
│                                 └─────────────┘            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Example: task-start 命令

```typescript
// src/cli/commands/task-start.ts (修正后)

import { handler as taskStartHandler } from '../handlers/task-start'

export function command(yargs: Argv) {
  return yargs
    .command(
      'task:start <taskPath>',
      'Start a task',
      (yargs) => {
        return yargs
          .positional('taskPath', {
            type: 'string',
            demandOption: true
          })
      },
      async (argv) => {
        // 只调用 handler，不包含业务逻辑
        const result = await taskStartHandler(argv.taskPath)
        console.log(JSON.stringify(result, null, 2))
      }
    )
}
```

## 验证清单

| 检查项 | 验证方法 |
|--------|----------|
| commands/ 不含业务逻辑 | `grep -r "engine\|kernel\|daemon" src/cli/commands/` 返回空 |
| handler 负责业务逻辑 | 检查 handler 调用 socket-client |
