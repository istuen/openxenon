---
title: 自定义 Probe
---

# 自定义 Probe

> 内置 11 个 Probe + 自定义 Probe 接口。

## 内置 Probe 类型

| Probe | 用途 |
|---|---|
| `fs-exists` | 检查文件是否存在 |
| `fs-not-exists` | 检查文件不存在 |
| `fs-content-match` | 检查文件内容匹配正则 |
| `fs-parseable` | 检查文件可解析（JSON 等） |
| `ts-compiles` | TypeScript 编译通过 |
| `lint-check` | Linter 检查通过 |
| `test-pass` | 测试全部通过 |
| `command-exit-code` | 命令退出码为 0 |
| `http-status` | HTTP 响应状态码 |
| `custom-script` | 自定义脚本 |
| `manual` | 人工确认 |

## 自定义 Probe 接口

```ts
// packages/engine/src/kernel/contracts/probe-port.ts
interface ProbePort {
  name: string
  description: string
  run(context: ProbeContext): Promise<ProbeResult>
}
```

## 注册流程

1. 在 `packages/engine/src/infra/probes/` 下新建文件
2. 实现 `ProbePort` 接口
3. 在 `packages/engine/src/kernel/verdicts/catalog.ts` 注册
4. 编写测试：`packages/engine/src/infra/probes/__tests__/<name>.test.ts`

## 参考

- [AGENTS.md §Probes 拆分](../../../AGENTS.md#仓库约定) — verdicts ↔ probes 对偶
- [ADR-0008 ProbeObservation vs ProbeOutcome](../../../.openxenon/drafts/rfc/0008-probe-observation-vs-verdict.md)
