---
version: 0.7.3
date: 2026-07-17
type: minor
rfc:
  - .openxenon/docs/rfcs/v0.7.3-ideal-data-flow-rfc.md
adr:
  - .openxenon/docs/adrs/0061-data-flow-contract.md
---

# 0.7.3 — 理想态数据流 runtime 闭环（P0 alpha.1 + P1 alpha.2 + P2 alpha.2 + P3 alpha.3 + P4 alpha.3 + P5 beta.1 + P6 beta.1 + P7 GA）

> 本 changelog 记录 v0.7.3 理想态数据流 RFC 的 **P0 alpha.1 + P1 alpha.2 + P2 alpha.2 + P3 alpha.3 + P4 alpha.3 + P5 beta.1 + P6 beta.1 + P7 GA** 落地：
> P0 = ADR-0061 立法 + RFC 定稿；
> P1 = F1 + F2 修复（BlueprintIR + Domain language 注入）；
> P2 = readDomainFile regex → mdast 切换，修 ## Terms: 后缀 + multiline - desc: | 两个 parser bug；
> P3 = D1 + D2 多视角 term 视图（Task 多 Domain 主/背景视角 + 块状渲染 + token 预算缓解）；
> P4 = D3 Boundary.observe 与 Task.probes lock 期 hard-check（F4 part 1 + D3）；
> P5 = D4 Workflow.slot DAG 与 Task.deps DAG 闭包校验（F4 part 2 + D4）；
> P6 = D5 Stack.tools 注入 Probe runtime（F4 part 3 + D5）；
> P7 = D6 Work `## Refs` 旧 `kind: domain` 软警告（不阻断 lock，为 v0.8.0 硬阻断预留窗口）；
> P8 = ADR-0055/0060 runtime 状态标注更新
> 将在 P8 落地后合并 v0.7.3 GA changelog。

## P0 核心交付

### RFC 定稿

- **`.openxenon/docs/rfcs/v0.7.3-ideal-data-flow-rfc.md`** 从 `pools/drafts/` 提升并定稿（状态 `📝 Draft` → `🟢 Accepted`）
- 4 个数据流断裂点（F1-F4）+ 7 个决策（D1-D7）全部锁定

### ADR-0061 立法

- **`.openxenon/docs/adrs/0061-data-flow-contract.md`** 新建（状态 🟢 Accepted）
- 数据流契约：Blueprint → Work → Task runtime integration
- 整合 RFC §2（理想态数据流）+ §3（D1-D7 决策）+ §4（P0-P8 phased landing）+ §5（非功能约束）
- 跨引用：ADR-0054（三边界框架）+ ADR-0055（Blueprint 组合模板）+ ADR-0060（Domain 词汇边界）

### ADR INDEX 更新

- `.openxenon/docs/adrs/INDEX.md` §4 Work/Asset 分类追加 ADR-0061 条目
- ADR 落地状态表追加 ADR-0061 行（v0.7.3 P1-P8 渐进落地，指向 `docs/zh-cn/work.md` 数据流段）

## 承接 Work

- **`.openxenon/works/v073-ideal-data-flow/`** — P0 已 lock + run + submit（implement part passed）
- 后续 P1-P8 将在同一 Work 下追加 task，按 RFC §4 phased landing 推进

## P1-P8 路线图（占位 · 待后续 changelog 记录）

| Phase | 内容 | 版本 | 状态 |
|---|---|---|---|
| P1 | `work-context-builder.ts` 读 `blueprints.json`，注入 `BlueprintIR` + 边界 Domain IR | v0.7.3-alpha.2 | ✅ 已落 |
| P2 | Domain 注入路径 regex → mdast 切换 | v0.7.3-alpha.2 | ✅ 已落 |
| P3 | Task 多 Domain 主/背景视角注入；`## Allowed Language` 渲染格式升级 | v0.7.3-alpha.3 | ✅ 已落 |
| P4 | Boundary.observe 与 Task.probes lock 期校验 | v0.7.3-alpha.3 | ✅ 已落 |
| P5 | Workflow slot DAG 与 Task deps DAG 闭包校验 | v0.7.3-beta.1 | ✅ 已落 |
| P6 | Stack.tools 注入 Probe runtime | v0.7.3-beta.1 | ✅ 已落 |
| P7 | Work `## Refs` 旧 `kind: domain` 软警告 | v0.7.3-GA | ✅ 已落 |
| P5 | Workflow.slot DAG 与 Task.deps DAG 闭包校验 | v0.7.3-beta.1 | ⏳ 待启动 |
| P6 | Stack.tools 注入 ProbeRunner | v0.7.3-beta.1 | ⏳ 待启动 |
| P7 | Work `## Refs` 旧 `kind: domain` deprecation warn | v0.7.3 | ⏳ 待启动 |
| P8 | ADR-0054/0055/0060 标注"runtime 已实现" | v0.7.3 | ⏳ 待启动 |

