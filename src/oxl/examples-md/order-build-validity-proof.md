---
entity: proof
version: 0.3.0
name: order-build-validity
---

# Proof: order-build-validity

> 示例 Proof：演示 unified + 纯 MD 语法的 Proof 实体
> 5 类 Intent 资产中的 Proof 轴示例（本文件）
> 用途：证明 place-order Work 的 build 步骤产出可执行 + 类型 + lint 全部通过

## Verdicts

### build-exists
- type: pass
- value: dist/oxn 文件存在且 sha256 与 lock 记录一致

### type-check
- type: pass
- value: bun run typecheck 0 error（0 warning）

### lint
- type: pass
- value: bun run lint 0 error（pre-existing 1 warning 不计）

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 3
- probes_passed: 3
- probes_inconclusive: 0
