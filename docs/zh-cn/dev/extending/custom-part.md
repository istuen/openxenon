---
title: 自定义 Part
---

# 自定义 Part

> 内置 Part 类型 + 自定义 Part 接口 + 沙箱纪律。

## 内置 Part 类型

| Part | 用途 |
|---|---|
| `file-write` | 写入文件 |
| `file-edit` | 编辑文件（sed/patch） |
| `command-run` | 运行命令 |
| `prompt-ai` | 调用 AI Agent |
| `manual-review` | 人工审查 |

## 自定义 Part 接口

```ts
// packages/engine/src/kernel/contracts/part-port.ts
interface PartPort {
  name: string
  description: string
  execute(context: PartContext): Promise<PartResult>
}
```

## 沙箱纪律

- Task 沙箱：`./` 路径可读写，`@` namespace 只读
- Part 不能绕过 sandbox 写入限制
- `--force` 不可用（v0.6.1 起禁止）

## 参考

- [ADR-0024 PartId 主键 + atomic-write](../../../.openxenon/docs/adrs/0024-partid-primary-key-atomic-write.md)
- [ADR-0025 Task 沙箱豁免](../../../.openxenon/docs/adrs/0025-task-sandbox-local-vs-namespace.md)
