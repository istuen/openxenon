---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# MD 唯一正交点

OXN 的 Asset .md 文件同时承载人类可读文档与 CLI/Engine 机器可读元数据（YAML frontmatter）。禁止为"机器可读"目的新建平行 yaml/json 配置文件。

## 背景

2026-08-01 `/grilling` session（分析 RFC-0017 terminology-two-tier-ssot）期间，曾提议 `.openxenon/context-map/{layers,dependencies,rules}.yaml` 作为"机器真理"层，与 `docs/` 人类镜像分离。该方案被否决。

## 理由

- MD frontmatter 已是 CLI 元数据源：`oxn assetmap list` 读 `assetmaps/*.md` 的 frontmatter；`oxn asset validate` 读所有 Asset 的 frontmatter 校验 schema
- 平行 yaml 会制造第二个 SSOT，必然漂移（与 RFC-0017 解决的 Domain↔glossary 漂移同病）
- "人类文档"与"机器配置"同源是 OXN 的设计纪律，非缺陷
- 单一文件格式降低认知负担：开发者只需理解 MD 一套格式

## 约束

- Asset / Workflow / Stack / Blueprint / Roadmap 的所有元数据通过 `.md` 文件 frontmatter 表达
- CLI/Engine 元数据需求（如 scene 列表、references DAG、kind 枚举）从 MD frontmatter 解析，不读独立 yaml
- 如未来确实需要更结构化的元数据承载，演进方向是**增强 frontmatter schema**（如新增 JSON Schema 校验），而非平行配置文件

## 反模式（需在 review 时拒绝）

- `.openxenon/context-map/*.yaml`
- `.openxenon/assets/{kind}/metadata.yaml`（与 .md 同名配套）
- 任何"机器专用"+ "人类文档"的双轨 SSOT

## 关联

- RFC-0017 术语双层 SSOT：Domain→glossary 单向同步是本 ADR 在术语维度的实例化（生成产物取代平行镜像）
- RFC-0018 项目工程元层：Meta 层文档与本 ADR 一致——不建平行机器配置
- ADR-0054 三边界框架：Workflow/Stack/Blueprint 元数据均在 Asset .md frontmatter 中
