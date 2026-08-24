---
title: OXN CLI 开发者手册
---

# OXN CLI 开发者手册

> **术语权威源**：本文档基于 `oxn-cli-domain` CLI 术语（Layer 1 · `packages/cli/`）编译。所有 term 定义以该 Domain 为唯一 SSOT（见 [术语表](/openxenon/product/zh-cn/concepts/glossary.html)）。

## What —— 是什么

`packages/cli/` 是 OpenXenon 的薄组合调用层（L3），负责把用户 / AI Agent 的命令
请求路由到 `packages/engine/` 的纯逻辑层。所有 CLI 行为可拆解为：

- **命令解析层**（Command / SubCommand / Arg / OutputFormat）
- **错误契约层**（IAPError / OXNCrash / ExitCode / TopCatch / Channel）
- **I18n 层**（Locale / I18nKey / TFunction / ResolveLocale / LocaleBundle）
- **Skill 分发层**（Skill / SkillAdapter / AdaptersRoot / MultiToolCompilation）
- **OXL 解析层**（Grammar / Schema / Validator / Compiler / IR / Entity）
- **Config 层**（OXnConfig / ProjectConfig / ConfigSchema / LeaderMode）

## Why —— 设计原则

1. **薄组合层**：CLI 不持业务逻辑，只做路由 + 输出格式化
2. **错误二轨制**：IAPError → stdout JSON（AI 消费）；OXNCrash → stderr stack（人类消费）
3. **i18n 强制走 t()**：禁止硬编码字符串；CLI 默认 human 模式按 locale 选文案
4. **Skill SSOT**：`packages/cli/src/skills/locales/` 是唯一来源；编译分发到多 AI 助手根目录
5. **Config 双层**：`.oxnrc`（git tracked，团队共享） + `.openxenon/.config`（git ignored，个人运行时）

## How —— 模块结构

```
packages/cli/
├── src/
│   ├── index.ts                    # TopCatch 4 档分流入口
│   ├── commands/                   # citty 子命令路由
│   ├── skills/                     # Skill SSOT + 编译 + 分发
│   │   └── locales/{zh-CN,en}/     # LocaleBundle 平面字典
│   ├── config/                     # OXnConfig + ProjectConfig
│   ├── errors/                     # IAPError + OXNCrash 类层级
│   ├── i18n/                       # t() / resolveLocale()
│   └── skills-locales/             # oxn-asset / oxn-work / oxn-cli / oxn-proof Skill
└── oxn-vscode/                     # VSCode 扩展（语法高亮）
```

### TopCatch 4 档分流

`packages/cli/src/index.ts` 顶层 catch 块按以下次序分流：

| 档 | 类型 | 通道 | 退出码 | 消费者 |
|---|---|---|---|---|
| 1 | IAPError | stdout JSON | 1 | AI Agent |
| 2 | OXNCrash | stderr stack | 2 | 人类工程师 |
| 3 | CliInputError | stdout + 友好消息 | 1 | 人类 / AI |
| 4 | 未知 Crash | stderr | 2 | 人类工程师 |

<!-- allow-version -->
### IAPError 字典（v1.1 收敛 8 个）
<!-- /allow-version -->

| Axis | Code | Action |
|---|---|---|
| INTENT | `IAP_INTENT_UNDEFINED_TERM` | YIELD_TO_HUMAN |
| INTENT | `IAP_INTENT_NAME_FILE_MISMATCH` | YIELD_TO_HUMAN |
| ALIGN | `IAP_ALIGN_CHECKLIST_MISSING` | YIELD_TO_HUMAN |
| ALIGN | `IAP_ALIGN_LOCK_NOT_FOUND` | YIELD_TO_HUMAN |
| ALIGN | `IAP_ALIGN_LOCK_HASH_MISMATCH` | YIELD_TO_HUMAN |
| ALIGN | `IAP_ALIGN_WORK_REMOVED` | YIELD_TO_HUMAN |
| PROOF | `IAP_PROOF_INFRA_FAIL` | YIELD_TO_HUMAN |
| PROOF | `IAP_PROOF_CRASH` | YIELD_TO_HUMAN |

<!-- allow-version -->
### OXNCrash 字典（v1.1 收敛 3 个）
<!-- /allow-version -->

| Code | 含义 |
|---|---|
| `OXN_CRASH_SIGNATURE_MISMATCH` | frozen.json 签名被外部篡改 |
| `OXN_CRASH_STATE_CORRUPT` | 状态文件损坏 |
| `OXN_CRASH_INTERNAL_ERROR` | 引擎内部未知异常 |

## Skill 分发

`oxn init` 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot：

| AdaptersRoot | 目标 AI 助手 |
|---|---|
| `.opencode/skills/` | OpenCode |
| `.claude/skills/` | Claude Code |
| `.agents/skills/` | Cursor / Codex / Goose |

`oxn install-skill <skill-id> --tools <list>` 手动触发分发；`compileAllSkills(toolIds, ...)` 是底层接口。

## I18n

```typescript
import { t } from '~/i18n'

// human 模式（CLI 默认）：走 t() 翻译
console.log(t('domain.list.description', { count: 5 }))

// AI 消费：传 --json 跳过 t()，走结构化 JSON
oxn domain list --json
```

**locale 解析优先级**：`--locale` flag > `config.locale` > `LANG` env > `DEFAULT ('zh-CN')`

**DEFAULT_LOCALE** = `'zh-CN'` 是唯一权威兜底。`en` locale 已废弃，文案与 `zh-CN` 一致。

## OXL 解析链路

```
.md 源文件
  ↓ Langium 解析（Grammar）
AST (抽象语法树)
  ↓ Entity Compiler（Compiler / EntityCompiler 单例）
AssemblyIR（IR）
  ↓ Zod 校验（Schema / Validator）
已校验 IR
  ↓ Engine 执行
业务行为
```

**关键约束**：
- Grammar 是唯一权威来源；AST 由 `langium generate` 自动产出
- Zod Schema 必须与 Grammar 一一对应，缺一个即 broken
- 所有 Validator 必须通过 `registerOxnValidators` 注册

## Config 双层

| 文件 | git 状态 | 字段 |
|---|---|---|
| `.oxnrc` | tracked | `leaderMode` |
| `.openxenon/.config` | gitignored | `mode`, `locale`, `debug`, `tools` |

`oxn config show` 合并展示两套 schema 的当前值。`writeProjectConfig` 触发自动迁移（旧 `config.json` → `.config`）。

## 参考

- [OXN 顶层术语 · core-terms](/openxenon/product/zh-cn/concepts/glossary.html)
- [OXN CLI 术语 · cli-terms](/openxenon/assets/domains/oxn-cli-domain.md)（本文档 SSOT）
- [架构总览 · architecture.md](./architecture.md)
<!-- allow-version -->
- v0.7 Domain 三层架构 RFC（v0.7 探索阶段产物，已并入 [RFC-0007 Domain 词汇与 OXN 定位](../../rfc/zh-cn/RFC-0007-domain-positioning.html)）
<!-- /allow-version -->