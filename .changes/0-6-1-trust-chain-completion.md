# v0.6.1: 信任链叙事落地 + 文档补全

> **版本**：v0.6.1
> **日期**：2026-07-12
> **作者**：opencode + user（协作）
> **关联 RFC**：[版本统一 RFC](../docs/rfcs/version-unification-rfc.md)
> **关联 ADR**：[0054 三边界框架](../docs/adrs/0054-three-boundary-framework.md), [0055 Blueprint 组合模板](../docs/adrs/0055-blueprint-as-composition-template.md), [0056 External inline](../docs/adrs/0056-external-inline-and-status.md)

## 概述

将"信任链"确立为 OpenXenon Engine 的核心叙事，并补全文档缺口：核心概念文档新增信任链/三边界/最小信任闭环章节，5 个 ADR 物理文件创建，changelog 片段归位。

## 核心变更

### 1. 信任链叙事写入核心概念文档

`docs/zh-cn/core-concepts.md` 新增：
- §3.1 信任链——OpenXenon 的核心（三方信任拓扑 + ASCII 图）
- §6.1 三边界框架（ADR-0054）
- §6.2 Blueprint 组合模板（ADR-0055）
- §6.3 AssetKind 5 类型（v0.6.1）
- §13 最小信任闭环（四层确定性 + A1/A2/A3 修复）

### 2. ADR 物理文件创建

| ADR | 文件 | 状态 |
|---|---|---|
| 0053 | `0053-superseded-0048-library-external-scheme.md` | ⛔ Superseded |
| 0054 | `0054-three-boundary-framework.md` | ✅ Adopted |
| 0055 | `0055-blueprint-as-composition-template.md` | ✅ Adopted |
| 0056 | `0056-external-inline-and-status.md` | ✅ Adopted |

### 3. INDEX.md 更新

- ADR 总数 43 → 48
- 状态统计更新（Adopted 24→27, Superseded 5→7）
- 新增 ADR-0052~0056 条目
- 落地状态表新增 0052/0054/0055

### 4. Changelog 引用修正

`0-6-1-three-boundary-blueprint-elevation.md` 中 ADR-0052 引用从不存在的文件修正为 ADR-0019 直接引用。

## 文件清单

| 文件 | 操作 |
|---|---|
| `docs/zh-cn/core-concepts.md` | 修改：新增 §3.1/§6.1~6.3/§13 + 更新参考列表 |
| `.openxenon/docs/adrs/0053-superseded-0048-library-external-scheme.md` | 新建 |
| `.openxenon/docs/adrs/0054-three-boundary-framework.md` | 新建 |
| `.openxenon/docs/adrs/0055-blueprint-as-composition-template.md` | 新建 |
| `.openxenon/docs/adrs/0056-external-inline-and-status.md` | 新建 |
| `.openxenon/docs/adrs/INDEX.md` | 修改：新增条目 + 更新统计 |
| `.changes/0-6-1-three-boundary-blueprint-elevation.md` | 修改：修正 ADR 引用 |
