# Changelog

## [0.6.1] - 2026-07-08

> **主题**：Asset/Work 全面 MD-canonical — 5 子 PR 完整闭环
> **范围**：v0.6.1-alpha.0 → v0.6.1 stable（5 sub-PR + 1 extension）
> **破坏性变更**：
> - 旧 `:::intent{...}` 容器指令解析期抛 `E_MD_DEPRECATED_SYNTAX`
> - Work 引用值强制 `@md/<scope>/<name>` 前缀；裸名 / `@prj/...` 抛 `E_MD_REFERENCE_PREFIX_INVALID`
> - `oxn work create` 默认写 `work.md`（可通过 `--oxn-legacy` flag 回退 .oxn）

### Added

- **PR-2 `@md/...` 前缀**：Work 引用值 `blueprint: @md/blueprints/X`、`domain: @md/domains/Y`（D-γ b 锁定）
- **PR-3 Asset canonical 翻转**：AssetFormat 默认 `md`；`resolveAssetFileCandidatesV61` 4 级路径候选（`.md` → `.oxn` → fallback layout）
- **PR-3 `oxn work create` 默认 .md**：双轨 .md + .oxn 留 fallback
- **PR-4 `--no-langium` flag**：`oxn domain validate <X> --no-langium` / `oxn blueprint validate <X> --no-langium` —— 强制 mdast 路径
- **PR-4 builtin .md 副本**：15 builtin probes + 3 builtin blueprints 都有 `.md` canonical 副本
- **PR-4 守卫**：
  - `bun run check:md-fallback` —— 扫描 .oxn 数量（INFO 日志）
  - `bun run check:no-langium` —— 拦截新增 Langium import（fatal）

### Changed

- **PR-1** `oxl-md-decompiler.ts` 移除 `'directive'` 选项；`mdast-to-kernel.ts` / `mdast-validator.ts` 同步
- **PR-3 `assetFormat` 默认**：`'oxn'` → `'md'`
- **PR-4 `driver.ts` 默认**：`'unified'` → `'mdast'`
- **PR-3 Sync 命令写入位置**：`.md` 写到主目录而非 `*-md/` 孤儿

### Deprecated

- **PR-4 `langium-driver/` 目录**：`@deprecated v0.7.0 will be removed`
- **PR-4 `langium`/`langium-cli` npm 依赖**：v0.7.0 切割

### Migration

```bash
# 升级到 v0.6.1
bunx @istuen/openxenon@0.6.1 install-skill

# 迁移存量 .oxn 资产（可选；可推迟到 v0.7.0）
oxn domain sync --all
oxn blueprint sync --all

# 强校验 mdast 路径生效
oxn domain validate <X> --no-langium
```

### Tests

- `bun test packages/engine/src/oxl/md-bridge`：**242 / 242 pass**
- `bun test src/builtin/__tests__/builtin-assets-md.test.ts`：**21 / 21 pass**（新增）
- `bun run typecheck / check / lint`：**0 error**

详细 PR 列表见 `.changes/0-6-1-asset-md-default.md`。

---

## [0.6.1-alpha.0] - 2026-07-02

> **主题**：v0.6.0 架构的调试驱动修复。5 个 Cycle（Asset / Skill / Work / Round / Proof）系统化测试，按问题分批修复 P0/P1 阻塞性问题。
> **测试结果**：1,890 → 1,884 pass（+0 回归）/ 6 fail（v0.6 Skill 极简版预期产物，归 backlog）
> **关键修复**：
> - P0: `oxn work finalize` 从零实现（之前完全缺失）
> - P0: 路径布局修正（`.openxenon/assets/domains-md/` v0.6 RFC 路径）
> - P0: `chmod 0o444` 落盘（planLock 守卫前提）
> - P0: Blueprint DAG 环检测（DFS + 灰/白/黑标记）
> - P0: builtin blueprint 模板与 grammar 一致
> - P1: domain sync-md 不再覆盖工程师 .oxn（data loss 修复）
> - P1: proof verify 加 frozen.json hash drift 检测


> OpenXenon 变更日志。每条变更对应一个 git commit；详细 PR 列表见 `.openxenon/pools/drafts/`。

## [0.3.0] - 2026-06-24

