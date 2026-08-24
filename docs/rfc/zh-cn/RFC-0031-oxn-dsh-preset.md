---
entity: rfc
id: RFC-0031
theme: oxn-dsh-preset
status: Accepted
date: 2026-08-14
accepted: 2026-08-14
accepted-at: 2026-08-14
synced-at: 2026-08-14
landing-files:
  - ~/.dsh/.agent-presets/oxn/agent.cordis.yml
  - ~/.dsh/.agent-presets/oxn/preset.yml
  - ~/.dsh/AGENTS.md
  - ~/.config/dsh/init.d/oxn-guard.js
landing-reason: declarative
---

# RFC-0031: 为 DeepSeek Harness (DSH) 提供 oxn 协作模式（Agent Preset）

> **主题**：在 DeepSeek Harness (DSH) 部署中新增一个名为 `oxn` 的 **agent preset**,让工程师启动 DSH 时可直接选择「oxn 模式」,以围绕 IAP( Intent–Align–Proof )范式 + oxn CLI + Work/Task/Part 编排体系工作。
> **来源**:2026-08-14 `/design` session(v0.6.4-alpha.0 + DSH 标准 preset fork 分析)
> **状态**:✅ **Accepted** (2026-08-14)— 实施探索完成,详见 Errata v0.3

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

### v0.1 (2026-08-14) — 实施探索中暴露的 CLI/Engine v1↔v2 解析错位

在 `.openxenon/.archived/works/rfc-0031-grilling/`(方法论探索 work,已 archive)与 `.openxenon/works/oxn-dsh-preset-implement/`(真实实施 work,已 lock + run)的执行过程中暴露 3 个 CLI/Engine 错位。本节记录供 RFC 实施者参考,不阻塞本 RFC,但需要在 v0.7.0 之前修复。

#### E1:CLI 不识别 v2 Blueprint 的 `## Slot` 段

**现象**:`oxn work create ... --blueprint promote-target-aware-workflow`(或 `draft-promote-router` / `bug-fix-blueprint` / `oxn-blueprint`)报 `OXN_INVALID_BLUEPRINT: Blueprint "X" has no boundaries`。

**根因**:v2.2.0 Blueprint 全部用 `## Slot` 段(参考 RFC-0009 + RFC-0019 §v0.3 收编),但 `packages/cli/src/commands/work.ts:451` 仍检查 `bp.boundaries ?? []`,CLI 校验逻辑没同步到 v2 形态。

**影响范围**:CLI 层 `oxn work create` / `oxn work add-task` 的 Blueprint 边界检查。Engine 解析器兼容 `## Slot` 与 `## Boundaries` 两种形式。

**Workaround**:本期 fork `packages/engine/src/builtin/blueprints/md-author-blueprint.md` 到 `.openxenon/blueprints/md-author-blueprint.md`(v1 `## Boundaries` 形态),用 v1 Blueprint 跳过校验。

**修复路径**:v0.7.0 把 `packages/cli/src/commands/work.ts:451` 的 `bp.boundaries` 检查改为 `bp.slots ?? bp.boundaries ?? []`,同步 v2 形态。建议作为独立 RFC-0032 立项。

#### E2:fork builtin Blueprint 后 ref 解析不查 builtin dir

**现象**:`oxn work lock` 报 `OXN_WORK_LOCK_FAILED: .work not lockable: schema-mismatch(fileHash must be sha256 hex)`。

**根因**:`packages/engine/src/Work/per-work-blueprints-merger.ts:212` 的 `resolveBoundaryAssetFile` 只查 `.openxenon/assets/{kind}/{name}.md`,**不查** `packages/engine/src/builtin/{kind}/{name}.md`。fork builtin Blueprint 后,Blueprint 内 `## Use` 引用的 builtin Domain/Workflow/Stack 的 fileHash 为空字符串,违反 `packages/engine/src/Work/birth-cert.ts:39` 的 SHA-256 hex schema。

**影响范围**:所有 builtin Blueprint 的 fileHash 解析路径。

**Workaround**:本期 fork builtin `doc-md-domain` / `md-author-workflow` / `md-stack` 到 `.openxenon/assets/{kind}/`,让 hash 解析成功。

**修复路径**:v0.7.0 在 `resolveBoundaryAssetFile` 加 fallback 检查 `packages/engine/src/builtin/{kind}/{name}.md`(走 oxn-builtin-registry)。

#### E3:`oxn work create --domain X --domain Y`(多 domain)CLI 接受但不写入 Task 段

**现象**:CLI 接受 `--domain` 多个值,但生成的 `work.md` 只在 `## Use` 顶层有 domain refs,**Task 段不继承**。`oxn work validate` 通过,但 Task 在执行时拿不到 domain 上下文。

