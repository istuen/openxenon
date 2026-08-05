# Draft 体系设计 Grilling 记录

> **日期**：2026-07-29
> **参与者**：工程师 + AI Agent
> **目标**：检查 OpenXenon 当前版本是否能用 Asset 管理 Doc / Asset / Draft，并设计 Draft 体系
> **状态**：archived（Grilling 收束，决议已落地）
> **关联**：ssot-asset-doc-boundary-audit-2026-07-28.md / blueprint-use-parser-format-support.md / RFC-0011-builtin-asset-two-layer / RFC-0013-versioning-policy

---

## 1. 会话起点

工程师提出的问题：**OpenXenon 当前版本是否把 OpenXenon 的 Doc、Asset 能管理起来了？即应该有一套 Asset 用来写 Doc、Asset 和写 Draft。**

通过 `/grilling` session（domain-modeling 技能）盘查，发现 **Draft 写作用途完全缺失管理**：

### 1.1 覆盖矩阵（盘查起点）

| 用途 | Blueprint | Workflow | 落盘位置 | 状态 |
|---|---|---|---|---|
| 写 Doc | doc-rfc/dev/prod-workflow (3) | doc-author + doc-publish | docs/{product,dev,rfc}/{zh-cn,en}/ | ✅ 完整 |
| 写 Asset | asset-workflow (1) | asset-create/evolve/archive | .openxenon/assets/{kind}/ | ✅ 完整 |
| 写 Draft | ❌ 无 | explore-analyze-report / fix-issue / refactor-safe（3 个孤儿） | .openxenon/drafts/ | ❌ 缺口 |

### 1.2 Draft 缺口证据（4 条）

1. **"Draft" 在 Domain 层未定义**：`docs/glossary/zh-cn/` grep "Draft" 零命中；`DraftAsset` 在 `oxn-engine-domain.md:88` 被列为 forbidden-constructs
2. **3 个 Workflow 是孤儿**：grep 5 个 Blueprint 的 `## Use` 段 → 零引用 `explore-analyze-report` / `fix-issue` / `refactor-safe`
3. **现有 Drafts 全是手写**：`.openxenon/drafts/*.md` 6 个文件全在 chat 内手写，无 Probe，无 frozen.json
4. **Promote Blueprint 把 Draft 当输入但不创造 Draft**：`asset-workflow` 和 `doc-rfc-workflow` 的 gather slot 假设 drafts 已存在，但无 Blueprint 创造

---

## 2. 五轮 Grilling 演进

### 第 1 轮：D1-D15 基础设计

**结论**：Draft = 独立 Domain（`oxn-draft-domain.md`），本质是 Doc（描述性），走通道内（Probe 验证）。

| # | 决议 |
|---|---|
| D1 | Draft = 独立 Domain；本质是 Doc（描述性）；共用 doc-stack |
| D2 | 3 个孤儿 Workflow 暂不补 Blueprint |
| D3 | `.openxenon/drafts/` 通道内（有 Probe） |
| D4 | 「自举完成 v2」后续再改 |
| D5 | Draft = Domain（不是 Scene）；Scene 是 explore/plan/fix 等 |
| D6 | 新增 draft-author workflow |
| D7/D13 | Draft 需要独立 draft-blueprint |
| D8 | 现有 scene 的 Blueprint 会用到 draft workflow + domain |
| D9 | 用 DraftType（非 DraftKind） |
| D10 | drafts 边界规则保留在 oxn-project-domain |
| D11 | oxn-project-domain 拆成两个（产品元层 + 自举实例层） |
| D12 | 仅 Draft 相关推动 RFC-0011 D3 落地 |
| D14 | 物理副本；先 @prj/ 后 @oxn/ |
| D15 | DraftType 3 类：report / issue / design |

### 第 2 轮：oxn-project-domain 分层 + 自举 Asset 内置

**关键反问**：oxn-project-domain 的对象是 OpenXenon（当前项目）还是使用 OpenXenon（其他项目）？

**结论**：
- oxn-project-domain 对象 = "使用 OpenXenon 的项目"（通用产品元层）
- OpenXenon 自己 = OXN 的自举实例
- 拆分：产品元层（@oxn/ 内置）+ 自举实例层（@prj/）
- 应内置的 Asset：通用 Workflow（doc-author / asset-create 等）+ Blueprint（doc-rfc/dev/prod-workflow 等）
- 不应内置的 Asset：业务 Domain / 项目特定 Stack / 项目特定 Roadmap

### 第 3 轮：D16-D18（Draft → Doc 路径）

**关键反问**：Draft 如何 Promote 成 Doc 下不同的文档、Asset、Dev？

