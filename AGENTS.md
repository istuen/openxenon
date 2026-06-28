# AGENTS.md

OpenXenon 是一个基于 Bun 构建的 OXO/IAP 控制引擎：`oxn` CLI + Daemon + 基于 Langium 的 OXN DSL。包管理器为 **Bun**（锁文件 `bun.lock`）。仓库本地的 OpenCode 技能（v0.6 起仅 `.opencode/skills/oxn-work`，唯一 Skill）与 opsx 命令（`.opencode/command/opsx-*.md`）属于工作流的一部分。

**v0.6 架构重构**：OXN 从"IAP 三轴叙事"重构为"E1-E4 四结构实体 + L0-L3 工程分层"双层叙事。代码从 `src/` 单包拆为 `packages/cli` + `packages/engine` 双包 Monorepo——CLI 是薄组合调用层，Engine 承载全部业务实现（L2 `l2_iap_biz/` DDD 模块化：`Asset/Intent/Align/Proof/Insight/Pool` + `daemon.ts`）。详见 [v0.6 RFC + Monorepo + Service 设计](.openxenon/pools/sprints/v0.6-iap-refactor/design/) 与 [changelog](.changes/0-6-0-iap-refactor.md)。

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

## 文档 SSOT 规则

- `docs/` 根平铺的 introduction + quickstart + core-concepts + intent + align + proof + recipes + ddd-in-practice + cli + architecture + extending + roadmap + glossary + iap-cheatsheet + faq + llm-prompt = **对外唯一权威（SSOT）**
- 新增概念 / 命令 / Probe：先在 `docs/` 找到归属章节，若没有则新建
- 跨章跳转用相对路径 + 锚链：`[Align](./align.md#work-task-part)`
- AI 协作者使用 `docs/llm-prompt.md` 作为入口
- 章内统一模板：What → Why → How → 参考
- 旧 `docs/{core,architecture,reference,guides,design,horizon}/` 已备份。手册完成后统一处理。

## 文档站点

