# ADR-0037: part-resolver 从 Kernel 迁 L2 Work 的依据

> **来源**：`docs_tmp/system-1.md` (2026-05-26)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：L0 / L2 边界

## 决策

`part-resolver` 模块**从 Kernel（L0）迁到 Work（L2）**。

## 原因

- Kernel 真空（禁 IO / 解析 / 业务）
- Part 解析依赖 Arsenal（Project > Global > Builtin 优先级链），是**业务逻辑**
- L2-Work 才是 Part 实例化的语义层

## 模块依赖图（修正后）

```
DSL (L1-OXL) ──→ Schema (L0)
                  
Infra (L1)   ──→ Schema (L0)

Work (L2)    ──→ DSL (L1) + Kernel (L0) + Arsenal (L2-Builtin)
              ↑
              │ 含 part-resolver（从 Kernel 迁出）
```

## 现状

- ✅ 当前 `src/work/` 含 Part 解析逻辑
- ✅ Kernel 真空（无 part-resolver）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-05-26-system-1.md`
- AGENTS.md L0-Processor 宪法