**发现**：doc-dev-workflow 和 doc-prod-workflow 的第一个 slot 是 `pick-domain`（选 Domain），不是 `gather`（收集 drafts）——**Draft → Doc(dev/prod) 路径缺失**。

**结论**：Draft → Doc 是伪需求——DraftType 3 类（report/issue/design）都是探索性内容，与 Doc 的"术语驱动手册"性质不同。Draft → RFC 才是正路。

### 第 4 轮：D19-D28（路线探索 A→B→C→D→E）

**关键反问**：如果 Work 承接临时文档，Draft 承接什么？

**5 条路线探索**：

| 路线 | 描述 | 结论 |
|---|---|---|
| A | 通道内 + draft-author + draft-workflow Blueprint | Draft 与 Work 边界模糊 |
| B | 通道外（手写探索） | 与"通道隐喻"冲突 |
| C | 通道内 + 极简 Probe + Template 保结构 | 引入 Template 机制 |
| D | Proof-First v2 + `--from-blueprint` | 概念错位（Proof-First 是验证器不是执行器） |
| E | Skill 执行 + Blueprint 声明 + Probe 验证 | Blueprint 缺执行字段 |

### 第 5 轮：问题 3-4 重大发现（OXN 架构缺口）

**关键反问 3**：Proof-First 是验证器还是轻量 Work？

**结论**：Proof-First 是**验证已存在产物的机制**，不是创建产物的机制。19 个 Probe 全部是验证（read-only 观察），不是创建（write 操作）。

**关键反问 4**：Blueprint 是否需要脚本执行？

**结论**：当前 Blueprint slot 只有 4 字段（refs/observe/deps/desc），**缺少 template/run 声明字段**。这是 OXN 架构缺口。

**进一步发现**：OXN 有 3 种内置内容分发机制——

| 机制 | 物理实现 | 例子 |
|---|---|---|
| (1) Skill 内嵌 | `import .md with { type: 'text' }`（Bun 编译时打入二进制）| oxn-asset 的 4 个模板 |
| (2) 内置 Asset 路径 | `src/builtin/` 目录 + runtime 解析 | 19 Probe + 3 Blueprint |
| (3) 项目 Asset | `.openxenon/assets/{kind}/` | 工程师手动创建 |

### 第 6 轮：方案 A vs B（Template 分发）

**方案 A**：CLI 写到 `.openxenon/assets/templates/`（项目模板，可修改）
**方案 B**：外部库 / npm 包（第三方 Asset 生态）

**结论**：A 是即时落地，B 是 v0.8+ 方向。两者位置一致（`.openxenon/assets/templates/`），只是分发渠道不同。

### 第 7 轮：极简化（最终方案）

**关键洞察**：如果只是创建空白文档，根本不需要 Template 机制。

**结论**：
- 撤销 Template 机制（D22/D33/D37）
- 撤销 draft-blueprint / draft-author workflow（D6/D7/D13/D23）
- 撤销 Proof-First v2 `--from-blueprint`（D26/D34）
- 简化 `oxn draft` 为 4 个独立命令（create/list/archive/discard）
- Draft Domain 仍保留（定义 Draft 概念、DraftType、生命周期）

---

## 3. 最终决议清单（D1-D15 + Q-S1-Q-S7）

### 3.1 保留的决议

| # | 决议 |
|---|---|
| D1 | Draft = 独立 Domain；本质是 Doc（描述性） |
| D2 | 3 个孤儿 Workflow（explore-analyze-report / fix-issue / refactor-safe）暂不补 Blueprint |
| D3 | **修订**——不叫"通道内"，改为"CLI 行为"（Engine + Infra Module 执行） |
| D4 | 「自举完成 v2」后续再改 |
| D5 | Draft = Domain（不是 Scene）；Scene 是 explore/plan/fix 等 |
| D9 | 用 DraftType（非 DraftKind） |
| D10 | drafts 边界规则保留在 oxn-project-domain |
| D11 | oxn-project-domain 拆成两个（产品元层 + 自举实例层） |
| D14 | 物理副本；先 @prj/ 后 @oxn/ |
| D15 | DraftType 3 类：report / issue / design |
| D25 | Workflow 对应 DraftType |
| Q-S1 | 用 `--prefix` 而非 `--type` |
| Q-S2 | CLI 调 Engine → Infra Module，无 Probe |
| Q-S3 | 暂不需要 draft-blueprint / draft-author workflow |
| Q-S4 | 不用"通道"术语，改说 CLI / Work |
| Q-S5 | `--prefix` 用于文件名前缀（不是 frontmatter 字段） |
| Q-S6 | `oxn draft` 独立子命令组（与 proof/work 平级） |
| Q-S7 | 4 命令：create + list + archive + discard（最小完整周期） |

