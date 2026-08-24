---
entity: draft
type: design
created: 2026-08-13
status: open
synced-at: 2026-08-13
related:
  - AGENTS.md
  - dev/knowledge-loading.md
  - dev/README.md
  - docs/dev/zh-cn/README.md
  - .openxenon/assets/domains/oxn-project-domain.md
source: grill-with-docs + domain-modeling (2026-08-13)
---

# 仓库根目录与文件整合收敛方案

> **情态**：Design Draft（前瞻性整合方案 / 收口稿）
> **来源**：2026-08-13 `/grilling` session（grill-with-docs + domain-modeling 双技能联合）
> **状态**：open（待工程师决策；4 个 Q1-Q6 关键问题 + 阶段 A-C 执行建议）
> **范围**：OpenXenon 仓库根文件 + 一级目录 + docs 子树 + .openxenon 归档镜像

---

## 1. 调查方法

执行以下步骤采样（仅观察，不动文件）：

1. 列出 root 文件 / 顶层目录结构 + 体积 / mtime
2. 抽样读工程入口文件（`AGENTS.md` / `package.json` / `tsconfig.json` / `lefthook.yml` / `bunfig.toml` / `langium-config.json` / `.gitignore` / `.npmignore` / `biome.json` / `eslint.config.js`）
3. 抽样读 docs 入口（`docs/index.md` / `docs/product/zh-cn/introduction.md` / `_index.md`）
4. 抽样读 dev 层入口（`dev/README.md` / `dev/knowledge-loading.md` / `docs/dev/zh-cn/README.md` / `docs/dev/zh-cn/architecture.md` / `oxn-engine.md` / `oxn-cli.md`）
5. 抽样读 skeleton + RFC README + ADR-0099 + `check-doc-boundary.ts` 守门
6. 检查 empty dirs / orphan files / 损坏引用 / 重复语义

---

## 2. 候选清单

### 2.1 🚮 高置信度删除（pure 垃圾 / 异味）

| # | 路径 | 性质 | 理由 |
|---|---|---|---|
| **D1** | `bun.lock.bak`（100 KB） | 备份残留 | 与 `bun.lock` **字节级别完全一致**（diff 为空）；`.gitignore` 已双行 ignore；`.openxenon/drafts/oxn-dev-release-coexistence.md` L94/111/243 写"保留作为本地对照"，但**对照基线与原文件永远等价**——要么是死备份，要么是写文档当时就没真核对。 |
| **D2** | `session-ses_0966.md`（334 KB / 7740 行） | 泄漏会话 | 仓库根出现 LLM 会话日志（"W1: 发起 v0.7 domain-hierarchy-restruct 工作区"），**不在任何 `.gitignore` / `.openxenon/.gitignore` / `.openxenon/.archived/` 范围内**——若是隐私/会话泄露应删；若是草稿应迁到 `.openxenon/drafts/`。 |
| **D3** | `docs/_archive/` 10 个空目录 | 死目录 | `core/ design/ development/ guides/ reference/ changelog/ architecture/adr/ zh-cn/` **全部 empty**（仅 `horizon/iap-as-signal-system.md` 一篇活文件，且 `docs/.gitignore` 已 ignore `horizon/`）。`check-doc-boundary.ts` §跳过规则同样跳过 `docs/_archive/**`——它们已**逻辑删除**。 |
| **D4** | `.openxenon/.archived/works/v0-2-t12-three-layer-pr2/tasks/{develop,test,verify,build}/` | 空任务桶 | 4 个 empty subdir，留作历史结构镜像，但 git 已无意义。 |
| **D5** | `.openxenon/.archived/pools/drafts/2026-06/journals/` | 空目录 | 同 D4，无文件。 |
| **D6** | `.openxenon/.archived/drafts/docs/dev/zh-cn/` | 空目录 | 同 D4。 |
| **D7** | `.openxenon/.archived/docs/domains-md/migration-stamp.json` | 迁移遗留 | 16 文件夹顶上一个 stamp；旧域文件已迁移到 `.openxenon/assets/domains/`，stamp 应一同归档或删除。 |
| **D8** | `scripts/v0.4-test-project/`（仅 1 个 README） | 死脚本目录 | 单文件 README 描述 v0.4 端到端测试流程，但**没有任何项目文件**——要么补命令要么删。 |
| **D9** | `dev/fix/`（仅 1 个 README） | 死目录 | README 自述"暂无——Fix Record 目录为 RFC-0013 D3 新建，待后续 bug 修复时启用"——**等到的时机是何时**？过去 0 篇。 |
| **D10** | `oxn-vscode/oxn-0.1.0.vsix`（8.7 KB） | 内嵌发行包 | 发行版不应提交到 git（vsce 工具应从 npm/github release 拉）。如未用编 v0.2.0 vsix 替代，删。 |
| **D11** | `oxn-vscode/intent-entity-types.json`（49 B） | 异位配置 | 5 个 entity 类型字符串，**没有任何引用**（grep 0 命中）——无论删或迁到 `oxn-vscode/package.json#contributes`。 |