- 站点生成器：VitePress，源在 `docs/*.md`，配置在 `docs/.vitepress/config.ts`
- 部署：GitHub Pages 部署到 `https://istuen.github.io/openxenon/`
- `config.ts` 只描述 nav 顺序与分组，**不写内容**
- 新增章节：先在 `docs/` 创建 .md，再在 `config.ts` 添加 sidebar 条目
- 部署触发：仅 main 分支 push 或手动 `workflow_dispatch` 触发部署；feat/* 推时仅 build 验证编译
- Pages 启用由仓库管理员手动一次性操作（Settings → Pages → Source: "GitHub Actions"）
- 本地预览：`bun run docs:dev`（http://localhost:5173）；本地构建：`bun run docs:build`

## 快速导览

- 运行时数据：`.openxenon/{works,tasks,proofs,issues,error}/`（目录内已 gitignore，运行时产物）。
- IAP 资产：`.openxenon/{domains,blueprints}/`（已 tracked，业务声明 + AI 创作模板）。
- Forge 设计笔记：`.openxenon/forges/`（已 tracked，跨 PR 工作的设计文档与状态分析）。**forges/ 计划于 v0.1.x 升级为 `.openxenon/pools/` Intent Pool**——设计稿见 `.openxenon/forges/2026-06-13-intent-pool-design.md`（v3 current）。升级后 forges/ 退役，pools/ 接管；5 类池（research/design/issue/audit/journal）分上下游两组生命周期，journal 由 `oxn work finalize` 两阶段原子写入。heading 模板自验证：`bun scripts/check-heading-skeleton.ts`。
- AI 可见的权威文档：`docs/introduction.md`（入口）、`docs/core-concepts.md`（IAP 范式）、`docs/intent.md`（Intent 轴）、`docs/align.md`（Align 轴）、`docs/proof.md`（Proof 轴）、`docs/cli.md`（CLI 参考）、`docs/architecture.md`（架构）。
- Probes 拆分：`src/kernel/verdicts/` = L0 判定/目录（纯函数，verdict strategies + probe catalog）；`src/infra/probes/` = L1 IO 执行器。不要在二者之间挪动逻辑。两层以 `verdicts` ↔ `probes` 命名对偶显式 L0 ⇄ L1 边界。
- `.changes/` 存放按版本号组织的变更日志片段；发布版本号时记得新增一条。

## v0.2 路线图分支策略

**主分支**：`feat/v0.2-proof-engine`（从 `dev` 拉出，**不基于** `main`）

**子分支命名**：`feat/v0.2-t<N>-<slug>`，N 与 EXECUTION-ORDER.md §3 任务编号严格一致

| 任务 | 子分支 | 周次 |
|---|---|---|
| T1a infra-fs-cli (子 PR 1) | `feat/v0.2-t1a-infra-fs-migrate-cli` | W1 | **✅ done** (commit df07407 + a621c64 + 1c30cf1) — src/cli/ 22 文件 fs 直引收口 + 47 case guard test + biome cleanup |
| T1b infra-fs-rest (子 PR 2) | `feat/v0.2-t1b-infra-fs-migrate-rest` | W1 | **✅ done** (commit cb7b014 + e6d4ff4) — 28 非 cli 文件 fs 直引收口 + filesystem-async.ts + 删 3 个真死 Port + biome cleanup |
| T1 infra-io-phase2-6 (总) | `feat/v0.2-t1-infra-io-phase2-6` | W1 | **✅ 拆分后 t1a + t1b 已合入主分支** (52 文件实测，父文档估 23 个) |
| T2 daemon-pr1-cleanup | `feat/v0.2-t2-daemon-pr1-cleanup` | W1 | **✅ done** (commit fdcd238) — src/daemon/recovery.ts → trace/recovery.ts (父文档 v0.1.x 早期版本的范围因 v0.1.8 演进中已分化, 仅做 recovery 移位) |
| T3 soft-gaps | `feat/v0.2-t3-soft-gaps` | W2 | **✅ done** (commit 04d143e) — 软缺口 A: grammar 多语法兼容 + 软缺口 B: merger 从 regex 改 Langium AST (3 个 sync 函数改 async) |
| T4 taint PR-1 数据契约 | `feat/v0.2-t4-taint-pr1-data-contract` | W3a | **✅ done** (commit a5dbab4) — IO Primitive + InterferenceFlag 12 项 + TRUST_BASELINE + ProbeVerdict 三态 (PASS/FAIL/INCONCLUSIVE); 14 个 builtin probe 透传守护通过 |
| T5 taint PR-2 frozen+展示 | `feat/v0.2-t5-taint-pr2-frozen-verdict` | W3b | **✅ done** (commit 05cd452 + 75d7bd6, merge eee9832) — frozen.json schema 三态升级 (verdict 必填 PASSED/FAILED/INCONCLUSIVE + interferenceFlags 可选) + FrozenProof 聚合三态 + reader hash 关键 bug 修复 (raw hash 不依赖 zod key 顺序) + renderShowHuman 3 态 emoji + TTY 色彩 + 8 case 新测试 (5 frozen-proof-shape + 3 renderShowHuman) + 中英双 SSOT 文档 |
| T6 taint PR-3 Provider | `feat/v0.2-t6-taint-pr3-registry-providers` | W3c | **✅ done** (commit 9d7c136 + b0c2c58, merge 3e127c5) — ProviderRegistry + 4 内置 Provider (FileProvider lstat + 4 flag / HttpProvider WAF 6 头 + cdn_cache / ShellProvider 委派 shell-exec / GitProvider 委派 git-* ) + IAPError 字典扩展 (3→4 轴, 5→7 码) + 18 case 新测试 (5 file + 6 http + 7 registry) + L1-Infra 架构合规修复 (6 处 import 走 kernel barrel) |
| T7 taint PR-4 沙箱+CLI | `feat/v0.2-t7-taint-pr4-sandbox-cli` | W3d ⚠ PoC | **✅ done** (commit 6258d4e + 1cef78f, merge 555202b) — PoC 闸门 Bun vm.SourceTextModule 通过 (方案 A) + probe-sandbox (FORBIDDEN_GLOBALS 7 + FORBIDDEN_MODULES 10 + 8 步 sandboxValidate) + probe-registry-store (registry.json v1 schema) + `oxn probe add` CLI (4 步流程: fetchSource → 落盘 0o444 → sandboxValidate → registryUpsert) + IAPError 字典 7→9 码 (加 SANDBOX_REJECTED + PROBE_INVALID) + 11 case 新测试 (6 sandbox + 5 e2e) + L3-CLI 架构合规修复 (3 新文件 0 fs 直引, 走 filesystem-async) + PoC 资产 bun-poc/spike-t7-sandbox/ |
| T9 taint PR-5 daemon+workcheck | `feat/v0.2-t9-taint-pr5-daemon-workcheck` | W5a | **✅ done** (commit 52f97e4 + d72daab, merge ed73e77) — daemonStartup 物理路径 src/daemon/ → src/infra/registry/ (L1-Infra, 避免 CLI↔daemon 互引违规) + startServer 钩子点 + workPrecheck (精准阻断该 Work, v2 核心倒置) + `oxn probe list` / `fix` CLI (3 case + 2 case) + IAPError 字典 9→12 码 (加 PROBE_CORRUPTED + PROBE_MISSING + PROBE_FIX_UNAVAILABLE) + 8 case 新测试 (5 precheck + 3 list) + L2-Work + L3-CLI 架构合规修复 (server.ts existsSync 走 infra/filesystem) |
| T8 intent-pool minimal | `feat/v0.2-t8-pool-minimal-research` | W4 末 | **✅ done** (commit a73c809 + a11dfef, merge 82542bb) — Intent Pool v3 最小切片 (research 池 + Hall 扫描迁移) — pool-writer (复用 writeImmutable 写 0o444 frozen.json) + journal-generator + markdown-headings (extractHeadings 排除 ```代码块```) + scripts/check-heading-skeleton.ts (CLI 退出码 0/1) + Hall 改造 (scanIntentPools + 埋 warnOnForgesDeprecated 开关) + OxnConfig 加字段 (默认 false, Sprint 6 flip) + lefthook pre-commit 第 5 hook + .gitignore 扩展 + .openxenon/pools/research/.gitkeep + 11 case 新测试 (3 pool-writer + 4 markdown-headings + 4 heading-skeleton) + 中英双 SSOT intent.md 章节 |
| T10 taint PR-6 OXL grammar | `feat/v0.2-t10-taint-pr6-oxl-grammar` | W5b | **✅ done** (commit d5d67e5 + 8091311, merge d5dadc4) — OXL 1.3 grammar scheme: 字段 (ProbeDeclaration 加可选 'scheme' ':' scheme=STRING) + 重新生成 parser/ast/grammar/tmLanguage + 15 builtin probe 模板迁移 (fs-*/git-*/http/shell 全覆盖) + probe-validator.ts 新建 (3 规则校验) + validators/index.ts 统一出口 + 22 case 新测试 (16 probe-templates + 6 probe-validator) + ⚠ 串行约束: 本 PR 必须在 T11 之前合入 (OXL grammar 两次 langium:generate 分两次 PR) |
| T11 three-layer PR-1 grammar | `feat/v0.2-t11-three-layer-pr1-grammar` | W5c | **✅ done** (commit aaad25d, merge 6e3000f) — InvariantDecl 加 script/manual/scope 可选字段 + WorkDeclaration 加 domainProofs+=DomProofRef (`proofs [...]` 语法) + 重新生成 parser/ast/grammar + 2 处兼容修复 + 10 case 新测试 + ⚠ 串行约束: T11 在 T10 之后合入 |
| T12 three-layer PR-2 finalize | `feat/v0.2-t12-three-layer-pr2-finalize` | W5d | **✅ done** (commit d183aff, merge 13c4d52) — work finalize 二阶段原子写入 + domain-proof-evaluator + 硬阻断 on FAIL + 8 case 新测试 + L1-Infra 合规 |
| T13 intent-pool full | `feat/v0.2-t13-pool-full-forges-warn` | W6-7 | **✅ done** (commit 16fb880, merge 8a6e9a0) — Intent Pool 5 池全启用 (research/design/issue/audit/journal) + 5 pool heading specs + 'oxn pool list/create' CLI + Hall scanIntentPools 5 池扫描 + physical dirs |
| T14 daemon PR-2/3/4 闭环 | `feat/v0.2-t14-daemon-pr234-loop` | W8 | **✅ done** (commit edbf3fa, merge 5f5720c) — PR-2 step.ts (Proof-driven incremental steps) + PR-3 daemon restart/logs/kill CLI 命令 + PR-4 escape-mechanism + trace archiver + L2-L3 架构合规 (step.ts 物理路径 cli → infra, daemon 不 import CLI) |
| T15 taint PR-7 spike | `feat/v0.2-t15-taint-pr7-spike` | W8（spike，不入 main） | ⏳ 待启动 |
| T3 soft-gaps | `feat/v0.2-t3-soft-gaps` | W2 |
| T4 taint PR-1 数据契约 | `feat/v0.2-t4-taint-pr1-data-contract` | W3a |
| T5 taint PR-2 frozen+展示 | `feat/v0.2-t5-taint-pr2-frozen-verdict` | W3b |
| T6 taint PR-3 Provider | `feat/v0.2-t6-taint-pr3-registry-providers` | W3c |
| T7 taint PR-4 沙箱+CLI | `feat/v0.2-t7-taint-pr4-sandbox-cli` | W3d ⚠ PoC |
| T8 intent-pool minimal | `feat/v0.2-t8-pool-minimal-research` | W4 |
| T9 taint PR-5 daemon+workcheck | `feat/v0.2-t9-taint-pr5-daemon-workcheck` | W5a |
| T10 taint PR-6 OXL grammar | `feat/v0.2-t10-taint-pr6-oxl-grammar` | W5b |
| T11 three-layer PR-1 grammar | `feat/v0.2-t11-three-layer-pr1-grammar` | W5c |
| T12 three-layer PR-2 finalize | `feat/v0.2-t12-three-layer-pr2-finalize` | W5d |
| T13 intent-pool full | `feat/v0.2-t13-pool-full-forges-warn` | W6-7 |
| T14 daemon PR-2/3/4 闭环 | `feat/v0.2-t14-daemon-pr234-loop` | W8 |
| T15 taint PR-7 spike | `feat/v0.2-t15-taint-pr7-spike` | W8（spike，不入 main） |

