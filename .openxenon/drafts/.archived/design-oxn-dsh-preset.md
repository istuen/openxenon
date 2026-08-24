---
entity: skeleton
target-entity: rfc
id: RFC-0031
theme: oxn-dsh-preset
status: Accepted
date: 2026-08-14
accepted: 2026-08-14
accepted-at: 2026-08-14
superseded-by: ~
promote-target: rfc
created-from: draft-skeleton-fork@0.1.0
synced-at: 2026-08-14
type: design
name: design-oxn-dsh-preset
related:
  - .openxenon/assets/domains/oxn-cli-domain.md
  - .openxenon/assets/domains/oxn-draft-domain.md
  - .openxenon/assets/domains/oxn-asset-domain.md
  - packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md
  - docs/rfc/zh-cn/RFC-0019-draft-promote-routing.md
  - docs/rfc/zh-cn/RFC-0027-asset-convergence-v070.md
  - .openxenon/drafts/design-rfc-skill-extensibility.md
---

# RFC-0031: 为 DeepSeek Harness (DSH) 提供 oxn 协作模式（Agent Preset）

> **主题**：在 DeepSeek Harness (DSH) 部署中新增一个名为 `oxn` 的 **agent preset**,让工程师启动 DSH 时可直接选择「oxn 模式」,以围绕 IAP( Intent–Align–Proof )范式 + oxn CLI + Work/Task/Part 编排体系工作。
> **来源**:2026-08-14 `/design` session(v0.6.4-alpha.0 + DSH 标准 preset fork 分析)
> **状态**:Draft(待通过 `oxn draft promote design-oxn-dsh-preset --target rfc` 提升到 `docs/rfc/zh-cn/RFC-0031-oxn-dsh-preset.md`)

---

## 1 · 背景与目标

### 1.1 为什么需要这个 RFC

OpenXenon 在 v0.6.x 系列已经把「AI Agent 围绕 oxn 工作」沉淀为 **oxn-work / oxn-asset / oxn-draft** 三个 Skill(SSOT 在 `packages/cli/src/skills/locales/{zh-CN,en}/<skill>/instruction.md`,编译产物在 `.opencode/skills/`)。但 Skill 的入口粒度是**「按需加载」**——只有当模型调 `tool-skill` 时才被装载,启动 prompt 里没有 IAP 身份契约。

**核心问题**:工程师用 DSH 启动会话时,如果选了 `standard` preset,模型会**默认按「通用编码 Agent」自我介绍**,不知道:

1. 三方协作模型(工程师 / AI Agent / OXN Engine)与 IAP 三阶段
2. oxn CLI 白名单(哪些命令能调、哪些禁止)
3. lock 后漂移的 IAP_ALIGN_LOCK_HASH_MISMATCH 边界
4. AGENTS.md §阅读与加载顺序( L-1 → L0 → L1 → L2 → L3 → L4 )
5. 错误码契约( `IAPError` / `OXN_INTENT_SCOPE_VIOLATION` / `OXN_INTENT_CONTEXT_MISSING` )

这些信息散落在 `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` §AI Agent 接入前置,但只有触发 Skill 才看得见——而触发 Skill 本身又需要模型先知道 Skill 的存在。这是**引导死锁**。

### 1.2 目标

通过 DSH 的 **agent preset** 机制,在 standing mount 时就把 IAP 身份契约 + oxn CLI 白名单注入到 system prompt 和工具层,让**启动即合规**:

- 模型启动 prompt 直接含「你是 OpenXenon AI Agent( oxn 模式)」身份段
- 工具层内置 `tool-oxn-cli`(包装 `tool-bash` + 白名单 regex)
- Skill 层通过 `skill-filesystem` 自动发现 `.opencode/skills/oxn-work/` 等本地 Skill(无需新增插件)
- 工具调用前由白名单守门 + oxn lock hash 守门**双层边界**

### 1.3 非目标

- ❌ 不复制 `oxn-work` Skill 全文到 preset prompt(避免重复 + 版本漂移)
- ❌ 不改 DSH host composition(presets 不应承载 host-plane 服务,见 `editing-cordis-compositions` Skill §Plane rule)
- ❌ 不引入 `tool-ralph`(Ralph 是 fresh-agent 模式,会绕过 IAP 的 lock 边界)
- ❌ 不改 OpenXenon 4 个 SSOT(Domain / RFC / Doc / Meta)——preset 模板是**派生**而非**修改**

