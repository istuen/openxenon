---
entity: adr
version: 1.0.0
status: Accepted
date: 2026-07-22
supersedes: null
superseded-by: null
related:
  - .openxenon/CONTEXT-MAP.md
  - .openxenon/assets/roadmaps/oxn-system.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - .openxenon/assets/workflows/dev-workflow.md
  - .openxenon/assets/workflows/doc-author.md
---

# ADR-0069: Asset 自举完整性——最小可用 Asset 集规范

> **状态**：✅ Accepted
> **日期**：2026-07-22
> **来源**：2026-07-22 grilling session（domain-modeling skill）
> **影响层**：Asset 边界 + Workflow 自举链路

## Context

<!-- allow-version -->
v0.6 引入 Asset 体系后，OXN 自身有完整的根 Asset 三件套（oxn-domain + oxn-workflow + oxn-stack + oxn-blueprint），但**没有规范定义"一个新项目要 bootstrap 起来需要哪些 Asset"**。
<!-- /allow-version -->

历史症状：
- Roadmap 100% 断链（14 个 Domain 引用全指 archived）——自举入口断裂
- dev-workflow.md 是 stub——3 个 scene 依赖它但拿到空壳
- 用户用 `oxn init` 后不知道接下来该写哪些 Domain/Workflow/Stack

核心问题：**Asset 自举完整性没有规范**。结果是新项目要么依赖 OXN 自身的根 Asset（不可能独立），要么不知道该从哪开始。

## Decision

### D1: 最小可用 Asset 集（Minimum Viable Asset Set）

一个新项目要 bootstrap OpenXenon 协作，**必须**包含以下 Asset：

| Kind | 数量 | 必含示例 | 选含（按项目特性） |
|---|---|---|---|
| **Domain** | ≥ 1（业务边界）| 1 个项目专属 domain | oxn-domain（顶层词汇引用）|
| **Workflow** | ≥ 2 | dev-workflow + doc-author（公共入口）| 项目专属子 workflow（add-cli-subcommand 等）|
| **Stack** | ≥ 1 | 项目自身 stack（如 ts-stack / python-stack）| 多个 stack 按环境拆分 |
| **Blueprint** | ≥ 1 | oxn-blueprint 或项目专属 blueprint | doc-* workflow 等 promote blueprint |
| **Roadmap** | ≥ 1 | oxn-system 或项目专属 roadmap | scene 调整 |

**总计：≥ 6 个 Asset**（1 Domain + 2 Workflow + 1 Stack + 1 Blueprint + 1 Roadmap）。

### D2: 公共 Asset vs 项目 Asset 边界

| 类别 | 物理位置 | scope | 复用性 |
|---|---|---|---|
| **公共 Asset** | OXN 引擎内置 / `src/builtin/` | @oxn | OXN 自带，所有项目共享 |
| **OXN 根 Asset** | `.openxenon/assets/`（root project） | @prj | OXN 自身使用，可被引用 |
| **项目 Asset** | `<user-project>/.openxenon/assets/` | @prj | 单项目使用，可被引用 |

**OXN 根 Asset 不是项目可省略的——它是 Asset 体系的术语权威**（Domain SSOT）。新项目可引用但不应复制。

### D3: 自举完整性 3 项守卫

#### G1: Asset 数量下限校验

`oxn init` 完成后，自动检查 `.openxenon/assets/` 目录：

```yaml
# checks
- domains/  ≥ 1
- workflows/ ≥ 2 (dev-workflow + doc-author)
- stack/    ≥ 1
- blueprints/ ≥ 1
- roadmaps/ ≥ 1
```

不满足 → 提示用户参考 ADR-0069 模板。

#### G2: Blueprint 依赖完整性

每个 Blueprint 必须通过 `## Use` 段引用：
- ≥ 1 个 Domain（词汇支撑）
- ≥ 1 个 Workflow（执行支撑）
- ≥ 1 个 Stack（实现支撑）

缺任一 → `IAP_INTENT_BLUEPRINT_INCOMPLETE`。

#### G3: Root Workflow 双轨存在

`oxn-workflow`（root workflow）必须有 dev + doc 两个 slot（2026-07-22 收敛后）。

只有 dev 没有 doc → Blueprint 实例化时无文档产出路径。
只有 doc 没有 dev → Blueprint 实例化时无代码产出路径。

### D4: 自举模板（Asset Template）

`oxn init --template bootstrap` 自动生成：

```
<project>/.openxenon/assets/
├── domains/
│   └── <project>-domain.md    # 项目专属 domain（业务术语）
├── workflows/
│   ├── dev-workflow.md        # 引用 @prj/workflows/dev-workflow
│   └── doc-author.md          # 引用 @prj/workflows/doc-author
├── stack/
│   └── <project>-stack.md     # 项目技术栈约束
├── blueprints/
│   └── <project>-blueprint.md # 项目组合模板（引用 3 root asset）
└── roadmaps/
    └── <project>-system.md    # 项目 scene 表
```

模板 Asset 是 SSOT，新项目必须复用模板；模板变更走 PR。

## Consequences

### 正面

- **新项目 bootstrap 路径清晰**：6 个最小 Asset 集 + 模板生成
- **自举守卫**避免半残 bootstrap（只有 dev 没有 doc 等）
- **公共 vs 项目 Asset 边界**明确，避免 Asset 复制和污染
- **Blueprint 依赖完整性**防止"孤立 Blueprint"（无 Domain/Workflow/Stack 引用）

### 负面 / 风险

- **Asset 数量下限可能误伤小项目**：极简项目可能只需要 1 个 Domain + 1 个 Blueprint
  - 缓解：提供 `--minimal` flag 放宽门槛
- **模板强制复用**可能限制项目特异性
  - 缓解：模板只约束结构（frontmatter + 必需 slot），不约束内容

### 衍生

- **ADR-0070** 写"Glossary ↔ Domain 同步"机制——Domain SSOT 是 Asset 体系的一部分
- **oxn-cli** 新增 `oxn asset check` 子命令——实现 G1/G2/G3 守卫
- **Roadmap sync 增强**——promote asset 自动触发 Roadmap scene 更新

## Alternatives Considered

- **不设下限，让用户自由 bootstrap**：灵活但产生大量半残项目。否决
- **固定 6 个 Asset 模板，不允许删减**：严格但限制项目特异性。否决——改为下限而非固定
- **只要求 Blueprint 完整，Domain/Workflow/Stack 可选**：Blueprint 是组合模板，但缺任一根 asset 的 Blueprint 是"空挂"。否决

## References

- [CONTEXT-MAP.md](../../../../CONTEXT-MAP.md) — 根级词汇表
- [Roadmap oxn-system](../../../assets/roadmaps/oxn-system.md) — 6 scene 路由
- [ADR-0054 三边界框架](./0054-three-boundary-framework.md) — Domain/Workflow/Stack 三正交维度
- [ADR-0055 Blueprint 提升](./0055-blueprint-as-composition-template.md) — Blueprint 组合模板
- [ADR-0070 Glossary ↔ Domain 同步](./0070-glossary-domain-sync.md) — 同步机制