### 2.2 🔁 合并 / 收敛（语义重叠）

| # | 路径 | 目标 | 理由 |
|---|---|---|---|
| **M1** | `README.md` 与 `README.en.md` 互为翻译 | 合并为单源 + VitePress i18n 渲染 | 当前是两个完全独立的中英文件——更新必双改且易漂移。AGENTS.md 入口指针仅指 `README.md`，README.md 头部"[English](./README.en.md)" 与 VitePress 站点双语机制冲突。 |
| **M2** | `dev/README.md` vs `docs/dev/zh-cn/README.md` | 二选一 | 两份都叫 `dev/README.md` 主题，路径不同（root `dev/` vs `docs/dev/zh-cn/`），内容**重复 70%**（都描述 dev 目录结构）。`dev/knowledge-loading.md` 已指 root `dev/` 为 L0 入口——`docs/dev/zh-cn/README.md` 应退出开发手册叙述，仅做导航。 |
| **M3** | `dev/assets-design-1.md` + `dev/assets-design-2.md` + `dev/Blueprint-1.md` | 迁到 `.openxenon/drafts/` 或删 | 3 篇 root 级 dev/ 文件：1.2 是 328/138 行 LLM 对话 ("你的工具..." / "你的思考非常有深度...")，是 **未 promote 的设计探索**，应按 RFC-0013 情态归入 `drafts/`；Blueprint-1.md 34 行模板直接与 `.openxenon/draft-skeletons/asset-blueprint.md` 重复。 |
| **M4** | `biome.json` (formatter + linter) + `eslint.config.js` (architectural guard) | 保留分工，但收敛注释 | `eslint.config.js` 只做 L0-L3 宪法守卫（no-restricted-imports），`biome.json` 做 format + lint——**分工合理**。但 `lefthook.yml` 双跑 `biome-check` + `eslint-arch` 易冲突，需明确 lint vs format 边界。 |
| **M5** | `bun.lock` + `pnpm-lock.yaml` + `pnpm-workspace.yaml` | 选 1 | `.gitignore` ignore `bun.lock`，但 `bun.lock` 仍本地存在；`pnpm-lock.yaml` 跟 `package.json#packageManager: pnpm@10.11.0` 绑定。**两者并存**对应 AGENTS.md "包管理器 pnpm（阶段 1），构建/测试 Bun"——但**逻辑混乱**：lockfile 漂移风险。 |
| **M6** | `.gitignore` (root) + `.openxenon/.gitignore` | 整合规则 | 两套 `.gitignore` 互相引用（`.openxenon/.gitignore` 提"三层文档规则见 AGENTS.md"），但 **`AGENTS.md` 没真正承载**——grep 118 行 `.gitignore` 与 23 行 `.openxenon/.gitignore` 部分规则重叠（`.openxenon/works, .openxenon/proofs, .openxenon/.cache`）。 |
| **M7** | `docs/rfc/zh-cn/README.md` 部分行带 `<!-- allow-version -->` | 与 `dev/knowledge-loading.md` "版本号中性原则" 冲突 | `dev/knowledge-loading.md` §6.7 明确"本文件版本号中性"——但 `docs/rfc/zh-cn/README.md` L8-12 用 `<!-- allow-version -->` 块显式带版本号（v0.7.0 RFC-0029 修订）。**两种规范并存**。 |
| **M8** | `.openxenon/draft-skeletons/asset-domain.md` 引导 `glossary-ref: /openxenon/assets/domains/oxn-domain.md#term-prototype` | 路径错误 | skeleton L19 写 `/openxenon/assets/domains/oxn-domain.md`，但实际生产路径是 `.openxenon/assets/domains/oxn-domain.md`（v0.7+ 收敛）。forward slash 头 + 仓库内路径都不对。 |
| **M9** | `docs/dev/zh-cn/oxn-engine.md` & `docs/dev/zh-cn/oxn-cli.md` 顶部链接 | 链接断 | 都写"`基于 [oxn-engine-domain 引擎术语](/product/zh-cn/concepts/glossary.html#)`"——**`#` 后面空 anchor**（无 fragment id），再加 `/product/...` 用绝对路径在 VitePress 多语言下会 404。 |
| **M10** | `scripts/proof-helpers/` 3 个文件 + `scripts/dev/de-version-pool.ts` | 归位 | `scripts/proof-helpers/` 含 `domain-merge-check.py` + `proof-self-check.sh` + `README.md`——python 脚本混在 TS 仓库；`scripts/dev/` 是单文件 isolated 目录。 |

