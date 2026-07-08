# Skills 模块架构

> **本文件是 OpenXenon Skills 模块的架构 SSOT。** AGENTS.md 仅做 1 行指针 → 本文件。
>
> 受众：维护/扩展 Skills 的工程师、Agent AI（避免误改编译产物）。

---

## 目录

- [1. 三段式架构（源 → 编译产物 → 用户安装）](#1-三段式架构源--编译产物--用户安装)
- [2. Skill Tool Adapters](#2-skill-tool-adapters)
- [3. 当前 Skill 清单](#3-当前-skill-清单)
- [4. 修改 / 添加 Skill 的工作流](#4-修改--添加-skill-的工作流)
- [5. 反模式](#5-反模式)
- [6. 代码锚点](#6-代码锚点)
- [7. 决策史](#7-决策史)

---

## 1. 三段式架构（源 → 编译产物 → 用户安装）

| 层 | 路径 | 写入机制 | 责任方 |
|---|---|---|---|
| **源（SSOT）** | `packages/cli/src/skills/locales/{zh-CN,en}/<id>/{instruction.md,references/*}` | `loader.ts` 静态 `import ... with { type: 'text' }` 嵌入 | 工程师（修改后跑 `oxn skill-compile`） |
| **编译产物** | `.opencode/skills/<id>/SKILL.md` + `.references.hash` + `references/*` | `skill-compiler.ts` 默认渲染（YAML frontmatter + `name` + `description` 由 loader.ts 注入） | 由 compiler 生成；**不应手改**（下次 compile 覆盖） |
| **用户安装** | `~/.opencode/skills/<id>/SKILL.md` | `install-skill.ts` 从 CLI 二进制嵌入资源读 SKILL.md 写出（`Bun.spawn` → 用户 `~/.opencode/skills/<id>/SKILL.md`） | 用户（`oxn install-skill --skill <id>`） |

### 1.1 源（`packages/cli/src/skills/locales/`）

- **双 locale 强制**：`zh-CN`（默认）+ `en`，loader.ts 第 53-58 行 — 非默认 locale 缺翻译时 **throw `OXN_SKILL_NOT_TRANSLATED`**（不静默降级）。
- **`instruction.md` 不含 YAML frontmatter**：loader.ts 直接当文本嵌入；YAML frontmatter 由 compiler 渲染时加。
- **`references/*.md` 列在 `loader.ts` skillContents**：必须显式 import + 列入 references 数组。

### 1.2 编译产物（`.opencode/skills/`）

- **`skill-compiler.ts` 默认渲染**：
  ```ts
  return `---
  name: ${skill.id}
  description: ${skill.description}
  ---
  ${skill.instruction}
  `
  ```
  即从 loader.ts 拿 `name` + `description` 加 frontmatter + instruction 正文。
- **References 按 hash 增量写**：`.references.hash` 是 `sha256("filename:content|filename:content|...")`，命中则跳过。
- **v0.6 启动例外**：`.opencode/skills/oxn-work/SKILL.md` 在仓库 git tracked（其它 skill 不入 git）。

### 1.3 用户安装（`~/.opencode/skills/`）

- **`install-skill.ts` 嵌入式读取**：
  ```ts
  import skillWork from '../../../../.opencode/skills/oxn-work/SKILL.md' with { type: 'file' }
  ```
  Bun `--compile` 时把 SKILL.md 内容嵌入二进制；运行时从 `$bunfs/...` 路径读取，**不依赖文件系统**。
- **用户 home 是"最终投递点"**：用户每次 `oxn install-skill --force` 都会被覆盖；OXN 不会从 home 反向 sync 回仓库。

---

## 2. Skill Tool Adapters

`packages/cli/src/skills/adapters.ts` 定义 3 个目标工具的 skills 根路径：

| Adapter | 根路径 | 默认？ |
|---|---|---|
| `opencode` | `{project}/.opencode/skills/` | ✓ |
| `claude` | `{project}/.claude/skills/` | ✓ |
| `agents` | `{project}/.agents/skills/` | ✓ |

- **每个 adapter 必须 `compileSkillToRoot` 跑一遍**：`compileAllSkills` 默认编译全部 DEFAULT_ADAPTERS。
- **新 adapter**：在 `DEFAULT_ADAPTERS` + `SKILL_ADAPTERS` 加 entry，**不允许硬编码新工具**到 compiler。

---

## 3. 当前 Skill 清单

### 3.1 loader.ts 注册（v0.6 极简策略）

**仅 1 个 Skill**：`oxn-work`（zh-CN + en 双 locale）。

| ID | instruction.md | references |
|---|---|---|
| `oxn-work` (zh-CN) | 459 行 | `blueprint-format.md` |
| `oxn-work` (en) | 459 行 | `blueprint-format.md` |

### 3.2 仓库内编译产物

仅 `oxn-work`（v0.6 启动例外，git tracked）：

```
.opencode/skills/oxn-work/
├── SKILL.md                   # skill-compiler 渲染
├── .references.hash           # sha256 of references content set
└── references/
    └── blueprint-format.md    # source mirror
```

### 3.3 用户 home 副本（5 个，不入仓）

| Skill | 类型 | 是否 OXN 管理 |
|---|---|---|
| `oxn-work` | OXN | ✓（loader.ts + install-skill 自动同步） |
| `oxn-cli` | OXN 历史遗留 | ✗（loader.ts v0.6 已删；home 副本为陈旧快照） |
| `oxn-proof` | OXN 历史遗留 | ✗（同上） |
| `sdex-analyze` | 第三方（stardex） | ✗（源在 `/Users/issac/pro/stardex/stardex/skills/`） |
| `sdex-sync` | 第三方（stardex） | ✗（同上） |

---

## 4. 修改 / 添加 Skill 的工作流

### 4.1 修改现有 Skill（如修 oxn-work）

```bash
# 1. 编辑源（双 locale 必须同步）
$EDITOR packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md
$EDITOR packages/cli/src/skills/locales/en/oxn-work/instruction.md

# 2. 跑编译（重生成 .opencode/skills/oxn-work/）
bun run skill-compile            # 或直接 packages/cli/src/commands/skill-compiler.ts

# 3. 跑 i18n 守卫（确保双 locale 就绪）
bun test packages/cli/src/__tests__/skills/skill-i18n.test.ts

# 4. 跑全量测试
bun test
```

### 4.2 添加新 Skill（recipe）

```bash
# 1. 创建双 locale 目录与 instruction.md
mkdir -p packages/cli/src/skills/locales/zh-CN/<new-id>/references
mkdir -p packages/cli/src/skills/locales/en/<new-id>/references
$EDITOR packages/cli/src/skills/locales/zh-CN/<new-id>/instruction.md
$EDITOR packages/cli/src/skills/locales/en/<new-id>/instruction.md

# 2. 在 loader.ts 注册（4 处）
#    a. import instruction.md + references/*.md（顶部 with { type: 'text' }）
#    b. skillMeta.<locale> 数组加 { id, description }
#    c. skillContents.<locale>['<new-id>'] 加 { instruction, references }
#    d. description 含触发关键词（Loader i18n 测试 #6 验证 en description 全英文）

# 3. 跑全量（i18n 守卫 + 全套测试）
bun test

# 4. 跑 skill-compile（生成 .opencode/skills/<new-id>/）
bun run skill-compile

# 5. （可选）跑 install-skill 到 home 验证
bun packages/cli/src/index.ts install-skill --skill <new-id> --force --json
```

### 4.3 删除 Skill（recipe）

```bash
# 1. 从 loader.ts 删除 4 处注册（同 §4.2 步骤 2）

# 2. 删除 locale 目录
rm -rf packages/cli/src/skills/locales/{zh-CN,en}/<old-id>/

# 3. 跑 skill-compile（pruneStale 会删除 .opencode/skills/<old-id>/）

# 4. 通知用户 home 副本需手动清理（OXN 不删 home）
```

---

## 5. 反模式

- ❌ **手改 `.opencode/skills/<id>/SKILL.md`** — `skill-compile` 会覆盖
- ❌ **手改 `~/.opencode/skills/<id>/SKILL.md`**（OXN-managed）— 不会自动更新；下次 install-skill 覆盖
- ❌ **单 locale 添加** — loader.ts:54-57 throw `OXN_SKILL_NOT_TRANSLATED`
- ❌ **在 loader.ts 加 import 但缺 instruction.md** — TS import 失败，编译挂
- ❌ **跳过 i18n 守卫** — `bun test packages/cli/src/__tests__/skills/skill-i18n.test.ts` 必跑（测试 #1-#7）
- ❌ **第三方 skill（sdex-*）改本仓** — 源在 stardex 仓库；OXN 仓库改不动
- ❌ **在 `install-skill.ts` 嵌 SKILL.md 而不更新 `EMBEDDED_SKILLS` 字典** — TS 编译错误 + install 时读不到

---

## 6. 代码锚点

| 模块 | 路径 | 职责 |
|---|---|---|
| Loader（i18n + content） | `packages/cli/src/skills/loader.ts:1-74` | 双 locale 注册 + `getSkillContent` / `getAllSkillsForLocale` |
| Adapter 配置 | `packages/cli/src/skills/adapters.ts` | 3 个工具适配器根路径 |
| 编译入口 | `packages/cli/src/commands/skill-compiler.ts:175-203` | `compileAllSkills` 默认渲染全部 adapter |
| 安装入口 | `packages/cli/src/commands/install-skill.ts` | 从 Bun 嵌入读 SKILL.md → 写到用户 home |
| i18n 守卫 | `packages/cli/src/__tests__/skills/skill-i18n.test.ts` | PR-4 引入；测试 #1-#7 覆盖 loader.ts ↔ locales/ 一致性 |

---

## 7. 决策史

| 版本 | 变更 |
|---|---|
| v0.0.x | Skills 体系初建；多 Skill（`oxn-forge` / `oxn-task` / `oxn-init` / `oxn-status` / `oxn-resume` / `oxn-stop` / `oxn-trace` 等） |
| v0.6 RFC | "Skill 极简" 决策：loader.ts 只保留 `oxn-work`；删除 `oxn-cli` / `oxn-proof` / `oxn-forge` / `oxn-task` 等 |
| v0.6.1-alpha.0 | `install-skill` 回归；测试 6b 验证 `oxn install-skill --skill oxn-cli` 在 v0.6 已删，输出 `data.failed` |
| v0.6.1-alpha.0 | home 副本（`~/.opencode/skills/{oxn-cli,oxn-proof}/SKILL.md`）保留为历史遗留，不自动清理 |
| v0.6.1-alpha.0 debug-patches | Skills 架构清理：补本 doc（`docs/architecture/skills-module.md`），AGENTS.md 仅留 1 行指针 |