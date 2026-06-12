# i18n Version Drift — OpenXenon i18n 与版本对齐诊断

> **状态**：Draft v0.1 — 审计稿，**未实现**。本文档**只记录事实 + 漂移点 + PR 拆分建议**，不动任何代码。
>
> **目标读者**：架构师 + OXN 维护者；**先评审 PR 拆分，再决定哪一档先做**。
>
> **前置文档**：
> - i18n Phase A 引入日志：[`.changes/0-0-26-i18n-kernel-adapter.md`](../../.changes/0-0-26-i18n-kernel-adapter.md)
> - 关联宪法：[`docs/architecture/l0-l3-constitution.md`](../../docs/architecture/l0-l3-constitution.md) §2.1（i18n 归 L3-Runtime）
> - 同期 v0.0.27 审计：[`2026-06-11-v0.0.27-product-audit.md`](./2026-06-11-v0.0.27-product-audit.md)

## 目录

- [1. TL;DR](#1-tldr)
- [2. 现状快照](#2-现状快照)
- [3. 漂移点（按严重度）](#3-漂移点按严重度)
- [4. PR 拆分建议（4 档可选）](#4-pr-拆分建议4-档可选)
- [5. 推荐路径：PR-1 → PR-2 → PR-3 → PR-4 顺序实施](#5-推荐路径pr-1--pr-2--pr-3--pr-4-顺序实施)
- [6. 实施 checklist（合 4 PR）](#6-实施-checklist合-4-pr)
- [7. 验收标准（每 PR 独立）](#7-验收标准每-pr-独立)
- [8. 风险与缓解](#8-风险与缓解)
- [9. 待评审项](#9-待评审项)
- [10. 决策记录（ADR）](#10-决策记录adr)
- [11. 关联资料](#11-关联资料)

---

## 1. TL;DR

i18n Phase A 在 **v0.0.26** 落地（[`.changes/0-0-26-i18n-kernel-adapter.md`](../../.changes/0-0-26-i18n-kernel-adapter.md)），但 **v0.0.27、v0.0.27-probe-stats、v0.0.27-insight、v0.0.28×2 共 5 次发版均未推进 i18n**。当前状态有 5 类漂移：

| # | 类别 | 严重度 | 现状 |
|---|---|---|---|
| 1 | 消费面漂移 | 🟠 高 | 36 处硬编码中文字符串未走 `t()`，新增报错文案绕过 i18n |
| 2 | 资源漂移（CLI） | 🟡 中 | `src/i18n/en.json` 缺失，契约声明支持 `'en'` 但实际回退 zh-CN |
| 3 | 资源漂移（Skills） | 🟠 高 | `src/skills/locales/en/` 整目录缺失；`oxn-resume` 80 行死资产未清理 |
| 4 | 测试漂移 | 🟡 中 | `src/i18n/__tests__/` 与 `src/skills/__tests__/skill-i18n.test.ts` 均不存在 |
| 5 | 版本同步漂移 | 🔴 低（但已坏 CI） | `docs/zh-cn/changelog/CHANGELOG.md` 缺失 → `bun run version:check` 失败；`src/cli/index.ts:147` 写死 `'1.0.0'` |

**核心结论**：i18n 在 v0.0.26 是 **"骨架已立、血肉未充"** 状态。**两套翻译体系**（`src/i18n/` 走 i18next + `src/skills/locales/` 走 Bun .md）**双轴漂移**。若不主动推 Phase B，v0.0.27+ 每次发版都会扩大漂移面。

---

## 2. 现状快照

### 2.1 模块边界

| 项 | 值 | 锚点 |
|---|---|---|
| 物理位置 | `src/i18n/` | L3-Runtime（[`docs/architecture/l0-l3-constitution.md`](../../docs/architecture/l0-l3-constitution.md) §2.1） |
| 引擎 | `i18next ^26.2.0` | `package.json:dependencies` |
| 配置文件 | `src/i18n/index.ts` | 26 行，初始化 + 导出 `t` / `setLocale` / `getCurrentLocale` |
| 资源文件 | `src/i18n/zh-CN.json` | 5 命名空间 / 18 条文案（41 行） |
| locale 契约 | `SupportedLocale = 'zh-CN' \| 'en'` | `src/cli/project-config.ts:3` |
| 默认 locale | `zh-CN` | `src/cli/project-config.ts:5` |

### 2.2 `zh-CN.json` 命名空间清单

| 命名空间 | 条数 | 消费方 | 状态 |
|---|---|---|---|
| `init.*` | 10 | `src/cli/init.ts`（5 处） | ✅ 落地 |
| `config.*` | 3 | `src/cli/config.ts`（1 处） | ✅ 落地 |
| `configDebug.*` | 5 | `src/cli/config-debug.ts`（5 处） | ✅ 落地 |
| `daemon.*` | 3 | **0 消费方** | ⚠️ 死资源（`socket-client.ts` / `daemon-status.ts` 直接字面量） |
| `skillCompiler.*` | 5 | **0 消费方** | ⚠️ 死资源（`skill-compiler.ts` 返回原始对象，无 i18n 包装） |

### 2.3 死代码

| 符号 | 定义 | 调用方数 | 评估 |
|---|---|---|---|
| `setLocale(locale)` | `src/i18n/index.ts:20` | 0 | 导出后从未被任何运行时调用 |
| `getCurrentLocale()` | `src/i18n/index.ts:24` | 0 | 同上 |

`init` 命令接收 `--locale` 参数后**只写入 `ProjectConfig.locale` 字段**，**未调用 `i18next.changeLanguage()`** → 即使项目 locale 是 `'en'`，运行时仍输出 zh-CN 文案（fallback 行为）。

---

## 3. 漂移点（按严重度）

### 3.1 🟠 消费面漂移（高）

**`OXN_NO_PROJECT` 硬编码 9 处**（同一文案重复 9 次，违反 DRY + 绕过 i18n）：

| 文件 | 行号 | 文案 |
|---|---|---|
| `src/cli/work.ts` | 677 | `项目未初始化，请先执行 oxn init` |
| `src/cli/work.ts` | 770 | 同上 |
| `src/cli/work.ts` | 947 | 同上 |
| `src/cli/work.ts` | 1097 | 同上 |
| `src/cli/work.ts` | 2527 | 同上 |
| `src/cli/work.ts` | 2639 | 同上 |
| `src/cli/work.ts` | 2728 | 同上 |
| `src/cli/blueprint.ts` | 458 | 同上 |
| `src/cli/domain.ts` | 473 | 同上 |

**Daemon 错误文案硬编码 7 处**（`i18n/zh-CN.json` 已定义 `daemon.*` 但消费方直接字面量）：

| 文件 | 行号 | 文案 |
|---|---|---|
| `src/cli/socket-client.ts` | 30 | `Daemon 未运行（${code}: ${message}）` |
| `src/cli/socket-client.ts` | 34 | `请先执行 oxn global daemon start 启动 Daemon` |
| `src/cli/socket-client.ts` | 38 | `Daemon 响应超时（${code}: ${message}）` |
| `src/cli/socket-client.ts` | 42 | `等 5 秒后重试，或执行 oxn global daemon stop && oxn global daemon start` |
| `src/cli/socket-client.ts` | 45 | `Daemon 通信失败（${code}: ${message}）` |
| `src/cli/daemon-status.ts` | 20 | `Daemon 未运行` |
| `src/cli/daemon-status.ts` | 22 | `Daemon 状态: 未运行\n使用 \`oxn daemon start\` 启动 Daemon` |

**其他硬编码中文字符串 2 处**：

| 文件 | 行号 | 文案 |
|---|---|---|
| `src/cli/explore-cmd.ts` | 353 | `添加问题失败` |
| `src/cli/explore-cmd.ts` | 368 | `格式错误，使用: --answer id\|回答内容` |
| `src/cli/explore-cmd.ts` | 479 | `无问答记录，无法生成报告` |
| `src/cli/explore-cmd.ts` | 489 | `报告已存在，使用 --force 覆盖` |
| `src/cli/cache-stats.ts` | 29 | `缓存目录不存在` |
| `src/cli/cache-clear.ts` | 34 | `缓存目录不存在，无需清理` |
| `src/cli/gc.ts` | 43, 82 | `没有任务目录需要清理` / `没有需要清理的任务` |
| `src/cli/cache.ts` | 16 | `使用 oxn cache clear 或 oxn cache stats` |
| `src/cli/oxn-migrate-cmd.ts` | 47 | `请指定文件路径、--dir 目录或 --all` |
| `src/cli/config.ts` | 44 | `项目配置:\n  mode: ...`（整段 hardcoded 模板） |

**总计 30+ 处硬编码中文字符串**未走 i18n（精确数：18 + 7 + 11 = 36 处）。

### 3.2 🟡 资源漂移（中）

**`en` locale 资源缺失**：

| 现象 | 锚点 |
|---|---|
| `SUPPORTED_LOCALES` 声明 `'en'` | `src/cli/project-config.ts:7` |
| `SupportedLocale` 类型含 `'en'` | `src/cli/project-config.ts:3` |
| `i18n/index.ts` 初始化只注册 `'zh-CN'` | `src/i18n/index.ts:12-14` |
| 运行时 `i18next.changeLanguage('en')` 会全部回退 zh-CN | 由 i18next 默认 fallback 行为 |
| `loader.ts` 显式注释 en 已废弃 | `src/skills/loader.ts:7, 62, 65, 67` |

**契约不一致**：`--locale en` 不会报错（`init.ts:171` 只校验在 `SUPPORTED_LOCALES` 内），但运行时无 en 资源 → 用户看到 zh-CN 文案 + 英文版 skill 描述同时存在的"半中半英"状态。

#### 3.2.1 Skills 资源漂移（与 `src/i18n/` 平行的另一套）

Skills 是**独立于 i18next 的第二套翻译资产**，由 `oxn init` 编译到目标 AI 助手目录（`.opencode/skills/` 等）。它**不走 i18next 资源**，而是 `loader.ts` 直接 `import ... with { type: 'text' }` 注入。

**当前文件清单**（实测 2026-06-11）：

| Locale | Skill | 物理文件 | 行数 | 状态 |
|---|---|---|---|---|
| `zh-CN` | `oxn-cli` | `src/skills/locales/zh-CN/oxn-cli/instruction.md` | ~430 | ✅ |
| `zh-CN` | `oxn-work` | `src/skills/locales/zh-CN/oxn-work/instruction.md` | ~280 | ✅ |
| `zh-CN` | `oxn-work` (ref) | `src/skills/locales/zh-CN/oxn-work/references/blueprint-format.md` | ~180 | ✅ |
| `zh-CN` | `oxn-proof` | `src/skills/locales/zh-CN/oxn-proof/instruction.md` | ~110 | ✅ |
| `zh-CN` | `oxn-resume` | `src/skills/locales/zh-CN/oxn-resume/instruction.md` | ~80 | ⚠️ **零消费方**（`loader.ts:3-6` 未 import） |
| `zh-CN` | `oxn-proof` (测) | `src/skills/locales/zh-CN/oxn-proof/__tests__/no-leak.test.ts` | ~50 | ✅ |
| `en` | — | **目录不存在** | — | ❌ |

**`loader.ts` 现状对 en 的处理**：

| 行号 | 现状 | 含义 |
|---|---|---|
| `loader.ts:7` | 注释 `v0.1: 英文版 Skill 已废弃（zh-CN 为唯一权威）` | **显式决策**："只发 zh-CN" |
| `loader.ts:34-49` | `skillMeta.en` 是**英文 description 字符串**（仅 `id` + `description`，无 `instruction` 字段） | 描述用英文、内容用中文 → 半中半英 |
| `loader.ts:61-68` | `skillContents.en` 三个 skill 全部 `instruction: zhCnXxx`（同一份 zh-CN 资源被 en 复用） | en 用户看到 zh-CN 内容 |
| `loader.ts:71-72` | `getSkillContent` 内部 fallback：en 找不到 → 回退 zh-CN | 行为兜底 |

**两套 i18n 体系的并立**：

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│  src/i18n/                          │    │  src/skills/locales/                │
│  ─────────                          │    │  ───────────────────                │
│  • 引擎: i18next ^26.2.0            │    │  • 引擎: Bun import .md with text   │
│  • 资源: zh-CN.json (1 文件)         │    │  • 资源: 4 skill × 5 .md 文件        │
│  • 消费方: CLI 错误文案               │    │  • 消费方: AI 助手（通过 init 编译）  │
│  • 范围: 人类可读字符串                │    │  • 范围: LLM 提示词（instruction）  │
│  • 切换: i18next.changeLanguage()    │    │  • 切换: loader.ts 按 locale 选择    │
│  • 翻译计划: PR-2/3 (本审计主体)      │    │  • 翻译计划: ❌ 未纳入                │
└─────────────────────────────────────┘    └─────────────────────────────────────┘
```

**Skills 翻译计划缺口**（核心问题）：

| 缺口 | 影响 |
|---|---|
| en instruction.md 缺失 | en locale 用户的 AI 助手实际收到**中文指令**（loader fallback），AI 行为按中文 prompt 走 |
| `oxn-resume` 整文件 0 消费方 | v0.0.26 后新增但 loader.ts:3-6 未 import；本地累计 80 行死资产 |
| `skillMeta.en` 与 `skillContents.en` 描述/内容语言不一致 | en 描述 + zh 内容 → LLM 看到 `description: "Unified OpenXenon CLI entry point..."` + `instruction: "oxn 是一个 OXO/IAP 控制引擎..."` 矛盾元数据 |
| 没有"是否要 en 翻译"的明确决策 | 与 `src/i18n/` en 决策（PR-3 3-A/B/C）脱钩 |
| skills 翻译无法走 i18next（asset 形态） | 翻译流程需手工维护 `locales/<locale>/<skill>/instruction.md`，无自动化 key 完整性守卫 |
| en skill 翻译工作量评估缺失 | `oxn-cli` 430 行中文 prompt → 英文 ≈ 700-900 行英文 + LLM 行为验证 |

### 3.3 🟡 测试漂移（中）

| 项 | 状态 |
|---|---|
| `src/i18n/__tests__/` | 不存在 |
| `src/i18n/index.ts` 单元测试 | 0 |
| `src/i18n/zh-CN.json` key 完整性测试 | 0 |
| 翻译函数 `t()` 行为测试（fallback / interpolation） | 0 |

i18n 是 L3 新增模块，**没有任何契约守卫**。Phase A 引入 18 条文案，但缺测意味着：
- 后续重构若误删 key，**编译可通过、运行时报 `i18next: key "xxx" not found`**
- 模板插值 `{{name}}` 拼写错误无人发现

### 3.4 🔴 版本同步漂移（低，但已坏 CI）

| 项 | 现状 | 影响 |
|---|---|---|
| `package.json` 版本 | `0.0.27` | OK |
| `.changes/0-0-26-i18n-kernel-adapter.md` | 存在 | OK |
| `.changes/0-0-27-*.md` (2 个) | 存在 | OK |
| `.changes/0-0-28-*.md` (2 个) | 存在 | OK |
| `docs/zh-cn/changelog/CHANGELOG.md` | **缺失** | `bun run version:check` 失败（`scripts/version-check.ts:7-8` 检查路径） |
| `docs/en/changelog/CHANGELOG.md` | **缺失** | 同上 |
| `src/cli/index.ts:147` 写死 `version: '1.0.0'` | **与 `package.json` 0.0.27 不一致** | `oxn --version` 输出错误 |

**`version:check` 失败现象**（实测 2026-06-11）：

```
ENOENT: no such file or directory, open 'docs/zh-cn/changelog/CHANGELOG.md'
  at loadAndEvaluateModule (2:1)
Bun v1.3.10 (macOS arm64)
error: script "version:check" exited with code 1
```

该问题与 i18n **非直接相关**（CHANGELOG 文件缺失是文档同步问题），但因 `version:check` 同样在 `version:sync` / CI 中被消费，归并到本审计一并记录。

---

## 4. PR 拆分建议（4 档可选）

| 档 | PR | 范围 | 预估 LOC | 风险 | 与版本关系 |
|---|---|---|---|---|---|
| **A. 最小同步** | **PR-1** | 修复 `version:check` + 动态版本号 + i18n 漂移备忘 changelog | ~30 | 极低 | 不 bump（仍 0.0.27） |
| **B. Phase B 核心** | **PR-1 + PR-2** | A + 消费面迁移（30+ 硬编码 → `t()`）+ 死代码处理 | ~150 | 低（纯重构） | bump → **0.0.29** |
| **C. 完整 Phase B** | **PR-1 + PR-2 + PR-3** | B + en.json 补齐 + i18n 单元测试 | ~400 | 中（en 资源需翻译） | bump → **0.0.29** 或 **0.1.0** |
| **D. 完整 + Skills** | **PR-1 + PR-2 + PR-3 + PR-4** | C + Skills en 翻译 + 死资产清理 | ~1200 | 高（长 prompt 翻译需 LLM 行为验证） | bump → **0.1.0** |

### 4.1 PR 范围对比

```
PR-1 (版本同步)         PR-2 (消费面迁移)         PR-3 (CLI i18n 资源+测)        PR-4 (Skills 翻译)
─────────────────       ──────────────────         ──────────────────              ──────────────────
+ docs/*/CHANGELOG      + 36 处硬编码 → t()        + src/i18n/en.json              + en instruction.md ×3
+ index.ts 动态版本      + setLocale 真接 init       + loader.ts 描述对齐             + 删 oxn-resume 死资产
+ changelog 补备忘       + 死代码清理                + 9 个 i18n 单测                 + Skills 翻译守卫测
                                              ──────────────────              ──────────────────
不 bump                  bump → 0.0.29              bump → 0.0.30                  bump → 0.1.0（语义跳跃）
```

### 4.2 为什么 PR-3 与 PR-4 拆开

| 维度 | `src/i18n/` (PR-3) | `src/skills/locales/` (PR-4) |
|---|---|---|
| 翻译单元 | key-value 短文案 | 长 prompt 文档（80-430 行） |
| 引擎 | i18next | Bun `import .md with text` |
| 翻译难度 | 短句，可机器翻译基线 | 长 prompt，需 LLM 行为验证 |
| 维护成本 | 低（增 key 改 json） | 高（增 skill 改 md） |
| 验收 | 单元测试断言字符串 | **端到端**：init --locale en → 实际跑 AI 任务验证行为 |
| 风险 | 低 | 中-高（错译会引导 AI 行为漂移） |
| 独立发版价值 | 短文案 en → LLM 也能消费 | 错译 en 反而是降级 → 可推迟到 v0.1.0 |

---

## 5. 推荐路径：PR-1 → PR-2 → PR-3 → PR-4 顺序实施

### 5.1 PR-1：版本同步 + i18n 漂移备忘（最小可发版）

**目标**：闭合 CI 红线（`version:check` 失败）+ 让 `oxn --version` 输出正确版本。

**改动清单**：

| 文件 | 改动 |
|---|---|
| `docs/zh-cn/changelog/CHANGELOG.md` | 新建，从 `.changes/*.md` 聚合前 28 个版本条目 |
| `docs/en/changelog/CHANGELOG.md` | 新建，英文版同步 |
| `src/cli/index.ts:147` | `version: '1.0.0'` → `version: pkg.version`（动态 import `package.json`） |
| `.changes/0-0-27-oxn-validate-cli.md` | 追加 "- Note: i18n Phase A 消费面未跟进，详见 forge/2026-06-11-i18n-version-drift.md" |
| `.changes/0-0-28-*.md` (2 个) | 同上追加 Note |

**changelog 模板**（zh-CN）：

```markdown
# Changelog

## [0.0.27] - 2026-06-11

### Added
- oxn-validate CLI 命令
- OXN DSL example files
- Work type shorthand syntax
- ...

### Fixed
- grammar ↔ examples ↔ 真实 work 三方漂移（task.deps 语法）
- ts-compiles probe error TS5042

### Note
- **i18n Phase A 漂移备忘**（详见 `forges/2026-06-11-i18n-version-drift.md`）：
  - 9 处 OXN_NO_PROJECT 硬编码 + 7 处 daemon 错误文案未走 `t()`
  - en locale 资源缺失
  - i18n 模块 0 单测
  - 下版本（0.0.29）推 Phase B
```

**验证**：

```bash
bun run version:check       # 期望：✅ 全部匹配
bun run typecheck           # 期望：0 错误
bun test                    # 期望：414 个测试全绿（无功能改动）
./dist/oxn --version        # 期望：0.0.27（而非 1.0.0）
```

**风险**：🟢 极低。纯文档 + 动态版本读取，零功能改动。

**预估 LOC**：~30（主要是 CHANGELOG.md 聚合）。

---

### 5.2 PR-2：消费面迁移（i18n Phase B 主体）

**目标**：把 30+ 硬编码中文字符串全部走 `t()`，闭合 i18n 消费面漂移。

**改动清单**：

#### 5.2.1 资源层（`src/i18n/zh-CN.json` 增量）

新增 4 个命名空间：

| 命名空间 | 新增 key | 数量 | 用途 |
|---|---|---|---|
| `errors.projectNotInit` | 1 | 1 | `OXN_NO_PROJECT` 统一文案 |
| `errors.invalidAction` | 1 | 1 | configDebug 已有，可复用 |
| `daemon.errorRunning` | 1 | 1 | socket-client 启动失败 |
| `daemon.errorTimeout` | 1 | 1 | socket-client 响应超时 |
| `daemon.errorComm` | 1 | 1 | socket-client 通信失败 |
| `daemon.statusNotRunning` | 1 | 1 | daemon-status |
| `daemon.statusNotRunningHint` | 1 | 1 | daemon-status human 提示 |
| `cache.notFound` | 1 | 1 | cache-stats/cache-clear |
| `cache.empty` | 1 | 1 | cache.ts 提示 |
| `gc.noTasks` | 1 | 1 | gc.ts 提示 |
| `migrate.invalidArgs` | 1 | 1 | oxn-migrate-cmd |
| `config.showTitle` | 1 | 1 | config.ts human 模板 |
| `explore.addFailed` | 1 | 1 | explore-cmd |
| `explore.invalidAnswer` | 1 | 1 | explore-cmd |
| `explore.noQaRecords` | 1 | 1 | explore-cmd |
| `explore.reportExists` | 1 | 1 | explore-cmd |

**总计新增 16 个 key**（其中 `daemon.*` 3 条已存在，需补 4 条新 daemon key）。

#### 5.2.2 消费层（`src/cli/*` 迁移）

| 文件 | 改动 | LOC |
|---|---|---|
| `src/cli/work.ts` | 7 处 `OXN_NO_PROJECT` → `t('errors.projectNotInit')` | -3（净减，因重复文案消失） |
| `src/cli/blueprint.ts:458` | 同上 | -1 |
| `src/cli/domain.ts:473` | 同上 | -1 |
| `src/cli/socket-client.ts:30,34,38,42,45` | 5 处 → `t('daemon.*')` | +5 |
| `src/cli/daemon-status.ts:20,22` | 2 处 → `t('daemon.*')` | +2 |
| `src/cli/init.ts` | 接入 `setLocale` 真切换 i18next language | +3 |
| `src/cli/init.ts` | `tools 配置已重置为 DEFAULTS` 字面量 → `t('init.toolsReset')` | +1 |
| `src/cli/init.ts:207,217` | 2 处 `tools 配置已更新` → `t('init.toolsUpdated')` | +1 |
| `src/cli/config.ts:44` | 整段 `项目配置:\n  ...` → 模板字符串 + `t()` | +5 |
| `src/cli/explore-cmd.ts:353,368,479,489` | 4 处 → 新增 `explore.*` | +4 |
| `src/cli/cache-stats.ts:29` | 1 处 | +1 |
| `src/cli/cache-clear.ts:34` | 1 处 | +1 |
| `src/cli/gc.ts:43,82` | 2 处 | +2 |
| `src/cli/cache.ts:16` | 1 处 | +1 |
| `src/cli/oxn-migrate-cmd.ts:47` | 1 处 | +1 |

#### 5.2.3 死代码处理

| 决策 | 详情 |
|---|---|
| `setLocale` 保留 | 改为在 `init.ts` 真接 `i18next.changeLanguage()`，让 `--locale` 真的生效 |
| `getCurrentLocale` 删除 | 0 调用方，删 |
| `i18n/index.ts:7` 注释 | 加注 "v0.0.29+ 项目 locale 真的切换 i18next language" |

**验证**：

```bash
bun run typecheck           # 期望：0 错误
bun run lint                # 期望：0 错误（imports 与分层不受影响）
bun test                    # 期望：414 个测试全绿
./dist/oxn init --locale en # 期望：未来可输出英文（PR-3 落地后）；现在仍 fallback zh-CN 但 i18next.language = 'en'
rg "项目未初始化|Daemon 未运行" src/cli/  # 期望：仅剩 import 语句注释
```

**风险**：🟡 低。纯字符串字面量替换，行为不变（zh-CN 资源全量覆盖）。

**预估 LOC**：~120（其中 +90 资源，+30 消费 + 死代码清理）。

**changelog 路径**：`.changes/0-0-29-i18n-phase-b-consume.md` + bump `package.json` → `0.0.29`。

---

### 5.3 PR-3：资源补齐 + i18n 单元测试（Phase B 完整闭环）

**目标**：闭合资源漂移 + 测试漂移，让 `en` locale 真的可用。

**改动清单**：

#### 5.3.1 资源层（`src/i18n/en.json` 新建）

镜像 `zh-CN.json` 结构，所有 key 全量翻译成英文：

```json
{
  "init": {
    "projectExists": "Project already exists: {{name}}",
    "modeUpdated": "Mode updated to: {{mode}}",
    ...
  },
  ...
}
```

**预估大小**：~80 行（与 zh-CN.json 1:1 镜像）。

#### 5.3.2 资源层（`src/skills/loader.ts` 修复 en 资源）

当前 `loader.ts:62,65,67` 显式 fallback 到 zh-CN 资源，并注释 "v0.1 英文版废弃"。

**决策**：

| 选项 | 含义 |
|---|---|
| **3-A**（推荐） | 保留 zh-CN 资源为 en fallback，但删除注释中"已废弃"措辞；en 描述改为英文（`loader.ts:34-49`），让 `init --locale en` 真输出英文 skill 描述 |
| **3-B** | 彻底删 `loader.ts` 的 en 分支 + `SupportedLocale` 删 `'en'`（前提：用户调研确认 en 需求不存在） |
| **3-C** | 推迟到 v0.1.0+（en 资源需要专业翻译，超出 OXN 维护者能力） |

**推荐 3-A**：最小变更 + 完整支持。

#### 5.3.3 测试层（`src/i18n/__tests__/` 新建）

| 测试文件 | 用例 | 数量 |
|---|---|---|
| `i18n-basic.test.ts` | `t('init.invalidLocale', { locale: 'x' })` 返回正确插值 | 3 |
| `i18n-basic.test.ts` | `t('nonexistent.key')` 返回 key 本身（i18next 默认行为） | 1 |
| `i18n-basic.test.ts` | `setLocale('en')` 后 `i18next.language === 'en'` | 1 |
| `i18n-basic.test.ts` | `getCurrentLocale()` 返回当前 i18next.language（注：若 PR-2 删除此函数，本测改测 `i18next.language`） | 1 |
| `i18n-zh-CN-key-completeness.test.ts` | 遍历所有消费方 `t('xxx.yyy')` 调用，确保 zh-CN.json 含对应 key | 1（自动收集） |
| `i18n-en-key-completeness.test.ts` | 同上针对 en.json | 1 |
| `i18n-en-zh-parity.test.ts` | en.json 与 zh-CN.json key 集合完全一致（无遗漏翻译） | 1 |

**总计 9 个测试**。

#### 5.3.4 changelog / 版本

- `.changes/0-0-30-i18n-phase-b-resources.md`（或 `0-1-0-i18n-enable.md`）
- bump `package.json` → `0.0.30`（保守）或 `0.1.0`（语义化跳跃）

**验证**：

```bash
bun run typecheck           # 期望：0 错误
bun run lint                # 期望：0 错误
bun test                    # 期望：414 + 9 = 423 个测试全绿
./dist/oxn init --locale en # 期望：人类可读输出 + skill 描述均为英文
```

**风险**：🟡 中。en 翻译质量依赖维护者英文能力；测试 key 完整性需保证零遗漏。

**预估 LOC**：~280（80 en.json + 100 测试 + 100 loader.ts 改动 + changelog）。

---

### 5.4 PR-4：Skills 翻译 + 死资产清理（独立 PR，可推迟到 v0.1.0）

**目标**：让 Skills 资源与 `src/i18n/` 对齐支持 en；清理 `oxn-resume` 死资产；建立 Skills 翻译守卫测试。

**为什么独立 PR**：

| 理由 | 详情 |
|---|---|
| 翻译量级不同 | en.json 短文案 ~80 行；Skills en 翻译 ~1000 行 prompt |
| 验收方式不同 | CLI 文案：单元测试断言字符串；Skills prompt：需端到端 LLM 行为验证 |
| 风险等级不同 | 短文案错译：UX 问题；长 prompt 错译：LLM 行为漂移，可能误导用户 |
| 可独立发版 | PR-3 落地后，en CLI 文案已可用；Skills 仍 fallback zh-CN 是已知降级，可推迟 |

#### 5.4.1 死资产清理（必做，PR-4 范围最小切片）

| 项 | 改动 |
|---|---|
| `src/skills/locales/zh-CN/oxn-resume/instruction.md` | **删除**（80 行死资产，loader.ts:3-6 未 import） |
| `src/skills/loader.ts:7` 注释 | 删 `v0.1: 英文版 Skill 已废弃（zh-CN 为唯一权威）`（改成中性描述） |
| `src/skills/loader.ts` 末尾加 | TODO 注释：v0.1.0 推 en skill 翻译 |

**这一节可独立发 PR-4-mini（约 5 LOC）**。

#### 5.4.2 en skill 翻译（推迟到 v0.1.0 评审）

**前置条件**：

1. PR-3 落地 + en CLI 跑通
2. LLM 行为基准测试就位（端到端：init --locale en → 跑一个 AI 任务，对比与 zh-CN 的输出 diff）
3. 维护者英文能力评审或外聘翻译
4. 4 个 skill 的 en 版本由谁 review 的责任明确

**翻译工作分解**：

| Skill | zh-CN 行数 | en 预估行数 | 复杂度 | 依赖 |
|---|---|---|---|---|
| `oxn-cli` | ~430 | ~700 | 🟠 高（CLI 完整操作手册） | OXN DSL v3.1+ 命令清单 |
| `oxn-work` | ~280 | ~450 | 🟠 高（v1.1 8 阶段流程） | work v1.1 spec |
| `oxn-work/references/blueprint-format.md` | ~180 | ~280 | 🟡 中（参考文档） | OXL grammar |
| `oxn-proof` | ~110 | ~170 | 🟢 低（5 命令闭环） | proof v0.1.2 spec |

**en 资源物理结构**：

```
src/skills/locales/
├── zh-CN/
│   ├── oxn-cli/instruction.md            ← 现状保留
│   ├── oxn-cli/references/...            (若有)
│   ├── oxn-work/instruction.md
│   ├── oxn-work/references/blueprint-format.md
│   └── oxn-proof/instruction.md
└── en/                                    ← v0.1.0 新建
    ├── oxn-cli/instruction.md             ← 翻译自 zh-CN
    ├── oxn-work/instruction.md
    ├── oxn-work/references/blueprint-format.md
    └── oxn-proof/instruction.md
```

#### 5.4.3 loader.ts 适配（PR-4 翻译落地时同步）

**当前 loader.ts en 处理**（§3.2.1 已列）。**改造方案**：

```typescript
// 当前（loader.ts:34-49, 61-68）
const skillMeta: Record<SupportedLocale, SkillMeta[]> = {
  'zh-CN': [...],
  en: [
    { id: 'oxn-cli', description: 'Unified OpenXenon CLI entry point...' },  // 英文描述
    ...
  ],
}

const skillContents: Record<string, Record<string, SkillContent>> = {
  'zh-CN': { 'oxn-cli': { instruction: zhCnOxnCli, ... }, ... },
  en: {                                                            // ⚠️ 当前 en 用 zh-CN 资源
    'oxn-cli': { instruction: zhCnOxnCli, ... },
    ...
  },
}
```

**改造后**（PR-4 落地形态）：

```typescript
import enOxnCli from './locales/en/oxn-cli/instruction.md' with { type: 'text' }
import enOxnWork from './locales/en/oxn-work/instruction.md' with { type: 'text' }
import enWorkBlueprintRef from './locales/en/oxn-work/references/blueprint-format.md' with { type: 'text' }
import enOxnProof from './locales/en/oxn-proof/instruction.md' with { type: 'text' }

const skillContents = {
  'zh-CN': { 'oxn-cli': { instruction: zhCnOxnCli, ... }, ... },
  en: {
    'oxn-cli': { instruction: enOxnCli, references: [] },
    'oxn-work': { instruction: enOxnWork, references: [{ filename: 'blueprint-format.md', content: enWorkBlueprintRef }] },
    'oxn-proof': { instruction: enOxnProof, references: [] },
  },
}
```

**关键改动**：en 不再回退 zh-CN；en 资源缺失时 `getSkillContent` 行为由 fallback 改为显式 throw（让"未翻译"成为显式错误而非静默降级）。

#### 5.4.4 Skills 翻译守卫测试（PR-4 必做）

**测试位置**：`src/skills/__tests__/skill-i18n.test.ts`（与 `src/skills/locales/zh-CN/oxn-proof/__tests__/no-leak.test.ts` 同层）

| 用例 | 数量 | 行为 |
|---|---|---|
| `loader.ts` 的 import 集合与 `locales/<locale>/<skill>/` 目录 1:1 对齐 | 1 | 防止"文件存在但未 import"（当前 oxn-resume 正是反例） |
| `skillMeta[locale]` 注册的 skill id 与 `locales/<locale>` 目录存在的 skill id 完全一致 | 1 | 防止"目录存在但未注册" |
| en locale 资源缺失时 `getSkillContent` 抛错（非静默 fallback） | 1 | 行为契约守卫 |
| `SupportedLocale` 与 `locales/` 子目录名集合一致 | 1 | 防止"`'en'` 声明但无 en 目录" |
| zh-CN 与 en 文件数 / 行数差异 < 50% | 1 | 防"en 是空文件"作弊 |
| `description` 字段与 `instruction` 第一段语言一致 | 1 | 防"en description + zh instruction"半中半英 |
| `oxn-resume` 不在 `loader.ts` import 集合中（删除守卫） | 1 | 防死资产复活 |

**总计 7 个测试**。

#### 5.4.5 风险与依赖

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| en 翻译质量差，LLM 行为漂移 | 🟠 高 | 🔴 高 | 端到端基准：固定 5 个 AI 任务（init / domain create / work create / proof create / work run），对比 zh-CN 与 en 输出 diff；漂移 > 阈值则不上线 |
| en 翻译滞后于 zh-CN（drift） | 🟡 中 | 🟡 中 | 翻译守卫测试：文件 mtime 对比 + CI 阻断 |
| 维护者英文能力不足 | 🟠 高 | 🟡 中 | 接受 v0.1.0 机器翻译基线；v0.2.0 走专业翻译；明确 reviewer 责任 |
| `oxn-resume` 删除影响外部用户（如果有） | 🟢 低 | 🟡 中 | `rg "oxn-resume"` 全仓扫一遍（v0.0.27 前）；当前 0 命中 → 安全删 |
| Skills 测试加在 `locales/<locale>/<skill>/__tests__/` 还是 `src/skills/__tests__/` | — | — | **推荐后者**（与 `src/skills/loader.ts` 同源；与 `zh-CN/oxn-proof/__tests__/no-leak.test.ts` 不同主题，那个是 prompt 内容测试，本测是 i18n 守卫） |

#### 5.4.6 changelog / 版本

- **PR-4-mini（仅死资产清理）**：可作为 0.0.28.x patch 版本，或并入 0.0.29
- **PR-4 完整（含 en 翻译）**：bump → **0.1.0**（语义化跳跃，标记 i18n 双轴完整支持）
- changelog 文件：`.changes/0-1-0-skills-i18n-enable.md`

**验证**：

```bash
bun run typecheck           # 期望：0 错误
bun run lint                # 期望：0 错误
bun test                    # 期望：414 + 9 (PR-3) + 7 (PR-4) = 430 个测试全绿
./dist/oxn init --locale en # 期望：CLI 英文 + skills instruction 英文
# 端到端 LLM 行为验证（人工）：
#   1. 选 5 个标准任务
#   2. 同一任务跑两遍：locale=zh-CN vs locale=en
#   3. diff AI 输出 + 最终 oxn 命令；漂移 < 阈值
```

**预估 LOC**：

- PR-4-mini：~10（删 1 文件 + 改 5 行 loader.ts 注释）
- PR-4 完整：~800（700 en skill 翻译 + 100 测试 + 30 loader.ts 改造 + changelog）

---

## 6. 实施 checklist（合 4 PR）

### PR-1（版本同步）

- [ ] `docs/zh-cn/changelog/CHANGELOG.md` 从 `.changes/` 聚合
- [ ] `docs/en/changelog/CHANGELOG.md` 英文版同步
- [ ] `src/cli/index.ts:147` 改动态读 `package.json`
- [ ] `.changes/0-0-27-*.md` / `0-0-28-*.md` 追加 i18n 漂移 Note
- [ ] `bun run version:check` 通过
- [ ] `bun run typecheck` 通过
- [ ] `bun test` 通过（414 全绿）
- [ ] `./dist/oxn --version` 输出 `0.0.27`

### PR-2（消费面迁移）

- [ ] `src/i18n/zh-CN.json` 新增 16 个 key（`errors.*` / `daemon.*` / `cache.*` / `gc.*` / `migrate.*` / `config.*` / `explore.*`）
- [ ] `src/cli/work.ts` 7 处 `OXN_NO_PROJECT` → `t('errors.projectNotInit')`
- [ ] `src/cli/blueprint.ts:458` 同上
- [ ] `src/cli/domain.ts:473` 同上
- [ ] `src/cli/socket-client.ts:30-45` 5 处 → `t('daemon.*')`
- [ ] `src/cli/daemon-status.ts:20,22` 2 处 → `t('daemon.*')`
- [ ] `src/cli/init.ts` 真接 `setLocale`（让 `--locale` 真的切 i18next language）
- [ ] `src/cli/init.ts` `tools 配置已重置/已更新` → `t('init.*')`
- [ ] `src/cli/config.ts:44` 整段模板 → `t('config.showTitle')` + 模板插值
- [ ] `src/cli/explore-cmd.ts:353,368,479,489` 4 处 → `t('explore.*')`
- [ ] `src/cli/cache-stats.ts:29` → `t('cache.notFound')`
- [ ] `src/cli/cache-clear.ts:34` → `t('cache.empty')`
- [ ] `src/cli/gc.ts:43,82` → `t('gc.noTasks')`
- [ ] `src/cli/cache.ts:16` → `t('cache.usage')`
- [ ] `src/cli/oxn-migrate-cmd.ts:47` → `t('migrate.invalidArgs')`
- [ ] 删除 `getCurrentLocale` 死代码（PR-1 若未删，PR-2 删）
- [ ] `.changes/0-0-29-i18n-phase-b-consume.md` changelog
- [ ] bump `package.json` → `0.0.29`
- [ ] `bun run version:check` 通过
- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过
- [ ] `bun test` 通过（414 全绿，零改动）
- [ ] `rg "[\u4e00-\u9fff]" src/cli/*.ts | rg "message:|human:"` 仅剩 i18n.ts 内引号注释

### PR-3（资源 + 测试）

- [ ] `src/i18n/en.json` 镜像 zh-CN.json 1:1
- [ ] `src/skills/loader.ts:34-49` en 描述保留英文（不 fallback）
- [ ] `src/skills/loader.ts:62,65,67` 注释更新（删"已废弃"，加"v0.0.30 en 资源就绪"）
- [ ] `src/i18n/__tests__/i18n-basic.test.ts` 6 个用例
- [ ] `src/i18n/__tests__/i18n-zh-CN-key-completeness.test.ts` 1 个用例
- [ ] `src/i18n/__tests__/i18n-en-key-completeness.test.ts` 1 个用例
- [ ] `src/i18n/__tests__/i18n-en-zh-parity.test.ts` 1 个用例
- [ ] `.changes/0-0-30-i18n-phase-b-resources.md`（或 `0-1-0-i18n-enable.md`）changelog
- [ ] bump `package.json` → `0.0.30` 或 `0.1.0`
- [ ] `bun run version:check` 通过
- [ ] `bun run typecheck` 通过
- [ ] `bun run lint` 通过
- [ ] `bun test` 通过（414 + 9 = 423 全绿）
- [ ] `./dist/oxn init --locale en` 输出英文

### PR-4-mini（Skills 死资产清理，可并入 0.0.28.x patch）

- [ ] `rg "oxn-resume" src/` 全仓扫一遍，确认 0 命中（删除前守卫）
- [ ] 删除 `src/skills/locales/zh-CN/oxn-resume/instruction.md`（80 行）
- [ ] 删除 `src/skills/locales/zh-CN/oxn-resume/__tests__/`（若有，连同 no-leak.test.ts 测试文件）
- [ ] `src/skills/loader.ts:7` 注释更新（删"v0.1 英文版 Skill 已废弃"，改为中性）
- [ ] `src/skills/loader.ts` 末尾加 TODO 注释（v0.1.0 推 en skill 翻译）
- [ ] `bun test` 通过（删文件后 414 全绿）
- [ ] `.changes/0-0-28-skills-dead-asset-cleanup.md`（或合并到下个 patch changelog）

### PR-4（Skills en 翻译，v0.1.0 跳跃）

- [ ] `src/skills/locales/en/oxn-cli/instruction.md` 翻译自 zh-CN（~700 行）
- [ ] `src/skills/locales/en/oxn-work/instruction.md`（~450 行）
- [ ] `src/skills/locales/en/oxn-work/references/blueprint-format.md`（~280 行）
- [ ] `src/skills/locales/en/oxn-proof/instruction.md`（~170 行）
- [ ] `src/skills/loader.ts` 改造：`import en ... with { type: 'text' }` × 4
- [ ] `src/skills/loader.ts:71-72` `getSkillContent` en 缺失时 throw（非静默 fallback）
- [ ] `src/skills/__tests__/skill-i18n.test.ts` 7 个守卫测试
- [ ] 端到端 LLM 行为验证：5 个标准任务 zh-CN vs en 输出 diff < 阈值
- [ ] `.changes/0-1-0-skills-i18n-enable.md` changelog
- [ ] bump `package.json` → `0.1.0`
- [ ] `bun run version:check` / `typecheck` / `lint` / `test` 全部通过
- [ ] `bun test` 414 + 9 (PR-3) + 7 (PR-4) = 430 全绿
- [ ] `./dist/oxn init --locale en` 输出 CLI 英文 + skills instruction 英文

---

## 7. 验收标准（每 PR 独立）

| PR | 验收命令 | 期望输出 |
|---|---|---|
| PR-1 | `bun run version:check` | `✅ All version references are consistent.` |
| PR-1 | `./dist/oxn --version` | `0.0.27` |
| PR-2 | `rg "[\u4e00-\u9fff]" src/cli/*.ts` | 仅命中 `import` 路径字符串 / 注释 |
| PR-2 | `bun test` | 414 个测试全绿，0 失败 |
| PR-3 | `bun test src/i18n/__tests__/` | 9 个新测试全绿 |
| PR-3 | `./dist/oxn init --locale en` | 人类可读输出 + skill 描述均为英文 |
| PR-4-mini | `rg "oxn-resume" src/` | 0 命中 |
| PR-4-mini | `ls src/skills/locales/zh-CN/oxn-resume/` | 目录不存在 |
| PR-4 | `bun test src/skills/__tests__/skill-i18n.test.ts` | 7 个新测试全绿 |
| PR-4 | `./dist/oxn init --locale en` 后 `cat .opencode/skills/oxn-cli/SKILL.md` | 英文 instruction |
| PR-4 | 端到端 LLM 行为 diff（5 任务 × 2 locale） | 漂移 < 阈值 |

---

## 8. 风险与缓解

| 风险 | 概率 | 影响 | 缓解 |
|---|---|---|---|
| en 翻译质量差 | 🟡 中 | 🟡 中 | 接受 v0.0.30 的"机器翻译基线"；v0.1.0+ 走专业翻译；en 资源 key 完整性与 zh-CN 对齐是硬保证 |
| 迁移消费面时漏改导致回归 | 🟢 低 | 🔴 高 | 全量 `rg` 扫硬编码中文 → 0 命中作为 PR-2 收尾硬条件 |
| `i18next.changeLanguage` 异步与同步输出冲突 | 🟢 低 | 🟡 中 | 保持 `initAsync: false`（`src/i18n/index.ts:15`），`changeLanguage` 同步生效 |
| 删 `getCurrentLocale` 后有调用方 | 🟢 低 | 🟡 中 | PR-1 前 `rg "getCurrentLocale"` 全仓扫一遍；当前 0 命中 |
| `docs/zh-cn/changelog/CHANGELOG.md` 与 `.changes/` 双源不一致 | 🟡 中 | 🟡 中 | 写一个 `bun scripts/sync-changelog.ts` 自动聚合（PR-1 范围外，可后置） |
| `src/cli/index.ts:147` 改动态读 `package.json` 在 Bun 编译产物中失败 | 🟢 低 | 🔴 高 | 用 `import pkg from '../../package.json' with { type: 'json' }`（Bun 编译时静态资源）；编译后 `bun build --compile` 把 package.json 嵌进 binary |

---

## 9. 待评审项

1. **en 资源策略**：3-A（保留 en fallback）vs 3-B（彻底删 en 声明）vs 3-C（推迟 v0.1.0+）？
2. **版本号策略**：0.0.29 / 0.0.30（保守，pre-1.0）vs 0.1.0（语义化跳跃，标记 i18n 完整支持）？
3. **PR-2 范围**：是否合并 `init` 接 `setLocale` 真切换？若否，`--locale` 仍是"只写不读"状态，PR-3 再说。
4. **changelog 双源问题**：是否在 PR-1 同步新增 `bun scripts/sync-changelog.ts` 自动聚合脚本（防 `.changes/` 与 `docs/.../CHANGELOG.md` 漂移）？
5. **i18n 测试位置**：放 `src/i18n/__tests__/`（与现有 `src/*/__tests__/` 一致）vs 放 `tests/integration/i18n/`（与现有 `tests/integration/` 一致）？**倾向后者**（i18n 跨 cli/config/daemon 多个 L3 文件，属集成测试）。
6. **en 翻译维护责任**：v0.0.30 是否接受机器翻译基线？谁负责后续人工润色？
7. **PR-4 拆分策略**：是否拆 `PR-4-mini`（仅死资产清理，可并入 0.0.28.x patch）+ `PR-4 完整`（v0.1.0 en 翻译）两个 PR？还是合并为一个 0.1.0 大版本？
8. **Skills 翻译评估时机**：是否在 PR-3 落地后立即启动 PR-4？还是等 v0.1.0 整体规划时再启动？（**倾向后者**——i18n CLI 与 Skills 是两套独立资产，可独立发版）
9. **`oxn-resume` 历史归档**：v0.0.26 引入后从未被消费，是否归档到 `.archive/` 而非直接删？（**倾向直接删**——仓库 0 引用 + loader.ts 未 import）
10. **Skills en 翻译工作流**：翻译→review→merge 流程是否与 `src/i18n/en.json` 同步？谁是 reviewer？需要 CONTRIBUTING.md 加一段吗？

---

## 10. 决策记录（ADR）

### ADR-1：i18n 不应下沉到 L0/L1/L2

**决策**：i18n 仅在 L3-Runtime 实现，不下沉到 L0-Kernel / L1-Infra / L2。

**理由**：
- L0 是"兰姆达真空"（[AGENTS.md](../../AGENTS.md) L0-Processor 限制），禁止 I/O、event、env；i18n 资源加载属 I/O
- L1-Infra 是 IO 执行器层，只关心"系统怎么跑"，不关心"给人看什么语言"
- L2 是 Builtin / Work 资产层，模板字符串由 L3 注入
- L3-Runtime 才是"用户交互边界"，locale 切换属于 L3 职责

**反面考虑**：若 L0 想输出 verdict 含本地化消息，需由 L3 在调用 L0 后包 i18n 包装层（现状：L0 verdict 返回 `IAPError` 模板 key，L3 消费时 `t(key)`）。

### ADR-2：i18n key 命名空间 = 子命令名（暂）

**决策**：`t('init.xxx')` `t('config.xxx')` 命名按子命令分。

**理由**：
- 现有 `zh-CN.json` 已按子命令分（`init` / `config` / `configDebug`）
- L3 子命令是 LLM 消费的稳定契约
- 未来若跨子命令复用（如 `errors.*`），按需提升命名空间

**反面考虑**：`init.*` 含项目级文案（`projectExists` / `modeUpdated`），与 `init` 子命令耦合弱；可考虑未来拆 `project.*` 命名空间。

### ADR-3：未采用 react-i18next / next-intl

**决策**：用纯 `i18next`（无 React / Next 绑定）。

**理由**：
- OXN CLI 是 Node/Bun runtime，无 DOM
- 编译产物 `dist/oxn` 是单文件 Bun executable，依赖越少越好
- `i18next` 26.x 已支持 sync init（`initAsync: false`），CLI 场景不需要异步

### ADR-4（待 PR-2 落地后回填）：`--locale` 真切换 i18next

**决策**：`init --locale en` 落地后，`ProjectConfig.locale` 字段 + `i18next.changeLanguage(locale)` 双重生效。

**理由**：
- ProjectConfig.locale 是持久化状态（下次 `oxn <cmd>` 启动时读）
- i18next.changeLanguage 是进程内状态（本次 CLI 调用的输出语言）

**当前缺陷**：v0.0.27 之前，ProjectConfig.locale 只持久化，不切换 i18next → 进程内仍输出 zh-CN（fallback）。PR-2 修。

### ADR-5：Skills 与 CLI i18n 是两套独立资产

**决策**：`src/skills/locales/` 与 `src/i18n/` **解耦**，各自走自己的翻译 / 测试 / 发版路径。Skills 不下沉到 i18next 资源系统。

**理由**：
- 翻译单元形态不同：CLI 文案 = 短 key-value；Skills = 长 prompt md
- 引擎不同：CLI = i18next；Skills = Bun `import .md with text`
- 切换粒度不同：CLI = 进程内 i18next.changeLanguage；Skills = loader.ts 按 locale 选 .md 文件
- 验收方式不同：CLI = 单元测试断言；Skills = 端到端 LLM 行为 diff
- 风险等级不同：CLI 错译 = UX；Skills 错译 = LLM 行为漂移

**反面考虑**：
- 若统一到 i18next，Skills instruction 需拆成 key-value 短句，破坏 prompt 的连贯性（LLM 对长 prompt 上下文敏感）
- 若统一到 .md 资源，CLI 短文案要变成 .md 文件，路径管理复杂

**翻译计划分离的好处**：
- PR-1/2/3 闭合 CLI i18n 不依赖 Skills 翻译
- PR-4 可独立推迟到 v0.1.0 而不阻塞 CLI 国际化
- 翻译工作量评估可分轴进行（CLI ~80 行 vs Skills ~1000 行）

### ADR-6：en 缺失时 Skills 应 throw 而非 fallback

**决策**（PR-4 落地时执行）：`getSkillContent(skillId, 'en')` 在 en 资源缺失时**抛 `OXN_SKILL_NOT_TRANSLATED` 错误**，而非静默回退 zh-CN。

**理由**：
- 静默 fallback 会让 LLM 看到 `description: "Unified OpenXenon..."`（en）+ `instruction: "oxn 是一个..."`（zh）矛盾元数据
- 显式 throw 让"未翻译"成为可观测错误，CI 端到端测试可捕获
- 翻译守卫测试（PR-4 §5.4.4）依赖此契约

**当前缺陷**：loader.ts:71-72 静默 fallback，en 缺失时无任何信号。

### ADR-7：`oxn-resume` 删除决策

**决策**（PR-4-mini 执行）：删除 `src/skills/locales/zh-CN/oxn-resume/instruction.md`，`loader.ts:3-6` 不引入该 import。

**理由**：
- v0.0.26 引入后，loader.ts:3-6 未 import，全仓 `rg "oxn-resume"` 0 命中
- 0 消费方 = 死资产
- 不在 `AGENTS.md` / `docs/` / `forges/` 任何位置被引用

**归档备选**：`.archive/skills-locales-zh-CN-oxn-resume/`（若担心外部用户引用，但仓库内 0 引用 → 不必要）。

---

## 11. 关联资料

- **变更日志**：`.changes/0-0-26-i18n-kernel-adapter.md`（Phase A 引入）
- **宪法**：`docs/architecture/l0-l3-constitution.md` §2.1 L3 边界 / §7.2.2 C-5 L3 映射
- **同期审计**：`forges/2026-06-11-v0.0.27-product-audit.md`
- **同期设计**：`forges/2026-06-11-grammar-deps-fix-design.md`（PR 拆分范式参考）
- **Skills 设计**：`docs/design/install-skill-v1.md`（v0.1 范围，**未纳入 en 翻译**）
- **i18next 文档**：https://www.i18next.com/（v26.x sync init 模式）
- **CI 脚本**：`scripts/version-check.ts:7-8`（CHANGELOG 路径硬编码）
- **Skills locale 实测**：
  - `src/skills/locales/zh-CN/oxn-{cli,work,proof,resume}/instruction.md`（4 skill × zh-CN）
  - `src/skills/locales/zh-CN/oxn-work/references/blueprint-format.md`（5 .md 文件）
  - `src/skills/locales/zh-CN/oxn-proof/__tests__/no-leak.test.ts`（prompt 内容守卫测）
  - **`src/skills/locales/en/` 不存在**

---

> **本审计稿不发起任何 PR。** 评审通过后，按 §5 顺序执行 PR-1 → PR-2 → PR-3。
