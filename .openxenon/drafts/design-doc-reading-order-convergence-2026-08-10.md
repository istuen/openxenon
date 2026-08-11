# Design: 文档关系结构审查 + 阅读/加载顺序收敛

- **DraftType**: design（设计稿）
- **状态**: draft（2026-08-10 grilling session 收束，计划已确认，待执行）
- **创建日期**: 2026-08-10
- **主题**: OpenXenon 文档关系结构审查；阅读/加载顺序统一收敛为单一权威（AGENTS.md 索引 + dev/ 正文）；语义优先级简化；CONTEXT-MAP 拆分；ai-entry 归 Skill；docs 独立文档包
- **关联**: `AGENTS.md`, `CONTEXT-MAP.md`, `.openxenon/assets/assetmaps/oxn-system.md`, `docs/product/zh-cn/ai-entry.md`, `packages/cli/src/skills/`, `dev/`
- **Grilling 来源**: 2026-08-10 `/grilling` session（grill-with-docs + domain-modeling skill）

---

## 0. Session 摘要

用户请求审查 OpenXenon 的文档关系结构，以及 LLM/AI Agent 阅读时依据什么顺序加载。经 grilling 分析，发现现状存在 4 套互不统一的"阅读顺序"定义源、3 处数字不一致、CONTEXT-MAP.md 在语义优先级中无级可归、加载链上的规则文件自身 drift 等问题。用户决策：

1. **收敛**：4 套阅读顺序统一为单一权威（AGENTS.md 索引 + `dev/` 下正文）
2. **语义优先级简化**：5 级 → 2 档（`domains/*.md` 定义性 SSOT + AGENTS.md 行为兜底）
3. **CONTEXT-MAP.md 拆分**：顶级结构 → AGENTS.md；术语锐化/索引 → Asset Domains + AssetMap（已拆分确认）
4. **ai-entry.md 归 Skill**：内容并入 oxn-work Skill（修订过时内容）
5. **docs 独立文档包**：docs 作为 Monorepo 下的独立 workspace package（路线 b）

## 1. 背景与目标

### 1.1 现状：6 个物理场域

| 场域 | 内容 | 情态 |
|---|---|---|
| 仓库根 Meta | `AGENTS.md` / `CONTEXT-MAP.md` / `README.md` / `.changes/` / `dev/` / `.opencode/rules/economy.md` | 元层 |
| `.openxenon/assets/` | domains(9) / workflows(5) / stacks(3) / blueprints(4) / assetmaps(1) | 定义性 · 冻结 |
| `.openxenon/drafts/` | 探索草稿 | 流动 |
| `docs/` | product(zh/en) + dev(zh) + rfc(27) + adrs(99) | 描述性 + 规定性 |
| `packages/cli/src/skills/locales/` | 3 Skill × 2 locale（SSOT）→ 编译产物 | 指令 |
| 编译产物 | `.opencode/skills/`(3) + `~/.opencode/skills/`(5) + `~/.agents/skills/`(4) + `.agents/skills/`(3) | 指令 |

### 1.2 现状：加载链（实际行为）

1. **L0 自动注入**：`AGENTS.md` 进 system prompt（含语义优先级 + 意图解析流程）→ Skill description 注册
2. **L1 路由**：意图解析 4 步 → `oxn assetmap suggest --goal --scene` → 读 scene 块 → 挑 Blueprint → `oxn work create`
3. **L2 闭包**：Blueprint（Use/Boundaries/Scope/Context Template）→ 拉入 `## Use` 引用的 Domain/Workflow/Stack
4. **L3 回源**：术语 → CONTEXT-MAP → Domain invariants；决策 → RFC/ADR；CLI → cli-user-guide
5. **裁决**：冲突时按 5 级语义优先级

### 1.3 审查发现的断裂点

- **数字不一致**：CONTEXT-MAP 标题"7 个 Domain" vs 表格 8 个 vs 磁盘 9 个文件（`NpmSupplyChainAdvisory.md` 孤儿，未登记索引）；assetmap 声称"8 Domain + 12 RFC 必读" vs 磁盘 27 RFC
- **CONTEXT-MAP 无级可归**：5 级语义优先级未包含它（拆分后自洽）
- **`.opencode/rules/economy.md` 引用已废除的 `.openxenon/pools/drafts/`**（v0.7 已并入 `.openxenon/drafts/`）——加载链上的规则文件自身 drift
- **4 套"必读/阅读顺序"**：AGENTS.md 4 步 / ai-entry.md 4 章 / concepts/_index.md / SKILL AssetMap-driven，无权威
- **编译产物多副本**：repo `.opencode/skills/`(3) vs `~/.opencode/skills/`(5，含已出 SSOT 的 oxn-cli / oxn-proof)（用户环境旁注，不进收敛范围）

