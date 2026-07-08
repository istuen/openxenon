---
entity: domain
version: 0.3.0
name: config-domain
oxn-source-sha: 6b2ac20c799c0e1c6ff78bb94fb187be84e8e08bc3805af8dd2334d304b18001
synced-at: 2026-07-08T13:52:19.209Z
---

# Domain: config-domain

> Config 轴统一词汇：OXN 项目级配置 + 多 AI 助手 Skill 分发配置；与 Intent/Align/Proof 三轴通过 IAP context_map 显式连接（不互相 include）

## Terms

### Skill
- desc: OXN 内置的可分发资产，SSOT 在 src/skills/locales/；一次编译分发到多 AI 助手根目录

### SkillAdapter
- desc: 目标 AI 助手适配器，描述如何把 Skill 写到该助手能识别的目录（含 opencode/claude/agents 三种）

### AdaptersRoot
- desc: SkillAdapter 写入的物理根目录（.opencode/skills/、.claude/skills/、.agents/skills/）；adapters 之间不重叠

### MultiToolCompilation
- desc: 一次 init 同时编译分发到多个 AdaptersRoot 的过程；compileAllSkills(toolIds, ...) 接口

### EnabledAdapter
- desc: config.tools.enabled 显式白名单；resolveTools 时优先于其他来源

### DisabledAdapter
- desc: config.tools.disabled 黑名单；在无 enabled 时生效

### DefaultAdapter
- desc: 未配置 tools 时 fallback 到 DEFAULT_ADAPTERS = [opencode, claude, agents]

### ConfigSchema
- desc: OXN 配置的强类型 schema，分两层：OxnConfig（.oxnrc）+ ProjectConfig（.openxenon/.config）

### LeaderMode
- desc: CLI 路由模式，reference（双轨默认）/ mvp（单轨实验），存于 .oxnrc（git tracked）

### ProjectConfig
- desc: 项目运行时配置，存于 .openxenon/.config（git ignored）；含 mode/locale/debug/tools 等

### ProjectBoundary
- desc: 项目物理边界目录 .openxenon/；存放所有运行时与意图资产

### ProjectMode
- desc: PRODUCTION 或 SANDBOX 模式；与 leaderMode 正交

### ConfigMigration
- desc: 配置路径的版本迁移（如 .openxenon/config.json → .openxenon/.config）；由 writeProjectConfig 触发原子 rename

### SSOT
- desc: Single Source of Truth：src/skills/locales/

### EmbeddedSkill
- desc: Bun --compile 时打入二进制的 SKILL.md；通过

### SkillLoader
- desc: src/skills/loader.ts：getAllSkillsForLocale() / getSkillContent() 入口

### SkillRenderer
- desc: src/cli/skill-compiler.ts：defaultRender() 把 (name + description + instruction) 拼成 SKILL.md frontmatter

### SkillAdapterId
- desc: SkillAdapter 的字面 id 类型，'opencode' | 'claude' | 'agents'（DEFAULT_ADAPTERS as const）

### ReferenceFile
- desc: Skill 的引用资源（如 references/blueprint-format.md），通过 .references.hash 缓存

### SkillContent
- desc: { instruction: string; references: ReferenceFile[] } 的运行时结构

## Bans

### forbidden-constructs
- items:
  - install-skill-flag
  - skillAdapterId
  - adaptersDir
  - Work
  - Task
  - Blueprint
  - Domain
  - configFile
  - rcFile
  - dotFile
  - settingsFile
  - preferencesFile
- desc: install-skill-flag, skillAdapterId, adaptersDir, Work, Task, Blueprint, Domain, configFile, rcFile, dotFile, settingsFile, preferencesFile

## Invariants

### inv-1
- value: oxn init 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot（opencode/claude/agents）

### inv-2
- value: oxn init --tools

### inv-3
- value: config.tools.{enabled,disabled} 解析优先级：CLI 白名单 > config.enabled > 黑名单 > DEFAULT_ADAPTERS

### inv-4
- value: AdaptersRoot 互不重叠：opencode→.opencode/skills/；claude→.claude/skills/；agents→.agents/skills/

### inv-5
- value: Claude Code 只识别 .claude/skills/（不读 .agents/skills/）；Cursor/Codex/Goose 共享 .agents/skills/

### inv-6
- value: OxnConfig（.oxnrc）只存 leaderMode；ProjectConfig（.openxenon/.config）存 mode/locale/debug/tools 等

### inv-7
- value: .oxnrc git tracked（团队共享 leaderMode 偏好）；.openxenon/.config git ignored（个人运行时）

### inv-8
- value: oxn config show 合并展示两套 schema 的当前值（leaderMode source + tools 行）

### inv-9
- value: writeProjectConfig 触发 ConfigMigration：旧 .openxenon/config.json 自动 rename 到 .openxenon/.config

### inv-10
- value: readProjectConfig 先试 .openxenon/.config，再 fallback .openxenon/config.json（双路径兜底，不写盘）

### inv-11
- value: SSOT 唯一来源是 src/skills/locales/

### inv-12
- value: SKILL.md frontmatter 仅含 name + description（与 agentskills.io 标准子集对齐；不引入 disable-model-invocation 等扩展字段）

### inv-13
- value: name 必须与目录名一致（^[a-z0-9]+(-[a-z0-9]+)*$），description ≤ 1024 字符

### inv-14
- value: EmbeddedSkill 通过

### inv-15
- value: defaultRender 输出字节级稳定；老项目重跑 init 时 hash 命中 skipped（保证零侵入升级）

### inv-16
- value: 本域管「OXN 自己用什么配置」；Intent 域管「OXN 做什么」（CLI/DSL/Program 三件套词汇）

### inv-17
- value: 本域管 Skill 分发；Align 域管 Skill 调用编排（work/task）

### inv-18
- value: 本域与 L0L3Context 正交：本域管业务配置 schema，L0L3 管代码分层架构
