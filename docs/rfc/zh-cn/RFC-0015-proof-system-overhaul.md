---
entity: rfc
id: RFC-0015
theme: proof-system-overhaul
status: Draft
date: 2026-07-31
supersedes: []
superseded-by: ~
related:
  - RFC-0008: docs/rfc/zh-cn/RFC-0008-naming-evolution.md
  - RFC-0002: docs/rfc/zh-cn/RFC-0002-kernel-l0.md
  - RFC-0011: docs/rfc/zh-cn/RFC-0011-builtin-asset-two-layer.md
  - ADR-0066: docs/adrs/0066-terminology-simplification.md
  - ADR-0072: docs/adrs/0072-oxn-as-referent-for-nondeterministic-agent.md
  - ADR-0084: docs/adrs/0084-collaboration-boundary-layering.md
  - ADR-0085: docs/adrs/0085-oxn-environment-characterization.md
  - ADR-0086: docs/adrs/0086-taint-trust-baseline-design.md
  - RFC-0016: docs/rfc/zh-cn/RFC-0016-generic-verification-probes.md
synced-at: 2026-08-01
---

# RFC-0015: Proof 体系重整——产物命名 / Taint 接入 / 注册表收敛 / Probe 分层

> **类型**：RFC（OpenXenon 规范）
> **主题**：proof-system-overhaul
> **状态**：📝 Draft（评审中，未执行）
> **来源**：2026-07-31 grilling session（domain-modeling skill，第二轮）
> **批次**：Proof / Probe / Verdict 子系统整体重整

## 摘要

