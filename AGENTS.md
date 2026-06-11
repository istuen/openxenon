# AGENTS.md

OpenXenon 是一个基于 Bun 构建的 OXO/IAP 控制引擎：`oxn` CLI + Daemon + 基于 Langium 的 OXN DSL。包管理器为 **Bun**（锁文件 `bun.lock`）。仓库本地的 OpenCode 技能（`.opencode/skills/oxn-cli`、`oxn-proof`、`oxn-work`）与 opsx 命令（`.opencode/command/opsx-*.md`）属于工作流的一部分。

## 硬性规则（L0–L3 宪法）

`src/` 被划分为多个层级，由 **两项** 检查强制约束。两项检查在 CI 中均会失败：

- `bun scripts/validate-dependencies.ts` — 跨 8 个子层的纯 ESM 依赖图检查。
- `bun run lint`（ESLint）— 按目录配置的 `no-restricted-imports` 规则。

层级 → 目录映射（L0 最内层，不依赖 L0+）：

| 层级 | 路径 | 禁止导入 |
|---|---|---|
| L0-Schema | `src/kernel/schemas/` | 其他所有层 |
| L0-Contract | `src/kernel/contracts/` | L0-Processor、L1、L2、L3 |
| L0-Processor | `src/kernel/{processors,probes,enums.ts}` | L1+（Kernel 是"兰姆达真空"：禁止 `fs` / `net` / `child_process` / `process.env` / `process.std*` / `EventEmitter`） |
| L1-Infra | `src/infra/` | L0-Processor、L2-Work、L3 |
| L1-OXL | `src/oxl/`（排除 `generated/`） | L0-Processor、L2、L3 |
| L2-Builtin | `src/builtin/` | L2-Work、L3 |
| L2-Work | `src/work/` | L3 |
| L3 | `src/{cli,daemon,hall,skills,watcher,core,i18n}/` | — |

ESLint 还阻止的相邻关系：`kernel↔infra`、`daemon↔cli`（仅 socket 通信）、`cli↔daemon`（仅 socket 通信）、`infra↔{daemon,cli}`，`daemon` 不允许直接 `import fs`（必须走 Infra）。`__tests__/` 下的测试文件在依赖脚本中豁免（参见 `isInTestsDirectory`）。

## 构建 / 校验

```bash
bun install --frozen-lockfile
bun run langium:generate   # 重新生成 src/oxl/generated/ — 不要手动编辑
bun run build               # = langium:generate + bun build --compile → dist/oxn
bun run build:macos         # 交叉编译到 dist/oxn-macos（还有 :linux、:windows）
bun run typecheck           # tsc --noEmit；tsconfig 启用了 noUncheckedIndexedAccess + verbatimModuleSyntax
bun run check               # biome check src/  （格式 + 风格）
bun run format              # biome format --write src/
bun run lint                # eslint src/  （架构守卫；自动修复不安全，请谨慎使用）
bun test                    # bun test，约 50 秒，414 个测试
```

`lefthook` 在 pre-commit 时执行 `biome-check` + `eslint-arch` + `typecheck`，在 pre-push 时执行 `bun test`（通过 `prepare` → `lefthook install` 安装）。

### 测试布局（Y 方案；不要把测试挪到叶文件旁边）

- `src/<mod>/__tests__/` — 模块单元测试
- `tests/architectural/` — L0–L3 宪法守卫
- `tests/integration/` — 跨层集成
- `src/cli/__tests__/*-e2e.test.ts` — 黑盒 CLI E2E（同目录下还有 work-*-e2e）

`bunfig.toml` 对大多数套件在 `concurrentTestGlob` 中启用 **per-test concurrent**（文件内并发）；E2E 和 `tests/integration/**` 刻意保持 **串行**（共享 `/tmp/oxn-…` 与 `.openxenon/` 缓存）。`retry = 1` 用于吸收已知的 `work-migrate-e2e` 抖动。运行单个文件：`bun test src/cli/__tests__/work-migrate-e2e.test.ts`。