---

## 2 · 决策要点

### D1:Preset 走 fork 路线,不从头写

**决议**:基于 `${DSH_HOME:-$HOME/.dsh}/.agent-presets/standard/` 的 `agent.cordis.yml` **完整 fork**,得到 `~/.dsh/.agent-presets/oxn/agent.cordis.yml` + `~/.dsh/.agent-presets/oxn/preset.yml`。

**理由**:

1. DSH 的 `editing-cordis-compositions` Skill §Off-limits 明确禁止编辑 shipped preset;fork 是唯一合法路径。
2. `agentPresets.copy(from, id, name)` 是 Host-side write,**不需要 sandbox escalation**(参考 `editing-cordis-compositions` §Authoring a preset Step 1)。
3. standard preset 已经包含 preset 必备的全部工具(shell / fs / job / skill / goal / plan / compaction / delegation),**继承即可**——不需要从 `cordis:group` 重画。

**反例**:不要基于 `minimal` fork(`minimal` 是「两工具 + 固定 prompt」子集,缺失 plan / compaction / delegation,无法承载 IAP-Align 工作流)。

**反例**:不要基于 `code` fork(`code` 的 Code Mode 把多 tool call 编译成单个 TS `run_code`,适合无 IAP 锁边界的工作;oxn 的 lock 后漂移检测需要细粒度 round-trip 审计,Code Mode 会**绕过** lock hash)。

### D2:Preset 文件不进入 OpenXenon 仓库根

**决议**:OpenXenon 仓库**只维护一份「preset 模板」**,放在 `packages/cli/src/skills/locales/oxn-dsh-preset/preset.yml.template`( YAML 字符串 SSOT)。`oxn init -f` 在用户级自动写入 `${DSH_HOME}/.agent-presets/oxn/`(参考 `oxn-work` Skill SSOT → `.opencode/skills/` 编译流水线)。

**理由**:

1. DSH user preset root(`${DSH_HOME}/.agent-presets/`)在仓库外,commit 进 OpenXenon 仓库会污染仓库边界。
2. 与现有 `packages/cli/src/skills/locales/ → .opencode/skills/` 流水线对齐,**复用** init -f 的写入逻辑。
3. Preset 升级随 OpenXenon 版本走,但**实际加载**是 DSH 部署级,符合 preset 与部署解耦原则。

**写入路径**(`oxn init -f` 增量):

```text
packages/cli/src/skills/locales/oxn-dsh-preset/preset.yml.template
  → ${DSH_HOME}/.agent-presets/oxn/preset.yml       (metadata)
  → ${DSH_HOME}/.agent-presets/oxn/agent.cordis.yml (composition)
```

### D3:Persona 必须替换,不得保留 standard 默认

**决议**:`- id: persona` 行的 `text` 字段**必须**替换为 OpenXenon 身份段:

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are an AI agent working under the OpenXenon IAP (Intent–Align–Proof) protocol,
      collaborating with an OpenXenon engineer through the oxn CLI.
      You are NOT a general-purpose coding agent; you are bound by oxn's 8-phase Work lifecycle
      (create → add-task → validate → lock → run → submit → finalize) and the IAP_ALIGN_LOCK_HASH_MISMATCH
      boundary that fires the moment any .oxn asset drifts after lock. Your reading path is
      AGENTS.md §阅读与加载顺序 (L-1 → L0 → L1 → L2 → L3 → L4). Working directory: {{cwd}}.
