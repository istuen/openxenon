---
entity: domain
name: OxnCliDomain
abstract: OXN CLI 领域（Asset 结构 v2：Group → Axiom → Theorem）。
references:
  - oxn-domain
  - oxn-engine-domain
citations: 0
synced-at: 2026-08-08
---

# Domain: OxnCliDomain

> v1.0.0 (2026-08-08): 收编为 Asset 结构 v2 三层模型。## Terms: <子主题> → ## Concept，## Bans → ## Forbidden，## Invariants → ## Boundary；语义锁定。

## Concept

### OXN_CLI
- OpenXenon 交互入口之一。

### Command
- CLI 命令解析（Command/SubCommand/Arg）层。

### Distribution
- CLI 分发层（Dev Version / Release Version / Version Hygiene 三 Axiom）。

### DevVersion
- 通过 `npm link`（仓库 dist/cli.js）注册的 oxn 全局 bin；mutable（每次 rebuild 改变）；仅贡献者 + 内部 dogfood 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:dev` 操作。

### ReleaseVersion
- 通过 `npm install -g @istuen/openxenon@<version>` 从 registry 或本地 tarball 安装的 oxn；指向预编译 `dist/cli.js`；immutable；终端用户 + CI/CD 使用。配合 `scripts/oxn-switch.sh` 的 `pnpm oxn:prod` 操作。

### VersionHygiene
- 🆕 v0.7.0 RFC-0027 PR-F（D3）：canonical 归 `oxn-project-domain.md §VersionHygiene`；CLI 域仅保留指向。
- CLI 域视角：dev 版本号严格大于 release（OXN CLI 不注入 build metadata；`oxn --version` 在 dev vs release 输出不同字符串）；判据 + 流程保障详见 project-domain。
- related: ADR-0083、`scripts/oxn-switch.sh`、`release-cut.md`。

### Skill
- OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。

### Locale
- CLI i18n 区域设置层（zh-CN 兜底 / resolveLocale 优先级）。

### OXnConfig
- OXN 配置文件层（OXnConfig / ProjectConfig 两层划分）。

## Forbidden

### ForbiddenConstructs
- Flag
- Option
- Switch
- ParserImpl
- LexerImpl
- GrammarFile
- var
- document.
- window.
- hardcodedString
- englishFallback
- i18n.bypass
- t.bypass
- locale.en-only
- locale.legacy-iso-code
- configFile
- rcFile
- dotFile
- settingsFile
- 🆕 v0.7.0 RFC-0027 PR-F（D5）：HARD_FAIL / SOFT_FAIL / VerdictAsException / FailureAsCrash / OXN_INTERNAL_ERROR_AS_IAP / StackTraceToAI / HARD_HALT_AS_IAP 7 项 canonical 归 `oxn-engine-domain.md §ForbiddenErrorContractFamily`（错误契约 SSOT），本域删。

- desc: CLI 参数层禁用 Flag/Option/Switch（用 Arg 一词）；i18n 禁用硬编码英文/绕过 t()；config 禁用 rcFile/dotFile/settingsFile（统一 OXnConfig/ProjectConfig）；错误处理禁用对人类 + AI 不同源的轨道混淆（详见 engine-domain §ForbiddenErrorContractFamily）。v0.7.0 起：Langium / GrammarFile / registerOxnValidators 全部退役（见 ADR-0052），DSL 唯一权威由 Engine 包集中提供，本域不重定义其概念。

## Boundary

### Inv1CliDecomposition
- OXN CLI = 命令解析（Command/SubCommand/Arg）+ 错误消费（TopCatch 4 档分流 / ExitCode）+ I18n + Skill 分发 + Config 加载；任何 CLI 行为必须可拆解到这些子模块。

### Inv2ExitCodes
- 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack。

### Inv3TopCatchShunt
- TopCatch 4 档分流：IAPError / OXNCrash / CliInputError / Crash 兜底；Crash 兜底绝不暴露给 AI（属于 OXNCrash 语义）。

### Inv4IAPErrorActionYield
- IAPError 的 action 字段 v1.0.2 后仅 YIELD_TO_HUMAN 一种（AI 不能自己改，必须叫人）。

### Inv5JsonForAi
- AI 调用必须传 --json；CLI 默认 human 模式走 t() 翻译；human 模式禁止硬编码英文/中文（biome lint 拒绝）。

### Inv6DefaultLocale
- DEFAULT_LOCALE = 'zh-CN' 是唯一权威兜底；CLI / Skill / 文档站点全用此值；en locale 已废弃（不允许独立维护）。

### Inv7LocaleResolvePriority
- resolveLocale 优先级：--locale flag > config.locale > LANG env > DEFAULT ('zh-CN')。

### Inv8SkillSsotFromCli
- Skill SSOT 唯一来源由 CLI 包提供；不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）。

### Inv9InitCompilesThreeAdapters
- oxn init 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot（opencode/claude/agents）；compileAllSkills(toolIds, ...) 是入口。

### Inv10AdaptersRootNoOverlap
- AdaptersRoot 互不重叠：opencode→.opencode/skills/；claude→.claude/skills/；agents→.agents/skills/。

### Inv11ConfigTwoLayer
- OxnConfig（.oxnrc，git tracked）只存 leaderMode；ProjectConfig（.openxenon/.config，git ignored）存 mode/locale/debug/tools 等。

### Inv12KebabCommand
- 命令名 kebab-case（与 Skill ID 命名一致）；OXN 不强制 PascalCase / kebab-case 风格，只强制声明 vs 文件规范化后一致（跨平台一致性保障）。

### Inv13OxnConfigPackage
- CLI 顶层统一走 `oxn-config` 包；不允许直接读 .oxnrc 字符串拼接。

### Inv14CliViaEngineBarrel
- CLI 必须通过 packages/engine barrel 消费 Engine 公共 API，严禁 import `@openxenon/engine/src/...` 穿透（从 oxn-engine-domain.inv-4 前半承接）。

### Inv15CliDaemonSocket
- cli↔daemon 仅走 unix socket + JSON payload；payload schema 唯一权威由 Engine 包提供；cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）。

### Inv16CliDomainUnidirectionalRef
- 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，重名 term（OXN CLI）不重定义；错误类型术语归 Engine 域，本域 references 含 oxn-engine-domain 用于消费侧 TopCatch / ExitCode 映射引用；不向下引用 oxn-asset-domain。