## P1 alpha.2 核心交付

### 修复点（RFC §1）

- **F1 修复**：`work-context-builder.ts` 现在真正读 `works/<w>/blueprints.json`
  - 新增 `loadPerWorkBlueprints(projectRoot, workName)` helper（包装 `loadPerWorkBlueprintsIndex`）
  - 新增 `summarizeBlueprints(idx)` 把 PerWorkBlueprintsIndex 压成 BlueprintIRSummary
  - WorkContextResult 新增 `blueprintIR?: BlueprintIRSummary` 字段
- **F2 修复**：从 Blueprint 边界 refs 加载 Domain language
  - 新增 `loadDomainLanguagesFromBlueprint(blueprintIR, projectRoot)` helper
  - 解析 Blueprint `domainRefs[]` → 读 Domain 文件 → 注入 `language{terms,bans,invariants}`
  - WorkContextResult 新增 `domainLanguages?: DomainLanguageEntry[]` 字段
  - **backward compat**：blueprints.json 缺失 → 不注入新字段（老 Work 兼容）

### CLI 端 mirror

- `packages/cli/src/commands/work.ts` 的 `work context` 命令镜像 engine 修复
- 同样的 F1+F2 逻辑 inline 应用（CLI 有独立输出 schema `level/workContext`）
- 避免单点修复：engine + CLI 双端注入

### 测试覆盖

- 6 个新测试 in `packages/engine/src/Work/__tests__/work-context-builder.test.ts`：
  - F1: `blueprints.json` 存在 → context 含 `blueprintIR` 字段
  - F2: blueprint domainRefs 引用的 Domain → language 被加载
  - backcompat: `blueprints.json` 缺失 → 字段省略（老 Work 兼容）
  - boundary: blueprint 引用不存在的 Domain → 跳过该条目（不抛错）
  - helper: `loadPerWorkBlueprints` 直接读取 + 解析
  - helper: `loadPerWorkBlueprints` 文件不存在 → 返回 null

### 验收门槛

- `bun test`：1538 pass / 3 skip / 0 fail
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- `oxn work context v073-ideal-data-flow --json` 输出含 `blueprintIR` + `domainLanguages` 字段

### 已知边界

- P1 仅修复 engine `work-context-builder.ts` + CLI `work context`；不涉及 task-level F3（F3 是 P3 范围）
- `oxn-domain terms=[]` 现象源于 `readDomainFile` 解析 bug（RFC §1 §2.3 注；P2 已修）

## P2 alpha.2 核心交付

### 修复点（RFC §1 §2.3 注）

- **`readDomainFile` 改走 mdast-based extractor**
  - `packages/engine/src/oxl/summary-extractors.ts` 重写为 `parseMarkdown()` + `extractDomainIR()` 实现
  - 保留 `.oxn` 格式 regex fallback（向后兼容 v0.6.x legacy work）
  - Externals 仍走 regex（extractDomainIR 不覆盖）

- **`packages/engine/src/oxl/md-pipeline/transformers/domain.ts` 升级**
  - `extractDomainIR` 支持 `## Terms: <Group>` 后缀（RFC §1 §2.3 标注的 parser bug #1）
  - DomainBan 新增 `itemsFromItemsList` 标志区分真实 `- items:` 列表 vs `- desc:` fallback
  - `collectListFields` 支持 YAML block scalar `|` `|-` `>+`（multiline `- desc: |`）