对 [Proof](/product/zh-cn/concepts/glossary.html#proof) / Probe / Verdict 子系统进行 6 项设计审视后形成的整体重整方案。覆盖四项核心问题：

1. **产物命名规范化** —— 修复半完成的 Verdict → outcome 术语迁移（[RFC-0008 D2](./RFC-0008-naming-evolution.html#d2verdict-三层拆分) 仅改了文件值未改标识符）与 `proof.md` 同名冲突（源 vs 快照）
2. **Taint 机制接入执行路径** —— 当前 12-flag RED/YELLOW 机制在真实 `oxn proof run` 中是死代码（Provider 实现 flag 检测但 19 个 probe handler 全部绕过 Provider 直连 IO）
3. **注册表同步强化** —— Catalog / Verdict Strategy / Probe Handler 三注册表的同步仅靠 1 个集成测试维护，存在 drift 风险
4. **Probe 集合分层收敛** —— 弃 2 个纯别名 + **8 个 OXN-internal probe**（4 旧 + 4 新生命周期 probe）统一为 `@prj/` 项目级 + 工具绑定 probe 可配置化。**通用 builtin probe 扩展**（file-hash / test-coverage / json-path / port-listening）不在本 RFC 范围，拆至 [RFC-0016 通用验证 probe 扩展](./RFC-0016-generic-verification-probes.html) 独立推进。

本 RFC 分 4 期执行（Phase 1–4），按风险从低到高排序。本文件为 Draft，仅落盘设计，**不立即执行任何代码变更**。

## 决策要点

### D1：产物命名规范化

Proof 子系统当前产出的 7 个文件命名混乱，存在 name/value 不匹配与同名冲突两类问题。

#### D1.1: `PROOF_VERDICT_MD` 常量名与值矛盾——系统性重命名

**现状**：[RFC-0008 D2](./RFC-0008-naming-evolution.html#d2verdict-三层拆分) 已正式弃用 "Verdict" 术语，文件值已改 `verdict.md → outcome.md`（commit b7153eb），但**常量名和整个模块名仍是 Verdict**：

| 旧标识符 | 新标识符 |
|---|---|
| `PROOF_VERDICT_MD` | `PROOF_OUTCOME_MD` |
| `verdict-writer.ts` | `outcome-writer.ts` |
| `writeVerdictMd()` / `readVerdictMd()` / `buildVerdictMd()` | `writeOutcomeMd()` / `readOutcomeMd()` / `buildOutcomeMd()` |
| `getProofVerdictPath()` | `getProofOutcomePath()` |
| `verdictWritten` / `hasVerdict` | `outcomeWritten` / `hasOutcome` |
| `renderVerdictHuman()` | `renderOutcomeHuman()` |
| `VerdictMdBody` / `BuildVerdictMdParams` | `OutcomeMdBody` / `BuildOutcomeMdParams` |

**决策**：执行系统性重命名（grep `verdict` 在 `packages/engine/src/Proof/` + `packages/cli/src/commands/proof.ts` 全量替换）。

**反向**：旧名 `verdict.md` 通过 deprecation alias 保留 1 个大版本（v0.8.x 仍可读取），v0.9 物理删除。

#### D1.2: `proof.md` 同名冲突——快照改名为 `work-snapshot.md`

**现状**：`PROOF_FILE`（Probe 声明源，0o644，可编辑）和 `PROOF_MD_FILE`（work.md 不可变快照，0o444）是同一字符串 `'proof.md'` 但语义角色冲突。`snapshotWorkMd()`（proof.ts:195-242）用 work.md 内容**覆盖** Probe 声明源，首次 run 后声明被摧毁。

**决策**：快照文件改名为 `work-snapshot.md`，与 proof.md（源）物理隔离。

```
.openxenon/proofs/<name>/
├── proof.md              ← Probe 声明源（DSL，0o644，编辑器可改）
├── frozen.json           ← 机器 SSOT（0o444 + SHA-256）
├── outcome.md            ← 人类 SSOT（0o444 + SHA-256）
├── work-snapshot.md      ← work.md 不可变字节副本（0o444）
├── work-hash.txt         ← work-snapshot.md 的 SHA-256
└── .running.json         ← 瞬态占位
```

**对应常量改动**：`PROOF_MD_FILE = 'work-snapshot.md'`（从 `'proof.md'` 改）。

#### D1.3: `PROOF_RUNNING_JSON` 移入 kernel 常量

**现状**：`PROOF_RUNNING_JSON = '.running.json'` 是 `packages/cli/src/commands/proof.ts:76` 的 local const，未在 `packages/engine/src/kernel/constants.ts` 注册，未通过 kernel barrel 导出。

**决策**：移入 `packages/engine/src/kernel/constants.ts`，与其他 Proof 产物文件常量共置。

#### D1.4: 清理 stale 引用

| 位置 | stale 内容 | 修复 |
|---|---|---|
| `README.en.md:80` | `Proof (\`frozen.json\` + \`verdict.md\`)` | `outcome.md` |
| `docs/product/en/_index.md:23,32,87` | 3 处 `verdict.md` | `outcome.md` |
| `.openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md:121` | `frozen.json + verdict.md + content_hash + planLock` | `outcome.md` |
| `packages/engine/src/Proof/proof-frozen-writer.ts:11-12` 注释 | `PASSED` / `FAILED` | `COMPLETED` / `DEVIATED`（[RFC-0008 D3](./RFC-0008-naming-evolution.html#d3三态字段重命名) 已改名，注释未同步） |

### D2：Taint 机制接入执行路径

**核心问题**：[InterferenceFlag](/product/zh-cn/concepts/glossary.html#interferenceflag)（12-flag RED/YELLOW 信任基线）在真实 `oxn proof run` 中是**死代码**——4 个 Provider 实现了 flag 检测，但 19 个 probe handler 全部绕过 Provider 直接做 IO。

#### D2.1: 全部 probe handler 改经 Provider 做 IO

**现状**：

| Provider | 实现的 flag 检测 | 注册位置 |
|---|---|---|
| `FileProvider` (`infra/providers/file-provider.ts:45-52`) | `symlink` / `just_modified` / `cache_path` / `permission_denied` | `daemon-startup.ts:44-47` |
| `HttpProvider` (`infra/providers/http-provider.ts:48-83`) | `waf_detected` / `cdn_cache` / `response_truncated` / `network_timeout` / `unknown` | 同上 |
| `ShellProvider` (`infra/providers/shell-provider.ts:86-95`) | `sandbox_violation` / `network_timeout` / `unknown` | 同上 |
| `GitProvider` (`infra/providers/git-provider.ts:76-84`) | `detached_head` / `shallow_clone` / `unknown` | 同上 |

**问题**：

- Provider 只在 2 处被使用：`work-precheck.ts:21`（依赖检查）和 `sandbox.ts:281`（第三方校验）
- 19 个 probe handler 全部直连 IO：`fs-exists.ts:17` `statSync()`、`http-responds.ts:49` `fetch()`、`shell-exec.ts:60` `spawn()`、`git-clean.ts` 直接 spawn git
- 结果：`observation.interference` 永远 `undefined` → `verdict.ts:706` `?? []` → `applyTrustBaseline([], ...)` → 12-flag 机制永不触发

**决策**：全部 19 个 probe handler 改为经 Provider 做 IO。每个 handler 持有对应 Provider 引用（如 `fs-*` 用 `FileProvider`），构造 `ProbeObservation` 时填入 `interference.flags`。

**例外处理**：`fs-content-match` / `fs-parseable` / `shell-exec` / `http-responds` 等已有直接 IO 代码——改造范围包含所有需要 flag 检测的 IO 操作。`deps-resolved`（纯 JS 解析 lockfile，无 IO Provider）保持现状。

**L0/L1 边界保持**：Provider 仍位于 L1-Infra，handler 改造不改变 L0 Kernel 的"兰姆达真空"约束。

#### D2.2: 补 Taint 独立 ADR

**现状**：设计父文档 `.openxenon/forges/2026-06-14-probe-signal-taint-design.md v2` 已被 5 个源文件引用（`file-provider.ts:6` / `http-provider.ts:6` / `shell-provider.ts:6` / `git-provider.ts:6` / `provider-registry.ts:6`），但 glob 返回空（forge 文档已随 forges 目录废弃归档）。

**决策**：补独立 ADR `0086-taint-trust-baseline-design.md`，固化：
- 12 flag 的选取理由（vs 阈值调参哲学）
- RED/YELLOW 硬编码语义（[trust-baseline.ts:5-8](./RFC-0008-naming-evolution.html#d10验证结果不是错误核心原则)："信任是系统决策，不是用户决策"）
- Provider-Handler 接线契约（谁填 flag、何时填、Provider 失败降级）

#### D2.3: 补 shell-provider / git-provider 单测

**现状**：`packages/engine/src/infra/providers/__tests__/` 仅有 `file-provider.test.ts` + `http-provider.test.ts`，缺 shell + git provider 测试。

**决策**：补 `shell-provider.test.ts`（`sandbox_violation` / `network_timeout` / `unknown` 触发场景）+ `git-provider.test.ts`（`detached_head` / `shallow_clone` / `unknown` 触发场景）。

#### D2.4: 补 e2e flag 流转测试

**现状**：所有现有 e2e 测试通过 mock `flags: []` 绕过 flag 流转，从未在真实 IO 路径上断言 flag 被检测并触发 INCONCLUSIVE。

**决策**：补 `tests/integration/probe-taint-flow.test.ts`，覆盖：

| 场景 | 触发 flag | 期望 outcome |
|---|---|---|
| `http-responds` 超时（`localhost:1` with `timeout: 100`） | `network_timeout` | INCONCLUSIVE |
| `shell-exec` 命令注入 metachar | `sandbox_violation` | INCONCLUSIVE |
| `git-clean` 在 detached HEAD | `detached_head` | INCONCLUSIVE |
| `fs-exists` 命中 symlink | `symlink` | COMPLETED + `interferenceFlags: ['symlink']` |

### D3：注册表同步强化

#### D3.1: 删除 `PROBE_STRATEGY_MAPPINGS` 死表

**现状**：`packages/engine/src/kernel/contracts/probe-port.ts:84-102` 定义 `PROBE_STRATEGY_MAPPINGS` 表，全代码库无引用（grep 0 hits），且只列 15 项 probe，缺 4 个 v0.6.2 doc-* probe（`heading-skeleton-check` / `docs-heading-check` / `doc-boundary` / 1 more）。

**决策**：物理删除，必要时由 Catalog 自动生成（`assertCatalogConsistency` 内部派生）。

#### D3.2: `assertCatalogConsistency` 扩展为 3-way 检查

**现状**（`packages/engine/src/kernel/verdicts/catalog.ts:756-778`）：仅查 catalog 内部不变量：
1. `semanticName` 唯一
2. `inputs[].name` 在 entry 内唯一
3. `inputMap` keys ⊆ `inputs[].names`

不查跨注册表同步。

**决策**：扩展为 3-way 检查：
1. 每个 catalog entry → handler 在 `probeHandlers` 或 alias 表可达
2. 每个 catalog entry → strategy 在 `PROBE_VERDICT_STRATEGIES` 或 alias 表可达
3. 每个 handler/strategy → 至少一个 catalog entry 引用（防孤儿）

**L0 边界处理**：3-way 检查需要触达 L1（`probeHandlers`），但 L0 Kernel 不能 import L1。**解法**：将检查函数放在 L2（`packages/engine/src/kernel/verdicts/catalog-consistency.ts`，仍 L0 但通过传入 handler/strategy 注册表作为参数），或在 L3 CLI 层（`packages/cli/src/commands/proof/probe-lint.ts`）做静态扫描。

**推荐方案**：L3 静态扫描——避免破坏 L0 纯净度，且只在使用 CLI 时跑一次，不影响运行时性能。

#### D3.3: 启动时调用一致性检查

**决策**：`oxn proof probe list` 与 daemon 启动时调用 D3.2 的检查函数，发现 drift 直接 `IAPError('PROOF', 'PROBE_REGISTRY_DRIFT')` 报错。

### D4：Probe 集合收敛

#### D4.1: 弃用 2 个纯别名

| 别名 | 证据 | 处理 |
|---|---|---|
| `git-status-clean` | handler `git-status-clean.ts:14-19` 纯委托 `executeGitClean`；verdict `gitStatusCleanStrategy` 与 `gitCleanStrategy` 结构相同 | 保留别名 1 版本（v0.8.x），v0.9 删 |
| `exec_exit_zero` | 无独立 handler，仅 alias 表项；verdict `= shellExecStrategy` 赋值；`migrate-probe-refs.ts` 已有迁移工具 | 按计划 v1.3 删除 |

**执行机制**：通过 `migrate-probe-refs.ts` 自动迁移项目内的 probe 引用。

#### D4.2: 8 个 OXN-internal probe 统一为 `@prj/` 项目级

**决策**：以下 8 个 probe 从 `@oxn/` builtin 移至 `@prj/` scope（`/Users/issac/pro/openxenon/.openxenon/assets/probes/`）——**4 个旧 probe**（已存在，待迁移）+ **4 个新生命周期 probe**（commit 63b50dd 已实现但误标 `@oxn/`，待修正 scope）：

| Probe | OXN 专属证据 | 外部项目可用性 |
|---|---|---|
| `doc-boundary` | 6 条规则硬编码 OXN 目录结构（docs/product, docs/dev, docs/rfc, .openxenon/drafts, .openxenon/assets） | 无 |
| `heading-skeleton-check` | 5 种 POOL_SPECS 是 OXN pool 格式（research/design/issue/audit/journal），要求 `pool` param | 无 |
| `docs-heading-check` | DOCS_CHAPTER_SPEC 要求 What→Why→How→参考 | 极低（仅采纳 OXN 章节模板的项目） |
| `docs-build` | 硬编码 `bun run docs:build`（VitePress） | 极低 |
| `boundary-guard` | 验证 work.md `## Tasks` 段 blueprint/domain/boundary/deps refs，OXN Work 模型专属 | 无 |
| `stale-pool-check` → **`stale-draft-check`** | 验证 drafts 文档 references[] 解析，OXN 中间层文档流专属 | 无 |
| `asset-migrate-check` | 验证 `.openxenon/.archived/assets/` 完整性（metadata.json + `## Archival` marker + 无 forward ref），OXN Asset 模型专属 | 无 |
| `oxn-runtime-version` | 校验 `.openxenon/config.json` 的 `runtime.oxnVersion` 与 `packages/engine/package.json` version 一致，OXN 引擎专属 | 无 |

**实施步骤**（适用于全部 8 个 probe）：
1. 创建 `/Users/issac/pro/openxenon/.openxenon/assets/probes/<name>.md`（@prj/ scope 的 .md 资产描述）
2. 从 `packages/engine/src/kernel/verdicts/catalog.ts` 将 8 条 entry 的 `builtin: 'oxn'` 改为 `'prj'`，`internalRef` 从 `@oxn/probes/<name>` 改为 `@prj/probes/<name>`
3. 4 个旧 probe：从 `packages/engine/src/infra/probes/index.ts` 移除 4 个 handler；4 个新 probe 保留 handler（仅改 catalog 标注）
4. 4 个旧 probe：从 `packages/engine/src/kernel/verdicts/verdict.ts` 移除 4 个 strategy；4 个新 probe 保留 strategy
5. 4 个旧 probe：`src/builtin/probes/` 下 4 个 .md 物理删除（之前是 @oxn/ 的载体）
6. 测试 fixture 中 `proof.md` 引用 `@oxn/probes/<name>` 改为 `@prj/probes/<name>`

**@prj/ 机制就绪性**：根据 [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.html) D2 + [ADR-0072](../../adrs/0072-oxn-as-referent-for-nondeterministic-agent.md)，@prj/ scope 解析器 + workspace manager 已实现，本次落地是首次实际启用。

**教训（commit 63b50dd 反面教材）**：4 个新 OXN-internal 生命周期 probe 在 commit 63b50dd 直接创建为 `@oxn/` builtin（catalog 标 `builtin: 'oxn'`），导致 @oxn/ builtin 数量从 15 涨到 19，**方向与 D4.2 相反**——本应该直接创建为 `@prj/` scope，避免后续再移。**未来 OXN-internal probe 创建规约**：必须直接创建为 `@prj/` scope，不允许先放 `@oxn/` 再迁移。

#### 收敛后 builtin 数量

19 → **9 个**（弃 2 别名 + 移 8 个 OXN-internal 到 @prj/）

### D5：工具绑定 probe 可配置化

**现状**：4 个 probe 硬绑定 OXN 自身工具链：

| Probe | 硬编码工具 | 证据 |
|---|---|---|
| `test-pass` | `bun test` | `test-pass.ts:39` `['bun', 'test']` 字面量 |
| `lint-check` | `biome` | `lint-check.ts:40` `['npx', 'biome', 'check']` 字面量 |
| `ts-compiles` | `tsc` (via `bun x`) | `ts-compiles.ts:90` `['bun', 'x', 'tsc']` 字面量 |
| `docs-build` | `bun run docs:build` (VitePress) | `docs-build.ts:35` 字面量 |

**问题**：使用 jest/vitest 的项目无法用 `test-pass`，使用 eslint/prettier 的项目无法用 `lint-check`——这些 probe 对外部项目而言是冗余。

**对照范例**：`deps-resolved` 是好范例（`deps-resolved.ts:105-118` 自动侦测 bun.lock/package-lock/pnpm-lock/yarn.lock），不应改动。

#### D5.1: handler 读 `StackToolInfo` 覆盖硬编码命令

**现状**：[v0.7.3 P6](.openxenon/pools/sprints/v0.7-stacks-probes/design/) 已设计 `StackToolInfo` 注入机制（`packages/engine/src/kernel/contracts/probe-port.ts:42-68`），Blueprint `use.stack` 可声明工具栈，但 **4 个 handler 都没读 `stackTools` 参数**。

**决策**：4 个 handler 改造为：
1. 优先读 `params.stackTools.<field>`（运行时覆盖）
2. 次之读 `context.stackTools.<field>`（Blueprint 注入）
3. 最后回退当前硬编码（默认值）

**StackToolInfo schema 字段**：

```typescript
interface StackToolInfo {
  testCommand?: string         // e.g. ['bun', 'test'] / ['npx', 'jest']
  lintCommand?: string         // e.g. ['npx', 'biome', 'check'] / ['npx', 'eslint']
  typecheckCommand?: string    // e.g. ['bun', 'x', 'tsc', '--noEmit']
  docsBuildCommand?: string    // e.g. ['bun', 'run', 'docs:build']
  // ... 更多按需扩展
}
```

#### D5.2: `deps-resolved` 维持现状（不改动）

作为"自适应范例"参考。

### D6：OXN-internal 生命周期 probe 补缺（4 个 `@prj/` probe）

**主题**：补全 OXN 项目自身结构完整性的 4 个验证 probe——验证对象是 OXN 的 Work/Asset/Pool/Runtime 模型，对外部项目零价值，统一 `@prj/` scope（与 D4.2 同类）。

**原则**：
- 优先一等公民（handler + verdict + catalog），仅在 shell-exec 无法等价表达时用之
- 直接创建为 `@prj/` scope，不允许先放 `@oxn/` 再迁移（D4.2 教训）
- 修复 commit 63b50dd 初始实现的 4 个 probe 的设计瑕疵（硬编码 / 死代码 / 逻辑重复 / 强耦合）

**代码现状**：4 个 probe 的 handler、verdict strategy、catalog entry、test 已在 commit 63b50dd 落地（1607 行 / 26 个测试）。D6 包含 scope 修正 + 4 个设计修复 + 1 个 probe 改名。

#### D6.1: `boundary-guard`（高优先级）

| 维度 | 内容 |
|---|---|
| 验证 | `.openxenon/works/<name>/work.md` 中 `## Tasks` 段每个 task 的 `blueprint` / `domain` / `boundary` / `deps` 引用正确性 |
| L1 实现 | 读 work.md → `parseMarkdown` + `collectHeadingContexts` + `collectListFields` 提取 task fields → 与 `.openxenon/assets/blueprints/` + `.openxenon/assets/domains/` + OXN builtin 域做 set 查重；`deps[]` 任务名在同 work 内 `## Tasks` 段下能找到 |
| L0 verdict | 任何 task ref drift 即 fail，强制工程师 review |
| catalog entry | `builtin: 'prj'` + `internalRef: '@prj/probes/boundary-guard'` |

**修复项（commit 63b50dd 设计瑕疵）**：
- ❌ 当前硬编码 9 个 OXN builtin domain name（`boundary-guard.ts:54-64` `OXN_BUILTIN_DOMAINS` 静态 Set）——新增/重命名 domain 时会 drift
- ✅ 改为运行时从 `@oxn/domains/` registry 动态读取（与 DomainCompiler 单一源），不再硬编码

#### D6.2: `stale-pool-check` → `stale-draft-check`（高优先级——修复死代码）

| 维度 | 内容 |
|---|---|
| 验证 | `.openxenon/drafts/**/*.md` 文档的 `references[]` 字段指向的 asset 在当前 active registry 中能找到（未归档 / 未删除） |
| L1 实现 | 递归扫 `drafts/` 下 `.md` → 提取 references[]（list 形式 + 多行 YAML 形式）→ `resolveAssetFile` / `resolveArchivedAssetFile` 判定状态（`active` / `archived` / `missing`） |
| L0 verdict | 有 archived 或 missing refs → fail |
| catalog entry | `builtin: 'prj'` + `internalRef: '@prj/probes/stale-draft-check'` |

**修复项（commit 63b50dd 死代码）**：
- ❌ 当前 `stale-pool-check` 验证 `.openxenon/pools/`——**该目录已被 `.openxenon/drafts/` 替代（v0.6.x 迁移），当前 OXN 项目中不存在**；probe 永远返回 `poolCount: 0, passed: true`，是死代码
- ✅ 改名 `stale-draft-check`，扫描 `.openxenon/drafts/` 替代
- ✅ 重新设计 `extractPoolReferences` 为 `extractDraftReferences`，适配 drafts 文档的 3 种 references 形式（list item / inline / multi-line YAML）
- ✅ 删除旧的 `stale-pool-check.ts` handler + catalog entry + verdict strategy

**关联 ADR**：v0.6.x 文档三层架构迁移（`pools/` → `drafts/`）见 AGENTS.md "文档三层架构" 段。

#### D6.3: `asset-migrate-check`（中优先级）

| 维度 | 内容 |
|---|---|
| 验证 | `.openxenon/.archived/assets/<kind>s/<name>.md` 的 3 项完整性 |
| 检查 1 | 同名 `.metadata.json` 存在且含 `archiveAt` / `reason` / `sourceKind` / `sourceName` 4 字段 |
| 检查 2 | `.md` body 含 `## Archival` H2 marker |
| 检查 3 | 当前 active asset registry 无 forward ref（违反 "无引用方可归档" 契约） |
| L1 实现 | 扫 `.archived/assets/` 5 类目录 → 读 `.md` + `.metadata.json` → 简单 YAML 解析 + active assets `references[]` 反向索引 |
| L0 verdict | 任何 incomplete + stale ref → fail |
| catalog entry | `builtin: 'prj'` + `internalRef: '@prj/probes/asset-migrate-check'` |

**修复项（commit 63b50dd 逻辑重复）**：
- ❌ `asset-migrate-check.ts:89-130` 重新实现 `extractReferencesForCheck`（自实现 reference 解析）——与 `Asset/internal/reference-checker.ts` 的 `listAssetReferences` 功能重叠
- ❌ `asset-migrate-check.ts:175` `void listAssetReferences(root)` 调用但不用结果（死调用，注释称 "保 L1-Infra reference-checker 入口稳定" — 无意义）
- ✅ 删除 `extractReferencesForCheck` 自实现，复用 `reference-checker.ts` export
- ✅ 删除 `void listAssetReferences` 死调用

#### D6.4: `oxn-runtime-version`（中优先级）

| 维度 | 内容 |
|---|---|
| 验证 | `.openxenon/config.json` 的 `runtime.oxnVersion` 与 `packages/engine/package.json` 的 `version` 字段一致 |
| L1 实现 | 读 `.openxenon/config.json` → 提取 `runtime.oxnVersion`（fallback `runtime.version`）→ 读 `packages/engine/package.json` → 取 `version` 字段 → 字符串相等 |
| L0 verdict | mismatch → fail；未配置 `expected` → skip（passed 不报错） |
| catalog entry | `builtin: 'prj'` + `internalRef: '@prj/probes/oxn-runtime-version'` |

**修复项（commit 63b50dd 强耦合）**：
- ❌ `oxn-runtime-version.ts:55-89` 通过 `import.meta.url` 路径上溯（`../../../../package.json` 等 4 个候选）找 `packages/engine/package.json`——深度耦合 OXN engine 物理布局，文件移动或 bundling 模式变化即断
- ✅ 改为从 `ProbeContext` 注入 `engineVersion`（由 L2 协调器从 `packages/engine/package.json` 读取并传入），handler 不再做物理路径解析
- ✅ 这也降低了 L0/L1 边界张力——probe handler 不再依赖 `import.meta.url` 这种运行时元信息

### D6 总结

| Probe | scope | 验证对象 | 设计修复 |
|---|---|---|---|
| `boundary-guard` | @prj/ | work.md task refs | 硬编码 builtin domain 列表 → 动态 registry |
| `stale-draft-check` | @prj/ | drafts references | 改名 + 扫 drafts/ 替代 pools/（修死代码） |
| `asset-migrate-check` | @prj/ | .archived/assets 完整性 | 删除重复 / 死调用 |
| `oxn-runtime-version` | @prj/ | config.runtime.oxnVersion | import.meta.url 上溯 → context 注入 |

每个 probe 实施规模：~60-230 行 handler + ~30-80 行 verdict + ~30 行 catalog entry + 配套单测（4 个 probe 已有 26 测试，D6 修复后预计维持或略增）。

### D7：分期执行顺序

按风险从低到高：

```
Phase 1 (D1): 产物命名规范
  ├─ D1.1 PROOF_VERDICT_MD → PROOF_OUTCOME_MD 全模块重命名
  ├─ D1.2 PROOF_MD_FILE → PROOF_WORK_SNAPSHOT_FILE ('work-snapshot.md')
  ├─ D1.3 PROOF_RUNNING_JSON 移入 kernel/constants.ts
  └─ D1.4 清理 stale 引用（英文文档 + 注释）
  
  风险：低（纯重命名 + 文档清理，无逻辑变更）
  依赖：无

Phase 2 (D3 + D4): 注册表强化 + Probe 收敛
  ├─ D3.1 删除 PROBE_STRATEGY_MAPPINGS 死表
  ├─ D3.2 assertCatalogConsistency 扩展为 3-way（L3 静态扫描）
  ├─ D3.3 启动时调用一致性检查
  ├─ D4.1 弃用 git-status-clean + exec_exit_zero
  └─ D4.2 4 个 OXN-internal probe 移 @prj/ 项目级
  
  风险：中（变更集合，需 D3.2 同步机制保障 D4.2 的 catalog 改动不出 drift）
  依赖：D3 必须在 D4.2 之前落地（否则 @prj/ 迁移期间无法验 catalog↔handler↔strategy 一致）

Phase 3 (D2): Taint 接入执行路径
  ├─ D2.2 补 taint 独立 ADR（0086-taint-trust-baseline-design）
  ├─ D2.3 补 shell-provider / git-provider 单测
  ├─ D2.1 全部 19 个 probe handler 改经 Provider 做 IO
  └─ D2.4 补 e2e flag 流转测试
  
  风险：高（改 handler 执行路径，影响最大；Provider 接口契约需明确）
  依赖：D2.2 必须先于 D2.1（设计先行）；D2.3 可与 D2.1 并行

Phase 4 (D4.2 + D5 + D6): OXN-internal 收敛 + 可配置化 + 生命周期 probe
  ├─ D4.2 8 个 OXN-internal probe 标 `builtin: 'prj'`（4 旧 + 4 新 commit 63b50dd）
  ├─ D5.1 test-pass/lint-check/ts-compiles/docs-build handler 读 StackToolInfo
  ├─ D5.2 deps-resolved 维持现状（参考范例）
  ├─ D6.1 boundary-guard probe 修复（硬编码 → 动态 registry）
  ├─ D6.2 stale-pool-check → stale-draft-check 改造（修死代码）
  ├─ D6.3 asset-migrate-check probe 修复（去重 + 删死调用）
  └─ D6.4 oxn-runtime-version probe 修复（import.meta.url → context 注入）
  
  风险：低-中（向前兼容；D5.1 改现有 handler 但保留默认值回退；D6 修复均有限定 scope）
  依赖：D4.2 必须在 D6 之前完成（catalog scope 修正后才能跑 3-way 一致性）；D5.1 可与 Phase 3 D2.1 合并评审
```

**合并建议**：Phase 3（D2.1 改 handler）与 Phase 4（D5.1 改 handler）合并为单期，因为都是改 handler 执行路径，合并评审可减少回归测试成本。最终顺序：

```
Phase 1 (D1): 命名规范                  — 低风险，1 周
Phase 2 (D3 + D4.2): 注册表+OXN-internal 收敛 — 中风险，2 周
Phase 3 (D2 + D5): Taint 接入 + 可配置化  — 高风险，3 周（含回归）
Phase 4 (D6): OXN-internal 生命周期 probe 修复 — 中风险，2 周
```

### D8：每次 Phase 必跑 6 项验证（[RFC-0010 D5](./RFC-0010-frozen-errata.html)）

```
bun run typecheck
bun run lint
bun run check         # biome
bun test              # 约 1700+ 测试
bun scripts/validate-dependencies.ts
bun scripts/check-doc-boundary.ts
```

## 影响范围

### Phase 1 落地声明
- ✅ `PROOF_VERDICT_MD` → `PROOF_OUTCOME_MD` 常量名（保留 alias 1 版本）
- ✅ `PROOF_MD_FILE` → `PROOF_WORK_SNAPSHOT_FILE` + `'proof.md'` → `'work-snapshot.md'`
- ✅ `PROOF_RUNNING_JSON` 移入 `kernel/constants.ts`
- ✅ `verdict-writer.ts` → `outcome-writer.ts` 模块重命名
- ✅ `writeVerdictMd` / `buildVerdictMd` / `getProofVerdictPath` 等函数重命名
- ✅ 3 处英文文档 stale `verdict.md` 引用清理（README.en.md:80 + _index.md:23,32,87 + draft RFC:121）
- ✅ 1 处 stale `PASSED/FAILED` 注释清理

### Phase 2 落地声明
- ✅ `PROBE_STRATEGY_MAPPINGS` 死表物理删除
- ✅ `assertCatalogConsistency` 3-way 扩展 + L3 静态扫描入口（probe-lint.ts:95）
- ✅ `oxn proof probe list` + daemon 启动时调用一致性检查（proof.ts:436 + daemon/server.ts:24）
- ✅ `git-status-clean` 标记 deprecated（catalog.ts:443 `exec_exit_zero` 通过 alias-only 隐式 deprecated）
- ✅ 8 个 OXN-internal probe 标 `builtin: 'prj'`（4 旧 + 4 新 commit 63b50dd，catalog.ts:515-654）
- ⏳ `.openxenon/assets/probes/` 添加 4 个新 probe 的 .md 描述（@prj/ scope — 待 D4.2 完整闭环时建）
- ✅ `@prj/probes/` scope 首次实际启用（catalog + handler + verdict strategy 三注册表均支持 @prj/）

### Phase 3 落地声明
- ✅ ADR-0086: taint 独立 ADR（`docs/adrs/0086-taint-trust-baseline-design.md`，Accepted 2026-07-31）
- ✅ 全部 19 个 probe handler 改经 Provider 做 IO（10 个直改 + 5 个 tool-binding 通过 _tool-resolver 间接覆盖 + 3 个老 OXN-internal probe 新增 FileProvider stat-only 集成）
- ✅ `shell-provider.test.ts` / `git-provider.test.ts` 单测（`packages/engine/src/infra/providers/__tests__/`）
- ✅ `tests/integration/probe-taint-flow.test.ts` e2e（probe-taint-flow.test.ts 存在）

### Phase 4 落地声明
- ✅ StackToolInfo schema 完善（probe-port.ts:61-68 已声明）
- ✅ 4 个工具绑定 handler 读 StackToolInfo（test-pass/lint-check/ts-compiles/docs-build 全部走 _tool-resolver.ts）
- ✅ D6.1 boundary-guard 修复：硬编码 builtin domain 列表 → 运行时扫 `.openxenon/assets/domains/` + 无副本时回退到 fallback 集合（boundary-guard.ts:50-92）
- ✅ D6.2 stale-pool-check → stale-draft-check 改造：改名 + 扫 `drafts/` 替代 pools/ + 重写 `extractDraftReferences` 适配 3 种 references 形式（stale-draft-check.ts + 测试）
- ✅ D6.3 asset-migrate-check 修复：删除 `extractReferencesForCheck` 自实现（复用 `reference-checker.ts:103 extractReferences`）+ 删除 `void listAssetReferences` 死调用（asset-migrate-check.ts + reference-checker.ts export）
- ✅ D6.4 oxn-runtime-version 修复：删除 `import.meta.url` 路径上溯，改为 `ProbeContext.engineVersion` 注入（probe-port.ts:53-60 + oxn-runtime-version.ts + index.ts:582 readEngineVersion helper）
- ✅ Probe 配套单测 + e2e 维护（boundary-guard.test.ts:9 + stale-draft-check.test.ts:7 + oxn-runtime-version.test.ts:7 + asset-migrate-check.test.ts 行为不变 = 30+ test 维护）

**RFC-0015 全部 D 决策点落地完成（2026-08-01）。** 6 项验证全部通过（typecheck/lint/biome/test/validate-deps/check-doc-boundary）。

### 不在本 RFC 范围
- ❌ Insight / ProbeStats 算法重构（与 RFC-0005 区分）
- ❌ Work/Asset 体系（RFC-0004）
- ❌ 文档站点 VitePress 配置
- ❌ 通用验证 probe 扩展（file-hash / test-coverage / json-path / port-listening）—— 拆至 [RFC-0016 通用验证 probe 扩展](./RFC-0016-generic-verification-probes.html)

## 相关术语

- [Proof](/product/zh-cn/concepts/glossary.html#proof) — 验证体系顶层
- [Probe](/product/zh-cn/concepts/glossary.html#probe) — 单条验证声明
- [ProbeOutcome](/product/zh-cn/concepts/glossary.html#probeoutcome) — Verdict 三层拆分第一层（[RFC-0008 D2](./RFC-0008-naming-evolution.html#d2verdict-三层拆分)）
- [outcome](/product/zh-cn/concepts/glossary.html#outcome) — Verdict 三层拆分第二层
- [InterferenceFlag](/product/zh-cn/concepts/glossary.html#interferenceflag) — Taint 12 flag
- [Asset](/product/zh-cn/concepts/glossary.html#asset) — 5 类 AssetKind（Domain/Workflow/Stack/Blueprint/Roadmap）

## 相关决策

- [RFC-0008 命名/演进策略](./RFC-0008-naming-evolution.html) — D2 Verdict 拆分 + D3 三态字段重命名（本 RFC D1.1 续）
- [RFC-0002 Kernel/L0 边界](./RFC-0002-kernel-l0.html) — L0 兰姆达真空约束（本 RFC D3.2 / D2.1 边界依据）
- [RFC-0011 内置 Asset 两层机制](./RFC-0011-builtin-asset-two-layer.html) — `@prj/` override + `@oxn/` fallback（本 RFC D4.2 落地依据）
- [RFC-0010 RFC frozen+errata 演进策略](./RFC-0010-frozen-errata.html) — D5 每次变更必跑 6 项验证（本 RFC D8）
- [ADR-0066](../../adrs/0066-terminology-simplification.md) — 术语精简立法（[RFC-0008 D1](./RFC-0008-naming-evolution.html#d1废弃-7-个裁判视角术语adr-0066)）
- [ADR-0072](../../adrs/0072-oxn-as-referent-for-nondeterministic-agent.md) — Asset = 工程师维护的确定性参照锚点
- [ADR-0084](../../adrs/0084-collaboration-boundary-layering.md) — 协作边界分层（本 RFC D4.2 OXN-internal probe 移 @prj/ 的协作语义支撑）
- [ADR-0085](../../adrs/0085-oxn-environment-characterization.md) — OXN 环境 6 轴表征（本 RFC 涉及环境维度判据参考）

## Errata

> 本段用于后续追加修正说明。核心决策自 RFC-0015 Draft 起评审，尚未冻结。

### 2026-08-01：D6 重写 + 落地状态更新（v0.6.2-alpha.2）

- **D6 主题变更**：原 §D6 设计 4 个通用 builtin probe（file-hash / test-coverage / json-path / port-listening）；commit 63b50dd 实现了 4 个 OXN-internal 生命周期 probe（boundary-guard / stale-pool-check / asset-migrate-check / oxn-runtime-version）但代码注释错误标注 "RFC-0015 D6.x"。本次重写 §D6 适配实际实现的 4 个 probe，并修复 4 个设计瑕疵（D6.1-D6.4）。
- **D6.2 stale-pool-check → stale-draft-check 改名**：原 probe 扫描已废弃的 `.openxenon/pools/` 目录（v0.6.x 迁移至 `.openxenon/drafts/`），是事实上的死代码。改造为扫描 drafts/。
- **D6.4 oxn-runtime-version import.meta.url → context 注入**：原 handler 通过 `import.meta.url` 路径上溯找 `packages/engine/package.json`，强耦合 engine 物理布局。改为 ProbeRunner 注入 `context.engineVersion`。
- **D4.2 扩展**：从 4 个旧 OXN-internal probe 扩展为 8 个（4 旧 + 4 新 commit 63b50dd）；收敛后 `@oxn/` builtin 数量从 13 修订为 9。
- **D1.4 清理完成**：3 处 stale `verdict.md` 引用清理（README.en.md:80 + docs/product/en/_index.md:23,32,87 + .openxenon/drafts/rfc/v0.7-domain-hierarchy-restructure-rfc.md:121）。
- **D6 拆分**：通用 builtin probe 扩展（file-hash / test-coverage / json-path / port-listening）拆至 [RFC-0016](./RFC-0016-generic-verification-probes.html) 独立推进，避免 RFC-0015 "重整" 主题被通用能力扩展拖累。
- **落地状态**：D1.1-D1.4 + D2.1 + D3.1-D3.3 + D4.1-D4.2 + D5.1 + D6.1-D6.4 全部落地。6 项验证通过（typecheck/lint/biome/test/validate-deps/check-doc-boundary）。

### 2026-08-01：frontmatter `related` 补 ADR-0086 + RFC-0016

- ADR-0086（Taint Trust Baseline）作为 RFC-0015 D2.2 落地的独立 ADR，纳入 related
- RFC-0016（通用验证 probe 扩展）作为 RFC-0015 §D6 拆分承接方，纳入 related