```

**理由**:

1. 标准 persona `text` 是「You are a coding agent powered by {{model}}」——这是 `standard` preset 的身份声明,oxn 模式必须显式**覆盖**。
2. Persona 是 standing mount 时注入 system prompt,**早于**任何 Skill 加载——是**身份契约的第一载体**。
3. IAP_ALIGN_LOCK_HASH_MISMATCH 必须在 persona 里点出来,因为这是 oxn 模式**特有的边界**(standard preset 没有 lock 概念)。

### D4:系统提示注入 IAP 接入前置段

**决议**:在 standard preset 之外,**追加**一段由 `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md §AI Agent 接入前置` 衍生的 prompt section,通过 dynamic plugin 注册到 `systemPrompt` 服务:

| 段落 | 来源 | 必填字段 |
|---|---|---|
| **§三方协作模型** | 工程师主权 / AI Agent 主权 / OXN Engine 主权 | ✅ |
| **§IAP 三阶段** | Intent / Align / Proof | ✅ |
| **§CLI 白名单** | ✅ / ❌ 两块命令清单 | ✅ |
| **§输出约定** | file_path:line_number + 完成状态附 `oxn work status --json` | ✅ |
| **§失败处理** | 5 个错误码处置 | ✅ |

**实现方式**:YAML 声明式 preset **不能**直接调 `systemPrompt.section()` API。两条路径:

- **路径 A(推荐)**:把 IAP 接入前段写入 `agent-instructions` 包的 `sections` config(若该包支持 sections 字段)。
- **路径 B(回退)**:把整段指令塞进 `persona.text` 并设 `complete: true`(参考 `minimal` preset 的实现)。

**最终选哪个**:spike 阶段先用 `cordis_inspect_query` 探 `@deepseek-ai/dsh-agent-instructions` 的 config schema 是否有 `sections` 字段;若无,走路径 B。

### D5:必须新增 `tool-oxn-cli`(基于 tool-bash + 白名单)

**决议**:新增一行 plugin:

```yaml
- id: tool-oxn-cli
  name: '@deepseek-ai/dsh-tool-bash'
  config:
    whitelist: |
      ^oxn work (create|add-task|inject|validate|lock|unlock|run|submit|finalize|status|list|show|migrate|context)$
      ^oxn proof (create|probe add|run|list|show)$
      ^oxn blueprint (list|show)$
      ^oxn domain (list|show)$
      ^oxn assetmap (show|suggest)$
      ^oxn draft (list|show)$
    denyRegex: |
      \.openxenon/proofs/.*/frozen\.json
      \.openxenon/works/.*/state\.json
      \.openxenon/works/.*/tasks/.*/frozen\.json
      --force
