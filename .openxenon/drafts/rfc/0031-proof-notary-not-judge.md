# ADR-0031: "Proof = 公证人 ≠ 裁判" 边界精确化

> **来源**：`docs_tmp/harness-3.md` (2026-07-02)
> **抽取日**：2026-07-04
> **状态**：Adopted（核心已落 SSOT）
> **影响层**：E3 Engine 哲学

## 决策

OXN Engine / Probe 的本质是**公证人（Notary）**，不是**裁判（Judge）**：

### 公证人做什么

- ✅ 记录"发生了什么"（命令 / 退出码 / stdout / stderr）
- ✅ 在 hash 校验基础上证明"数据未被篡改"
- ✅ 输出可重现的 verdict（基于已定义规则）

### 公证人不做什么

- ❌ 评判"代码质量" / "设计好坏"
- ❌ 预测"未来风险"
- ❌ 自主决定"该不该 merge"

### 关键边界

| 决策权归属 | 谁 |
|---|---|
| 代码是否合并 | 工程师（或 PR reviewer AI） |
| Probe 是否失败 | 公证人（仅基于事实判定） |
| 业务是否正确 | 人类 |

## slogan 印证

> "**OpenXenon 不生产代码，只生产信任。**"

## 现状

- ✅ `docs/zh-cn/proof.md` 已落实（Probe 仅记录事实）
- ✅ Kernel 真空（无业务判断）

## 参考

- 源文件：`.openxenon/forges/sprints/archive/docs-tmp-era/2026-07-02-harness-3.md`
- 关联 ADR-0012 Main/Sub Agent 审计链