---
title: 调试指南
---

# 调试指南

> frozen.json 异常诊断 + ports 排查 + OXNCrash 流程。

## frozen.json 异常

### `IAP_ALIGN_LOCK_HASH_MISMATCH`

**原因**：lock 后修改了 `.md` 资产（work.md / blueprint / task.md）。

```bash
# 查看 hash 差异
oxn work status <work> --json
# → 检查 state.json 中的 planLock vs 当前文件 hash
```

**修复**：`oxn work unlock <work>` → 修改 → `oxn work lock <work>`。

### Probe outcome `DEVIATED`

**原因**：Probe 运行偏离预期（脚本退出码非 0）。

```bash
# 查看 Probe 详情
oxn proof show <proof> --json
# → 检查 probe-results 中的 outcome 字段
```

### `E_FROZEN_HASH_MISMATCH`

**原因**：frozen.json 被手动修改（chmod 0o444 应阻止）。

```bash
# 验证 hash
oxn proof verify <proof>
# → 重新计算 content_hash 并比对
```

## 三档 Exit 分类

| 错误类型 | 退出码 | 输出到 | 诊断 |
|---|---|---|---|
| `IAPError` | 1 | stdout (JSON) | 业务错误，AI 可消费 |
| `OXNCrash` | 2 | stderr | 崩溃，人类处理 |
| `isCliInputError` | 1 | stdout (JSON) | 用户输入错误 |

## Ports 排查

```bash
# 检查 daemon 端口
lsof -i :<port>

# 检查 socket 连接
oxn status
```

## 参考

- [AGENTS.md §错误类型定义](../../../AGENTS.md#cli-架构oxn) — IAPError / OXNCrash / isCliInputError
- [RFC-0003 AI 协作哲学 §D3 OXN Engine 公证人 ≠ 裁判](../../rfc/zh-cn/RFC-0003-ai-collaboration.html#d3-oxn-engine-公证人--裁判)
- [AGENTS.md §开发者操作指南 §调试](../../../AGENTS.md#开发者操作指南)
