# ADR-0036: canonical.oxn 命名约定依据

> **来源**：`docs_tmp/arsenal-oxn-2.md` (2026-05-21)
> **抽取日**：2026-07-04
> **状态**：Superseded（已用 blueprint.oxn + frozen.json 三件套替代）
> **superseded-by**：blueprint.oxn + frozen.json 三件套（v0.6.1 正式替代 canonical.oxn）
> **影响层**：E1 Asset

## 历史决策

v0.1 阶段 OXL 设计用 `canonical.oxn` 作为资产"正本"文件名（区别于"草稿"），由 `forge` 命令生成。

## 当前状态

- ❌ canonical.oxn 不再使用
- ✅ 改用：
  - `blueprint.oxn`（Blueprint 正本）
  - `domain.oxn`（Domain 正本）
  - `frozen.json`（编译产物）

## 保留意义

本 ADR 记录命名演化的关键节点，避免后人重提 `canonical.*`。

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-21-arsenal-oxn-2.md`
- `docs/zh-cn/asset.md` §命名约定