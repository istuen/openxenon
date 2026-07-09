# ADR-0001: Blueprint props 漏斗效应 + 三层默认值优先级

> **来源**：`docs_tmp/blueprint5.md` (2026-05-19)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L1-OXL

## 决策

Blueprint props ≠ Part props 合集，是**漏斗**：Blueprint 通过硬编码 / 拼接 / 默认值吸收子层复杂度。

## 三层默认值优先级链（从高到低）

1. **父层显式**（Blueprint / Task `--param`）
2. **本层 default**（Blueprint 的 params.default）
3. **子层 schema default**（Part / Probe 的 props.default）

## 背景

早期 OXL 设计曾让 Blueprint props 与 Part props 解耦，导致调用者需逐一填写 Part 内部参数。漏斗效应原则让 Blueprint 充当"参数收敛器"，简化上层调用。

## 后果

- ✅ Task 命令行参数简短（只需关心 Blueprint 暴露面）
- ✅ Part 内部细节对调用者隐藏
- ⚠️ Part 改名 / 删除属性时需同步检查 Blueprint 引用
- 🔗 OXL `params` 求值链仍依此原则，需在 `docs/zh-cn/asset.md` 显式写入

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-19-blueprint5.md`