```

**理由**:

1. standard preset 的 `tool-bash` 是**自由 shell**——模型可以拼任何命令,失去白名单守门。
2. oxn CLI 有明确的命令面(8 顶层命令族,见 `oxn-cli` Skill §全局选项),可枚举为 whitelist regex。
3. 4 个 denyRegex 对应**证据文件的不可写边界**——standard preset 默认不保护这 4 类路径。
4. 不需要新增 `isolate` realm(`tool-bash` 是 consumer,本身不发布服务,见 `editing-cordis-compositions` §The rule that catches people)。

**待 spike 确认**:whitelist / denyRegex 字段名实际叫什么(可能是 `allowedCommands` / `commandWhitelist` / `execPolicy.allowed`)。**这是落地前的 P0 blocker**。

### D6:不引入 tool-ralph,默认禁用

**决议**:`- id: tool-ralph` 行设置 `disabled: true`(从 standard preset 复制过来时已经存在,只需显式锁死)。

**理由**:

1. Work 的 round-loop 由 `work.oxn` 内 `loop_policy { max_iterations = N }` 控制,不需要 Ralph 的 fresh-agent round。
2. Ralph 模式是「fresh child + shared workspace」,**绕过** lock 边界(每个 fresh round 没有 planLock 概念)。
3. 锁后漂移检测需要**连续 session trace**——Ralph 会把 trace 切碎,破坏 IAP_ALIGN_LOCK_HASH_MISMATCH 的可追溯性。

### D7:Skill 发现走 standard 的 skill-filesystem,无需新增行

**决议**:**不新增** `- id: skill-filesystem` 与 `- id: tool-skill`(从 standard 继承即可)。

**理由**:

1. standard preset 已经注册 `skill-filesystem`(`@deepseek-ai/dsh-skill-filesystem`),它会自动扫描 `~/.opencode/skills/`。
2. OpenXenon 的 `oxn-work` / `oxn-asset` / `oxn-draft` 三个 Skill 编译产物在 `<cwd>/.opencode/skills/`,**只要 cwd 是 OpenXenon 仓库**就自动被发现。
3. skills registry 是 host-plane + per-scope layered,不需要 isolate realm。

**前置条件**:engineer 启动 oxn preset 时,**cwd 必须指向 OpenXenon 仓库根**(否则 skill-filesystem 找不到 `.opencode/skills/`)。

### D8:Isolate realm 划分沿用 standard,不得新增

**决议**:完整继承 standard preset 的 3 个 isolate group:

| group | isolate | 用途 |
|---|---|---|
| `planning` | `planMode: true` | plan mode 是 per-agent 的 |
| `compaction` | `compaction: true` + `toolResultPruner: true` | 折叠 + 裁剪是 per-agent 的 |
| `delegation` | `workflowEngine: true` | workflow 是 per-agent 的 |

**新增的 `tool-oxn-cli` 不进任何 realm**(它是 consumer,无 service publish)。

---

## 3 · Preset 文件结构(目标产物)

```
${DSH_HOME}/.agent-presets/oxn/
├── preset.yml                                # metadata(name + description + order)
└── agent.cordis.yml                          # composition(从 standard fork)
```

### 3.1 `preset.yml` 内容

```yaml
name: OXN 模式
description: 围绕 OpenXenon IAP 范式的 AI 协作模式,使用 oxn CLI 编排 Work/Task/Part;启动即注入 IAP 身份契约与 CLI 白名单,锁后漂移自动检测。
order: 5   # standard(1) / code(2) / minimal(3) / cordis(4) 之后
```

### 3.2 `agent.cordis.yml` 改动清单

| 来自 standard | 改动 | 行 |
|---|---|---|
| `- id: persona` | 替换 `text` 字段 | §3.3 |
| `- id: agent-instructions` | 不变 | - |
| `- id: tool-bash` | 不变(继承) | - |
| `- id: tool-fs` / `tool-fs-search` | 不变 | - |
| `- id: tool-jobs` | 不变 | - |
| `- id: skill-filesystem` / `tool-skill` | 不变 | - |
| `- id: tool-goal` | 不变 | - |
| `- id: planning` group | 不变 | - |
| `- id: compaction` group | 不变 | - |
| `- id: delegation` group | 不变 | - |
| `- id: tool-ralph` | **显式 `disabled: true`** | §D6 |
| `- id: tool-subagent-codex` | 不变(默认 disabled) | - |
| `- id: tool-subagent-claude-code` | 不变(默认 disabled) | - |
| `- id: tool-ask-user` / `tool-todo` / `tool-web` | 不变 | - |
| **新增** | `- id: tool-oxn-cli` | §D5 |
| (system prompt 段) | 由 `agent-instructions` + persona 承载,见 §D4 | - |

### 3.3 Persona 完整定义

```yaml
- id: persona
  name: '@deepseek-ai/dsh-persona'
  config:
    text: >-
      You are an AI agent working under the OpenXenon IAP (Intent–Align–Proof) protocol,
      collaborating with an OpenXenon engineer through the oxn CLI.
      You are NOT a general-purpose coding agent; you are bound by oxn's 8-phase Work lifecycle
      (create → add-task → validate → lock → run → submit → finalize) and the IAP_ALIGN_LOCK_HASH_MISMATCH
      boundary that fires the moment any .oxn asset drifts after lock.
      Your reading path is AGENTS.md §阅读与加载顺序 (L-1 → L0 → L1 → L2 → L3 → L4).
      Working directory: {{cwd}}.
      Model: {{model}}.
```

---

## 4 · 双层边界守门

DSH bash 沙箱 + oxn lock hash 是**两层独立边界**,不互相替代:

| 层级 | 守门 | 触发条件 |
|---|---|---|
| **DSH 层** | `tool-oxn-cli` 的 `whitelist` + `denyRegex` | 模型试图执行不在白名单的命令 / 试图写 4 类证据文件 |
| **oxn 层** | `IAP_ALIGN_LOCK_HASH_MISMATCH`(`oxn-engine-domain.md`) | `oxn work lock` 后任何 `.oxn` 资产漂移(workOxn / workDomains / blueprints / tasks 任一 hash 变) |

**两层的失败语义不同**:

- DSH 层失败 → 工具执行前拒绝(`bash-sandbox` 抛 error),模型收到 `[sandbox: command denied]`
- oxn 层失败 → 工具执行成功,但 OXN Engine 检测 hash 不一致,在 `frozen.json` 写入 `HASH_MISMATCH` 错误码,模型读 frozen.json 才知道

**反例**:不要试图用 DSH 层 denyRegex 替代 oxn 层 hash 守门——前者只能拦「命令面」,后者要拦「资产内容漂移」,语义不同。

---

## 5 · 落地路径

### 5.1 路径 A(用户级,推荐)

```
Step 0: spike @deepseek-ai/dsh-tool-bash 的 config schema
  ↓
