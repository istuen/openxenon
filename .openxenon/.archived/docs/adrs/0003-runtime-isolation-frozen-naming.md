# ADR-0003: 运行期隔离 + frozen 命名规则（不带源格式后缀）

> **来源**：`docs_tmp/oxn-grammer2.md` (2026-05-20)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L0-Contract

## 决策

### 运行期隔离

`frozen.json` 是**运行期唯一合法产物**。Engine 不得感知源格式（YAML / OXN / MD），源文件信息记录在 `_xenon_meta.source_format` 字段，运行期代码不做条件分支。

### frozen 命名约束

- ✅ `frozen.json`（不带 `.yaml`/`.oxn`/`.md` 后缀）
- ❌ `frozen.oxn.json` / `frozen.yaml.json`（暴露源格式）
- ✅ 源格式信息记录于 `_xenon_meta.source_format: "oxn" | "yaml" | "md"`

## 背景

跨格式（YAML→OXN→MD）迁移期间，Engine 不能根据源格式走不同代码路径。所有源格式差异在编译期被吸收，运行期只见 frozen.json。

## 后果

- ✅ Engine 简化（无需 if-else 源格式分支）
- ✅ frozen.json 是不可变流通产物
- ✅ 多源格式资产可在同一 Work 中混合引用

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-20-oxn-grammer2.md`