---
title: CLI 术语
---
synced-at: 2026-07-22
source: oxn-cli-domain.md
---

# CLI 术语

> 适用：命令 / 参数 / i18n / Skill / 配置 / 错误处理。

## 命令

### OXN CLI
- OpenXenon 交互入口之一。完整定义见 [core-terms](./core-terms#oxn-cli)。

### Command
- CLI 顶级命令，采用 citty 库。

### SubCommand
- Command 下子命令（如 `work add-task`、`domain validate`）。

### Arg
- 命令参数（必填或可选）。

### OutputFormat
- 输出格式（human/json/yaml/html/md）。

### ExitCode
- OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。

## Skill 系统

### Skill
- OXN 内置给 AI 助手的技能，用于 AI 助手里通过 Skill 对 OpenXenon CLI 交互。当前唯一入口 `/oxn-work`。

### SkillAdapter
- 多 AI 助手适配器。

### AdaptersRoot
- SkillAdapter 对各自 AI 助手写入其配置目录以便识别（opencode / claude / agents 三套）。

## 国际化

### Locale
- 语言区域标识（仅支持 'zh-CN'）；DEFAULT_LOCALE = 'zh-CN' 兜底。

### I18nKey
- 翻译 key 字符串（点号分隔命名空间）；zh-CN locale 字典是 SSOT。

### TFunction
- `t(key, args?)` 主翻译函数；从 zh-CN locale 字典解析；缺 key 抛错。

### LocaleBundle
- locale 字典 `{ [key: string]: string }` 平面结构；按 dot key 索引。

## 项目配置

### OXnConfig
- OXN 项目级配置（.oxnrc，git tracked）；存 leaderMode（CLI 路由模式）。

### ProjectConfig
- 项目运行时配置（.openxenon/.config，git ignored）；含 mode / locale / debug / tools。

### ProjectBoundary
- 项目物理边界目录 `.openxenon/`；存放所有运行时与意图资产。

## 简明对照

| 退出码 | 语义 | 来源 |
|---|---|---|
| 0 | 成功 | — |
| 1 | IAPError / CliInputError | 业务阻断 |
| 2 | OXNCrash / 未知异常 | 引擎崩溃 |
