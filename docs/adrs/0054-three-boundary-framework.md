# ADR-0054: 三边界框架（Domain/Workflow/Stack 正交维度）

> **状态**：✅ Adopted
> **日期**：2026-07-10
> **触发**：[三边界框架 + Blueprint 提升组合模板 RFC](../rfcs/three-boundary-blueprint-elevation-rfc.md)
> **影响层**：L1-OXL（编译器）+ L2-Engine（Asset lifecycle）+ L3-CLI（命令）

## Context

<!-- allow-version -->
v0.6.1-alpha.1 有 6 种 AssetKind（domain/blueprint/stack/roadmap/library/external），边界类型混淆：
<!-- /allow-version -->
- Blueprint 承载"执行模板"行为，与"组合模板"职责混合
- library/external 是为特定用例引入的独立类型，增加了概念负担
- 工程师无法清晰区分"哪些 Asset 定义边界"vs"哪些 Asset 是模板"

三边界框架将 E1 Asset 的边界类型明确为 3 个正交维度。

## Decision

**E1 Asset 的边界类型明确为 3 个正交维度**：

| 边界类型 | 约束内容 | IAP 角色 | 引用方式 |
|---|---|---|---|
| **Domain** | 词汇表（term）/ 禁用词（ban）/ 不变量（invariant） | 业务边界（语义约束） | Work 级多选，Task 级单选 |
| **Workflow** | slots / deps / observe | 执行边界（结构约束） | Blueprint `## Refs` 引用 |
| **Stack** | runtimes / linters / testers | 实现边界（环境约束） | Work 级声明，不进 Task |

**约束**：
- 每种边界类型只引用同类型（kind-isolation 原则）
- Blueprint 是唯一的跨类型组合实体（引用 Domain + Workflow + Stack）
- Roadmap 是跨类型的导航索引（meta 层）

## Consequences

- **正面**：概念清晰——3 个正交维度定义"可靠"的全部边界
- **正面**：Blueprint 成为唯一组合层，单一职责
- **风险**：需迁移现有 Blueprint 文件为 Workflow（30 个文件）
- **衍生**：ADR-0055（Blueprint 组合模板）+ ADR-0056（External inline）

## Alternatives Considered

- **保留 6 类型不变**：概念负担不减，组合关系隐式——否决
- **5 类型但不改名 Blueprint**：语义混淆持续——否决

## References

- [三边界框架 RFC §2](../rfcs/three-boundary-blueprint-elevation-rfc.md)
- [2026-07-10 kind-isolation journal](../../pools/journals/2026-07-10-references-kind-isolation.md)
- [changelog](../../../.changes/0-6-1-three-boundary-blueprint-elevation.md)