### 1.4 目标

- 阅读顺序唯一权威：AGENTS.md 存索引（自它开始的加载链），正文落 `dev/knowledge-loading.md`
- 语义优先级简化：5 级 → 2 档（Domain = 定义性 SSOT，AGENTS.md = 行为兜底；RFC/glossary/docs 仅解释）
- CONTEXT-MAP.md 拆分：顶级结构 → AGENTS.md；术语锐化 → Domain（已含，删冗余）；路由索引 → AssetMap（已承担）
- ai-entry.md 归 Skill（oxn-work），修订过时内容
- docs 独立为 monorepo 文档包

## 2. 关键决策（grilling 确认）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 收敛载体 | (a)+(b) 组合：AGENTS.md 存索引骨架；正文落 `dev/` 下（**非** `.openxenon/drafts/` 也**非** `docs/dev/`）——`.openxenon` 是 OXN 运行时文件（临时性），docs 是对外正式文档（不承载开发内容，未来 docs 独立项目更不可读） |
| D2 | 入口分层 | AGENTS.md = AI Agent 阅读入口；README.md = 工程师入口；Skill = OXN 对外的 AI 入口（在 AGENTS.md **更前**，其他项目经 Skill 触发）；concepts/_index.md 阅读顺序 = 人类 VitePress 导航（不参与 agent 加载链） |
| D3 | ai-entry 归属 | 算 Skill 内容（描述如何使用 OXN 为主），部分内容过时需调整；**并入 oxn-work** |
| D4 | docs 独立化 | 选 (b)：docs 作为 Monorepo 下独立文档包（`docs/package.json` + pnpm-workspace 纳入） |
| D5 | 语义优先级 | 简化：`.openxenon/assets/domains/*.md` 为定义性 SSOT（`###` Axiom + `-` Theorem 结构，已包含旧 1-4 级） |
| D6 | CONTEXT-MAP | 拆分：AGENTS.md 承接"OpenXenon 整体结构与阅读顺序"顶级内容；核心术语锐化（Referent / StructureV2 等）与 Domain 索引归 Asset Domains + AssetMap 承接；**文件删除**（确认） |
| D7 | 范围排除 | `NpmSupplyChainAdvisory.md` 为探索成果（检测依赖注入入侵的初步尝试），保留，不入索引；不做"加载链可执行性验证"守门脚本 |

## 3. 收敛设计

### 3.1 阅读/加载顺序（收敛版 · 裁决轴 + 时序轴分离）

```
L-1  Skill 分发（OXN 对外的 AI 入口；其他项目经 Skill 触发）→ 注入 CLI 能力
L0   项目入口自动注入：AGENTS.md（AI）/ README.md（工程师）
L1   意图路由：goal → oxn assetmap suggest --goal --scene（+ show 前置）→ 人机挑选
L2   蓝图闭包：Blueprint（Use/Boundaries/Scope/Context Template）→ Use refs 的 Asset
L3   按需回源：术语 → domains/*.md；决策 → docs/rfc/ + docs/adrs/；命令 → cli-user-guide
L4   裁决：2 档（Domain 定义性 SSOT > AGENTS.md 行为兜底；RFC/glossary/docs 仅解释）
```

### 3.2 裁决规则（简化版）

1. **定义性 SSOT**：`.openxenon/assets/domains/*.md`（`### Axiom` + `- Theorem` 结构承载术语、边界硬约束；涵盖旧 1-4 级内容）
2. **行为规则兜底**：`AGENTS.md`
3. **仅解释性参考**（无约束力）：`docs/rfc/`、`docs/product/zh-cn/concepts/glossary.md`、`docs/` 其余

### 3.3 目标拓扑

- `AGENTS.md`：AI 入口 + 整体结构 + 阅读顺序索引 + 简化裁决规则 + 意图解析流程（与 SKILL 对齐：show 前置 + suggest 候选 + 人机挑选）
- `dev/knowledge-loading.md`（新建）：唯一正文——阅读者分层、加载链 5 层详述（每层读什么/读多深）、裁决规则、docs/ 外部参考层定位、维护约定
- `CONTEXT-MAP.md`：删除
- `docs/product/zh-cn/ai-entry.md`：删除（内容并入 oxn-work Skill）
- `docs/`：独立文档包，定位为外部参考层（URL 引用）