### 2.3 🏚️ 现状归档 / 明确退役（语义收敛）

| # | 路径 | 动作 | 理由 |
|---|---|---|---|
| **A1** | `docs/_archive/horizon/iap-as-signal-system.md` | 迁 `.openxenon/.archived/docs/horizon/` 或 `dev/meta/` | 文档本身头部已声明 `ARCHIVED: ... 当前 IAP paradigm documentation is at docs/product/zh-cn/concepts/iap-paradigm.md`——但**位置**仍是 `docs/_archive/`，未走 `.openxenon/.archived/docs/` 主流归档路径。 |
| **A2** | `.openxenon/.archived/docs/domains-md/` 16 文件 | 物理迁 `domains-md/`→`.archived/pools/` 旧路径 | README §镜像结构 文末写"阶段 5: `.archived/domains-md/` → `.archived/docs/domains-md/` 重排"——但 `.archived/pools/` 还有 `drafts/issues/journals/spikes` 分散持有。 |
| **A3** | `.openxenon/.archived/docs/en-archive/` | 收敛到 `.archived/docs/zh-cn/` 与 `en-archive/` 平行 | 注释 `_archive()` 表明未来可能弃用，目前 1 文件。 |
| **A4** | `docs/dev/zh-cn/three-tier-docs.md` | 改名 `docs-dev-boundary.md` | 标题"三层文档守门"已与 v0.7.0 RFC-0028 收敛后的"2 档裁决"用语不一致。 |
| **A5** | `src/daemon/engine/executor.ts`（孤立单文件） | 迁 `packages/engine/src/Work/` 或 `packages/cli/src/commands/` | `src/daemon/` 是"保留: daemon/ + builtin/ + watcher/"（README 架构表）——但 `engine/` 子目录只 1 个 executor.ts，**与 v0.6 Monorepo 拆分不符**。 |

### 2.4 🧐 待澄清（语义边界问题——ask user）

