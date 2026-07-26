# ADR-0056: External inline 收敛 + 状态管理

> **状态**：✅ Adopted
> **日期**：2026-07-10
> **触发**：[三边界框架 + Blueprint 提升组合模板 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md)
> **影响层**：L1-OXL（编译器）+ L1-Infra（状态管理）+ L3-CLI（external 命令）

## Context

原 External 是独立 Asset 类型（ADR-0048），引入了 `external/` 子目录和独立编译器。三边界框架中，External 被证明适合内联到 Domain/Workflow/Stack 中，而非独立类型。

## Decision

**External 从 Asset 类型降级为边界类型内的 `## Externals` H2 category**：

```markdown
## Externals
- name: payment-gateway
  url: https://api.stripe.com
  kind: rest-api
  status: available          # optional: 手动覆盖
  reason: "Production dependency"
```

**规则**：
- 仅 Domain/Workflow/Stack 可声明 External（Blueprint 不支持——组合层不应有外部依赖）
- `url`（网络）或 `path`（本地）二选一（互斥）
- `kind` enum 6 值：`rest-api | webhook | documentation | library | config | service`

**状态管理**：
- 状态存储：`.openxenon/.cache/external-status.json`（gitignore）
- 4 种状态：`available | unavailable | stale | unknown`
- 更新方式：`oxn external check`（自动）或 `oxn external mark`（手动）
- 不阻断 Work 执行（仅记录，工程师决定是否使用）

**CLI 命令**：
```bash
oxn external check        # 扫描 + 检查可达性 + 更新状态
oxn external status       # 显示所有 external 状态
oxn external mark <name> --status <s> [--reason "..."]  # 手动标记
```

## Consequences

- **正面**：External 复用现有边界类型的解析能力；不增加 AssetKind 数量
- **正面**：状态管理非阻断——记录证据而非阻止执行（符合信任链哲学）
- **风险**：External status 是运行时缓存，需定期 check 保持准确
- **衍生**：ADR-0053 删除 library/external Asset 类型

## References

- [三边界框架 RFC §3.4](../rfcs/three-boundary-blueprint-elevation-rfc.md)
- [changelog §3](../../../.changes/0-6-1-three-boundary-blueprint-elevation.md)
