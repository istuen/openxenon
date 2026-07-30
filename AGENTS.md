# AGENTS.md

OpenXenon 是一个基于 Bun 构建的 OXO/IAP 控制引擎：`oxn` CLI + Daemon + 基于 **md-pipeline** 的 OXN DSL（0.6.x 起纯 MD，Langium 已退役，见 ADR-0052）。

**包管理器**：阶段 1（2026-07-30 起）切到 **pnpm**（workspace + 依赖安装），构建器与测试运行器仍为 **Bun**（`bun build` / `bun test`）。权威锁文件 `pnpm-lock.yaml`（track）。`bun.lock` 已 ignore；`bun.lock.bak` 保留作本地对照基线，不入库。阶段 2 计划：构建换 tsup + 运行时切 Node.js。

仓库本地的 OpenCode 技能（v0.6.1 起共 2 个 Skill：`oxn-asset` 管 Asset 生命周期、`oxn-work` 管 Work 编排与执行；源在 `packages/cli/src/skills/locales/`，编译产物到 `.opencode/skills/`，不 git 追踪）与 opsx 命令（`.opencode/command/opsx-*.md`）属于工作流的一部分。

**版本号政策**：[RFC-0013](docs/rfc/zh-cn/RFC-0013-versioning-policy.md)（Draft）——Alpha prerelease 机制 + Version Fragment/Roadmap/Fix Record 三情态分离 + AssetMap/Roadmap 术语消歧 + RFC 文档移除 version 字段。当前版本：`0.6.2-alpha.0`（RFC 迁移已执行但功能未完全人工验证，alpha 阶段）。

**v0.6 架构重构**：OXN 从"IAP 三轴叙事"重构为"E1-E4 四结构实体 + L0-L3 工程分层"双层叙事。代码从 `src/` 单包拆为 `packages/cli` + `packages/engine` 双包 Monorepo——CLI 是薄组合调用层，Engine 承载全部业务实现（L2 `` DDD 模块化：`Asset/Intent/Align/Proof/Insight/Pool` + `daemon.ts`）。详见 [v0.6 RFC + Monorepo + Service 设计](.openxenon/pools/sprints/v0.6-iap-refactor/design/) 与 [changelog](.changes/0-6-0-iap-refactor.md)。

## 硬性规则（L0–L3 宪法）

> **v0.6 monorepo 迁移后**：L0-L2 全部在 `packages/engine/src/`，L3 在 `packages/cli/src/`。根 `src/` 仅残留 `src/{builtin,daemon,watcher}/`（部分迁移，待清理）。下表路径为 v0.6 现状。

由 **两项** 检查强制约束。两项检查在 CI 中均会失败：

- `bun scripts/validate-dependencies.ts` — 跨 8 个子层的纯 ESM 依赖图检查。
- `bun run lint`（ESLint）— 按目录配置的 `no-restricted-imports` 规则（覆盖 `src/` + `packages/`）。

层级 → 目录映射（L0 最内层，不依赖 L0+）：

| 层级 | 路径（v0.6 现状） | 禁止导入 |
|---|---|---|
| L0-Schema | `packages/engine/src/kernel/schemas/` | 其他所有层 |
| L0-Contract | `packages/engine/src/kernel/contracts/` | L0-Processor、L1、L2、L3 |
| L0-Processor | `packages/engine/src/kernel/{processors,verdicts}/` | L1+（Kernel 是"兰姆达真空"：禁止 `fs` / `net` / `child_process` / `process.env` / `process.std*` / `EventEmitter`） |
| L1-Infra | `packages/engine/src/infra/` | L0-Processor、L2-Work、L3 |
| L1-OXL | `packages/engine/src/oxl/` | L0-Processor、L2、L3 |
| L2-Builtin | `src/builtin/`（残留，待迁入 engine） | L2-Work、L3 |
| L2-Work | `packages/engine/src/{Work,Asset,Intent,Align,Proof,Insight,Pool}/` | L3 |
| L3 | `packages/cli/src/{commands,skills}/` + `src/{daemon,watcher}/`（残留，待迁入 packages/engine）+ `packages/engine/src/daemon.ts`（待迁移，目前 daemon 物理在根 src/daemon/） | — |

