---
entity: adr
id: ADR-0099
status: Active-Mechanism
date: 2026-08-07
role: mechanism-root
note: |
  v0.7+ 唯一保留在 docs/adrs/ 的活跃 ADR；定义 landing-files + landing-reason 机制。
  其他 87 ADR 已迁移为 RFC（主题合并）或物理归档（.openxenon/.archived/docs/adrs/）。
  详见 RFC-0030 D1 + RFC-0029 + RFC-0027。
related:
  - RFC-0030
  - RFC-0027
  - RFC-0029
  - .openxenon/assets/domains/oxn-project-domain.md
  - .openxenon/.archived/docs/adrs/
landing-files:
  - docs/adrs/0099-adr-landing-mandatory.md
  - scripts/check-adr-landing.ts
  - .openxenon/assets/domains/oxn-project-domain.md
landing-reason: ~
superseded-by: ~
archived-at: ~
---

# ADR-0099: ADR Accepted 必须配套 filesystem 落地清单 + pre-commit 强制校验

v0.6.0 / §4.4 / 2026-08-07

## Status
Accepted（D5+ 落地，跟 RFC-0026 三大 6 块同批；治"声明层与filesystem 层脱节"病根）。

## Context
RFC-0026 + 6 块 ADR（0093~0098）落地时暴露**单一根因**——声明层（RFC + ADR Accepted）与 filesystem 层（domain 改写、CLI 实现、README 正名、frontmatter 迁移、workflow 改造）之间**无强制同步机制**，靠人工纪律，结果必然漏。

具体证据（2026-08-07 检查）：
- ADR-0094 说"Goal 正名"但 `dev/pool/README.md` 仍称 PlanningPool + 含已退役 `dev/versions/` 反向引用
- ADR-0095 说"Intent Pool 退役"但 `oxn-insight-domain.md` inv-1~5 仍是旧 pool invariants（后续由"ADR 跟随 wave"补足）
- ADR-0093 暗示 Version cut-record 模型但 `release-cut.md` workflow 改造发生在 ADR 之后一日
- ADR-0098 锁分支三层但 `feat/v0.6.1` 仍承载今日 commit 落地

**典型症状**：6 条 ADR 的 `Status: Accepted` 是声明层落地，filesystem 层同步迁移 7 个漏项是 0% 起跑，由"事后盘 + 手动补"模式收尾。

**失败条件**（已实测 3 次）：
- ADR 写声明 vs filesystem 落地 分属不同人 / 不同 commit
- ADR 落地清单只在 RFC body 一段口语描述，未结构化
- pre-commit 钩无 ADR-文件系统对应检查

## Decision
ADR 接受（`Status: Accepted`）时**必须**在 frontmatter 结构化声明 filesystem 落地清单，并经 pre-commit 强制校验：

### 1. ADR frontmatter 扩展

```yaml
---
id: ADR-NNNN
status: Accepted
landing-files:               # 必填（Accept 时；除非 landing-reason 存在）
  - docs/adrs/0099-adr-landing-mandatory.md
  - scripts/check-adr-landing.ts
landing-reason: declarative  # 可选（仅当 landing-files: [] 时填）
                             # 声明型 ADR 无文件系统落地（如纯策略宣言、术语正名但代码未到）
---
```

### 2. landing-files 语义

- **Accepted ADR**：landing-files **不可为空**（除非 `landing-reason: declarative`）
- **Draft / Superseded / Withdrawn ADR**：landing-files 可选
- **路径格式**：相对仓库根，与 git diff 一致
- **多入口允许**：ADR 可能影响多个文件，全部列出
- **指向 ADR 自身**：若 ADR 落地仅是文档自身修改（如 supersede），仍可列（`docs/adrs/00XX-xxx.md`）

### 3. pre-commit 检查脚本

新增 `scripts/check-adr-landing.ts`，扫描条件：