- **`packages/engine/src/oxl/md-pipeline/utils.ts` 升级**
  - `collectListFields` regex 加 `'s'` flag 让 `.` 匹配 newline（支持 multiline desc）
  - YAML block scalar 标记 `|` `|-` `>+` 识别 + 剥除首行（保留正文）

### 修复的 3 个 parser bug（RFC §1 §2.3 注）

| Bug | 修复前 | 修复后 |
|---|---|---|
| `## Terms: <Group>` 后缀 | regex `## Terms\n` 不匹配 `## Terms: Work`，全部 0 个 term | extractDomainIR 支持后缀，7 active domain 平均 12+ terms |
| multiline `- desc: \|` | regex `.+` 不跨行，只捕获 `\|` | 跨行捕获 + YAML block scalar 识别，desc 完整 |
| `- items:` 列表 | 完全忽略 | 完整展开为 ban 数组（oxn-work-domain 18 forbidden-constructs → 25 ban entries） |

### 测试覆盖

- 5 个新测试 in `packages/engine/src/oxl/__tests__/summary-extractors.test.ts`：
  - `## Terms: <Group>` 后缀 → 全部 terms 被捕获（多组）
  - multiline `- desc: |` → 多行文本合并为单 desc
  - `- items:` 列表 → ban items 展开
  - 集成：Terms: 后缀 + multiline + items 同一文件
  - regression：7 active domain 真实文件 readDomainFile 后关键字段不空

### 验收门槛

- `bun test`：1543 pass / 3 skip / **0 fail**（P1 测试同步更新为新格式）
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- `oxn work context v073-ideal-data-flow --json` 的 `domainLanguages[oxn-domain].language.terms` 不再为空（实测 16 terms）

## P3 alpha.3 核心交付

### 决策落地（ADR-0061 §D1 + §D2）

**D1 - Task 多 Domain 主/背景视角注入**：
- 保持 TaskIR schema 不变（task.domain 仍是单值字段 = 主对齐视角）
- Blueprint.use.domain[] 派生 background Domains（除 taskDomain 外）
- Background Domain 加载 language（terms/bans/invariants）
- 同名 term 聚合：每个 main term 找 background 同 name term，附加视图

**D2 - 多视角 term 注入格式（块状 + 视角标注）**：
- `## Allowed Language (multi-view)` 段渲染升级
- 每个同名 term 聚合为 H4 子节
- 子节下按 Domain 视角列多行：`[Domain名]` 行内前缀 + desc
- Main 视角标注 `isMain=true` + `[main]` 标签
- nameOnly 标注 `isNameOnly=true` + `[name-only]` 标签

**Token 预算缓解（RFC §5.1）**：
- 前 3 个 background Domain 满注入（terms + bans + invariants 全文）
- 4+ background Domain 仅 term name 列表（不附 desc）
- 背景视角仅注入与主视角同名 term 的 desc

**CLI `--context-mode` flag**：
- `--context-mode full`（默认）：多视角 + termViews 聚合
- `--context-mode lean`：单 Domain 模式（保留 compat 路径）

### 代码改动

| 文件 | 内容 |
|---|---|
| `packages/engine/src/Work/work-context-builder.ts` | contextMode param + TermView 类型 + termViews 字段 + buildTermViews helper + partitionBackgroundDomains helper + 渲染升级 + findBoundaryAssetFile export |
| `packages/cli/src/commands/work.ts` | `--context-mode` flag + 镜像 engine 修复 + renderContextHuman 升级 + 任务级主 Domain 路径修复（`.openxenon/domains/` → `.openxenon/assets/domains/`）|
| `packages/engine/src/Work/__tests__/work-context-builder.test.ts` | +11 测试（buildTermViews × 5 / partitionBackgroundDomains × 3 / 渲染 × 3）|

### 修复的 pre-existing 路径 bug

- `findBoundaryAssetFile` 改用 `resolveAssetCandidates`（兼容 v0.7 primary `assets/domains/` + v0.6 fallback `domains/`）
- 老代码 hardcoded `.openxenon/domains/`，导致任务级主 Domain 永远加载失败（即使文件存在）
- P3 fix: task-level 主 Domain 现在能正确加载 → injectedDomains 含 main role + role tag 出现在 human 渲染中

### 验收门槛

