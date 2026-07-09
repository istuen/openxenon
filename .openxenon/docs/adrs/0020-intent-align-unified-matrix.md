# ADR-0020: Intent / Align 统一矩阵（Blueprint = Intent, Work = Align）

> **来源**：`docs_tmp/oxn-ddd-1.md` (2026-06-04)
> **抽取日**：2026-07-04
> **状态**：Adopted
> **影响层**：E1-E4 整体哲学

## 决策

OXN 四实体与 Intent/Align 矩阵映射：

```
                  Intent              Align
              (声明"我要什么")   (实施"我怎么做")
─────────────────────────────────────────────
E1 Asset      Domain / Blueprint    Part / Probe
E2 Work       work.oxn (intent)     IAP Align 阶段
E3 Engine     frozen schema         Kernel 验证
E4 Insight    涌现的"为什么"      涌现的"是什么"
```

## 核心命题

- **Asset 是工程师的 Intent**（静态边界）
- **Work 是 AI 的 Align**（动态协作）
- **Engine 公证 Align 是否符合 Intent**
- **Insight 把 Align 反哺给 Intent**（涌现）

## 后果

- ✅ DDD "Bounded Context" 自然映射 Blueprint
- ✅ Intent / Align 二分贯穿全部 4 个实体
- ✅ slogan："**Intent Arsenal, Align Work**"
- ❌ DDD 战术术语（aggregate / entity / value_object）**未引入**到 OXL（避免语法污染）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-06-04-oxn-ddd-1.md`
- 关联 ADR-0006 三相模型