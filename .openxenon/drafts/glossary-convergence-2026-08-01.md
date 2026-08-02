# Glossary 收敛草案（2026-08-01 grilling 输出）

> **来源**：2026-08-01 `/grilling` session（grill-with-docs + domain-modeling skill）
> **作者**：opencode（与 user 协作，2026-08-01）
> **状态**：待执行（仅分析，未动文件）
> **目标**：glossary.md 从 140 term 收敛到 130 term

---

## 0. Session 摘要

用户提出三类术语收敛诉求：
- **A. 通用术语**（Alpha / Anchor / Arg）— 大家都能理解，但实际承载 OXN 特定语义
- **B. 历史遗留**（Builtin / BuiltinAsset 与 Built-in Asset 三重名）— 已废弃或被替代
- **C. AI 添加但工程师认为无用**（FunnelEffect / SkillContext）— 0 引用 / 隐喻命名

经数据驱动的 grilling 分析，用户决策：
1. 强合并 Builtin + BuiltinAsset → Built-in Asset
2. 删 FunnelEffect + SkillContext
3. 删 5 个叙事章节 term（Asset 协作语义 / Proof 协作语义 / Work 协作语义 / Proof-First 下限 / Draft → Promote 路径）
4. 本轮仅分析，不动文件

## 1. 数据基础

| 指标 | 值 |
|---|---|
| glossary.md 当前 term 数 | 140 |
| 单 Domain 定义 | 124 |
| 多 Domain 定义 | 16（Asset / AssetMap / Daemon / Infra / Insight / Kernel / OXL / OXN CLI / OXN Engine / Part / PlanLock / Probe / Proof / Roadmap / Version Hygiene / Work） |
| 纯中文 term | 4（拓扑闭包校验 / 确定性度量 / 确定性根基 / 通道内追踪） |
| 混合中英文 | 5 |
| 纯英文/特殊字符 | 131 |

## 2. 三类术语分析（grilling 输出）

### A. 通用术语（Alpha / Anchor / Arg）

| Term | 引用频次 | 处置建议 |
|---|---|---|
| **Alpha** | 1（仅 RFC-0013） | **保留**——semver `-alpha.N` 是工业标准，但 RFC-0013 引用了它的 OXN 特定含义（minor/major prerelease）。无歧义 |
| **Anchor** | 2（ADR-0027, 0029） | **保留**——MD `{#id}` 锚点是 Markdown 标准语法，但 OXN 用作 Domain term 与 anchor 字段绑定 |
| **Arg** | 1（Dev Version 文档） | **保留**——CLI 参数通用概念 |

**结论**：这些 term 看似"通用"但实际承载 OXN 特定语义，**保留**——glossary 的价值正在于消除歧义。

### B. 历史遗留（Builtin* 三重名）

| Term | 当前状态 | 处置建议 |
|---|---|---|
| **ArsenalResolver** | 4 refs（RFC-0014 等）；被 AssetFileResolver + Scope 替代 | **强合并**（用户决议） |
| **Roadmap** | 28 refs + Glossary 显式标注"已废弃，主术语 AssetMap" | **主推 AssetMap，Roadmap 仅作 deprecation 锚点**——已在 Glossary 标注但仍有 28 处引用需后续清理 |
| **Builtin** (14 refs) vs **BuiltinAsset** (1 ref) vs **Built-in Asset** (96 refs) | **三个 term 表达同一概念**！ | **强合并为 Built-in Asset**（用户决议） |
| **AuditTrail** | 1（RFC-0008）；ADR-0071 已 abolish | **删**——ADR-0071 已废弃 |
| **MinimumClosure** | 2 | 保留（已改名 MinimumTrustClosure → MinimumClosure，ADR-0066） |

**关键发现**：`Builtin` / `BuiltinAsset` / `Built-in Asset` 三重存在——这是 AI 添加但未消歧的典型问题。

### C. AI 添加但工程师认为无用

| Term | 引用频次 | 处置建议 |
|---|---|---|
| **FunnelEffect** | 0 docs + 3 asset（仅 Domain 文件自指） | **删**（用户决议）——无任何外部引用，是 AI 推理时引入的隐喻 |
| **SkillContext** | 0 docs + 8 asset | **删**（用户决议）——Work 内 AI 上下文概念，但 0 外部引用 |
| **I18nKey** | 1（仅 oxn-cli.md） | **保留但精简**——是 CLI i18n 实现细节，对用户手册无价值；可改为 oxn-cli-domain 内部实现段 |
| **Bootstrap Seed Exemption** | 1（仅 RFC-0012 自指） | **保留**——RFC-0012 唯一支撑 |

### D. 标题性质而非术语

| Term | 形式 | 处置 |
|---|---|---|
| **Asset 协作语义** / **Proof 协作语义** / **Work 协作语义** | H3 标题包含"协作语义" | **删除**（用户决议）——ADR-0084 的内容切片，不是独立术语 |
| **Draft → Promote 路径** | 包含箭头 | **删除**（用户决议）——是路径描述 |
| **Proof-First 下限** | 包含连字符 | **删除**（用户决议）——ADR-0084 概念，非术语 |
| **拓扑闭包校验** / **确定性度量** / **确定性根基** / **通道内追踪** | 纯中文 | **评估**——可能也是 ADR-0084 章节标题（待 Work F 时一并审） |
| **`oxn draft`** | 含 backtick | **格式错误**——sync 脚本提取规则需修复 |

## 3. 用户决议（4 项）