- `bun test`：1554 pass / 3 skip / **0 fail**
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- `oxn work context --task p0-rfc-finalize --context-mode full --json`：
  - `injectedDomains`：2 entries（main + background）
  - `allowedLanguage.contextMode: 'full'`
  - `allowedLanguage.termViews`：25 项（10 main + 15 background 独有）
  - multi-view term 例：`Asset` term 同时有 main + background 视图
- `oxn work context --task p0-rfc-finalize --context-mode lean --json`：
  - `injectedDomains`：1 entry（仅 main）
  - `allowedLanguage.contextMode: 'lean'`
  - `allowedLanguage.termViews`：undefined（BWC preserved）

### human 渲染对比

**Full mode**:
```
## Allowed Language (multi-view)
> Main view: `oxn-asset-domain` · Background views: `oxn-domain`
> Token budget: 前 3 个 background 满注入（同名 term desc），其余仅 term 名列表
### Terms
#### Asset
- [oxn-asset-domain [main]] Asset 是 E1 工程师定义边界的资产；...
- [oxn-domain] 工程师的资产，定义 AI Agent 工作时需要遵守的边界。具体领域见
```

**Lean mode**:
```
## Allowed Language (lean mode)
Terms (must use): Asset, AssetKind, AssetMode, ...
```

## P4 alpha.3 核心交付

### 决策落地（ADR-0061 §D3）

**D3 - Boundary.observe 与 Task.probes lock 期 hard-check**：
- Task 内 `- probe: @oxn/probes/<name>` 必须 ∈ Task 对齐 slot 的 `Blueprint.boundaries[].observe[]`
- 顶层 `## Probes` 段同理
- lock 期校验失败 → `throw IAPError(INTENT, PROBE_OUT_OF_BOUNDARY, YIELD_TO_HUMAN, ...)`
- CLI 输出 JSON `code: IAP_INTENT_PROBE_OUT_OF_BOUNDARY` + violations 列表

### 代码改动

| 文件 | 内容 |
|---|---|
| `packages/engine/src/kernel/contracts/iap-error.ts` | 加 `PROBE_OUT_OF_BOUNDARY` IAPErrorCode |
| `packages/engine/src/Work/work-validator.ts` | `extractProbeName` + `findSlotForTask` + `checkTaskProbesAgainstBoundary` + `collectAndThrowProbeBoundaryViolations`；validateAndWriteArtifacts 调用 |
| `packages/engine/src/oxl/md-pipeline/transformers/work.ts` | WorkTaskIR 加 `boundary` 字段；extractTaskFromFields 提取 |
| `packages/cli/src/commands/work.ts` | try-catch 包 validateAndWriteArtifacts，捕获 IAPError 并 outputError |
| `packages/engine/src/Work/__tests__/work-validator.test.ts`（新建）| 20 个测试（extractProbeName × 4 / findSlotForTask × 4 / checkTaskProbesAgainstBoundary × 8 / collectAndThrowProbeBoundaryViolations × 4）|

### 验收门槛

- `bun test`：1574 pass / 3 skip / **0 fail**（新增 20 测试）
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- 端到端测试：故意注入 `- probe: @oxn/probes/forbidden-probe` → `oxn work validate` 返回 `code: IAP_INTENT_PROBE_OUT_OF_BOUNDARY` + 详细 violations
- 真实场景：当前 9 tasks 全部无 probe → validate 通过；lock 成功

## P5 beta.1 核心交付

### 决策落地（ADR-0061 §D4）

**D4 - Workflow.slot DAG 与 Task.deps DAG 闭包校验**：
- task.deps[i] 可引用其他 task 名（解析到该 task 的 boundary slot）或直接引用 slot 名
- 解析后的 slot 必须 ∈ task.boundary 的祖先闭包 ∪ {boundary 自身}
- 同 slot 内 task 互相依赖 → 通过（validSlots 包含自身）
- lock 期校验失败 → `throw IAPError(INTENT, TASK_DAG_VIOLATES_SLOT, YIELD_TO_HUMAN, ...)`
- CLI 输出 JSON `code: IAP_INTENT_TASK_DAG_VIOLATES_SLOT` + 详细 violations
- **escape hatch**：`--skip-workflow-dag-check` flag 跳过 DAG 闭包校验（供历史 Work 渐进迁移）