Step 1: agentPresets.copy('standard', 'oxn', 'OXN 模式')
  ↓
Step 2: 编辑 preset.yml(metadata)
  ↓
Step 3: 编辑 agent.cordis.yml(替换 persona + 新增 tool-oxn-cli + 锁死 tool-ralph disabled)
  ↓
Step 4: agentPresets.standingKeyFor('oxn')  // mount-validate
  ↓
Step 5: 工程师实际启动 preset 跑 oxn work create smoke-test
```

### 5.2 路径 B(OpenXenon 仓库维护 preset 模板)

```
Step 0-1: 同路径 A
  ↓
Step 2: 在 packages/cli/src/skills/locales/oxn-dsh-preset/ 下写 preset.yml.template + agent.cordis.yml.template
  ↓
Step 3: 改 packages/cli/src/init.ts 让 oxn init -f 自动复制这两个文件到 ${DSH_HOME}/.agent-presets/oxn/
  ↓
Step 4: 跑 oxn init -f 验证写入路径
```

**推荐两条都做**:路径 A 是 spike 验证,路径 B 是长期 SSOT。

### 5.3 不做的事

- ❌ 不要 commit preset 文件进 OpenXenon 仓库根(它属于 ${DSH_HOME}/)
- ❌ 不要把 preset 文件塞进 .openxenon/(那是 Asset 边界,不是 DSH preset 边界)
- ❌ 不要试图从 cordis preset fork(那个 preset 是给 DSH 开发者用的,**不适合**普通工程师)
- ❌ 不要试图修改 standard preset(它是 shipped,会随部署升级被覆盖)

---

## 6 · 影响范围

| 维度 | 影响 |
|---|---|
| **DSH 部署** | 无——preset 是 per-user 的,不影响 host composition |
| **OpenXenon 代码** | `packages/cli/src/init.ts`(增量写入 preset 文件)+ `packages/cli/src/skills/locales/oxn-dsh-preset/` 新增目录 |
| **OpenXenon 资产** | 不动——preset 是 DSH 概念,不进 `.openxenon/` |
| **CLI** | `oxn init -f` 增量写入 preset 文件(已有流水线,无需新增命令) |
| **i18n** | `preset.yml` 的 `name` / `description` 走 zh-CN / en 双 locale,与 Skill SSOT 对齐 |
| **Skill** | 不新增——3 个 oxn-* Skill 已存在,preset 通过 skill-filesystem 自动发现 |
| **文档** | `docs/dev/zh-cn/architecture.md`(新增「DSH oxn 模式」章节)+ `docs/product/zh-cn/concepts/glossary.md`(新增 `DSHPreset` 词条) |
| **测试** | E2E:启动 oxn preset → `tool-skill` 列出 oxn-work / oxn-asset / oxn-draft → `oxn work create smoke --blueprint dev-workflow` → lock → drift .oxn → 触发 HASH_MISMATCH |

---

## 7 · 相关术语

| 术语 | context | 定义 |
|---|---|---|
| `Agent Preset` | `oxn-cli-domain.md`(待新增) | DSH 中一组 standing plugin composition + metadata,决定 AI Agent 启动时装备的工具 / 提示 / Skill |
| `Standing Mount` | `editing-cordis-compositions` Skill | preset 在 session 启动时一次性挂载到 standing scope,所有 session 通过 scope 继承 |
| `IAP` | `oxn-domain.md` | OpenXenon 三阶段协作范式:Intent(工程师主权) / Align(AI 主权) / Proof(OXN Engine 主权) |
| `Work / Task / Part` | `oxn-work-domain.md` | 8 阶段生命周期编排器(Work)、Align 执行单元(Task)、内联操作块(Part) |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | `oxn-engine-domain.md` | oxn 层边界错误码:lock 后 4 组件 hash 任一漂移 |
| `Isolate Realm` | `editing-cordis-compositions` §The rule | cordis:group 的 `isolate: true` 让 preset 拥有 per-session 服务实例 |
| `Whitelist` | `dsh-tool-bash` config(spike 确认) | bash 沙箱的命令白名单 regex |

---

## 8 · 相关决策

| 编号 | 主题 | 关联 |
|---|---|---|
| `RFC-0018-project-engineering-meta` | 5 级 → 2 档裁决 | AGENTS.md §裁决规则(本 RFC 落地后,DSH preset 模板归 Meta 层管理) |
| `RFC-0019-draft-promote-routing` | Draft Promote 路由 | 本 RFC 落地走 `oxn draft promote design-oxn-dsh-preset --target rfc` |
| `RFC-0027-asset-convergence-v070` | Asset 收敛 v2 | 本 RFC **不动** Asset 边界,只新增 DSH 侧 |
| `RFC-0028-context-map-deprecation` | CONTEXT-MAP 退役 | 本 RFC 用 AGENTS.md §阅读与加载顺序 作 L0 入口 |
| `RFC-0013-versioning-policy` | 版本号中性原则 | 本 RFC 标题 versionless(`RFC-0031: oxn-dsh-preset`),版本号只在 `.changes/` |

---

## 9 · 推迟 / 不在本 RFC 范围

- � DSH preset 自动更新机制(随 OpenXenon 版本走)— 留待 v0.8+
- ❌ preset marketplace / 第三方 preset 安装 — 留待 v0.8+
- ❌ preset 与 `.opencode/skills/` 之外的 skill 路径(如 git 仓库 skill) — 留待 v0.8+
- ❌ 多个 oxn preset 变体(`oxn-minimal` / `oxn-onboard`) — 留待 v0.8+
- ❌ preset 级 telemetry / 使用统计 — 留待 v0.8+

---

## 10 · 实施路径(v0.7.0 计划)

```
v0.7.0 Phase 1 (Spike, ~3 天)
  - cordis_inspect_query 探 dsh-tool-bash config schema(确认 whitelist / denyRegex 字段名)
  - 在临时 ${DSH_HOME}/.agent-presets/oxn/ 跑 agentPresets.standingKeyFor('oxn') 验证挂载

