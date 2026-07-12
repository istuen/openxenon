# ADR-0053: Superseded ADR-0048（library/external Asset 类型收敛）

> **状态**：⛔ Superseded
> **日期**：2026-07-10
> **Supersedes**：[ADR-0048](./0048-asset-library-external-scheme.md)
> **触发**：[三边界框架 + Blueprint 提升组合模板 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md)
> **影响层**：L1-Infra（Asset IO）+ L2-Engine（Asset lifecycle）+ L3-CLI（编译器）

## Context

ADR-0048 引入 `library/` 和 `external/` 两个 Asset 子目录，分别处理"已索引内容"和"外部引用指针"。三边界框架重构中，这两个 Asset 类型被证明是不必要的独立层级：

- **library**：运行时产生的动态文档，不应是 Asset（不可变边界）。成熟后可提炼为 Domain。
- **external**：外部引用指针，适合内联到 Domain/Workflow/Stack 的 `## Externals` H2 category，无需独立 Asset 类型。

## Decision

- `library` Asset 类型删除（非 Asset，降级为 `.openxenon/libraries/` 下的 `.md` 文件）
- `external` Asset 类型删除（收敛为 Domain/Workflow/Stack 内的 `## Externals` inline 声明）
- `library-compiler.ts` 和 `external-compiler.ts` 删除
- `.openxenon/assets/libraries/` 和 `.openxenon/assets/externals/` 目录废弃

## Consequences

- **正面**：AssetKind 从 6 收敛为 5，减少概念负担；External 可复用现有边界类型的解析能力
- **风险**：library 内容需要迁移路径（`oxn migrate external-assets`）
- **衍生**：ADR-0056 接管 External 的 inline 声明 + 状态管理

## References

- [ADR-0048 原文](./0048-asset-library-external-scheme.md)
- [三边界框架 RFC §3.2](../rfcs/three-boundary-blueprint-elevation-rfc.md)
- [changelog](../../../.changes/0-6-1-three-boundary-blueprint-elevation.md)
