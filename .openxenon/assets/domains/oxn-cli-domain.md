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

> Asset 结构 v2 三层模型（## Group → ### Axiom → - Theorem）。

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
- CLI 域视角：dev 版本号严格大于 release（OXN CLI 不注入 build metadata；`oxn --version` 在 dev vs release 输出不同字符串）；判据 + 流程保障详见 project-domain。
- related: `scripts/oxn-switch.sh`、`release-cut.md`。
- **`oxn --version` 双输出**——dev 输出 `0.7.0-alpha.0`，release 输出 `0.6.4`；版本号字符串本身是 Dev/Release 在运行时的唯一区分器。
- **无 build metadata 注入**——`oxn --version` 不附带 git SHA / build timestamp；纯净字符串输出。
- **`oxn-switch.sh` 切版本**——`pnpm oxn:dev` 切到仓库 dist/cli.js；`pnpm oxn:prod` 切到 npm 全局 install；详见相关 workflow。

### Skill
- OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。
- Skill SSOT 唯一来源由 CLI 包提供；不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）。
- Skill instruction.md 物理位置 `packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md`；变更后 `bun run packages/cli/src/index.ts init -f` 自动重建 `.opencode/skills/`。
- Skill 三方协作语义：OXN Skill 是工程师 ↔ AI Agent ↔ OXN Engine 协作的"接口翻译层"——把人类意图翻译成 oxn CLI 调用，再把 CLI 输出翻译回 AI Agent 可读结构。
- **3 AdaptersRoot 编译**——`oxn init` 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot（opencode/claude/agents）；详见 Inv9InitCompilesThreeAdapters。
- **Skill 编译入口**——`compileAllSkills(toolIds, ...)` 是 init 编译入口；不允许 CLI 直接写 `.opencode/skills/`。

### Locale
- CLI i18n 区域设置层（zh-CN 兜底 / resolveLocale 优先级）。
- i18n 库选型：综合评估 paraglide-js（typesafe）+ typesafe-i18n（runtime typesafe）+ i18next（生态）后，OXN 选择最小可工作方案（具体库名落地确认）；判断标准：零运行时类型负担 + Bundle 友好 + 与 citty/Bun 兼容。
- 严格锁 3 类 prefix（report/issue/design）；其他 prefix 拒收（OXN_DRAFT_TYPE_INVALID）。
- locale 不可绕过 t()；硬编码英文/绕过 i18n.bypass / t.bypass 永久 ban。
- **4 档优先级**——`--locale flag` > `config.locale` > `LANG env` > `DEFAULT ('zh-CN')`；详见 Inv7LocaleResolvePriority。
- **zh-CN 唯一兜底**——DEFAULT_LOCALE = 'zh-CN' 是唯一权威；en locale 不允许独立维护（详见 Inv6DefaultLocale）。
- **t() 不可绕过**——所有 user-facing 字符串必须经 `t()` 翻译；hardcodedString / englishFallback 永久 ban。

### OXnConfig
- OXN 配置文件层（OXnConfig / ProjectConfig 两层划分）。
- 配置文件命名统一：OXnConfig（系统级 `~/.config/openxenon/`） / ProjectConfig（项目级 `.oxnrc` 或 `.openxenon/config.json`）；禁止 rcFile / dotFile / settingsFile 等历史命名。
- draftDir 字段可覆盖 `.openxenon/drafts/` 默认路径；与 AssetKind=assetmap 解析路径协同。
- **2 层配置**——OXnConfig（系统级，git ignored）+ ProjectConfig（项目级，git tracked）；详见 Inv11ConfigTwoLayer。
- **走 oxn-config 包**——CLI 顶层统一走 `oxn-config` 包；不允许直接读 .oxnrc 字符串拼接（详见 Inv13OxnConfigPackage）。

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