### 代码改动

| 文件 | 内容 |
|---|---|
| `packages/engine/src/oxl/md-pipeline/transformers/work.ts` | WorkTaskIR 加 `deps: string[]` 字段；extractTaskFromFields 用 `getArray(fields, 'deps')` 提取 |
| `packages/engine/src/oxl/md-pipeline/utils.ts` | `getArray` 加 inline 数组语法解析 `[a, b, c]`（之前只支持嵌套 list） |
| `packages/engine/src/kernel/contracts/iap-error.ts` | + `TASK_DAG_VIOLATES_SLOT` IAPErrorCode |
| `packages/engine/src/Work/work-validator.ts` | + 4 helpers（`buildSlotDAG` / `computeSlotAncestors` / `checkTaskDepsClosure` / `collectAndThrowDagClosureViolations`）；validateAndWriteArtifacts 加 `skipDagCheck?: boolean` param |
| `packages/cli/src/commands/work.ts` | validate subcommand 加 `--skip-workflow-dag-check` flag |
| `packages/engine/src/Work/__tests__/work-validator.test.ts` | + 21 测试（buildSlotDAG × 3 / computeSlotAncestors × 6 / checkTaskDepsClosure × 8 / collectAndThrow × 4）|

### 验收门槛

- `bun test`：**1598 pass / 3 skip / 0 fail**（新增 21 测试）
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- 端到端测试：故意注入 `deps: [p4-boundary-observe-check, compass, nonexistent-task]` → `oxn work validate` 返回 `code: IAP_INTENT_TASK_DAG_VIOLATES_SLOT` + 2 violations（1 个 dep_slot_not_in_task_slot_closure + 1 个 dep_unknown）
- 真实场景：当前 9 tasks deps 全在 slot 闭包 → validate 通过；lock 成功
- **escape hatch E2E**：同样违规 deps + `--skip-workflow-dag-check` flag → validate OK
- 修复 pre-existing bug：`p0-rfc-finalize` 原 `deps: [compass]` 是 P5 之前漏掉的 DAG 违规（compass 是 design 的下游，违反闭包），P5 落地时同步修正为 `deps: []`

## P6 beta.1 核心交付

### 决策落地（ADR-0061 §D5）

**D5 - Stack.tools 注入 Probe runtime（采纳 a）**：
- `work-context-builder` 从 `Blueprint.use.stack` 加载 Stack .md → 提取 tools
- 注入到 `WorkContextResult.stackTools` (类型：Kernel.StackToolInfo[])
- `ProofRunner.executeProbe` 透传 `stackTools` 到 `ProbeContext.stackTools`
- `submitTaskWithProbes` 内部加载 stackTools（向后兼容：lock 前/老 Work 退回 undefined）
- renderContextHuman 展示 stackTools 列表（CLI + engine 双向对齐）
- 决策边界（P6 不引入）：
  - 不改 L1 probe handlers 行为（shell-exec / lint-check / ts-compiles 仅 data plumbing）
  - 不引入新 hash 字段（PlanLock 4 组件公式不变）
  - 不改 stack .md schema（仍 version / command / config / role / desc 5 字段）

### 代码改动

| 文件 | 内容 |
|---|---|
| `packages/engine/src/kernel/contracts/probe-port.ts` | + `StackToolInfo` interface（name + version/command/config/role/desc 可选）；`ProbeContextBase.stackTools?: StackToolInfo[]` |
| `packages/engine/src/kernel/index.ts` | re-export `StackToolInfo` |
| `packages/engine/src/Work/work-context-builder.ts` | + `loadStackToolsFromBlueprint` + private `parseStackTools` 轻量版解析器；`WorkContextResult.stackTools?`；task-level / work-level branch 都注入；renderContextHuman 加 `## Stack Tools` 块 |
| `packages/engine/src/Proof/runner.ts` | `executeProbe` 把 `context.stackTools` 透传到 `ProbeContext.stackTools`（length>0 才注入，避免空 entry） |
| `packages/engine/src/Work/dual-state-exec.ts` | `submitTaskWithProbes` 内部 `buildWorkContext(lockCheck=false)` 加载 stackTools；try-catch 兜底（lock hash drift / 老 Work → undefined） |
| `packages/cli/src/commands/work.ts` | CLI mirror 加 stackTools 字段（task-level + work-level branch）+ renderContextHuman 加 `## Stack Tools` 块 |
| `packages/engine/src/Work/__tests__/work-context-builder.test.ts` | + 9 测试（loadStackToolsFromBlueprint × 5：解析 / 文件缺失 / 无 stackRefs / parse 失败 / 多 BP 去重；buildWorkContext × 4：含 stackTools / 渲染 / 无 stack → 省略 / 无 stackRefs → 省略）|
| `packages/engine/src/Proof/__tests__/runner.test.ts`（新建）| + 4 测试（stackTools 透传 / 缺省 undefined / 空数组不注入 / projectRoot 同步）|