| # | 决议 | 影响范围 |
|---|---|---|
| 1 | **强合并 Built-in Asset** | 删 Builtin + BuiltinAsset，主推 Built-in Asset |
| 2 | **删 FunnelEffect + SkillContext** | 2 个 AI 添加但无用的 term |
| 3 | **删 5 个叙事章节 term** | Asset/Proof/Work 协作语义 + Proof-First 下限 + Draft → Promote 路径 |
| 4 | **仅分析，不动文件** | 本轮不执行任何文件修改 |

## 4. 待执行 Work（未来立项）

### Work F：glossary 收敛（4 类处置合并）

**F1. Domain 文件层修改**（必须）：

| Term | Domain 文件 | 处置 |
|---|---|---|
| Builtin | oxn-proof-domain | 合并到 Built-in Asset 项下作为别名，或删除该 term |
| BuiltinAsset | oxn-engine-domain | 同上 |
| FunnelEffect | oxn-asset-domain | 删除 `### FunnelEffect` 段 |
| SkillContext | oxn-work-domain | 删除 `### SkillContext` 段 |
| Asset 协作语义 | oxn-asset-domain | 删除 H3 段 |
| Proof 协作语义 | oxn-proof-domain | 删除 H3 段 |
| Work 协作语义 | oxn-work-domain | 删除 H3 段 |
| Proof-First 下限 | oxn-proof-domain | 删除 H3 段 |
| Draft → Promote 路径 | oxn-asset-domain | 删除 H3 段 |

**F2. 重跑 sync**：
```bash
bun scripts/sync-domain-glossary.ts --write
```

**预期效果**：
- 总 term：140 → **130**（-10）
- 多 Domain 项保持 16（不变）
- glossary.md 行数减少

**F3. Built-in Asset 保留确认**：
- Built-in Asset（96 refs，已是主用名）作为唯一术语
- Builtin + BuiltinAsset 删除，文档如需引用改为 Built-in Asset

### Work G（可选）：sync 脚本提取规则强化

**问题**：当前 sync 脚本提取 `## Terms:` 段下所有 `### ` 作为 glossary term，但部分 `### ` 实际是 ADR 章节标题（叙事性而非术语）。

**方案**：在 Domain 文件层调整——把 ADR 章节从 `## Terms:` 段移到普通 `##` 段下，sync 脚本自然不再提取它们。

**或者**：sync 脚本增加过滤——term 名称必须符合 kebab-case / PascalCase 规则（含空格的"X 协作语义"被排除）。

## 5. 同步影响核查

执行 Work F 后，**16 处多 Domain 项**保持不变（不影响 RFC-0017 之前的裁决范围）：
- 5 处真矛盾（PlanLock / Roadmap / OXL / Probe / Part）—— 仍需独立 RFC
- 11 处视角补全 —— 仍按多 Domain 列表保留

**不影响**：
- ✅ RFC-0017 Phase 0-4 已完成状态
- ✅ check-doc-boundary 三条规则
- ✅ Domain 文件 `glossary-ref` 反向链接
- ✅ VitePress sidebar

## 6. 与 grilling Round 1 决议的对应

| Grilling Round 1 决议 | 本轮处置 |
|---|---|
| Q1 (sync scope = 全部 157) | ✅ 不变 |
| Q2 (仅 ## Terms: H3) | ✅ 不变——但 Domain 文件层要清理叙事章节 |
| Q3 (concepts-no-term-redef = slug 碰撞) | ✅ 不变 |
| Q4 (Stack 语义不动) | ✅ 不变 |
| Q5 (不建 context-map/) | ✅ 不变 |
| Q6 (窄路径) | ✅ 不变 |

## 7. 与已落地工作的衔接

本草案基于已完成的 RFC-0017 Phase 0-4：
- **Phase 2 sync 脚本**：删除冲突检测 + 多 Domain 链接 + glossary 单文件生成
- **Phase 3 概念页去重**：8 个 concepts/*.md 加 glossary 指针
- **Phase 4 删除多文件**：docs/glossary/{zh-cn,en}/ 已删除

后续执行 Work F 时，**复用现有 sync 脚本**——只需删除 Domain 文件中的目标 term 段，然后重跑 sync 即可。

## 8. 待用户确认的子决策（Work F 启动时）

| # | 子决策 | 选项 |
|---|---|---|
| F.1.a | Builtin 处置 | A) 合并到 Built-in Asset 别名段 / B) 直接删除（Builtin 在 docs/ 引用 14 处需手动更新） |
| F.1.b | BuiltinAsset 处置 | 同上（1 ref，影响小） |
| F.1.c | AuditTrail 处置 | A) 保留至 ADR-0071 正式 promote / B) 直接删（ADR-0071 已存在） |
| F.1.d | 4 个纯中文 term（拓扑闭包校验等） | A) 保留 / B) 删（视为 ADR 章节标题） |

## 9. 不在本草案范围

- ❌ 16 个多 Domain 项的裁决（5 处真矛盾 + 11 处视角补全）—— 独立 RFC 立项
- ❌ Domain 文件 desc 内容修改 —— 仍是工程师 + AI 责任
- ❌ sync 脚本结构性变更 —— Work G 单独处理
- ❌ ADR-0084 章节归属重构 —— 独立 RFC 立项

## 10. Grilling Session 轨迹

| 轮次 | 焦点 | 产出 |
|---|---|---|
| Round 1 | 用户提出 3 类术语收敛诉求 | 数据基础（grep 引用统计） |
| Round 2 | 按 3 类系统分类 + 引用频次评估 | 140 term 全分类清单 |
| Round 3 | 用户决策 4 项（合并/删/不动文件） | 本草案 |