ESLint 还阻止的相邻关系：`kernel↔infra`、`daemon↔cli`（仅 socket 通信）、`cli↔daemon`（仅 socket 通信）、`infra↔{daemon,cli}`，`daemon` 不允许直接 `import fs`（必须走 Infra）。`__tests__/` 下的测试文件在依赖脚本中豁免（参见 `isInTestsDirectory`）。

## 构建 / 校验

```bash
bun install --frozen-lockfile
bun run build               # = build:clean + build:dist (bun build --target=node --outdir dist)
bun run typecheck           # tsc --noEmit；tsconfig 启用了 noUncheckedIndexedAccess + verbatimModuleSyntax
bun run check               # biome check src/ packages/  （格式 + 风格）
bun run format              # biome format --write src/ packages/
bun run lint                # eslint src/ packages/  （架构守卫；自动修复不安全，请谨慎使用）
bun test                    # bun test，约 1487 个测试 / 119 文件
```

`lefthook` 在 pre-commit 时执行 `biome-check` + `eslint-arch` + `typecheck`，在 pre-push 时执行 `bun test`（通过 `prepare` → `lefthook install` 安装）。

### 测试布局（Y 方案；不要把测试挪到叶文件旁边）

- `packages/engine/src/<mod>/__tests__/` — 模块单元测试
- `tests/architectural/` — L0–L3 宪法守卫
- `tests/integration/` — 跨层集成
- `packages/cli/src/__tests__/*-e2e.test.ts` — 黑盒 CLI E2E（同目录下还有 work-*-e2e）

`bunfig.toml` 对大多数套件在 `concurrentTestGlob` 中启用 **per-test concurrent**（文件内并发）；E2E 和 `tests/integration/**` 刻意保持 **串行**（共享 `/tmp/oxn-…` 与 `.openxenon/` 缓存）。`retry = 1` 用于吸收已知的 `work-migrate-e2e` 抖动。运行单个文件：`bun test packages/cli/src/__tests__/work-migrate-e2e.test.ts`。

## CLI 架构（`oxn`）

入口文件 `packages/cli/src/index.ts` 顶部定义了 4 档退出分类器（IAPError → exit 1 JSON 输出到 stdout / OXNCrash → exit 2 输出到 stderr / `isCliInputError` → exit 1 JSON / 未知异常 → exit 2 stderr）。`subCommands` 下以懒加载方式导入子命令：`init`、`config`、`domain`、`blueprint`、`work`、`proof`、`insight`、`dev`。开发态守护进程入口为 `src/server.ts`（socket 服务 + 文件监听 + 监督器）。

错误类型定义在 `packages/engine/src/errors/`：`IAPError`（供 AI 消费，JSON 输出到 stdout）、`OXNCrash`（供人类消费，输出到 stderr）、`isCliInputError`（用户输入错）。新增失败模式时，从这三者中挑选——不要在子命令中直接抛出原始 `Error`。

`oxn` 本身是 Bun 编译出的单文件可执行（`dist/cli.js`，阶段 1；阶段 2 计划换 tsup）。`dist/` 与 `*.js` 已被 gitignore。安装时使用 **pnpm**（`pnpm install`），构建与测试仍用 Bun（`bun run build` / `bun test`）。锁文件：`pnpm-lock.yaml` track，`bun.lock` ignore。详见 `.openxenon/drafts/oxn-dev-release-coexistence.md`。

## OXN DSL

- 0.6.x 后 `.oxn` (Langium) 格式已废弃，`.md` 是唯一 canonical 格式
- 语法定义历史记录：`packages/engine/src/oxl/langium-driver/oxn.langium`（已删除）
- VSCode 扩展：`oxn-vscode/`（支持 `.md` 语法高亮）
- `src/builtin/` 存放运行时加载的 **.md** 资产（probes / blueprints）