### 验收门槛

- `bun test`：**1611 pass / 3 skip / 0 fail**（+13 新测试）
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- E2E：`oxn work context v073-ideal-data-flow --task p0-rfc-finalize --context-mode full` → 输出含 `## Stack Tools (8)`（bun / typescript / eslint / biome / bun-test / vitepress / lefthook / validate-deps）
- E2E JSON：`oxn work context ... --json` → data.stackTools 数组长度=8，每项含 name + version + command + config + role
- 端到端：mock probe handler 在 ProofRunner 测试中收到完整 stackTools（ctx.stackTools.length=2）

## P7 GA 核心交付

### 决策落地（ADR-0061 §D6）

**D6 - Work `## Refs` 兼容性：旧 `kind: domain` deprecation warn**：
- v0.7.3 lock 期：检测到 Work `## Refs` 中 `kind: domain` 触发 `OXN_WORK_LEGACY_DOMAIN_REF` 软警告（不阻断 lock，记录到 warnings + structured diagnostics）
- v0.8.0 升级为硬阻断（本 RFC 不实现）
- 给历史 Work 一个 migrate 窗口

### 代码改动

| 文件 | 内容 |
|---|---|
| `packages/engine/src/Work/work-validator.ts` | + `LegacyDomainRef` interface + `detectLegacyDomainRefs(work)` + `legacyDomainRefsToWarnings(entries)`；`ValidateArtifactsResult.legacyDomainRefs?`；validateAndWriteArtifacts 调用 helper（不阻断 artifacts 写入）|
| `packages/cli/src/commands/work.ts` | validate subcommand 输出含 `legacyDomainRefs` 结构化字段（无新 CLI 代码；透传 result.legacyDomainRefs）|
| `packages/engine/src/Work/__tests__/work-validator.test.ts` | + 10 测试（detectLegacyDomainRefs × 7：空/缺省/无 legacy/1 个/多 个/ref 缺省/stack 不触发；legacyDomainRefsToWarnings × 3：空/1 个/多 个）|

### 验收门槛

- `bun test`：**1621 pass / 3 skip / 0 fail**（+10 新测试）
- `bun run typecheck`：全绿
- `bun run lint`：全绿
- `bun scripts/validate-dependencies.ts`：violations=0
- E2E：临时 work `.openxenon/works/test-legacy-ref-warn/work.md`（`## Refs` + `### TrustChain-LegacyProbe - kind: domain`） → `oxn work validate` 返回 `ok=true` + warning `OXN_WORK_LEGACY_DOMAIN_REF: ref "TrustChain-LegacyProbe" (@prj/domains/TrustChain) uses deprecated "kind: domain" (ADR-0055 §D2). v0.7.3 only warns; v0.8.0 will hard-block. Move to Blueprint ## Use ...`
- E2E JSON：data.legacyDomainRefs 数组含 1 条 entry（refName + ref + suggestion）
- 真实场景：当前 v073-ideal-data-flow work 用 `## Use` 语法 → 无 warning；artifacts 正常写入

## 验收门槛

- P0：`oxn work status v073-ideal-data-flow` 显示 planLock + 5 tasks 注册（4 default + p0-rfc-finalize）
- 后续 phase：每 phase 完成后追加 changelog 段；最终 GA 时合并所有 alpha/beta changelog
- 全程：`bun test` + `bun run typecheck` + `bun run lint` + `bun scripts/validate-dependencies.ts` 全绿