## CLI 架构（`oxn`）

入口文件 `src/cli/index.ts` 顶部定义了 4 档退出分类器（IAPError → exit 1 JSON 输出到 stdout / OXNCrash → exit 2 输出到 stderr / `isCliInputError` → exit 1 JSON / 未知异常 → exit 2 stderr）。`subCommands` 下以懒加载方式导入子命令：`init`、`config`、`domain`、`blueprint`、`work`、`proof`、`insight`、`dev`。开发态守护进程入口为 `src/server.ts`（socket 服务 + 文件监听 + 监督器）。

错误类型定义在 `src/core/errors/`：`IAPError`（供 AI 消费，JSON 输出到 stdout）、`OXNCrash`（供人类消费，输出到 stderr）、`isCliInputError`（用户输入错）。新增失败模式时，从这三者中挑选——不要在子命令中直接抛出原始 `Error`。

`oxn` 本身是 Bun 编译出的单文件可执行（`dist/oxn`）。`dist/` 与 `*.js` 已被 gitignore。`pnpm-lock.yaml` 也被忽略——请使用 Bun 安装而非 pnpm，尽管 README 的 `pnpm install` 快速入门略有出入（README 在此点上有轻微过时；权威锁文件是 `bun.lock`）。

## OXN DSL

- 语法定义：`src/oxl/langium/oxn.langium`
- 配置：`langium-config.json` → 输出到 `src/oxl/generated/` 与 `syntaxes/oxn.tmLanguage.json`
- VSCode 扩展：`oxn-vscode/`（自带 `oxn-dsl-0.1.0.vsix`；其内部的 `pnpm-lock.yaml` 仅用于该扩展）
- `src/oxl/builtin/` 存放 **.oxn 源**资产；`src/builtin/` 存放运行时加载的 **已编译二进制** 资产——它们是源与产物的关系，并非重复。
- 语法修改后必须运行 `bun run langium:generate`；不要手动编辑 `src/oxl/generated/*`（该目录在 `biome.json` `files.ignores` 中也已忽略）。

## 仓库约定

- Biome：2 空格缩进、单引号、**无分号**（`semicolons: asNeeded`）、列宽 120，assist 中 organize-imports **关闭**。
- ESLint 架构规则的错误信息是中文（"🚨 宪法违规…"）——请仔细阅读，其中会指明违反的边界。
- `tsconfig.json` 启用了 `verbatimModuleSyntax: true` 与 `noUncheckedIndexedAccess: true`。类型导入请使用 `import type`（依赖校验器会显式跳过这类导入）。
- 生成文件与测试文件已被 `tsconfig` 与 biome 排除——不要在其中加入生产代码。
- 版本号：`bun run version:check` / `bun run version:sync`（权威版本号在 `package.json`；变更日志片段存放在 `.changes/<version>-<slug>.md`）。
- `scripts/restore-skills.sh` 与 `scripts/verify-skill-structure.sh` 用于维护 `.opencode/skills/` 下的 OpenCode 技能包。

## 快速导览

- 运行时数据 + IAP 资产：`.openxenon/{domains,blueprints,works,tasks,proofs,issues,forges,error}/`（目录内已 gitignore）。
- AI 可见的权威文档：`docs/core/document.md`（概念）、`docs/reference/oxn-dsl.md`（DSL）、`docs/reference/probe-types.md`（Probes）、`docs/architecture/l0-l3-constitution.md`（分层）。
- Probes 拆分：`src/kernel/verdicts/` = L0 判定/目录（纯函数，verdict strategies + probe catalog）；`src/infra/probes/` = L1 IO 执行器。不要在二者之间挪动逻辑。两层以 `verdicts` ↔ `probes` 命名对偶显式 L0 ⇄ L1 边界。
- `.changes/` 存放按版本号组织的变更日志片段；发布版本号时记得新增一条。