```
1. 遍历 docs/adrs/*.md
2. 读 frontmatter status + landing-files + landing-reason
3. 若 status=Accepted 且 landing-files=[] 且 无 landing-reason=declarative → 报错
4. 对每条 landing-files 路径：在 git diff（staged + unstaged）中匹配
   - 路径必须出现于 git diff（被改/被增/被删）
   - 完全无 diff → 报错 "ADR-NNNN accepts but landing-files 路径未变化"
5. 输出报告：N 接受 / M 落地校验通过 / K 失败
```

退出码：0 通过 / 1 有失败。

### 4. 集成方式

- pre-commit 钩：`.git/hooks/pre-commit` 调用（项目已有 husky / lint-staged 模式）
- CI：`.github/workflows/ci.yml` 中加 `bun scripts/check-adr-landing.ts`
- 本地：开发者 commit 前手动跑（README §常用命令补 `bun run adr:check`）

### 5. 例外与豁免

- `landing-reason: declarative` 允许 landing-files 为空（用于纯宣言型 ADR，如 RFC 0049 之类）
- `landing-reason: external` 允许 landing-files 指向仓库外（如外部依赖升级不在本仓改）
- `landing-reason: postponed` 标记延迟落地（接受时未落地，但有明确日期）；超期未落地需重新评估

## Consequences

### 正面
- **机械化**：6 条 ADR + filesystem 落地的"应 0%"“病根消除，未来同类问题由 pre-commit 自动拦截
- **可追溯**：每个 Accepted ADR 的 filesystem 影响列表明确，commit review 时一眼可查
- **零人工维护成本**：ADR 作者写声明时已隐含承担落地义务

### 负面 / 限制
- **写 ADR 多一步**：作者需在 frontmatter 维护 landing-files 列表（用 `rg` 扫已存在的 fallback hint 减少负担）
- **历史 ADR 不补**：0093~0098 这 6 条**不补 landing-files**（已 Accepted 但未结构化）；ADR-0099 自生效，**未来 ADR 必须遵守**
- **false positive 风险**——landing-files 中路径若只在 dev/ 内部移动（如 `mv dev/versions/a.md dev/versions/b.md`）git diff 仍能识别；写 ADR 时建议列**最终后**位置
- **declarative 例外需自觉**：纯宣言型 ADR 需明确写 `landing-reason: declarative`，避免漏填

### 落地清单（本 ADR 自身）
- `docs/adrs/0099-adr-landing-mandatory.md`（本文件）
- `scripts/check-adr-landing.ts`（新增）
- `package.json` 加 `adr:check` script（若需要）
- `.git/hooks/pre-commit` 或 husky 配置接入（若需要）

### 关联变更
- 启动 ADR 后立即对 0093~0098 做**回溯 audit**（advisory，不阻塞）：验证声明与filesystem 是否真的对齐；输出 report 文件，工程师逐条 review
- RFC-0026 自身也补 landing-files（ADR-0099 生效后下次 promote 的 RFC 强制）

## Alternatives Considered

### A1 — 仅文档（口头清单）
放弃 pre-commit 强制，靠 RFC body 内文描述 + code review。
- **拒绝理由**：现状即如此，已失败 3 次。

### A2 — ADR 落地由独立 work-id 跟踪
每个 ADR 配套建一个 `Work d-adr-NNNN-落地` 跟踪。
- **拒绝理由**：增加 ceremony 但不解决"声明与落地脱节"病根；只把脱节移到 work 跟踪层。

### A3 — 反向：filesystem diff 反推 ADR 关联
git diff 解析文件路径，反查哪些 ADR 该落地。
- **拒绝理由**：可作 audit 工具补充，但**不能替代**前置声明（落地无 → 反推不出 ADR 是该写的还是不写的）。

### A4 — 选 A1+A3 组合（采纳）
A1（口头声明，保留）+ A3（filesystem diff 反推 audit）作为辅助。
- 本 ADR 即 A1（结构化）+ pre-commit 强制（A3 形式但前置）组合。

## 配套工具

- `scripts/check-adr-landing.ts` — pre-commit 主检查
- 后续可加 `scripts/audit-adr-landing-historical.ts` — 对历史 0093~0098 回溯 audit（不阻塞）