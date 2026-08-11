---
entity: adr
status: Archived
archived-at: 2026-08-11
archived-by: RFC-0030-D1
---

# ADR-0031: "Proof = 公证人 ≠ 裁判" 边界精确化

> **来源**：`docs_tmp/harness-3.md` (2026-07-02)
> **抽取日**：2026-07-04
> **状态**：Adopted（核心已落 SSOT）
> **修订**：2026-07-21 — **Notary 术语废弃**（详见 ADR-0066），决策内容保留并归入 OXN Engine desc
> **影响层**：E3 Engine 哲学

## 决策

OXN Engine / Probe 的本质是**公证人（Notary）**，不是**裁判（Judge）**：

> **2026-07-21 修订**：术语"Notary"废弃（ADR-0066）。OXN Engine 的角色本质不变（记录事实不评判），但改用更中性的描述归入 OXN Engine desc。本 ADR 保留决策内容，不作为独立术语使用。

### Engine 角色做什么

- ✅ 记录"发生了什么"（命令 / 退出码 / stdout / stderr）
- ✅ 在 hash 校验基础上证明"数据未被篡改"
- ✅ 输出可重现的 outcome（基于已定义规则，COMPLETED/DEVIATED/INCONCLUSIVE 三态）

### Engine 角色不做什么

- ❌ 评判"代码质量" / "设计好坏"
- ❌ 预测"未来风险"
- ❌ 自主决定"该不该 merge"
- ❌ 自主决定"工作是否合格"

### 关键边界

| 决策权归属 | 谁 |
|---|---|
| 代码是否合并 | 工程师（或 PR reviewer AI） |
| Probe 是否完成探测 + 目标是否符合 | OXN Engine（仅基于事实记录，不评判合格） |
| 业务是否正确 | 人类 |
| **工作是否合格** | **工程师（基于 outcome 聚合结构自行判定）** |

> **2026-07-21 补充**：ADR-0067 进一步明确，ProbeOutcome DEVIATED 时 OXN 只记录不阻断；判定权归工程师。

## slogan 印证

> "**OpenXenon 不生产代码，只生产证据。**"

> **2026-07-21 修订**：原 slogan"只生产信任"改为"只生产证据"。理由——"信任"在"彻底不判"原则下不存在（OXN 不判信任）；OXN 只生产证据，工程师基于证据建立信任。

## 现状

- ✅ `docs/zh-cn/proof.md` 已落实（Probe 仅记录事实）
- ✅ Kernel 真空（无业务判断）
- ✅ Verdict 拆分（ADR-0067）：frozen.json verdict 字段 → outcome 聚合结构
- ✅ ProbeOutcome 三态：COMPLETED / DEVIATED / INCONCLUSIVE

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-harness-3.md`
- 关联 ADR-0012 Main/Sub Agent 审计链
- **关联 ADR-0066 术语精简**（Notary 废弃，决策内容保留）
- **关联 ADR-0067 彻底不判贯彻**（Verdict 拆分 + outcome 聚合结构）