**根因**:`packages/cli/src/commands/work.ts` 的 `work create` 渲染逻辑只把 domain refs 写进 `## Use`,没下推到 `## Tasks` 段。

**影响范围**:Work 编排时 Task-level Domain alignment 缺失。

**Workaround**:本期在 work.md 手动复制 `## Use` 的 domain refs 到每个 `### <task>` 段的 `domain: X` 行。

**修复路径**:v0.7.0 改 CLI 渲染,让 `--domain` 自动下推到 Task 段,或加 `--domain-task <task>=<domain>` 显式绑定。

---

### v0.2 (待补) — D5 spike 结果回写

> ⚠️ **占位段已废弃**(Accept 后 Errata 不可删,只能标注废弃)。真实 D5 spike 结果见下一段 `v0.2 (2026-08-14)`。

### v0.2 (2026-08-14) — D5 spike 完成:D5 必须重写

**核心发现**:`@deepseek-ai/dsh-tool-bash` **没有** `whitelist` / `denyRegex` config 字段。RFC-0031 §3.5 D5 的原假设**错误**。

**运行时验证依据**:

1. `@deepseek-ai/dsh-tool-bash/README.md:49`:命令层 allow/deny/ask policy 走 **`tools/pre-execute` waterfall**(host-plane Cordis 事件),**不是** preset-level config 字段。
2. `@deepseek-ai/dsh-bash-sandbox/README.md`:文件读写层走 `sandboxPolicy` 服务(`workspace-write` mode + 不可变 `workspaceRoot`)。**这不限制具体命令**,只限制文件读写。
3. `cordis_inspect_query platform=host provider=Service method=listService input={"service":"tools"}` 返回 `tools.guard(guard: ToolGuard)` 签名:"Register a **monotonic guard** after the extensible `tools/pre-execute` waterfall. A plain-context guard applies globally; one registered through `agent.ctx` applies only to that agent. Any matching guard may deny by returning a reason, while no guard can force-allow a call another guard denied."
4. `standard` preset 的 `tool-bash` 行无 config 字段:`- id: tool-bash, name: '@deepseek-ai/dsh-tool-bash', disabled: !!js process.platform === 'win32'`。

**D5 重写(替代方案)**:

| 原方案 | 新方案 |
|---|---|
| `- id: tool-oxn-cli` 基于 `tool-bash` + config.whitelist + config.denyRegex | 通过 `cordis_define` 动态 plugin 注册 `tools.guard`,在 `tools/pre-execute` waterfall 后做命令前缀 + deny regex 拦截 |

**新方案代码骨架**:

```js
// dynamic plugin via cordis_define
return {
  name: 'oxn-cli-guard',
  inject: ['tools'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.tools.guard((event) => {
        const cmd = event.input?.command ?? ''
        // 白名单:仅 oxn CLI 顶层命令族
        if (!/^oxn (work|proof|blueprint list|domain list|assetmap|draft list) /.test(cmd)) {
          return 'oxn mode: command outside CLI whitelist'
        }
        // 黑名单:--force + frozen.json 写入
        if (/--force/.test(cmd)) return 'oxn mode: --force forbidden'
        if (/\.openxenon\/(proofs|works).*frozen\.json/.test(cmd)) {
          return 'oxn mode: frozen.json write forbidden'
        }
        return null  // allow
      })
    )
  },
}
```

**影响**:

- RFC-0031 §3.5 D5 必须重写(本 Errata 替代)
- RFC-0031 §3.3 改动清单中"`- id: tool-oxn-cli`(基于 `tool-bash` + whitelist/denyRegex)"改为"动态 plugin + tools.guard"
- RFC-0031 §5 路径 A 落地步骤 spike 段更新
- 本 RFC 主体不需要其他改动(D1/D2/D3/D4/D6/D7/D8 假设正确)

**Work 状态**:spike-result.md 已写于 `.openxenon/works/oxn-dsh-preset-implement/spike-result.md`(211 行)。

**后续动作**:

- `oxn-dsh-preset-implement` work 的 `validate-doc` task 必须按新方案写 preset(动态 plugin 而非 YAML config 行)
- `oxn-dsh-preset-implement` work 的 `publish-doc` task 跑 mount-validate 时,需要把动态 plugin 注入到 preset(用 `cordis_define` + `cordis_run`)

> 📌 **结论**:RFC-0031 v0.1 的 D5 决策**形式上错误**,**语义上正确**——命令白名单仍然实现,只是从 YAML config 改为 JS guard plugin。这不阻塞 RFC Accepted。

