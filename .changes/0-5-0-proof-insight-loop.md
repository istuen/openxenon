# 0.5.0 — Proof → Insight → Intent 反馈闭环

> **v0.5 主题**：填补 IAP 三轴的反馈缺口，构建从 Proof 证据 → Insight 洞察 → Intent 改进的完整闭环。

## 核心变化（用户视角）

### Proof Verdict .md 结案文档

每次 `oxn proof run` 在 `frozen.json` 之外，产出人类可读的 `verdict.md`：

```bash
oxn proof run my-proof
# → .openxenon/proofs/my-proof/frozen.json  (机器)
# → .openxenon/proofs/my-proof/verdict.md   (人类)

oxn proof show my-proof    # 终端渲染 frozen.json
cat proofs/my-proof/verdict.md  # 直接阅读结案文档
```

verdict.md 含 frontmatter（proof_id / verdict / run_at / content_hash / frozen_hash）、Evidence 清单（per-probe ✅/❌ + fact/conclusion）、Verdict Summary 表格、Interference 标记。

### Insight cross-proof 跨证明趋势分析

新增 `oxn insight --cross-proof`，扫描全部 proof 目录做跨证明分析：

```bash
oxn insight --cross-proof          # 全量扫描
oxn insight --cross-proof --since 2026-06-01  # 时间过滤
oxn insight --cross-proof --probe-type ts-compiles,test-pass  # 类型过滤
oxn insight --cross-proof --md     # 输出 cross-proof-insight.md 落盘
```

输出 4 维分析：Target 趋势矩阵（worsening/stable/improving）、Proof 关联热图（共现关系）、恶化/改善信号（连续趋势检测）、Probe 有效性排名（按 fail rate 排序）。

### Insight pipeline Intent→Work→Proof 全程分析

新增 `oxn insight --pipeline`，关联 Domain/Blueprint（Intent）→ Work trace（Align）→ Proof 结果（Proof）：

```bash
oxn insight --pipeline             # 全量 pipeline 分析
oxn insight --pipeline --work foo  # 追踪单个 Work 的 IAP 全生命周期
oxn insight --pipeline --md        # 输出 pipeline-insight.md 落盘
```

输出 4 维分析：Invariant 命中率（哪些约束真正在起作用）、Blueprint Slot DAG 偏差（声明 vs 实际执行）、Intent 覆盖率缺口（声明了但未验证的维度）、Work→Proof 全链追踪。

### Intent 改进审查闸门

从 Insight 产出改进建议 → audit pool 审查 → 审批通过原子覆盖 Intent：

```bash
# 从 insight 生成改进建议
oxn insight --pipeline --json | oxn pool create audit \
  --from insight --target domain CodeQualityContext

# 审查建议
oxn pool review <slug>

# 审批通过 → 原子覆盖 Domain/Blueprint
oxn pool approve <slug>

# 拒绝 → 归档
oxn pool reject <slug> --reason "不符合当前项目方向"
```

所有 approve/reject 操作产生 frozen.json 审计链（before_hash/after_hash），不可抵赖。

## 子 PR 清单

| PR | 名称 | 周次 |
|----|------|------|
| PR-A | Proof Verdict .md 输出 | W1 |
| PR-B | Insight cross-proof 模式 | W2 |
| PR-C | Insight pipeline 模式 | W3–W4 |
| PR-D | Intent review/approve gate | W5–W6 |

## 设计文档

- RFC：[v0.5-proof-insight-loop-rfc.md](../.openxenon/pools/sprints/v0.5-proof-insight-loop/design/v0.5-proof-insight-loop-rfc.md) v1.0