## 仓库约定

- Biome：2 空格缩进、单引号、**无分号**（`semicolons: asNeeded`）、列宽 120，assist 中 organize-imports **关闭**。
- ESLint 架构规则的错误信息是中文（"🚨 宪法违规…"）——请仔细阅读，其中会指明违反的边界。
- `tsconfig.json` 启用了 `verbatimModuleSyntax: true` 与 `noUncheckedIndexedAccess: true`。类型导入请使用 `import type`（依赖校验器会显式跳过这类导入）。
- 生成文件与测试文件已被 `tsconfig` 与 biome 排除——不要在其中加入生产代码。
- 版本号：`bun run version:check` / `bun run version:sync`（权威版本号在 `package.json`；变更日志片段存放在 `.changes/<version>-<slug>.md`）。
- `scripts/restore-skills.sh` 与 `scripts/verify-skill-structure.sh` 用于维护 `.opencode/skills/` 下的 OpenCode 技能包。
- **Skill 工作流（SSOT → 编译产物）**：
  - **SSOT**：`packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md`（与 `assets/`、`references/`）
  - **编译产物**：`.opencode/skills/<skill>/SKILL.md` + `~/.opencode/skills/<skill>/SKILL.md`（两个都不 git 追踪）
  - **编译触发**：`oxn init`（自动跑 `compileAllSkills` 从 SSOT 重新生成 SKILL.md）
  - **分发触发**：`oxn install-skill`（把已编译的 SKILL.md 拷贝到目标 AI 助手路径如 `~/.opencode/skills/`、`~/.claude/skills/`）
  - **正确维护流**：修改 `instruction.md` → 跑 `bun run packages/cli/src/index.ts init -f` → `.opencode/skills/` 自动重建
  - **错误反模式**：不要手动编 `.opencode/skills/<skill>/SKILL.md`——下次 `init -f` 会从 SSOT 覆盖你的修改

## 文档三层架构（0.6.x 三情态分离重构）