| # | 路径 | 疑问 |
|---|---|---|
| **Q1** | `dev/versions/` 目录体感消失 | `dev/pool/README.md` L5 提"2026-08-06 dev-versionless-pooling 把 `dev/versions/` 中过早填充的 10 个 Roadmap 回滚到 `dev/pool/`"——但 `ls dev/` 仍无 `versions/`。是已干净删，还是有 dangling ref？ |
| **Q2** | `docs/dev/zh-cn/oxn-engine.md` & `oxn-cli.md` 引旧的 E1-E4 + L0-L3 | 它们叫"开发者手册"但内容是 OXN 引擎总览（"OXN Engine 开发者手册" / "OXN CLI 开发者手册"），与 `docs/dev/zh-cn/architecture.md` 重复 50%——是**冗余**还是**专题**？ |
| **Q3** | `.npmignore` 是否多余 | package.json `files: ["dist"]` + `prepublishOnly: build` 已收口发布内容；`.npmignore` 显式排除 `src/ tests/ .openxenon/ .github/ docs/ .changes/ scripts/`——但 npm pack 默认不含 `src/` 等。**两者择一**。 |
| **Q4** | `skills-lock.json` 与 `.agents/skills/` 关系 | `skills-lock.json` 列 3 个从 `mattpocock/skills` GitHub 拉的 skill（domain-modeling/grill-with-docs/codebase-design），但 `.agents/skills/` 实际目录结构与本地 `~/.agents/skills/` 怎么协同？ |
| **Q5** | `dist/` 是否入仓 | `package.json` `"main": "./dist/cli.js"` + `files: ["dist"]`；`scripts/oxn-switch.sh` 拷本地 `dist/` 作 dev 链接入口——但 `clean: rm -rf dist` 会破坏。需要 `pnpm run build` 之后发布。 |
| **Q6** | `src/markdown.d.ts`（358 B） | 孤立的 `.d.ts` 在 `src/` 根——是 daemon 依赖的 type 声明，还是迁过去的？`src/daemon/.gitignore` 没有它。 |

---

## 3. Domain-Modeling 裁决（glossary 视角）

按 `dev/knowledge-loading.md` §3 2 档裁决：

| 概念 | 候选定位 | 冲突 |
|---|---|---|
| **"开发手册入口"** | root `dev/README.md`（AGENTS.md 入口指针） vs `docs/dev/zh-cn/README.md`（VitePress 站入口） | AGENTS.md L81 指 `docs/dev/zh-cn/architecture.md`——**两者并存但未澄清**。需在 oxn-project-domain.md 立 `dev-guide-interface` Axiom 区分"仓库内部入口" vs "站点入口"。 |
| **"目录骨架"** | `dev/knowledge-loading.md` §4 文档场域定位 | 表格 L4 列 `dev/versions/` 但目录里**不存在**——terminology stale。 |
| **"废弃内容"** | `docs/_archive/` vs `.openxenon/.archived/` | 两套归档位置，README §镜像结构 说 `.archived/` 是 L2/L3 历史尾巷，`docs/_archive/` 是 docs 自己的旧仓——**但 `docs/_archive/` 几乎全空**。 |
| **"烤"文档** | `dev/assets-design-1.md` / `dev/assets-design-2.md` 中"你的工具..."对 LLM 称呼 | 这些是**对话体**而非工程文档——按 RFC-0013 情态分应归 `Draft`（`.openxenon/drafts/`）；当前在 root `dev/` 是情态越界。 |

### 3.1 待 freeze 新 Axiom（写 `.openxenon/assets/domains/oxn-project-domain.md`）

```yaml
- theorem: dev-directory-vs-docs-dev-directory
  source: grill-with-docs 2026-08-13
  rules:
    - root dev/ = 开发者操作手册（仓库内部入口，AGENTS.md 引用）
    - docs/dev/zh-cn/ = 站点渲染手册（VitePress 入口，外部读者）
    - 内容可重叠但**入口不同**；修 root dev/ 等于改元入口，必走 PR review
- theorem: archive-directory-monopoly
  rules:
    - root docs/_archive/ 仅 1 个有效文件（horizon/iap-as-signal-system.md）
    - 所有历史归档在 .openxenon/.archived/ 镜像结构
    - docs/_archive/ 其余 9 个空目录应删除
- theorem: dev-content-vs-draft-content
  rules:
    - dev/<file>.md 必须已是 Accepted 工程文档或 RFC / ADR 入口
    - 对话体 / 探索稿 / 未 promote 设计稿 → 必在 .openxenon/drafts/
```

---

## 4. 执行建议（不实施 —— 等批准）

