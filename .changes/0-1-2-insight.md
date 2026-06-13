---
categories:
  - Added
---

- `oxn insight --proof <name>` 命令：读 frozen.json + probe-stats.json 即时产出结构化 Insight（v0.1.2 P→I 反馈）
- Insight 结构：3 层（evidenceChain + probeStats 视图 + emergentPatterns），不混入策略（无 suggestion 字段）
- 3 种涌现模式识别：
  - `consecutive-fail`：同一 target 连续失败 ≥2 次（撞墙信号）
  - `cross-proof-repeat`：同 probe type 出现 ≥3 个 proof（重复模式信号）
  - `cross-proof-fail-clusters`：同 (type+target) 在 ≥2 个 proof 都失败（设计缺陷信号）
- L0-Schema：`src/kernel/schemas/insight-schema.ts`（Zod schemaVersion=1）
- L0-Processor：`src/kernel/probes/insight-compute.ts`（纯函数：frozen + stats → Insight）
- L1-Infra：`src/infra/probes/insight-collector.ts`（纯 IO + schema 校验，路径由 L3 传入避免 §4.1 违规）
- L3-CLI：`src/cli/insight.ts`（编排 + output，错误码 `OXN_INSIGHT_INPUT_MISSING`）
- Skill 更新：`.opencode/skills/oxn-proof/SKILL.md` 加 Step5.5（verdict 后调 insight）+ 白名单扩 `oxn insight` + 错误契约
- 16 个 L0 单测覆盖 compute 三层 + 不可变性
- 8 个 E2E 测试覆盖：未 run / 未 init / PASS / consecutive-fail / cross-proof-repeat / cross-proof-fail-clusters / 多 probe type / human 输出