**严格约束**：
- 所有子分支从 `feat/v0.2-proof-engine` 派生
- **T10 → T11 串行**：OXL grammar 两次 `langium:generate` 分两次 PR，**绝对禁止并行**
- **T7 PoC 闸门**：Bun `vm.SourceTextModule` PoC 不通过则降级方案 B（Worker）/ C（spawn 子进程）/ D（推迟 PR-4）
- **T15 spike 边界**：不进入 main 分支；产出 `spike/probe-converge/README.md` 决策即可

**Sprint 设计稿位置**：`.openxenon/forges/sprints/sprint-{N}/<doc>.md`（15 份）+ `EXECUTION-ORDER.md`（总索引）

**对应 changelog 片段**：`.changes/0-2-0-roadmap.md`（路线图占位，每个子分支 PR 合入时记得新增一条 changelog）

**Work v1.1 流程**：每个子分支开工时按 `oxn-work` skill 8 阶段（init → migrate → create → add-task → validate → lock → run → submit）走完一轮。

## v0.3 路线图扩展：MD-Native Grammar 改革（🟡 RFC 待拍板）

**主分支**：`feat/v0.3-md-ssot`（已开 8 commits，ahead of dev）

**RFC 文档**：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md` v1.0

**对应 changelog**：`.changes/0-3-0-md-native.md`

| 任务 | 子分支 | 周次 | 状态 |
|---|---|---|---|
| T18 md-native grammar | `feat/v0.3-t18-md-native-grammar` | W9a | 🟡 **RFC 待拍板** — EntityCompiler 接口 + EntityRegistry 单例 + 5 个 compiler + extract-headings/extract-list-fields；70 case 新测试；不破坏旧 `:::intent{...}` 解析（双选项 `'native' \| 'directive'`）|
| T19 md-native migrate | `feat/v0.3-t19-md-native-migrate` | W9b | 🟡 **RFC 待拍板** — decompiler 全切到纯 MD 输出；11 个 `domains-md/*.md` 重生；8 个测试 fixture 迁移；`E_MD_DEPRECATED_SYNTAX` 抛错；删 `remark-directive` 依赖 |
| T20 md-native highlight | `feat/v0.3-t20-md-native-highlight` | W9c | 🟡 **RFC 待拍板** — oxn-vscode grammar 扩 markdown 注入 + VitePress CSS 着色；0 新 npm 依赖 |

**严格约束**：

- 所有子分支从 `feat/v0.3-md-ssot` 派生，合并后再派生（接续 v0.2 模式）
- **T18 → T19 → T20 串行**：PR-A 留 `'directive'` 双选项作为安全网，PR-B 全切后 PR-C 仅做高亮
- **T19 breaking change**：v0.3.0 发版时 `:::intent{...}` 解析期抛 `E_MD_DEPRECATED_SYNTAX`；changelog 写明「请重新跑 `oxn domain compile`」
- **不引入新 npm 依赖**：`remark-attr` 0.11.1（6 年未更新 + tokenizer 冲突）和 `remark-heading-id` 都不引；H3 文本 + heading slug 自行实现
- **`oxn-vscode` 物理隔离**：L3-CLI 不 import L1-OXL；`scripts/check-intent-types-drift.ts` CI 守卫 type 白名单一致

**RFC 决策点（5 项已锁定）**：

1. 语法范式：**纯 MD**（H1 实体 / H2 分类 / H3 实例 / 嵌套列表子结构）
2. 复杂属性风格：**全嵌套列表**（Task 下 Part 用 `- part:` 缩进，不用 H4）
3. ID 唯一性：**强制 H3 文本在 `##` 分类内唯一**（`E_MD_DUPLICATE_H3` 报错）
4. 实体解耦：**Factory + Singleton**（`EntityRegistry` 对齐 `driverRegistry` 范式）
5. VitePress 改造：**仅 CSS 着色**（H2 分类加 border + 浅色背景）