> **主题**：MD-Native Grammar 改革 — 完全替换 `:::intent{...}` 为纯原生 Markdown 层级映射
> **范围**：3 个串行子 PR (t18-t19-t20) + 5 个后续 commits (canonical 范式落地) + A1 fixture 迁移 + A2 CLI 实装
> **破坏性变更**：旧 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`；用户须重跑 `oxn domain compile` / `oxn blueprint compile` 生成新格式

### Added

**v0.3.0 改革核心（5 commits on `feat/v0.3-md-ssot`）**：

- **EntityCompiler 接口 + Registry**：`compile()` / `parse()` / `validate()` 三方法抽象；`EntityRegistry` Singleton 路由 5 类实体（src/oxl/md-bridge/entity-compiler.ts + entity-registry.ts）
- **5 个 compiler 实现**：Domain / Blueprint / Work / Task / Proof（src/oxl/md-bridge/compilers/）
- **extract-headings + extract-list-fields**：H1/H2/H3 上下文栈 + 列表字段树形递归（mdast 天然支持，无固定缩进）
- **`oxn domain compile <name>` CLI**：把 `.oxn` 重编译为 v0.3 canonical 纯 MD `.md`（落 `.openxenon/domains-md/`，触发 auto-rebuild slim 索引）
- **`oxn blueprint compile <name>` CLI**：同上 for blueprint
- **canonical CI 守卫**（`scripts/check-md-canonical.ts`）：5 条规则防漂移
  - `E_MD_CANONICAL_NAME_REDUNDANT`（H3 已是 canonical name，禁 `- name: <H3>`）
  - `E_MD_CANONICAL_ITEMS_COMMA_STRING`（禁 `items: A, B, C`，必须缩进列表）
  - `E_MD_CANONICAL_VALUES_INLINE_ARRAY`（禁 `values: [a, b, c]`，必须缩进列表）
  - `E_MD_CANONICAL_SEMICOLON_INLINE`（结构性字段禁 `;`，自然语言字段豁免）
  - `E_MD_INVALID_SYNTAX`（md-bridge pipeline 解析失败）

**canonical 范式三原则**：
1. H3 = canonical name（不再写冗余 `- name:`）
2. 一行一个 `- key: value`（不再 `;` 内联分隔）
3. 数组 = 缩进列表（不再逗号字符串或内联数组）

**oxn-vscode 扩展**：
- `oxn-intent.tmLanguage.json`：markdown 注入 5 类 entity H1/H2 高亮
- `docs/.vitepress/theme/custom.css`：H2 分类加 border + 浅色背景
- `scripts/check-intent-types-drift.ts`：CI 守卫 type 白名单一致

**5 个 canonical 实体样例**（`src/oxl/examples-md/`）：
- `order-domain.md`（电商 Order 限界上下文）
- `order-workflow-blueprint.md`（validate → charge → ship 拓扑）
- `place-order-work.md`（3 task 链）
- `t1-validate-task.md`（Parts / Probes）
- `order-build-validity-proof.md`（Verdicts / Runtime）
- `README.md`：范式总览 + 13 E_MD_xxx + 5 canonical 守卫速查

**docs 双 SSOT 同步**：
- `docs/zh-cn/intent.md` + `docs/en/intent.md`：新增「v0.3 统一 MD 范式」章节（5 类资产 canonical 范式代码示例 + 5 反模式 + 自然语言字段豁免白名单）

### Changed

- **错误码扩展**：6 → 13 E_MD_xxx（新增 7 个：DEPRECATED_SYNTAX / DUPLICATE_H3 / H1_MISSING / H1_MISMATCH / CATEGORY_UNKNOWN / LIST_FORMAT_INVALID / NESTED_LEVEL_OVERFLOW）
- **decompiler 产出 canonical 形式**：domain/blueprint/work/proof 4 个 compiler 的 `compile()` 输出不再含冗余 `- name:`、`items:` 改缩进列表、wrapper H3 改 `### primary` / `### snapshot`
- **A1 fixture 迁移**：66 个 `:::intent` 测试 fixture 全部改写为 H1/H2/H3 + 列表形式；md-bridge 17 个 test 文件从 175/241 → 241/241 pass
- **tests 隔离修复**：`entity-registry.test.ts` beforeEach 显式还原 5 个 compiler（避免并行 test 污染全局 registry）

### Fixed

- **test 隔离**：mdast-to-kernel-native.test.ts 的 beforeAll `_clearForTest` 不再影响 oxl-md-decompiler.test.ts
- **CI canonical drift**：22 个 `.md` 文件（6 examples + 14 domains-md + 2 intent.md）全部通过 canonical 守卫
- **typecheck**：md-bridge 4 个文件 TS2339 / TS6133 修复（未用 import / 缺失 deps 字段）

### Removed

- **删除** `remark-directive` 依赖（v0.3 PR-B breaking change）
- **删除** legacy `parseDomainMd/parseBlueprintMd/parseWorkMd` 返回类型中的 `result.intents` 字段（已重写为 canonical 形式）

### Migration 指南

**v0.2 → v0.3 升级步骤**：