> **判据**：受众是外部用户 → `docs/`（topic-first：product|dev|rfc）；受众是贡献者且需长期保留 → `docs/rfc/`（沉淀）；受众是 OXN 开发 → `.openxenon/drafts/`（流动）；项目资产 → `.openxenon/assets/`；运行时 → `.openxenon/{works,proofs}/`。
>
> **0.6.x 三情态**：文档按"情态"分三类——Asset（定义性，回答"X 是什么"）+ RFC（规定性，回答"为什么决定 X"）+ Doc（描述性，回答"怎么用 X"）。详见 [RFC-0009 文档三情态分离](.openxenon/drafts/rfc-format-design.md#d1三情态定义) 与 [OxnProjectDomain 工程术语](./docs/glossary/zh-cn/project-terms.html)。

### 1. 对外文档 — `docs/`（topic-first SSOT，tracked）

```
docs/
├── product/{zh-cn,en}/   ← 产品与使用手册（描述性 Doc）
├── dev/{zh-cn,en}/       ← 开发手册（贡献者，描述性 Doc）
└── rfc/{zh-cn,en}/       ← 规范 RFC（规定性 Prescriptive）
```

- **topic-first**：先按主题（product/dev/rfc）后按语言（zh-cn/en），不再按语言平铺。
- **rfc/ 唯一承载规定性内容**：0.6.x+ 废除 OXP 双层机制，所有 RFC 走 `docs/rfc/zh-cn/RFC-XXXX-<theme>.md`（frozen + errata 演进）。
- 默认中文为主（zh-cn/）；rfc/ 暂无英文版本。
- 章内统一模板：What → Why → How → 参考。
- 旧 `docs/_archive/` 保留历史归档（不再作对外引用源，inv-10）。

### 2. 对内-开发文档 — `.openxenon/drafts/`（流动，tracked）

- `.openxenon/drafts/` — 项目工作草稿（替代原 pools/）
  - `drafts/rfc/` — 历史 ADR 归档（0.6.x Phase 3 已批量归档到 `.openxenon/.archived/docs/adrs/`）
  - `drafts/*.md` — 工作草稿（探索、审计、设计初稿）
- 流动层：可自由编辑/删除
- 提升通道：promote 走对应 Blueprint → `docs/product/` / `docs/dev/` / `docs/rfc/` / `.openxenon/assets/`

### 3. 项目资产 — `.openxenon/assets/`（边界，定义性 Asset，冻结后不可变）

- `.openxenon/assets/{domains,workflows,stack,blueprints,roadmaps}/`（E1 Asset）
- 0.6.2 布局，业务声明 + AI 创作模板，`.md` 格式
- `assetRoot` 可配（`.oxnrc` 指定），支持跳出 `.openxenon/`
- 与 builtin assets 关系：见 [RFC-0011 内置 Asset 两层机制](.openxenon/drafts/rfc-format-design.md)

### 4. 运行时数据 — `.openxenon/{works,proofs}/`

- 已 gitignore，IAP 执行产物（works + proofs）

### 5. 版本 changelog（tracked）

- `.changes/` — 按版本号组织的变更日志片段；发布版本号时记得新增一条。

### RFC 生命周期（0.6.x+ 取代 OXP 机制）

```
.openxenon/drafts/<scope>-draft.md（散落，无格式）
    ↓ oxn work create rfc-XXXX-... --blueprint doc-rfc-workflow
    ↓ lock → run → submit → finalize
docs/rfc/zh-cn/RFC-XXXX-<theme>.md（accepted 后核心冻结，仅可追加 errata 段）
```

详见 [RFC-0010 RFC frozen+errata 演进策略](.openxenon/drafts/rfc-format-design.md) + [RFC-0009 文档三情态分离](.openxenon/drafts/rfc-format-design.md)。

### 4 条 Promote 工作流

```
.openxenon/drafts/xxx.md
    │
    ├── asset-workflow      → .openxenon/assets/{kind}/xxx.md  (定义性 Asset)
    ├── doc-prod-workflow   → docs/product/{zh-cn,en}/xxx.md    (描述性 Doc)
    ├── doc-dev-workflow    → docs/dev/{zh-cn,en}/xxx.md        (描述性 Doc)
    └── doc-rfc-workflow    → docs/rfc/zh-cn/RFC-XXXX-xxx.md    (规定性 RFC)
```

### 引用规则（0.6.x 三情态隔离）

1. `docs/` 内部互引 ✅（product↔dev↔rfc 同树，跨语言需走相对路径）
2. `docs/` → `.openxenon/` ❌（严格隔离，dev→drafts/dev→assets 由 `bun scripts/check-doc-boundary.ts` 守门）
3. `.openxenon/drafts/` → `docs/` ✅（仅通过 promote workflow）
4. `.openxenon/assets/` → `docs/` ❌（边界不依赖手册）
5. **RFC 强制约束**（0.6.x RFC-0010）：RFC 只引用 `docs/glossary/zh-cn/<category>.html#<term>` 与 related ADR（不在正文引 docs/{product,dev}）

## 文档站点

- 站点生成器：VitePress，源在 `docs/{product,dev,rfc}/{zh-cn,en}/`，配置在 `docs/.vitepress/config.ts`
- 部署：GitHub Pages 部署到 `https://istuen.github.io/openxenon/`
- `config.ts` 只描述 nav 顺序与分组，**不写内容**
- 门户页 `docs/index.md` 自动重定向到 `docs/product/zh-cn/`
- 本地预览：`bun run docs:dev`（http://localhost:5173）；本地构建：`bun run docs:build`

## 快速导览

- 运行时数据：`.openxenon/{works,proofs}/`（已 gitignore，运行时产物）。
- **`.openxenon/` = 工程工作台**（非纯运行时目录）：`assets/`（E1 Asset 边界）；`drafts/`（探索稿 + 历史 ADR/RFC）；运行时 `works/ proofs/ .cache/` 已 gitignore。
- IAP 资产：`.openxenon/assets/{domains,workflows,stack,blueprints,roadmaps}/`（0.6.2 布局，Asset = 定义性，5 类 AssetKind）；`assetRoot` 可配（`.oxnrc` 指定），支持跳出 `.openxenon/`。
- AI 可见的权威文档：`docs/product/zh-cn/introduction.html`（入口）、`docs/product/zh-cn/concepts/iap-paradigm.html`（IAP 范式）、`docs/product/zh-cn/concepts/insight.html`（Insight 层）、`docs/product/zh-cn/concepts/work.html`（Work 核心）、`docs/product/zh-cn/concepts/proof.html`（Proof 轴）、`docs/product/zh-cn/reference/cli-user-guide.html`（CLI 参考）、`docs/dev/zh-cn/architecture.html`（架构）。
- **RFC 索引**：[`docs/rfc/zh-cn/`](./docs/rfc/zh-cn/) — 13 个 RFC（0.6.x+ 唯一规定性载体；12 个已 Accepted + RFC-0013 versioning-policy Draft；旧 `.openxenon/drafts/rfc/INDEX.md` 已废，48 ADR 已归档到 `.openxenon/.archived/docs/adrs/`）。RFC 文档无 version 字段，用 status + Errata 段演进（RFC-0013 D6，对齐 IETF/Rust/Python 业界标准）。
- Probes 拆分：`packages/engine/src/kernel/verdicts/` = L0 判定/目录（纯函数，verdict strategies + probe catalog）；`packages/engine/src/infra/probes/` = L1 IO 执行器。不要在二者之间挪动逻辑。两层以 `verdicts` ↔ `probes` 命名对偶显式 L0 ⇄ L1 边界。
- `.changes/` 存放按版本号组织的变更日志片段；发布版本号时记得新增一条。

## AI Agent 路由入口（0.6.x+ Roadmap）

> **第一步：定位 scene，再读 Roadmap**
> 收到 goal 后判断属于哪个 scene（doc / dev / debug / test / release / onboard），
> 读 `.openxenon/assets/roadmaps/oxn-system.md` 的对应 scene 段。
> 列出该 scene 的 Domain + Blueprint 列表（每项带 description）。
> 用 `oxn roadmap suggest --goal "<goal>" --scene <scene>` 排序匹配。

### 场景速查（0.6.x+ 6 scene）
- 写/改/读文档 → `scene=doc`（DocEngineeringContext + VitePressContext + doc-publish + doc-promote）
- 改代码/加 CLI → `scene=dev`（WorkOrchestrationContext + dev-workflow + add-cli-subcommand）
- Bug 修复/frozen 异常 → `scene=debug`（iap-error-context + fix-issue）
- 写测试 → `scene=test`（WorkOrchestrationContext + dev-workflow）
- 发版 → `scene=release`（MonorepoContext + release-cut + migrate-version）
- 新人入门 → `scene=onboard`（L0L3Context + MonorepoContext + dev-workflow）

### 0.6.x+ 文档架构改动（AI 必读）
- **规定性文档**：48 ADR + 3 OXP → 12 RFC（8 主题 RFC + 4 meta-RFC）；frozen + errata 演进。
- **三情态分离**：Asset（定义性）+ RFC（规定性）+ Doc（描述性）；3 情态全集中两情态组合是设计错误信号。
- **内置 Asset 两层**：`@oxn/` scope fallback + `@prj/` scope override（Phase 4 落地）。
- **跨层链接守门**：`bun scripts/check-doc-boundary.ts` 在 pre-commit 强制（dev→drafts / dev→assets / rfc→drafts 全部禁止）。

### Asset 变更后（手动 sync，Mode B）
- `oxn asset create` 成功后会自动提示 `oxn roadmap sync`（不自动改 Roadmap）
- 跑 `oxn roadmap sync oxn-system --scene <scene> --dry-run` 检查 dangling / outdated link
- 确认后加 `--apply` 写入：删 dangling + 刷新过时 description

## 开发者操作指南

> **`dev/` 目录 = 维护者 + 贡献者写给开发者看的操作手册，不是产品文档。**
>
> 完整目录结构与跨层引用规则见 [`dev/README.md`](./dev/README.md)。本段是核心摘要。

**当前 `dev/` 内容**：

| 文件/目录 | 用途 |
|---|---|
| `dev/README.md` | 开发者操作指南入口（待建：getting-started / dev-workflow / release-process / debugging / ai-collaboration） |
| `dev/versions/` | 前瞻性版本计划（Roadmap）——描述未来版本将包含什么；`dev/versions/README.md` 详述。转正后归档到 `.openxenon/.archived/dev/versions/`（RFC-0013 D3） |
| `dev/fix/` | 开发者面向的 bug 修复记录（Fix Record）——比 Version Fragment 更详细；`dev/fix/README.md` 详述（RFC-0013 D3） |

**跨层引用规则**（与 dev/README 同步）：

```
L1 docs/  ──→  L2 .openxenon/docs/      ✅ 允许（用户深入了解）
L2 .openxenon/docs/ ──→  L1 docs/        ❌ 禁止（沉淀层应独立可读）
L2 .openxenon/docs/ ──→  L3 .openxenon/pools/  ✅ 允许（引用探索稿）
L3 .openxenon/pools/ ──→  L2 .openxenon/docs/  ❌ 禁止（探索稿不引用决策）
dev/  ──→  L1/L2/L3   ✅ 允许（开发者手册引用 SSOT）
L1/L2/L3 ──→  dev/     ⚠️ 谨慎（SSOT 不应反向引用操作指南）
```

**新 dev/ 文档的添加流程**：

1. 用 `oxn work create <name> --blueprint doc-promote` 走 IAP（lock → run → submit → finalize）
2. 落地后 `git add dev/<filename> && git commit -m "docs(dev): add <title>"`
3. 更新 `dev/README.md`「当前内容」表 + 本段摘要

**0.6.x 三层文档守门**（已落地）：由 `bun scripts/check-doc-boundary.ts` 在 lefthook pre-commit 自动校验（覆盖 `**/*.md`）；Phase 5 扩展规则为 6 条（products/dev/rfc → .openxenon 双向 + drafts 隔离 + drafts-rfc-no-assets）。Phase 5 修复 19 条跨层链接（F6）后 0 violations。

## v0.2 路线图分支策略（已完成，归档）

> **状态**：T1a–T14 全部 done 并合入；T15 spike 待启动（不入 main）。下表为历史归档，不再以"进行中"维护。

**主分支**：`feat/v0.2-proof-engine`（从 `dev` 拉出，**不基于** `main`）

**子分支命名**：`feat/v0.2-t<N>-<slug>`，N 与 EXECUTION-ORDER.md §3 任务编号严格一致

| 任务 | 子分支 | 状态 |
|---|---|---|
| T1a infra-fs-cli | `feat/v0.2-t1a-infra-fs-migrate-cli` | ✅ done |
| T1b infra-fs-rest | `feat/v0.2-t1b-infra-fs-migrate-rest` | ✅ done |
| T1 infra-io-phase2-6 | `feat/v0.2-t1-infra-io-phase2-6` | ✅ done (t1a+t1b 合入) |
| T2 daemon-pr1-cleanup | `feat/v0.2-t2-daemon-pr1-cleanup` | ✅ done |
| T3 soft-gaps | `feat/v0.2-t3-soft-gaps` | ✅ done |
| T4 taint PR-1 数据契约 | `feat/v0.2-t4-taint-pr1-data-contract` | ✅ done |
| T5 taint PR-2 frozen+展示 | `feat/v0.2-t5-taint-pr2-frozen-verdict` | ✅ done |
| T6 taint PR-3 Provider | `feat/v0.2-t6-taint-pr3-registry-providers` | ✅ done |
| T7 taint PR-4 沙箱+CLI | `feat/v0.2-t7-taint-pr4-sandbox-cli` | ✅ done (PoC 闸门通过) |
| T8 intent-pool minimal | `feat/v0.2-t8-pool-minimal-research` | ✅ done |
| T9 taint PR-5 daemon+workcheck | `feat/v0.2-t9-taint-pr5-daemon-workcheck` | ✅ done |
| T10 taint PR-6 OXL grammar | `feat/v0.2-t10-taint-pr6-oxl-grammar` | ✅ done |
| T11 three-layer PR-1 grammar | `feat/v0.2-t11-three-layer-pr1-grammar` | ✅ done |
| T12 three-layer PR-2 finalize | `feat/v0.2-t12-three-layer-pr2-finalize` | ✅ done |
| T13 intent-pool full | `feat/v0.2-t13-pool-full-forges-warn` | ✅ done |
| T14 daemon PR-2/3/4 闭环 | `feat/v0.2-t14-daemon-pr234-loop` | ✅ done |
| T15 taint PR-7 spike | `feat/v0.2-t15-taint-pr7-spike` | ⏳ 待启动（spike，不入 main） |

> 各任务改动摘要见 `.changes/pre-0-6-history.md` 的 v0.2.x 段；详细 commit 记录查 `git log --oneline feat/v0.2-proof-engine`。

**已执行约束**（历史记录）：
- 所有子分支从 `feat/v0.2-proof-engine` 派生
- T10 → T11 串行（OXL grammar 两次生成分两次 PR）
- T7 PoC 闸门：Bun `vm.SourceTextModule` PoC 通过（方案 A）
- T15 spike 边界：不进入 main 分支；产出 `spike/probe-converge/README.md` 决策即可

**Sprint 设计稿位置**：`.openxenon/forges/sprints/sprint-{N}/<doc>.md`（15 份）+ `EXECUTION-ORDER.md`（总索引）

**对应变更历史**：`.changes/pre-0-6-history.md` 0.2.x 段（路线图完成；逐子分支 PR 原始 changelog 已合并到历史归档）

**Work v1.1 流程**：每个子分支开工时按 `oxn-work` skill 3 IAP 阶段（Intent → Align → Proof）走完一轮。

## v0.3 路线图扩展：MD-Native Grammar 改革（✅ 已完成，归档到 v0.6.1）

**主分支**：`feat/v0.3-md-ssot`（已开 8 commits，ahead of dev）

**RFC 文档**：`.openxenon/pools/sprints/v0.3-md-ssot/design/md-native-grammar-rfc.md` v1.0

**对应 changelog**：`.changes/pre-0-6-history.md` 0.3.x 段

| 任务 | 子分支 | 周次 | 状态 |
|---|---|---|---|
| T18 md-native grammar | `feat/v0.3-t18-md-native-grammar` | W9a | ✅ 已在 v0.6.1 落地 — EntityCompiler 接口 + EntityRegistry 单例 + 5 个 compiler + extract-headings/extract-list-fields；70 case 新测试；不破坏旧 `:::intent{...}` 解析（双选项 `'native' \| 'directive'`）|
| T19 md-native migrate | `feat/v0.3-t19-md-native-migrate` | W9b | ✅ 已在 v0.6.1 落地 — decompiler 全切到纯 MD 输出；11 个 `domains-md/*.md` 重生；8 个 测试 fixture 迁移；`E_MD_DEPRECATED_SYNTAX` 抛错；删 `remark-directive` 依赖 |
| T20 md-native highlight | `feat/v0.3-t20-md-native-highlight` | W9c | ✅ 已在 v0.6.1 落地 — oxn-vscode grammar 扩 markdown 注入 + VitePress CSS 着色；0 新 npm 依赖 |

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