## 4. 改动清单（P0 → P6）

### P0 · docs 独立文档包
- [ ] 新建 `docs/package.json`（name `@openxenon/docs`；devDeps: vitepress ^1.6.4；scripts: dev/build/preview）
- [ ] `pnpm-workspace.yaml` 加 `"docs"`
- [ ] 根 `package.json`：vitepress 依赖迁出；docs:dev/build/preview 改为 `pnpm --filter docs ...` 代理
- [ ] `docs/.gitignore` 补 `node_modules` / `dist`（现状 9 字节，`.vitepress/dist` 为构建产物）
- [ ] lock 重建（`pnpm install`）；确认 scripts/*.ts 路径兼容（已验证 check-doc-boundary / auto-wrap-versioned 等硬编码路径不受影响）

### P1 · ai-entry 归 Skill（oxn-work）
- [ ] 修订内容（CLI 白名单按现行 3-Skill 体系校准；失败处理；工作流）并入 `packages/cli/src/skills/locales/{zh-CN,en}/oxn-work/instruction.md` 顶部"接入前置"段
- [ ] 删 `docs/product/zh-cn/ai-entry.md`（en 侧 `llm-prompt.md` 确认后一并处理）
- [ ] 更新 `docs/product/zh-cn/_index.md`、VitePress sidebar
- [ ] 重新编译：`bun run packages/cli/src/index.ts init -f` → `.opencode/skills/` 重建

### P2 · CONTEXT-MAP.md 拆分
- [ ] 顶级"整体结构与阅读顺序" → AGENTS.md
- [ ] 术语锐化逐条核对 Domain：Referent（ADR-0072 落地处）、StructureV2 三层锁（oxn-asset-domain 已有）、PEAS/R&N 对照（RFC-0018 附录 A）；已含删冗余，缺口补 Axiom/Theorem
- [ ] 引用侧清理：RFC-0018 frontmatter `related`、glossary.md 指向、README/入口链
- [ ] 删除 `CONTEXT-MAP.md`

### P3 · AGENTS.md 修订
- [ ] 5 级语义优先级 → 2 档裁决规则
- [ ] 新增"阅读与加载顺序"索引段（L-1 → L4 + 正文指针 `dev/knowledge-loading.md`）
- [ ] 入口指针更新：CONTEXT-MAP 条目 → domains/ 目录 + assetmaps/oxn-system.md
- [ ] 意图解析 4 步与 SKILL 对齐（show 前置 + suggest 候选 + 人机挑选）

### P4 · dev/knowledge-loading.md（新建 · 唯一正文）
- [ ] 阅读者分层（README / AGENTS.md / Skill）
- [ ] 加载链 5 层详述（每层读什么、读多深：整文件 vs 章节）
- [ ] 2 档裁决规则
- [ ] docs/ 外部参考层定位（URL 引用，未来独立 repo）
- [ ] 维护约定（改动登记）

### P5 · assetmap 修正
- [ ] `oxn-system.md`："8 Domain + 12 RFC 必读" → 按 scene 引用的现行表述（27 RFC 按需，非必读清单）
- [ ] Domain 计数统一（9 文件含 Advisory 说明）

### P6 · 验证
- [ ] `bun run check:all`（含 check-doc-boundary）
- [ ] `bun run typecheck` && `bun test`
- [ ] `init -f` 后 `.opencode/skills/` diff 检查
- [ ] `docs:build` 验证独立包

## 5. 波及面核查

- `scripts/check-doc-boundary.ts`：豁免段含 `docs/.vitepress/**`，docs 独立包后路径不变，无影响
- `docs/.vitepress/config.ts`：sidebar 需更新（删 ai-entry）
- RFC-0018 frontmatter `related` 含 CONTEXT-MAP.md → 同步更新
- `docs/product/zh-cn/concepts/glossary.md`：可能有 CONTEXT-MAP 链接 → 清理
- VitePress dist 产物（docs/.vitepress/dist）→ gitignore 确认

## 6. 待办 / 后续

- [ ] 执行 P0 → P6（本 draft 落盘后按序执行）
- [ ] economy.md drift（`.openxenon/pools/drafts/` → `.openxenon/drafts/`）顺手修正
- [ ] 用户全局 `~/.opencode/skills/` 旧版 oxn-cli / oxn-proof 清理（环境侧，非仓库范围）
- [ ] docs 未来独立 repo（路线 c）后移，本次仅 workspace 包化