v0.7.0 Phase 2 (落地, ~1 周)
  - 路径 A:用户在 DSH 部署 fork standard preset + 编辑
  - 路径 B:OpenXenon 仓库写 packages/cli/src/skills/locales/oxn-dsh-preset/{preset,agent.cordis}.yml.template
  - 改 packages/cli/src/init.ts 让 oxn init -f 自动复制

v0.7.0 Phase 3 (验证, ~2 天)
  - 启动 oxn preset 跑 smoke test(work create → lock → drift → HASH_MISMATCH)
  - 跑 `oxn init -f` 在新环境验证自动写入
  - 在 AGENTS.md §入口指针 + dev/knowledge-loading.md §AI Agent 接入前置 段加 DSH preset 安装指引
```

---

## 11 · 反模式(明确禁止)

- ❌ 不要把 `oxn-work` Skill 全文复制进 persona / agent-instructions(Skill 已经按需加载,重复占 token 且版本漂移)
- ❌ 不要把 preset 文件 commit 进 OpenXenon 仓库根(它属于 ${DSH_HOME}/)
- ❌ 不要从 `minimal` preset fork(缺 plan / compaction / delegation,无法承载 IAP-Align)
- ❌ 不要从 `code` preset fork(Code Mode 绕过 lock hash 边界)
- ❌ 不要把 `tool-oxn-cli` 放进任何 isolate realm(它是 consumer,无 service publish)
- ❌ 不要在 preset 里调 `systemPrompt.section()` API(YAML 声明式 preset 不能调 API,要走 §D4 路径 A/B)
- ❌ 不要试图修改 shipped preset(`standard` / `code` / `minimal` / `cordis`)— `editing-cordis-compositions` §Off-limits 明确禁止
- ❌ 不要让 preset 替代 `oxn-work` Skill 的 SOP——preset 承载身份契约,Skill 承载操作 SOP,分工不可混

---

## 12 · 验证清单(mount-validate 后必跑)

| 检查项 | 命令 / 操作 | 预期 |
|---|---|---|
| Mount 成功 | `agentPresets.standingKeyFor('oxn')` | 返回 `ScopeKey`,无 rejection |
| Persona 替换 | 启动 preset 后模型第一句自我介绍 | 含「IAP protocol」,不含「coding agent powered by {{model}}」 |
| Skill 发现 | 模型调 `tool-skill` | 列出 `oxn-work` / `oxn-asset` / `oxn-draft` |
| Whitelist 工作 | 模型执行 `rm .openxenon/proofs/x/frozen.json` | DSH 层拒绝 + oxn 层 hash 守门 |
| Lock 后漂移 | `oxn work lock` 后改 `.openxenon/assets/blueprints/dev-workflow.md` | `oxn work submit` 时 `IAP_ALIGN_LOCK_HASH_MISMATCH` |
| Smoke test | `oxn work create smoke --blueprint dev-workflow --goal "verify preset"` | 走完 create → lock → run 三个 stage 无错 |

---

## Errata

<!-- status: ✅ Accepted (2026-08-14) — 实施探索完成,核心冻结,仅可追加 errata 段,version bump patch -->

### v0.3 (2026-08-14) — 实施完成,D4 路径 C 确认

> 详细描述见 `docs/rfc/zh-cn/RFC-0031-oxn-dsh-preset.md` Errata v0.3 段。
> 本段为简版同步,工程师 review 时以 docs/rfc/ 版本为准。

**RFC-0031 已 Accepted (2026-08-14)**。实施 work 全部 4 task 完成,产出 `spike-result.md` / `fork-result.md` / `edit-result.md` / `final-status.md` 共 912 行。

**关键发现**:

- D4 真实路径 = **路径 C**:`~/.dsh/AGENTS.md`(`dsh-agent-instructions` 自动加载),非原 RFC §3.4 假设的 sections 字段(不存在)
- D5 真实落地 = **动态 plugin + `tools.guard()`** + `~/.config/dsh/init.d/oxn-guard.js` DSH 自启动,非原 RFC §3.5 假设的 YAML config whitelist(不存在此字段)
- 8 决议中 6 个形式正确,2 个(D4/D5)经 spike 修正后语义不变

**沙箱边界**:全程未对 `~/.dsh/` 自动写入,工程师手动执行。

**后续工程师行动**:

1. 改 `~/.dsh/.agent-presets/oxn/preset.yml` metadata
2. 创建 `~/.dsh/AGENTS.md`(模板见 edit-result.md §6)
3. (可选)创建 `~/.config/dsh/init.d/oxn-guard.js`
4. 重启 DSH,选 oxn preset,跑 smoke test
5. 完成 = oxn 模式上线

### v0.1 (2026-08-14) — 实施探索中暴露的 CLI/Engine v1↔v2 解析错位

> 详细描述见 `docs/rfc/zh-cn/RFC-0031-oxn-dsh-preset.md` Errata v0.1 段。
> 本段为简版,工程师 review RFC 时以 docs/rfc/ 版本为准。

3 个错位(本期有 workaround,v0.7.0 修复):

- **E1**:CLI 不识别 v2 Blueprint 的 `## Slot` 段 → workaround 是 fork v1 `## Boundaries` 形态 Blueprint
- **E2**:fork builtin Blueprint 后 ref 解析不查 builtin dir → workaround 是 fork builtin Domain/Workflow/Stack 到 `.openxenon/assets/`
- **E3**:`--domain` 多值不写入 Task 段 → workaround 是手动复制到每个 task 的 `domain:` 行

#### v0.2 (待补) — D5 spike 结果回写

`oxn-dsh-preset-implement` work 的 write-doc task 完成后,spike `@deepseek-ai/dsh-tool-bash` config schema 的真实字段名应回写至此段。

#### v0.2 (2026-08-14) — D5 spike 完成

**核心发现**:`@deepseek-ai/dsh-tool-bash` 没有 `whitelist` / `denyRegex` config 字段。命令层守门走 `tools/pre-execute` waterfall + `tools.guard()`,**不是** preset YAML config。

**修正方案**:用 `cordis_define` 动态 plugin 注册 `tools.guard`(monotonic deny),实现等价语义。

详细描述见 `docs/rfc/zh-cn/RFC-0031-oxn-dsh-preset.md` Errata v0.2 段。