### 3.2 被撤销的决议

| 决议 | 撤销理由 |
|---|---|
| D6 | 新增 draft-author workflow → 撤销（Q-S3 暂不需要） |
| D7/D13 | draft-blueprint Blueprint → 撤销（Q-S3 暂不需要） |
| D12 | 推动 RFC-0011 D3 落地 → 撤销（Draft 简化后不需要大量 @oxn/ 内置） |
| D22 | Template 作为 CLI 方法固定 → 撤销（无 Template 机制） |
| D23 | draft-blueprint 需要 draft-author workflow → 撤销 |
| D26 | `oxn proof create --from-blueprint` → 撤销（暂不需要） |
| D27 | 旧版 Proof 代码删除 → 撤销（保留旧版） |
| D28 | 无独立 draft 命令 → 修订（有独立 `oxn draft`） |
| D33 | Blueprint slot 新增 template/run → 撤销 |
| D34 | Proof-First v2 还需要吗 → 撤销 |
| D37 | Template 分发方案 → 撤销 |
| D38 | run 字段执行边界 → 撤销 |

### 3.3 被推迟的决议

| 决议 | 推迟理由 |
|---|---|
| D8 | 现有 scene 的 Blueprint 会用到 draft workflow + domain → 等 Blueprint 补齐再决 |
| D16 | doc-dev/prod-workflow 是否从 drafts 收集 → 后续（Draft → Doc 是伪需求） |
| D17 | 拆分后的 Domain 命名（oxn-bootstrap-domain?） → 后续 |
| D18 | draft-workflow Blueprint slot 结构 → 撤销（Q-S3 暂不需要） |
| D19-D21 | 路线选择 → 撤销（采用最终极简方案） |
| D24/D36 | oxn-draft Skill → 后续（CLI 命令足够时不需要 Skill） |
| D29-D32 | 代码删除范围 / observe 读取 / Template fork 位置 / Work 路径场景 → 全部撤销或推迟 |
| D35 | Draft 创建流程路线 → 撤销（采用最终方案） |

### 3.4 关键概念修订

| 原概念 | 修订后 |
|---|---|
| "通道内 / 通道外" | "CLI 行为 / Work 行为"（不引入"通道"概念） |
| "Template" | 撤销——Draft 是空白文档，无 Template |
| "DraftBlueprnt" | 撤销——Q-S3 暂不需要 |
| "Proof-First v2" | 撤销——Proof-First 是验证器不是执行器 |
| "Blueprint slot 新增 template/run 字段" | 撤销——不需要执行能力 |

---

## 4. 最终设计

### 4.1 命令设计

```
oxn draft create <name> [--prefix report|issue|design]
  → Engine 接收 → 调 Infra Module 创建文件
  → 默认目录 .openxenon/drafts/（.oxnrc 可配 draftDir）
  → 文件名：无 --prefix → <name>.md；有 --prefix → <prefix>-<name>.md
  → 空白文件，无 Template，无 frontmatter，无 Probe

oxn draft list
  → 列出 .openxenon/drafts/ 下所有 .md
  → 输出：name、prefix、size、mtime

oxn draft archive <name>
  → 移到 .openxenon/drafts/.archived/<name>.md
  → 保留历史，标记不再活跃

oxn draft discard <name>
  → 物理删除（需确认）
  → 无引用时可丢弃
```

### 4.2 Domain 文件（待创建）

`oxn-draft-domain.md` 需要定义：

- **Draft** = 未提升的描述性工作稿。物理位置 `.openxenon/drafts/`。情态 = Descriptive。CLI 创建 + 工程师/AI Agent 填写。
- **DraftType** = 用途分类（report / issue / design），对应文件名前缀
- **DraftLifecycle** = create → (archive | discard)。无 promote 阶段（promote 由 Promote Blueprint 直接读 drafts/ 文件）

### 4.3 边界规则

保留 `oxn-project-domain.md:121-123` 现有边界规则：

- `.openxenon/drafts/` 项目草稿 → ADR/RFC 暂存禁止（草稿不应引用自身）
- `.openxenon/drafts/rfc/` ADR/RFC 暂存 → 项目 Asset 禁止
- `docs/dev/` → `.openxenon/drafts/` 禁止

### 4.4 未来方向