```bash
# 1. 升级包（package.json 0.3.0）
bun install --frozen-lockfile

# 2. 重生所有 .md（v0.3 PR-B breaking change）
bun scripts/migrate-domains-to-native-md.ts
bun scripts/migrate-blueprints-to-native-md.ts

# 3. 验证 canonical 形式
bun scripts/check-md-canonical.ts src/oxl/examples-md docs/zh-cn/intent.md docs/en/intent.md .openxenon/domains-md

# 4. 验证测试
bun test  # 应 1700/1700 pass
```

**Breaking changes**：
- 旧 `:::intent{...}` 块在解析期抛 `E_MD_DEPRECATED_SYNTAX`（必须重跑 compile）
- 工作流（Work）/ 任务（Task）/ 证明（Proof）的 .md 仍保留 v0.2 形式（待 v0.4 批量迁移）

## [0.2.0] - 2026-06-XX

> **主题**：Proof Engine 主线 + Token Ingest
> **范围**：15 个 T-series PR + 1 个 Sprint 9 work
> **T15 spike 不入 v0.2.0**（推迟 v0.3）

### Added

**Sprint 1 (W1) — 基础设施重构**：
将 `src/cli/` 22 个文件 + `src/` 内 28 个非 cli 文件的 fs 直引收口至 `src/infra/filesystem/filesystem-async.ts`，删 3 个真死 Port。`src/daemon/recovery.ts` 移位至 `src/infra/trace/recovery.ts` 满足 L1-Infra 架构合规。

**Sprint 2 (W2) — 软缺口**：
OXL grammar 加多语法兼容（task.deps 多种写法）；merger 从 regex 改 Langium AST 解析（3 个 sync 函数改 async）。

**Sprint 3 (W3-W4) — Probe 污染防护**：
引入 IO Primitive + InterferenceFlag 12 项 + TRUST_BASELINE + ProbeVerdict 三态（PASS/FAIL/INCONCLUSIVE）；frozen.json schema 升级至三态；新增 ProviderRegistry + 4 内置 Provider（FileProvider/HttpProvider/ShellProvider/GitProvider）；probe-sandbox（Bun vm.SourceTextModule PoC + FORBIDDEN_GLOBALS 7 项 + FORBIDDEN_MODULES 10 项）；probe-registry-store（registry.json v1 schema）；`oxn probe add/list/fix` CLI 三个新命令。Intent Pool v3 最小切片上线：research 池 + Hall 扫描迁移 + forges/ 退役预警。

**Sprint 4-5 (W5-W6) — Daemon 闭环与 OXL 1.3**：
`daemonStartup` 物理路径从 `src/daemon/` 迁至 `src/infra/registry/`；workPrecheck 精准阻断该 Work（v2 核心倒置）。OXL 1.3 grammar 加 scheme 字段 + 15 builtin probe 模板迁移。InvariantDecl 加 script/manual/scope 三个可选字段（兼容老 value=STRING）；WorkDeclaration 加 domainProofs+=DomProofRef 语法。work finalize 二阶段原子写入（临时目录 + 验证 + 原子 rename）+ domain-proof-evaluator。

**Sprint 6-7 (W7-W8) — 全量启用**：
Intent Pool 5 池（research/design/issue/audit/journal）全启用；`oxn pool list/create` CLI。Daemon PR-2/3/4 闭环：step.ts（Proof-driven incremental steps）+ daemon restart/logs/kill CLI + trace archiver。

**Sprint 9 — Token Ingest**：
oxn token ingest 最小闭环。

### Changed

- 多次 L0–L3 架构合规修复（详见 T1a/T1b/T6/T7/T9/T11/T12 各 PR）
- ESLint `no-restricted-imports` 规则强化（kernel↔infra、daemon↔cli 边界）
- Langium grammar 增量改动（T3/T10/T11 三次 `bun run langium:generate`）
- 14 builtin probe 升级（三态/Provider 化/grammar 升级）

### Fixed

- 各类 5–10 case 测试修复（每 PR 平均 +5 case，11 PR 合计 100+ 新测试）
- T1 跨平台 require → ESM import（CJS 残留 14 处修复）
- T1b 路径解析回归（`resolveForgeRoot` 修复）
- T4 ReDoS 防护（safe-regex 拦截）
- T5 reader hash 关键 bug 修复（raw hash 不依赖 zod key 顺序）

### Removed

- `src/daemon/recovery.ts`（移至 `src/infra/trace/recovery.ts`，T2）
- 3 个真死 Port（T1b）

## [0.1.8] - 2026-06-15

### Added

- 文档站点 i18n 化（VitePress 双语结构）
- 英文全量翻译（16 个章节 + 4 个 examples）
- Quick Start 改用 npm/pnpm/bun 全局安装

### Fixed

- root locale 的 nav/sidebar 链接路径修正
- 补 docs/zh-cn/index.md 修 /zh-cn/ 404
- locale key 改小写 'zh-cn' 修 zh-cn 页面缺 sidebar/i18n 切换器
