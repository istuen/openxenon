---
entity: domain
version: 0.3.0
name: I18nContext
oxn-source-sha: 5a92734901cb162e48a6a812966ffc0c4237a76bc838916045b1280d87449bad
synced-at: 2026-07-08T13:52:19.202Z
---

<!-- v0.7 MIGRATION BANNER · 2026-07-16
     This Domain has been migrated to [`oxn-cli-domain`](./oxn-cli-domain.md)
     as part of v0.7 domain hierarchy restructure (RFC W2).
     terms 已迁移（Locale / ZhCN / En / I18nKey / TFunction / ResolveLocale /
     DefaultLocale / LocaleBundle / TranslationArgs / ConfigLocale / LocaleFallback /
     I18nNamespace / SkillLocale / DocLocale / LocaleAudit）。
     文件保留供历史审计，不接受新 term 添加。W8 收尾时删除。
-->

# Domain: I18nContext

> i18n 国际化限界上下文: zh-CN/en 双语 + locale 协议 + t() 翻译函数 + resolveLocale 解析;config.locale (ProjectConfig) 是唯一权威 locale 源;CLI 默认 human 模式按 locale 选文案

## Terms

### Locale
- desc: 语言区域标识;SupportedLocale = 'zh-CN' | 'en';CLI 顶层 + Skill + 文档站点共用

### ZhCN
- desc: 简体中文: 唯一权威 locale,所有 SSOT 文案首发;en locale 内容与 zh-CN 保持一致 (不允许独立维护)

### En
- desc: 英文 locale: v0.6 起已废弃,沿用 zh-CN 内容 (不允许独立维护);保留 enum 仅为兼容旧 config.locale='en' 用户

### I18nKey
- desc: 翻译 key 字符串: 'domain.list.description' / 'format.json' / 'error.asset.create.failed';点号分隔命名空间

### TFunction
- desc: t(key, args?): 主翻译函数;从 t('domain.list.description', {count: 5}) 解析当前 locale 字符串;缺 key 抛 I18N_KEY_MISSING (YIELD_TO_HUMAN)

### ResolveLocale
- desc: resolveLocale(config, env?): 解析当前生效 locale;优先级: --locale flag > config.locale > LANG env > DEFAULT ('zh-CN')

### DefaultLocale
- desc: DEFAULT_LOCALE = 'zh-CN';CLI 启动 + Skill 加载 + 文档站点全用此值兜底

### LocaleBundle
- desc: locale 字典: { [key: string]: string } 平面结构;不存在嵌套;按 dot key 索引

### TranslationArgs
- desc: t(key, args) 第二参数: {name?: string; count?: number; ...};占位符 {{name}} 双花括号替换

### ConfigLocale
- desc: ProjectConfig.locale 字段;gitignored (个人运行时);CLI 加载期 readProjectConfig 解析

### LocaleFallback
- desc: t() 缺 key 时的兜底: 静默返回 key 字符串 (CLI human 模式) 或抛 I18N_KEY_MISSING (--strict 模式)

### I18nNamespace
- desc: I18nKey 第一段前缀: 'domain.' / 'blueprint.' / 'work.' / 'format.' / 'error.' / 'cli.';按 CLI 子命令分组

### SkillLocale
- desc: Skill 的语言变体: packages/cli/src/skills/locales/{zh-CN,en}/<skill-id>/SKILL.md;zh-CN 是唯一权威

### DocLocale
- desc: VitePress 文档站点的 i18n: docs/zh-cn/*.md (首发) + docs/en/*.md (镜像);zh-cn 是 SSOT

### LocaleAudit
- desc: 审计工具: 扫 CLI t() 调用 + 字典缺失 key + 多余 key;CI 守门,缺失/多余都报

## Bans

### forbidden-constructs
- items:
  - hardcodedString
  - englishFallback
  - i18n.bypass
  - t.bypass
  - stringLiteralAsI18n
  - locale.en-only
  - locale.legacy-iso-code
- desc: hardcodedString, englishFallback, i18n.bypass, t.bypass, stringLiteralAsI18n, locale.en-only, locale.legacy-iso-code

## Invariants

### inv-1
- value: DEFAULT_LOCALE = 'zh-CN' 是唯一权威兜底;CLI / Skill / 文档站点全用此值

### inv-2
- value: en locale 已废弃: config.locale='en' 仍能跑 (兼容),但文案与 zh-CN 一致;禁止独立维护 en 文案

### inv-3
- value: t(key) key 必须存在于 zh-CN locale 字典;缺失 → 抛 I18N_KEY_MISSING (YIELD_TO_HUMAN, 防止静默 fallback 掩盖 bug)

### inv-4
- value: t(key) 占位符 {{name}} 双花括号;不允许 %s / ${} / {} 等历史占位符

### inv-5
- value: resolveLocale 优先级: --locale flag > config.locale > LANG env > DEFAULT ('zh-CN');同优先级后者覆盖前者

### inv-6
- value: I18nKey 第一段命名空间: domain./blueprint./work./format./error./cli.;新增命名空间必须更新 I18nNamespace 字典

### inv-7
- value: config.locale (ProjectConfig) 是运行时唯一权威;不允许从 process.env.LANG 直接读 (绕过 config)

### inv-8
- value: t() 缺 key 行为: 默认 human 模式静默返回 key + 打印 stderr warn; --strict 模式抛 I18N_KEY_MISSING 阻断

### inv-9
- value: CLI human 模式输出必须走 t();不允许 process.stdout.write('') 内联英文/中文;违反 → biome lint 拒绝

### inv-10
- value: LocaleBundle 是平面结构 {key: string};嵌套对象违反 → locale-loader 拒绝加载

### inv-11
- value: Skill 内的 command description / 文案引用必须走 t() 或包内字面量;不允许 'inline english string'

### inv-12
- value: zh-CN locale 字典是 SSOT;en locale 通过 autoMirror 镜像 (CLI init 时自动生成);不允许手写 en 字典

### inv-13
- value: LocaleAudit CI 守门: zh-CN key 数 - en key 数 = 0 (否则 fail);新增 zh-CN key 必须同步 en (即使 en 镜像)

### inv-14
- value: 硬编码字符串 (process.stdout.write('Hello')) 在 CLI 入口 (citty command) 描述中禁止;必须走 t()

### inv-15
- value: OXN 不引入 i18next / react-intl / lingui 等第三方 i18n 库;自实现 t() + locale bundle 足够 (locales/{zh-CN,en}.json)