| 方向 | 描述 | 时间 |
|---|---|---|
| `oxn work draft` 模式 | Draft 结合 Work 机制（多阶段 Draft / Task DAG） | v0.7+ |
| `oxn proof draft` 模式 | Draft 结合 Proof 验证（fs-exists 验证 + 后续 Probe） | v0.7+ |
| `.oxnrc` 配置 | `draftDir` 字段配置 Draft 目录 | 立即 |
| 外部包 / npm 包 | 第三方 Asset 包生态（方案 B） | v0.8+ |
| oxn-project-domain 拆分 | 产品元层 + 自举实例层分离 | 后续 |

---

## 5. 关键洞察沉淀

### 5.1 Proof-First 是验证器不是执行器

查 19 个 Probe 的实现，全部是验证已存在的事实（fs-exists / ts-compiles / lint-check / test-pass 等），不是创建产物。`shell-exec` 是最接近"执行"的 Probe，但输出是 pass/fail，不是产物。

**结论**：创建动作（fork Template / 写文件）需要执行器，不是验证器。OXN 是验证器 + 参照系，不应变执行器。

### 5.2 OXN 架构缺口：Blueprint slot 缺执行字段

当前 Blueprint slot 只有 4 字段（refs/observe/deps/desc），缺少 template/run 声明字段。

**但本次不需要补这个缺口**——因为 Draft 最终简化为"空白文档创建"，不需要 Template fork / 脚本执行。

**未来探索**：如果需要"Blueprint 驱动的执行"，需要扩展 Blueprint slot 增加 template/run 字段，由 Skill 执行（而非 Engine），OXN 角色保持验证器。

### 5.3 OXN 内置内容分发的 3 种机制

| 机制 | 物理实现 | 用户可改？ |
|---|---|---|
| (1) Skill 内嵌 | `import .md with { type: 'text' }`（Bun 编译打入二进制） | ✅（`oxn init` 复制到 `.opencode/skills/`） |
| (2) 内置 Asset 路径 | `src/builtin/` 目录 + runtime 解析 | ❌（只读参照） |
| (3) 项目 Asset | `.openxenon/assets/{kind}/` | ✅ |

**Draft 选择 (3) 项目模板路径**（`.openxenon/assets/templates/`）——但本次不需要，因为 Draft 是空白文档。

### 5.4 过度设计的教训

本次 grilling 从最初的设计（Domain + Workflow + Blueprint + Template + Proof-First v2）简化到最终（4 命令 CLI + 1 Domain 文件）。过度设计的原因：

1. **假设需要 Template**：实际不需要，工程师 + AI 自由格式更合适
2. **假设需要 Blueprint 编排**：实际不需要，CLI 直接调 Engine + Infra 足够
3. **假设需要 Probe 验证**：实际不需要，创建行为本身是证据
4. **假设需要 Skill 包装**：实际不需要，CLI 命令足够

**原则**：先做最简方案（CLI 命令 + Domain 文件），用着用着发现不够再加。

---

## 6. 未来 Work 入口

建议路径：`oxn work create draft-system-v1 --blueprint dev-workflow`（开发场景）

- **Intent**：实现 Draft 体系 v1（4 命令 + Domain 文件 + 边界规则迁移）
- **Align**：
  - 新增 `packages/cli/src/commands/draft.ts`（4 子命令）
  - 新增 `.openxenon/assets/domains/oxn-draft-domain.md`
  - 更新 `.oxnrc` schema 支持 `draftDir` 配置
  - 更新 `oxn-project-domain.md` 边界规则（迁移到 oxn-draft-domain 或保留）
- **Proof**：
  - 单元测试：`packages/cli/src/__tests__/draft.test.ts`
  - E2E 测试：`packages/cli/src/__tests__/draft-e2e.test.ts`
  - 手动验证：4 命令全部走通
  - 全量测试 + typecheck + lint + validate-deps

预计工作量：3-5 文件，约 200-400 行代码改动。

---

## 7. 引用

- `ssot-asset-doc-boundary-audit-2026-07-28.md`（Step 1-10 修复记录）
- `blueprint-use-parser-format-support.md`（per-work-blueprints-merger.ts 修复计划，已执行）
- `RFC-0011-builtin-asset-two-layer`（内置 Asset 两层机制）
- `RFC-0013-versioning-policy`（版本号政策，D18 收窄 probes + blueprints）
- `CONTEXT-MAP.md`（OXN 领域模型，8 Domain + ADR 记录）
- `oxn-asset-domain.md`（AssetKind + AssetLifecycle 定义）
- `oxn-work-domain.md`（Work/Task/Part/IAP 三阶段定义）
- `oxn-project-domain.md`（项目工程元层 + drafts 边界规则）