---

### v0.3 (2026-08-14) — 实施完成 + D4 路径 C 确认

`oxn-dsh-preset-implement` work 全部 4 task 完成。本节记录实施过程中的关键发现 + D4 真实路径(替代原 RFC §3.4 路径 A/B)。

#### 实施产物(完整 4 task)

| Task | RFC 决议 | 产出文件 | 行数 |
|---|---|---|---|
| write-doc | D5 spike | `spike-result.md` | 211 |
| edit-doc | D1+D6+D7+D8 fork | `fork-result.md` | 196 |
| validate-doc | D3+D4(重写后)+D5(重写后)配置 | `edit-result.md` | 271 |
| publish-doc | mount-validate + smoke test 文档化 | `final-status.md` | 234 |

#### D4 真实路径:路径 C(替代原 §3.4 路径 A/B)

**RFC-0031 v0.1 §3.4 假设**:`@deepseek-ai/dsh-agent-instructions` 有 `sections` config 字段,可写入 IAP 接入前段。

**实施 spike 揭示**:

1. `dsh-agent-instructions/lib/types/config.d.ts` 真实 Config schema 只有 `dshHome` / `projectRootMarkers` / `maxBytes` / `instructionFileCandidates` / `localInstructionFileCandidates`——**无 `sections` 字段**。
2. `dsh-agent-instructions/lib/types/render.d.ts:39` → `USER_GLOBAL_FILE = "AGENTS.md"`
3. `dsh-agent-instructions/lib/index.js:16` → `DEFAULT_INSTRUCTION_FILE_CANDIDATES = ["AGENTS.md", "CLAUDE.md"]`
4. `dsh-agent-instructions/lib/index.js:554` → `const userGlobal = join(config.dshHome, USER_GLOBAL_FILE);`
5. `scopesByDirectory` 按目录分组,**多个 AGENTS.md 都被加载,合并渲染,不覆盖**——project AGENTS.md 更具体所以 precedence 优先

**真实落地路径 C**:

| 段 | 放哪里 | 原因 |
|---|---|---|
| persona 简短声明 | `~/.dsh/.agent-presets/oxn/agent.cordis.yml` 中 `- id: persona` 段 | 启动时显式身份 |
| IAP 接入前段全文 | **`~/.dsh/AGENTS.md`** | `dsh-agent-instructions` 自动加载 user-global AGENTS.md |
| 项目级指令 | OpenXenon 仓库 `<cwd>/AGENTS.md`(已存在) | project root AGENTS.md,与 user-global 合并渲染 |
| 命令白名单守门 | `~/.config/dsh/init.d/oxn-guard.js`(DSH 自启动) + `tools.guard()` | 动态 plugin 注册,monotonic deny |

**D4 真实代码骨架**(写入 `~/.dsh/AGENTS.md`):

```markdown
# AGENTS.md — OXN 模式身份契约

## 你是谁
[三方协作模型 + IAP 三阶段 + OXN 通道边界]

## CLI 白名单
[§允许命令清单 + §禁止清单]

## 输出约定
[file_path:line_number + 完成状态附 oxn work status --json]

## 失败处理
[5 个错误码处置]
```

完整模板见 `.openxenon/works/oxn-dsh-preset-implement/edit-result.md` §6 step 3。

#### D5 真实落地(完全替代原 §3.5)

**RFC-0031 v0.1 §3.5 D5 假设**:用 YAML config 配 `@deepseek-ai/dsh-tool-bash` 的 `whitelist` / `denyRegex`。

**实施 spike 揭示**:

1. `@deepseek-ai/dsh-tool-bash/README.md:49`:命令层 allow/deny/ask 走 `tools/pre-execute` waterfall,**不是** preset-level config。
2. `@deepseek-ai/dsh-tool-bash/lib/types/index.d.ts:6`:`TODO(permissions): deployment policy belongs in tools/pre-execute`。
3. `cordis_inspect_query` 运行时验证:`tools.guard(guard: ToolGuard)` 是 **monotonic deny** 机制。
4. `standard` preset 的 `tool-bash` 行无 config 字段:`- id: tool-bash, name: '@deepseek-ai/dsh-tool-bash', disabled: !!js process.platform === 'win32'`。

**真实落地**:`cordis_define` 动态 plugin + `~/.config/dsh/init.d/oxn-guard.js` DSH 自启动脚本:

```js
module.exports = {
  name: 'oxn-cli-guard',
  inject: ['tools'],
  apply(ctx) {
    ctx.effect(() =>
      ctx.tools.guard((event) => {
        const cmd = event.input?.command ?? ''
        if (!/^oxn (work|proof|blueprint (list|show)|...) /.test(cmd))
          return `oxn mode: command outside CLI whitelist: ${cmd}`
        if (/--force/.test(cmd))
          return `oxn mode: --force forbidden: ${cmd}`
        if (/\.openxenon\/(proofs|works).*frozen\.json/.test(cmd))
          return `oxn mode: frozen.json write forbidden: ${cmd}`
        return null
      })
    )
  },
}
```

#### 沙箱边界声明

**实施全程未对 `~/.dsh/` 做自动写入**。所有 preset 文件改动由工程师手动执行(详见 fork-result.md §3 + edit-result.md §6)。原因:当前 DSH 部署通过 `npx @deepseek-ai/dsh web` 启动,本会话 sandbox = `workspace-write`,home 目录被拒。

按 sandbox escalation 规则,真正写入需 escalate 到 `danger-full-access`(取消所有限制),本 RFC 决定**不 escalate**——理由:

1. `~/.dsh/` 是持久 host root,不属于单次 session
2. 写入 home = 持久状态变更,工程师保留控制权
3. fork 是低频可审计动作,工程师手动跑更安全
4. DSH 启动时已物化 shipped preset root,新文件不热加载,需重启 DSH 才生效

#### RFC 决策回顾

| 决策 | RFC v0.1 | 真实落地(v0.3) | 决策有效性 |
|---|---|---|---|
| **D1** fork standard preset | ✅ 不变 | ✅ 不变 | ✅ 有效 |
| **D2** 用户级 preset 路径 | ✅ 不变 | ✅ 不变 | ✅ 有效 |
| **D3** 替换 persona | ✅ 不变 | persona 保持简洁,IAP 段放 AGENTS.md | ✅ 有效(略调) |
| **D4** 注入 IAP 段 | 路径 A(sections) / 路径 B(persona.text) | **路径 C(`~/.dsh/AGENTS.md`)** | ⚠️ 形式修正,语义不变 |
| **D5** 命令白名单 | YAML config whitelist | **动态 plugin `tools.guard()`** | ⚠️ 形式修正,语义不变 |
| **D6** 锁 tool-ralph | ✅ 不变 | ✅ 不变 | ✅ 有效 |
| **D7** skill-filesystem 继承 | ✅ 不变 | ✅ 不变 | ✅ 有效 |
| **D8** 沿用 isolate realm | ✅ 不变 | ✅ 不变 | ✅ 有效 |

**总结**:8 个决策 6 个有效,2 个(D4/D5)需要形式修正——**结论不变**(oxn preset 在 DSH 中可行),**实现路径变更**(从 YAML config 改为 JS plugin + AGENTS.md 文件)。

#### RFC 状态

**`status: Draft` → `status: Accepted`** (2026-08-14)

**Accepted 依据**:

1. ✅ 8 决议中 6 个形式正确,2 个(D4/D5)经 spike 修正后语义不变
2. ✅ 实施探索 work 全部 4 task 完成,产出 4 个 markdown 文档总计 **912 行**
3. ✅ 守门通过:`bun scripts/check-doc-boundary.ts` → 0 violations
4. ✅ 工作流程验证:`oxn work create` → `add-task` → `validate` → `lock` → `run` → `submit ×4` 全跑通

**未交付(工程师手动)**:

- ⏳ `~/.dsh/.agent-presets/oxn/preset.yml` metadata 改动
- ⏳ `~/.dsh/AGENTS.md` 创建
- ⏳ `~/.config/dsh/init.d/oxn-guard.js` 创建
- ⏳ mount-validate 真实执行(下次 DSH session)
- ⏳ smoke test 真实执行(下次 DSH session)

#### 落地文件清单(工程师执行后落盘)

| 文件路径 | 大小 | 状态 |
|---|---|---|
| `~/.dsh/.agent-presets/oxn/agent.cordis.yml` | 13114 B | ✅ 已 fork + D6 改动 |
| `~/.dsh/.agent-presets/oxn/preset.yml` | 176 B | ✅ 已 fork(待 metadata 改) |
| `~/.dsh/AGENTS.md` | ~80 行 | ⏳ 待创建 |
| `~/.config/dsh/init.d/oxn-guard.js` | ~30 行 | ⏳ 待创建 |

#### 引用

- 实施 work: `.openxenon/works/oxn-dsh-preset-implement/`
- 实施产物:`spike-result.md` + `fork-result.md` + `edit-result.md` + `final-status.md`
- 方法论探索 work(已 archive):`.openxenon/.archived/works/rfc-0031-grilling/`
- RFC-0031 设计草案:`.openxenon/drafts/design-oxn-dsh-preset.md`(同步)