### 4.1 阶段 A · 立即清理（pure 垃圾，无语义风险）

```bash
# D1 备份等同 → 删
rm -v bun.lock.bak

# D2 移到归档区或暂存 /tmp
mv session-ses_0966.md /tmp/oxn-session-leak-2026-08-13.md

# D3 删 docs/_archive/ 9 个空目录（保留 horizon/ 1 个文件）
rm -rf docs/_archive/{core,design,development,guides,reference,changelog,architecture,zh-cn}

# D4-D6 删 .archived/ 下空目录
rm -rf .openxenon/.archived/works/v0-2-t12-three-layer-pr2/tasks/{develop,test,verify,build}
rm -rf .openxenon/.archived/pools/drafts/2026-06/journals
rm -rf .openxenon/.archived/drafts/docs/dev/zh-cn

# D7 删迁移 stamp
rm -v .openxenon/.archived/docs/domains-md/migration-stamp.json

# D8 删死脚本目录
rm -rf scripts/v0.4-test-project

# D9 删死 dev 目录（或真启用 — 工程师定）
rm -rf dev/fix

# D10 删内嵌 vsix
git rm -f oxn-vscode/oxn-0.1.0.vsix

# D11 删异位配置
git rm -f oxn-vscode/intent-entity-types.json
```

### 4.2 阶段 B · 合并 / 迁移（语义重排）

- **M1**: `README.md` 改单源（GitHub 自动渲染 + VitePress 接管双语），`README.en.md` 改软链或删
- **M3**: `git mv dev/assets-design-1.md dev/assets-design-2.md dev/Blueprint-1.md .openxenon/drafts/`
- **M5**: 删 `bun.lock`（已 gitignore）+ 保留 `pnpm-lock.yaml`
- **M8**: `git grep` 全仓 `/openxenon/assets/domains/oxn-domain.md` 修 skeleton
- **M9**: 修 `docs/dev/zh-cn/oxn-engine.md` L7、`oxn-cli.md` L7 死链
- **M2**: 收敛 root `dev/README.md` vs `docs/dev/zh-cn/README.md`（写 Axiom 后定调）

### 4.3 阶段 C · 术语裁决（写 Domain Axiom）

- 写 `oxn-project-domain.md` 的 3 条新 Axiom（见 §3.1）
- 跑 `bun scripts/sync-domain-glossary.ts` 同步 glossary
- 跑 `bun scripts/check-doc-boundary.ts` 验证
- 跑 `bun scripts/check-versioned-docs.ts` 验证 M7

### 4.4 阶段 D · 仍待澄清（不走 PR）

- Q1-Q6 需工程师回答（已列在 §2.4）

---

## 5. 需要立刻决定的 4 个关键问题

1. **D2 `session-ses_0966.md`** — 删？迁到 `.openxenon/drafts/`？还是迁到 `.openxenon/.archived/`（若已是无用旧会话）？
2. **D9 `dev/fix/`** — 真启用还是删？若是启用，期望何时第一次写？
3. **M1 README 双语** — 接受 VitePress i18n 方案（推荐）还是保留双源 README？
4. **M5 lockfile** — 删 `bun.lock` 强一致 pnpm，还是保留双 lock（风险：CI 漂移）？

其余 D3-D8 / D10-D11 / M2-M4 / M6-M10 / A1-A5 视为低风险合并，可一并在阶段 A-C 走 PR。

---

## 6. Promote 路径

- **推荐 promote-target**: `rfc`（决策层 RFC 收敛掉 11 项 M + 5 项 A）
- **次选 promote-target**: `asset` (`--kind domain`）→ 把 §3.1 的 3 条 Axiom 落到 `oxn-project-domain.md`
- **不推荐 promote-target**: `work`（v0.7.0+ 已废弃 `--target work`，见 `OXN_DRAFT_TARGET_WORK_DEPRECATED`）

---

## 附：版本沿革

| 日期 | 状态 | 变更 |
|---|---|---|
| 2026-08-13 | **open** | 初版（grill-with-docs + domain-modeling 联合 session 产出） |