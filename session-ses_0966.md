# W1: 发起 v0.7 domain-hierarchy-restruct 工作区

**Session ID:** ses_0966e86fdffeloyH41XDnimI7R
**Created:** 7/16/2026, 2:16:09 PM
**Updated:** 7/17/2026, 6:33:32 PM

---

## Assistant (Build · MiniMax-M3 · 7.8s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "P6: 验证 docs 已覆盖被删词",
      "status": "pending",
      "priority": "medium"
    },
    {
      "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7b: grep 最终确认无 docs/ 链接残留",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "P6: 验证 docs 已覆盖被删词",
    "status": "pending",
    "priority": "medium"
  },
  {
    "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7b: grep 最终确认无 docs/ 链接残留",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 6.7s)

## P1 — 删 `（package Domain 实现）` / `（module Domain）` 括注

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "- desc: OpenXenon 交互入口之一（package Domain 实现）。root 抽象定义见 [`oxn-domain.OXN CLI`](../../assets/domains/oxn-domain.md#oxn-cli)。",
  "newString": "- desc: OpenXenon 交互入口之一。root 抽象定义见 [`oxn-domain.OXN CLI`](../../assets/domains/oxn-domain.md#oxn-cli)。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md",
  "oldString": "- desc: Asset = oxn-domain.Asset 在 E1 业务层的完整定义（module Domain）。5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。",
  "newString": "- desc: Asset = oxn-domain.Asset 在 E1 业务层的完整定义。5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "- desc: Work = oxn-domain.Work 在 E2 业务层的完整定义（module Domain）。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。详细沙盒布局见 docs/zh-cn/work.md。",
  "newString": "- desc: Work = oxn-domain.Work 在 E2 业务层的完整定义。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。详细沙盒布局见 docs/zh-cn/work.md。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "- desc: Proof = oxn-domain.Proof 在 E3 Engine 层的完整定义（module Domain）。执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。",
  "newString": "- desc: Proof = oxn-domain.Proof 在 E3 Engine 层的完整定义。执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-insight-domain.md",
  "oldString": "- desc: Insight = oxn-domain.Insight 在 E4 涌现层的完整定义（module Domain）。整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。",
  "newString": "- desc: Insight = oxn-domain.Insight 在 E4 涌现层的完整定义。整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 13.6s)

## P2 — Engine Domain 删 7 个实现词

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md",
  "oldString": "## Terms: OXN Engine\n\n### OXN Engine\n- desc: OpenXenon 核心引擎（package Domain 实现）。\n\n### PackageEngine\n- desc: packages/engine — L1-L2 业务实现层；承载 Asset/Work/Proof/Insight 模块 + infra/oxl/kernel/errors 子域。\n\n### Barrel\n- desc: packages/engine 暴露给消费方的统一 re-export 入口（src/index.ts 集中 re-export 公共 API）。\n\n### OXNPackageScope\n- desc: packages/engine 对外导出契约（`packages/engine/package.json` exports 字段）：显式导出 `./kernel/* ./oxl/* ./infra/* ./Asset ./Work ./Intent ./Align ./Proof ./Insight ./Pool`。\n\n### BuiltinAsset\n- desc: Engine 编译时内置资产（src/builtin/ 目录 .md 文件，@oxn scope）；与项目资产（@prj scope）严格隔离。\n\n## Terms: Kernel\n\n### Kernel\n- desc: L0 纯逻辑验证模块（公证人非裁判 ADR-0031）；只接受 Infra 通过 Port 暴露的观测结果，输出 Verdict。完整 IO 禁用在 [`docs/zh-cn/dev/oxn-engine.md`](../../../docs/zh-cn/dev/oxn-engine.md) §\"司法/行政分离\"。\n\n### Infra\n- desc: L1 副作用/IO 执行模块；只回答事实不做 PASS/FAIL 判定，通过 Port 接口暴露 IO 能力（FsPort/PathPort/ProbePort/HashPort/OsPort/PartPort）。\n\n### Daemon\n- desc: OXN Engine 后台守护进程；负责 Engine 常驻模式 + 文件监听 + Work 追踪 + Probe FAIL 阻止。**@pending-migration**：物理实现在 `src/daemon/`（残留未迁入 packages/engine）。\n\n### OXL\n- desc: v0.7 OXL = 基于 md-pipeline（unified/remark）+ md-bridge（EntityCompiler + EntityRegistry）的 MD-native DSL；已退役 Langium。8 个 EntityCompiler：domain/blueprint/workflow/stack/roadmap/work/task/proof。完整技术链路见 [`docs/zh-cn/dev/oxn-engine.md`](../../../docs/zh-cn/dev/oxn-engine.md) §\"OXL 解析链路\"。\n\n### EntityCompiler\n- desc: OXN OXL 实体编译器 interface（packages/engine/src/oxl/md-bridge/）；3 方法 compile/parse/validate，输入/输出为强类型 IR（DomainIR/BlueprintIR/WorkIR/TaskIR/ProofIR）。\n\n### EntityRegistry\n- desc: EntityCompiler 单例注册表 + factory（packages/engine/src/oxl/md-bridge/entity-registry.ts）；v0.7 注册 8 个 Compiler，bootstrap 期内 warm-up。\n\n### md-pipeline\n- desc: OXN OXL unified/remark 解析链（packages/engine/src/oxl/md-pipeline/）；把 .md AST → 强类型 IR（内含 Zod schema + 编译时 validator）。\n\n### md-bridge\n- desc: OXN OXL EntityCompiler 实现层（packages/engine/src/oxl/md-bridge/）；与 md-pipeline 协同，8 个 Compiler 注册到 EntityRegistry。\n\n## Terms: IAPError\n\n### IAPError\n- desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。完整错误契约（name/axis/code/action/context 字段 + 字典）见错误契约 SSOT。\n\n### OXNCrash\n- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。完整错误契约见错误契约 SSOT。\n\n### CliInputError\n- desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出档 3，stdout+exit 1。详细白名单见错误契约 SSOT。\n\n## Bans\n\n### forbidden-constructs\n- items:\n  - L2Domain\n  - Tier\n  - TierLevel\n  - Stratum\n  - Strata\n  - ArsenalPromote\n  - DraftAsset\n  - CanonicalAsset\n  - monolithic-cli\n  - monolithic-engine\n  - package-coupled\n  - engine-internal-import\n  - daemon-direct-import-from-cli\n  - cli-direct-import-from-daemon\n  - cross-package-circular\n  - import-from-src\n  - @engine-internal\n  - CrashLoop\n  - ForkDaemon\n  - SystemdUnit\n  - LaunchD\n  - ANTLR\n  - Yacc\n  - PEG\n  - TypeScriptGrammar\n  - HandWrittenParser\n- desc: |\n  禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。\n  Monorepo 禁用 monolithic-{cli,engine} / 跨包循环 / 穿透 import-from-src。\n  Daemon 禁用 CrashLoop/ForkDaemon/SystemdUnit/LaunchD（必须走 oxn daemon * 命令）。\n  OXL 禁用 ANTLR/Yacc/PEG/TypeScriptGrammar/HandWrittenParser（统一 md-pipeline，禁止再引 DSL 框架）。\n  Security 沙箱详见 [`docs/zh-cn/dev/oxn-engine.md`](../../../docs/zh-cn/dev/oxn-engine.md) §\"Engine 安全沙箱\"。",
  "newString": "## Terms: OXN Engine\n\n### OXN Engine\n- desc: OpenXenon 核心引擎。root 抽象定义见 [`oxn-domain.OXN Engine`](./oxn-domain.md#oxn-engine)。\n\n### BuiltinAsset\n- desc: Engine 编译时内置资产（@oxn scope）；与项目资产（@prj scope）严格隔离。\n\n## Terms: Kernel\n\n### Kernel\n- desc: L0 纯逻辑验证模块（公证人非裁判）；只接受 Infra 通过 Port 暴露的观测结果，输出 Verdict。Kernel 禁用 fs/net/child_process/process.env/process.std*/EventEmitter。\n\n### Infra\n- desc: L1 副作用/IO 执行模块；只回答事实不做 PASS/FAIL 判定，通过 Port 接口暴露 IO 能力（FsPort/PathPort/ProbePort/HashPort/OsPort/PartPort）。\n\n### Daemon\n- desc: OXN Engine 后台守护进程；负责 Engine 常驻模式 + 文件监听 + Work 追踪 + Probe FAIL 阻止。\n\n### OXL\n- desc: Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。root 定义见 [`oxn-domain.OXL`](./oxn-domain.md#oxl)。\n\n## Terms: IAPError\n\n### IAPError\n- desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。\n\n### OXNCrash\n- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。\n\n### CliInputError\n- desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。\n\n## Bans\n\n### forbidden-constructs\n- items:\n  - L2Domain\n  - Tier\n  - TierLevel\n  - Stratum\n  - Strata\n  - ArsenalPromote\n  - DraftAsset\n  - CanonicalAsset\n  - monolithic-cli\n  - monolithic-engine\n  - package-coupled\n  - engine-internal-import\n  - daemon-direct-import-from-cli\n  - cli-direct-import-from-daemon\n  - cross-package-circular\n  - import-from-src\n  - @engine-internal\n  - CrashLoop\n  - ForkDaemon\n  - SystemdUnit\n  - LaunchD\n  - ANTLR\n  - Yacc\n  - PEG\n  - TypeScriptGrammar\n  - HandWrittenParser\n- desc: |\n  禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。\n  Monorepo 禁用 monolithic-{cli,engine} / 跨包循环 / 穿透 import-from-src。\n  Daemon 禁用 CrashLoop/ForkDaemon/SystemdUnit/LaunchD（必须走 oxn daemon * 命令）。\n  OXL 禁用 ANTLR/Yacc/PEG/TypeScriptGrammar/HandWrittenParser（统一通过 unified 库实现 MD-native DSL，禁止再引 DSL 框架）。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 6.6s)

## P3.1 — Engine Domain Invariant 自给自足 + 改 barrel 引用

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md",
  "oldString": "## Invariants\n\n### inv-1\n- value: L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图\n\n### inv-2\n- value: Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，\n  不可互相包含（详见 docs/zh-cn/dev/l0-l3-constitution.md）\n\n### inv-3\n- value: Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；\n  Infra 只回答事实不做判定；Kernel 不能直接执行 Task；\n  Infra 不能绕过 Daemon 自己宣布 Work 完成。\n  完整 IO 禁用清单见 docs/zh-cn/dev/l0-l3-constitution.md §\"层级 → 目录映射\"\n\n### inv-4\n- value: Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，\n  仅走 packages/engine barrel；\n  packages/engine 不能 import packages/cli（engine 是被依赖方）\n\n### inv-5\n- value: Daemon 不能 import CLI（必须走 socket 通信）；不能直接 import 'fs'/'node:fs'\n  （必须通过 L1-Infra filesystem.ts 收口）。\n  物理实现：src/daemon/ 待迁入 packages/engine/src/daemon.ts\n\n### inv-6\n- value: 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，\n  重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain",
  "newString": "## Invariants\n\n### inv-1\n- value: L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图\n\n### inv-2\n- value: Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，\n  不可互相包含\n\n### inv-3\n- value: Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；\n  Infra 只回答事实不做判定；Kernel 不能直接执行 Task；\n  Infra 不能绕过 Daemon 自己宣布 Work 完成。\n  Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter\n\n### inv-4\n- value: Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，\n  仅走 packages/engine 公共 API；\n  packages/engine 不能 import packages/cli（engine 是被依赖方）\n\n### inv-5\n- value: Daemon 不能 import CLI（必须走 socket 通信）；不能直接 import fs（必须通过 L1-Infra 收口）\n\n### inv-6\n- value: 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，\n  重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 3.3s)

## P2.1 — root oxn-domain.md 新增 OXL term

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-domain.md",
  "oldString": "### OXN Engine\n- desc: OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。",
  "newString": "### OXN Engine\n- desc: OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。\n\n### OXL\n- desc: OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。Engine 实现见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 3.8s)

## P3.2 — CLI Domain（删 SSOT 路径）

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### Skill\n- desc: OXN 内置可分发资产；SSOT 在 `packages/cli/src/skills/locales/`；一次编译分发到多 AI 助手根目录。",
  "newString": "### Skill\n- desc: OXN 内置可分发资产；SSOT 由 CLI 包提供；一次编译分发到多 AI 助手根目录。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### inv-8\n- value: Skill SSOT 唯一来源是 packages/cli/src/skills/locales/；\n  不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）",
  "newString": "### inv-8\n- value: Skill SSOT 唯一来源由 CLI 包提供；\n  不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 3.7s)

## P3.3 — Module Domains（删 docs 指向）

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "- desc: Work = oxn-domain.Work 在 E2 业务层的完整定义。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。详细沙盒布局见 docs/zh-cn/work.md。",
  "newString": "- desc: Work = oxn-domain.Work 在 E2 业务层的完整定义。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md",
  "oldString": "- desc: Asset 完整生命周期 3 阶段（create / evolve / archive）+ 附 delete（需 citations==0）；执行路径见 docs/zh-cn/asset.md。",
  "newString": "- desc: Asset 完整生命周期 3 阶段（create / evolve / archive）+ 附 delete（需 citations==0）。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 5.4s)

## P4 — RFC §2 全景图 + §2.1 演进表

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md",
  "oldString": "package · 包级（两个 · @openxenon/cli + @openxenon/engine）\n─────────────────────────────────────────────────────────\noxn-cli-domain                        oxn-engine-domain\n  ├─ references: [oxn-domain]          ├─ references: [oxn-domain]\n  ├─ terms:                              ├─ terms:\n  │   OXN CLI* (补)                       │   OXN Engine* (补)\n  │   Command, SubCommand,                │   PackageEngine, Barrel,\n  │   Arg, OutputFormat,                  │   OXNPackageScope,\n  │   ExitCode, Skill,                    │   BuiltinAsset, Kernel,\n  │   SkillAdapter, AdaptersRoot,         │   Infra, Daemon, OXL,\n  │   Locale, I18nKey, TFunction,         │   EntityCompiler,\n  │   LocaleBundle, OXnConfig,            │   EntityRegistry,\n  │   ProjectConfig, ProjectBoundary      │   md-pipeline, md-bridge,\n  │                                       │   IAPError, OXNCrash,\n  │                                       │   CliInputError\n  └─ ...                                 └─ ...",
  "newString": "package · 包级（两个 · @openxenon/cli + @openxenon/engine）\n─────────────────────────────────────────────────────────\noxn-cli-domain                        oxn-engine-domain\n  ├─ references: [oxn-domain]          ├─ references: [oxn-domain]\n  ├─ terms:                              ├─ terms:\n  │   OXN CLI* (补)                       │   OXN Engine* (补)\n  │   Command, SubCommand,                │   BuiltinAsset,\n  │   Arg, OutputFormat,                  │   Kernel, Infra,\n  │   ExitCode, Skill,                    │   Daemon, OXL,\n  │   SkillAdapter, AdaptersRoot,         │   IAPError, OXNCrash,\n  │   Locale, I18nKey, TFunction,         │   CliInputError\n  │   LocaleBundle, OXnConfig,\n  │   ProjectConfig, ProjectBoundary\n  └─ ...                                 └─ ..."
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 3.6s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md",
  "oldString": "oxn-domain\n  ├─ terms:    OpenXenon, OXN CLI, OXN Engine\n  ├─ bans:     -\n  ├─ invariants: single-source-of-truth, root-no-downward-ref\n  └─ references: -  (不向下引用)",
  "newString": "oxn-domain\n  ├─ terms:    OpenXenon, OXN, OXN CLI, OXN Engine, OXL,\n  │            IAP, Intent, Align, Proof, Asset, Boundary,\n  │            Work, Verdict, Insight, Hall, Daemon\n  ├─ bans:     -\n  ├─ invariants: single-source-of-truth, root-no-downward-ref,\n  │              product-boundary, three-top-concepts-closed-loop\n  └─ references: -  (不向下引用)"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 6.2s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md",
  "oldString": "### 2.1 Engine 域 term 数量演进\n\n| 版本 | terms | 备注 |\n|---|---|---|\n| v0.2 RFC 草案 | 9（Kernel/OXL/Infra/Daemon/Pool/Langium/Security/Workspace/CliBin/AssetMode）| 含 Langium + 旧术语 |\n| v0.3 落地版 | 20（含 Layer 段 8 个 + Constitution/Monorepo/LayeredNarrative）| \"压缩 + 分组\" 路径，混入 CLI 视角 |\n| **v0.4 当前** | **16（删 9 + 改 7 + 新增 7）** | Kernel/OXL/Infra/Daemon 业务语义重写；新增 EntityCompiler/EntityRegistry/md-pipeline/md-bridge/IAPError/OXNCrash/CliInputError |",
  "newString": "### 2.1 Engine 域 term 数量演进\n\n| 版本 | terms | 备注 |\n|---|---|---|\n| v0.2 RFC 草案 | 9（Kernel/OXL/Infra/Daemon/Pool/Langium/Security/Workspace/CliBin/AssetMode）| 含 Langium + 旧术语 |\n| v0.3 落地版 | 20（含 Layer 段 8 个 + Constitution/Monorepo/LayeredNarrative）| \"压缩 + 分组\" 路径，混入 CLI 视角 |\n| v0.4 | 16（删 9 + 改 7 + 新增 7） | Kernel/OXL/Infra/Daemon 业务语义重写；新增 EntityCompiler/EntityRegistry/md-pipeline/md-bridge/IAPError/OXNCrash/CliInputError |\n| **v0.4.1 当前** | **9（删 7）** | 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）迁 docs/zh-cn/dev/oxn-engine.md；确立 DDD 边界判据（ADR-0060）：Domain 收\"是什么\"特性词，不收\"怎么实现\"细节词。root oxn-domain 新增 OXL 顶层特性词。 |"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 31.6s)

## P5 — 新建 ADR-0060

**Tool: write**

**Input:**
```json
{
  "content": "---\nentity: adr\nversion: 1.0.0\nstatus: Accepted\ndate: 2026-07-17\nsupersedes: null\nsuperseded-by: null\nrelated:\n  - .openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md\n  - .openxenon/docs/adrs/0059-domain-reference-model-v2.md\n  - .openxenon/assets/domains/oxn-domain.md\n  - .openxenon/assets/domains/oxn-engine-domain.md\n  - docs/zh-cn/dev/oxn-engine.md\n---\n\n# ADR-0060: Domain 词汇边界（What/How 判据）\n\n> **状态**：🟢 Accepted（v0.7 RFC §2 同步拍板）\n> **日期**：2026-07-17\n> **来源**：[v0.7-domain-hierarchy-restructure-rfc §2.1 v0.4.1 演进行](../../rfcs/v0.7-domain-hierarchy-restructure-rfc.md)\n> **影响层**：L1-OXL（AssetFrontmatter schema）+ L2-Engine（Domain transformer）+ L3（oxn CLI）\n\n## 背景\n\nv0.7 RFC §2 决定采用三层 Domain 架构（root / package / module），但未明确 Domain 应承载的词汇边界。前几个版本的 Engine Domain 反复出现\"新增实现词 → 下一版本实现改了 → 再删词\"的循环（v0.2 Langium → v0.4 删除；v0.3 Layer×6 + Monorepo×3 → v0.4 删除；v0.4 新增 md-pipeline/md-bridge/EntityCompiler/EntityRegistry/PackageEngine/Barrel/OXNPackageScope → 又面临再删）。\n\n每次实现重构，Domain 都要跟着删/改一批词，本质是 **Domain 承载了实现名**，违反 DDD 通用语言（universal language）原则。\n\n具体症状（v0.4 Engine Domain 的 16 个 term）：\n\n| 性质 | Term | 命运 |\n|---|---|---|\n| 业务/契约词 | OXN Engine / Kernel / Infra / Daemon / OXL / BuiltinAsset / IAPError / OXNCrash / CliInputError | 跨版本稳定 |\n| 实现层词 | PackageEngine / Barrel / OXNPackageScope / md-pipeline / md-bridge / EntityCompiler / EntityRegistry | v0.4.1 删除 |\n\n## 决策\n\n### D1：Domain 词汇双层判定（What vs How）\n\nDomain 仅承载\"**是什么**\"层词汇；\"**怎么实现**\"层词汇由 Stack 资产或开发者手册（docs/zh-cn/dev/）承载。\n\n| 层级 | 含义 | 归宿 |\n|---|---|---|\n| **What**（Domain 收） | 该词描述\"这是什么概念/能力/技术领域\" | Domain |\n| **How**（Domain 不收） | 该词描述\"具体怎么实现 / 实现细节 / 代码路径 / 实现状态\" | Stack 资产 / 开发者手册 |\n\n判据：\n\n> **重写测试**：\"如果 OpenXenon 用 Rust 重写、或 v0.8 把内部实现改名（如 md-pipeline 改名为 unified-ast-bridge），这个词还需存在么？\"\n>\n> - 仍需存在 → Domain 收（它在描述\"是什么\"）\n> - 不需存在 → 迁 Stack/docs（它在描述\"怎么实现\"）\n\n### D2：Domain 词汇 4 个分类\n\n按 D1 判据，Domain 词汇进一步分为 4 类：\n\n| 分类 | 含义 | 例 | 归宿 |\n|---|---|---|---|\n| 产品词汇 | 业务对象 | OpenXenon / IAP / Intent / Align / Proof / Asset / Work / Insight / Hall / Verdict | Domain |\n| 特性词汇（技术） | 项目特定技术领域词（\"这是什么技术领域\"） | OXL（OpenXenon Language）| Domain |\n| 实现词汇（技术） | \"怎么实现\" / 代码路径 / 实现状态 / 框架选择 | md-pipeline / Barrel / `packages/.../src/...` / `@pending-migration` | Stack / docs |\n| 通用技术词 | 通用度过高的外部技术词 | TypeScript / Bun / unified | Stack（不进 Domain） |\n\n### D3：root Domain 装顶层特性词\n\nroot Domain 装的是 **OpenXenon 的特性集合**，不限业务/技术分类。OXL（OpenXenon 的特定领域语言）作为特性词属于 root，与 IAP / Asset / Work 等业务特性并列。\n\n> ⚠️ 区别于旧理解的\"root = 业务词汇集合\"——旧理解会让 OXL 这种跨视角的技术特性词无处安放。\n\n### D4：同名特性词多域共存\n\n同一特性词（如 OXL）可在 root + 子 Domain（Engine / CLI 等）重名存在，依 ADR-0059 §D2「重名不重定义」机制：\n\n- **root 定义本质**：OXL 是什么（\"OpenXenon 的特定领域语言，用于声明与校验 OXN 实体\"）\n- **子 Domain 补视角特性**：在 Engine Domain 补\"Engine 视角下的 OXL\"（\"Engine 通过 unified 库实现 MD 语法的特性\"）；未来 CLI Domain 可补\"CLI 视角下的 OXL\"（CLI 如何消费 OXL 编译结果）\n\n子 Domain 的同名 term desc **不重定义 root 已说的部分**，只补\"该视角下的具体特性\"。\n\n### D5：Domain 引用规则\n\n#### D5.1 禁止指向 docs/\n\nDomain 的 desc / invariant **禁止** markdown link 引用 `docs/`——docs/ 是 SSOT 之下的可变层，会随编辑而破坏 Domain 引用稳定性。\n\n#### D5.2 禁止纯文本指向 docs/\n\nDomain 的 desc / invariant **禁止**纯文本\"详见 / 完整清单见 / 具体实现见 / 见开发者手册\"指向 docs/——即使不嵌 markdown link，仍会引导 AI 去读取 How 层。\n\n**Domain 必须 What 自给自足**——核心断言（IO 禁用清单、字段结构、约束列表）必须 inline 写入 desc / invariant value。\n\n#### D5.3 禁止代码路径\n\nDomain 的 desc / invariant **禁止**包含代码路径（`src/...`、`packages/.../src/...`）——属 How 层。\n\n#### D5.4 禁止实现状态注释\n\nDomain 的 desc / invariant **禁止**包含实现状态注释（`@pending-migration`、物理实现 Where）——属 How 层。\n\n#### D5.5 允许引用 ADR（append-only）\n\nDomain 的 desc / invariant **允许**引用 ADR（append-only 不可变），但作为名词陈述句的一部分（如 \"v0.7 Langium 退役（ADR-0052）\"），不嵌 markdown link。\n\n#### D5.6 允许 Domain 间 MD link\n\nDomain 的 desc **允许**引用其他 Domain 的同名 term（ADR-0059 §D2 sub→root 引用机制），这是 Domain 间的 What 引用，不是 How 指向。\n\n例：Engine Domain `### OXL` desc 含 `[`oxn-domain.OXL`](./oxn-domain.md#oxl)` 是合规的。\n\n#### D5.7 External 标号引用语法\n\nExternal 标号引用语法（如 `[External: ADR-0031]`）待 ADR-0061 单独立法，本次不引入。\n\n### D6：不变式自给自足\n\nInvariant 的 value **必须自给自足**——核心断言完整 inline 写入，不允许\"完整清单见 X\"。\n\n例：\n\n```yaml\n### inv-3\n- value: |\n  Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；\n  Infra 只回答事实不做判定；\n  Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter\n```\n\n禁用清单（fs/net/child_process/process.env/process.std*/EventEmitter）inline 写在 value 里，不甩到外部文档。\n\n### D7：OXL 子 Domain 拆分触发条件\n\nOXL 当前在 Engine Domain 内（1 个 term）。若 OXL 相关契约词 > 5 个（如未来增加 OXL Compiler / OXL Registry / OXL Pipeline 等契约词），触发拆出 `oxn-engine-oxl-domain`（依 RFC §2.2 命名规则）。本 ADR 不立即拆分。\n\n## 影响\n\n| 模块 | 改动 |\n|---|---|\n| `oxn-engine-domain.md` v0.4 → v0.4.1 | 删 7 词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）；9 个保留 term 的 desc 按 D5 清理 |\n| `oxn-domain.md` v0.4 → v0.4.1 | 新增 OXL 顶层特性词（16 → 17） |\n| `oxn-cli-domain.md` v0.4 → v0.4.1 | 删 2 处 SSOT 代码路径引用 |\n| `oxn-work-domain.md` v0.2 → v0.2.1 | 删 1 处 docs 引用 |\n| `oxn-asset-domain.md` v0.2 → v0.2.1 | 删 1 处 docs 引用 |\n| `docs/zh-cn/dev/oxn-engine.md` | 已承担 7 个被删词的实现细节描述（§\"OXL 解析链路\" / §\"模块结构\"）；无需大改 |\n| RFC §2 全景图 | Engine 域 terms 列表去掉 7 词；root terms 列表加 OXL |\n| RFC §2.1 演进表 | 新增 v0.4.1 行 |\n| `remark-canonical.ts` | 未来增强：D5.1-D5.4 校验作为可选 strict mode（本次不实现） |\n\n## 兼容性\n\n- Engine Domain 删 7 词是 **deleting-only breaking change**——已被这些词的 desc 引用的其他文档（docs/zh-cn/dev/oxn-engine.md）已承载同等描述\n- root oxn-domain 新增 OXL term 是 **adding-only**——不影响任何依赖\n\n## 验证\n\n- `oxn domain validate` × 7 全通过\n- `bun test`：backlinks / transformer 测试不受影响\n- grep 确认：所有 Domain desc/invariant 中无 `](../../../docs/` 或 `](../../docs/` markdown link 残留\n- grep 确认：所有 Domain desc/invariant 中无 `src/...` 或 `packages/.../src/...` 代码路径残留\n\n## 与其他 ADR/RFC 的关系\n\n- **ADR-0059 §D2（sub→root 引用）**：D5.6 扩展 ADR-0059 允许 Domain 间 MD link 作为 What 引用\n- **ADR-0059 §D7（citations 处理）**：本 ADR 不动 citations 语义\n- **RFC v0.7 §2.1 v0.4.1 行**：本 ADR 是其落地约束\n- **ADR-0052（Langium 退役）**：作为 ADR 引用保留例；cli-domain `forbidden-constructs` desc 名词陈述句 \"Langium 退役（ADR-0052）\" 是 D5.5 合规引用",
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/0060-domain-vocabulary-boundary.md"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiniMax-M3 · 2.7s)

## P5b — ADR INDEX

**Tool: bash**

**Input:**
```json
{
  "command": "test -f .openxenon/docs/adrs/INDEX.md && wc -l .openxenon/docs/adrs/INDEX.md || echo \"INDEX.md missing\"",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
     175 .openxenon/docs/adrs/INDEX.md

```

---

## Assistant (Build · MiniMax-M3 · 2.6s)

**Tool: bash**

**Input:**
```json
{
  "command": "tail -10 .openxenon/docs/adrs/INDEX.md",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
| `0001` ~ `0047` | docs-tmp 时代 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/` 迁入 |
| `0048` ~ `0051` | Asset Paper 4 ADR | 从 `.openxenon/forges/splits/archive/docs-tmp-era/decisions/` 迁入 |
| `0052+` | 新 ADR | 新决策按顺序编号 |

## 元数据

- **抽取 work**：docs-tmp-cleanup
- **抽取日**：2026-07-04
- **讨论跨度**：2026-05-14 → 2026-07-12（58 天）
- **涉及版本**：v0.0 → v0.6.1
```

---

## Assistant (Build · MiniMax-M3 · 2.7s)

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"0059\\|0060\\|0061\" .openxenon/docs/adrs/INDEX.md || echo \"none found\"",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
none found

```

---

## Assistant (Build · MiniMax-M3 · 2.5s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md",
  "limit": 30
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md</path>
<type>file</type>
<content>
1: # ADR 索引
2: 
3: > **来源**：2026-07-04 docs-tmp-cleanup work 抽取 + 2026-07-09 doc-unify-layout 救援 + 2026-07-10 v0.6.1-alpha.4 ADR 追加 + 2026-07-12 三边界框架 ADR 追加
4: > **总计**：50 条 ADR（来自 v0.0 ~ v0.6.1 共 9 个版本的讨论记录；另 8 条 0040-0047 已归档于 `2026-07-05-archive-0040-0047-memory-series-superseded.md`）
5: > **位置**：`.openxenon/docs/adrs/`（对内-沉淀层，append-only）
6: > **约定**：决策一旦记录不编辑不删除；被推翻时新 ADR 标记旧 ADR 为 Superseded
7: 
8: ## 状态图例
9: 
10: | 状态 | 含义 | 数量 |
11: |---|---|---|
12: | ✅ **Adopted** | 已落 SSOT + 代码 | 30 |
13: | 🟡 **Partially Adopted** | 部分已落，部分待办 | 5 |
14: | 💡 **Proposed** | 待 v0.7+ 落地 | 9 |
15: | ⛔ **Superseded** | 被推翻但有史料价值 | 6 |
16: 
17: ## 主题分类索引
18: 
19: ### 1. OXL / Blueprint 哲学（8 条）
20: 
21: | ADR | 标题 | 状态 |
22: |---|---|---|
23: | [0001](./0001-blueprint-props-funnel-effect.md) | Blueprint props 漏斗效应 + 三层默认值优先级 | ✅ Adopted |
24: | [0002](./0002-probe-default-rules-five-level-priority.md) | Probe default 规则 + 五级参数优先级链 | ✅ Adopted |
25: | [0003](./0003-runtime-isolation-frozen-naming.md) | 运行期隔离 + frozen 命名规则 | ✅ Adopted |
26: | [0019](./0019-blueprint-type-paradigm.md) | Blueprint Type 范式（task/plan/explore） | ⛔ Superseded（由 three-boundary-blueprint-elevation-rfc.md 触发） |
27: | [0053](./0053-superseded-0048-library-external-scheme.md) | library/external Asset 类型收敛（Superseded ADR-0048） | ⛔ Superseded（由 three-boundary-blueprint-elevation-rfc.md 触发） |
28: | [0021](./0021-intent-align-observe-keyword-separation.md) | Intent / Align / Observe 四关键字分离 | ✅ Adopted |
29: 
30: ### 2. Kernel / L0 边界（6 条）

(Showing lines 1-30 of 176. Use offset=31 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 3.4s)

**Tool: grep**

**Input:**
```json
{
  "pattern": "### \\d+\\.|^### | ADR-",
  "path": "/Users/issac/pro/openxenon/.openxenon/docs/adrs",
  "include": "INDEX.md"
}
```

**Output:**
```
Found 14 matches
/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md:
  Line 19: ### 1. OXL / Blueprint 哲学（8 条）

  Line 27: | [0053](./0053-superseded-0048-library-external-scheme.md) | library/external Asset 类型收敛（Superseded ADR-0048） | ⛔ Superseded（由 three-boundary-blueprint-elevation-rfc.md 触发） |

  Line 30: ### 2. Kernel / L0 边界（6 条）

  Line 41: ### 3. AI 协作哲学（6 条）

  Line 54: ### 4. Work / Asset（9 条）

  Line 74: ### 5. Insight / Skill（5 条）

  Line 84: ### 6. Docs / Brand（5 条）

  Line 94: ### 7. 历史 / 命名（4 条）

  Line 106: ### 已落 SSOT（19 条 · 标记 SSOT 已增补位置）

  Line 130: ### 待办（8 条 Proposed · 进 v0.7+ RFC 子 PR）

  Line 150: supersedes: null        # ADR-NNNN (如适用)

  Line 151: superseded-by: null     # ADR-NNNN (如适用)

  Line 154: ### ADR 7 节模板

  Line 162: ### 编号规则

```

---

## Assistant (Build · MiniMax-M3 · 3.0s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md",
  "limit": 15,
  "offset": 125
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md</path>
<type>file</type>
<content>
125: | 0054 | `docs/zh-cn/asset.md` §三边界框架 + `docs/en/asset.md` |
126: | 0055 | `docs/zh-cn/asset.md` §Blueprint 组合模板 |
127: | 0057 | `docs/zh-cn/core-concepts.md` §3.1 信任链 |
128: | 0058 | `docs/zh-cn/core-concepts.md` §13 最小信任闭环 |
129: 
130: ### 待办（8 条 Proposed · 进 v0.7+ RFC 子 PR）
131: 
132: | ADR | 候选 sprint |
133: |---|---|
134: | 0006 | v0.7-emergence §三相模型 |
135: | 0007 | v0.6.x-observability-roadmap §Loop 三维 |
136: | 0016 | llm-prompt.md §AI 行为指引 |
137: | 0022 | v0.7-emergence §三模式 AI |
138: | 0028 | v0.7-emergence §ResourcePort |
139: | 0029 | v0.7-emergence §Anchor/Slot |

(Showing lines 125-139 of 176. Use offset=140 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 3.3s)

Looking at the structure. Let me find a good place to add ADR-0059 (currently not in INDEX) and ADR-0060. Let me check what sections exist:

**Tool: bash**

**Input:**
```json
{
  "command": "grep -n \"^### \\|0001 \\|0048 \\|0049 \\|0050 \\|0051 \\|0052 \\|0054 \\|0055 \\|0056 \\|0057 \\|0058 \\|0059 \" .openxenon/docs/adrs/INDEX.md | head -50",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
19:### 1. OXL / Blueprint 哲学（8 条）
30:### 2. Kernel / L0 边界（6 条）
41:### 3. AI 协作哲学（6 条）
54:### 4. Work / Asset（9 条）
74:### 5. Insight / Skill（5 条）
84:### 6. Docs / Brand（5 条）
94:### 7. 历史 / 命名（4 条）
106:### 已落 SSOT（19 条 · 标记 SSOT 已增补位置）
110:| 0001 | `docs/zh-cn/asset.md` §Blueprint props 漏斗 |
124:| 0052 | `packages/engine/src/oxl/langium-driver/` 删除 + `docs/zh-cn/cli.md` + `docs/zh-cn/work.md` §Langium 退役 |
125:| 0054 | `docs/zh-cn/asset.md` §三边界框架 + `docs/en/asset.md` |
126:| 0055 | `docs/zh-cn/asset.md` §Blueprint 组合模板 |
127:| 0057 | `docs/zh-cn/core-concepts.md` §3.1 信任链 |
128:| 0058 | `docs/zh-cn/core-concepts.md` §13 最小信任闭环 |
130:### 待办（8 条 Proposed · 进 v0.7+ RFC 子 PR）
154:### ADR 7 节模板
162:### 编号规则

```

---

## Assistant (Build · MiniMax-M3 · 3.9s)

ADR-0059 and 0060 are both related to Domain/Architecture. Let me add them in the relevant section. Looking at this, the INDEX is missing ADR-0059 already. Let me add both. I'll add them under section 6 "Docs / Brand" since they're about domain/asset structure, OR I can add a new section "8. Domain 架构". Looking at the existing structure more carefully:

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md",
  "limit": 15,
  "offset": 84
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md</path>
<type>file</type>
<content>
84: ### 6. Docs / Brand（5 条）
85: 
86: | ADR | 标题 | 状态 |
87: |---|---|---|
88: | [0014](./0014-why-openxenon-motivation-narrative.md) | "Why OpenXenon" — AI 漂移根因与人格化叙事 | 💡 Proposed |
89: | [0023](./0023-at-addressing-no-arrow-pointer.md) | `@` 一贯寻址哲学 + `->` 伪指针否决 | ✅ Adopted |
90: | [0028](./0028-resource-port-cache-port-work-snapshot.md) | ResourcePort + CachePort + WorkSnapshot（待办） | 💡 Proposed |
91: | [0029](./0029-anchor-slot-doc-binding.md) | Anchor / Slot 文档绑定机制（待办） | 💡 Proposed |
92: | [0030](./0030-term-cross-reference-upstream-dag.md) | `@term/X` 跨 term 寻址 + `@upstream` DAG（待办） | 💡 Proposed |
93: 
94: ### 7. 历史 / 命名（4 条）
95: 
96: | ADR | 标题 | 状态 |
97: |---|---|---|
98: | [0006](./0006-three-phase-model.md) | 三相模型（静态结构 → Loop → 静态产物） | 💡 Proposed |

(Showing lines 84-98 of 176. Use offset=99 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 13.6s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md",
  "oldString": "### 7. 历史 / 命名（4 条）",
  "newString": "### 7. Domain 词汇架构（3 条）\n\n| ADR | 标题 | 状态 |\n|---|---|---|\n| [0059](./0059-domain-reference-model-v2.md) | Domain 引用模型 v2（references DAG + MD 链接代替 composes） | ✅ Adopted |\n| [0060](./0060-domain-vocabulary-boundary.md) | Domain 词汇边界（What/How 判据 + 引用规则） | ✅ Adopted |\n| [0052](./0052-langium-retirement-migration.md) | Langium 退役（作为 D2 实现词汇反复印证的案例） | ✅ Adopted |\n\n### 7. 历史 / 命名（4 条）"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/INDEX.md",
  "oldString": "> **总计**：50 条 ADR（来自 v0.0 ~ v0.6.1 共 9 个版本的讨论记录；另 8 条 0040-0047 已归档于 `2026-07-05-archive-0040-0047-memory-series-superseded.md`）",
  "newString": "> **总计**：52 条 ADR（来自 v0.0 ~ v0.7 共 9 个版本的讨论记录；另 8 条 0040-0047 已归档于 `2026-07-05-archive-0040-0047-memory-series-superseded.md`）"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 11.3s)

Now let me bump versions of the changed Domain files and run validation:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md",
  "oldString": "version: 0.4.0\nname: OxnEngineDomain\nabstract: OXN Engine 领域。\nreferences:\n  - oxn-domain\ncitations: 0\nsynced-at: 2026-07-17",
  "newString": "version: 0.4.1\nname: OxnEngineDomain\nabstract: OXN Engine 领域。\nreferences:\n  - oxn-domain\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-domain.md",
  "oldString": "version: 0.4.0\nname: OxnDomain\nabstract: OpenXenon 顶层领域\nreferences: []\ncitations: 0\nsynced-at: 2026-07-16",
  "newString": "version: 0.4.1\nname: OxnDomain\nabstract: OpenXenon 顶层领域。\nreferences: []\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "version: 0.4.0\nname: OxnCliDomain\nabstract: OXN CLI 包级业务领域。\nreferences:\n  - oxn-domain\ncitations: 0\nsynced-at: 2026-07-17",
  "newString": "version: 0.4.1\nname: OxnCliDomain\nabstract: OXN CLI 包级业务领域。\nreferences:\n  - oxn-domain\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "version: 0.2.0\nname: OxnWorkDomain\nabstract: OXN Work 业务领域。\nreferences:\n  - oxn-domain\n  - oxn-engine-domain\n  - oxn-asset-domain\ncitations: 0\nsynced-at: 2026-07-16",
  "newString": "version: 0.2.1\nname: OxnWorkDomain\nabstract: OXN Work 业务领域。\nreferences:\n  - oxn-domain\n  - oxn-engine-domain\n  - oxn-asset-domain\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md",
  "oldString": "version: 0.2.0\nname: OxnAssetDomain\nabstract: OXN Asset 业务领域。\nreferences:\n  - oxn-engine-domain\n  - oxn-cli-domain\ncitations: 0\nsynced-at: 2026-07-16",
  "newString": "version: 0.2.1\nname: OxnAssetDomain\nabstract: OXN Asset 业务领域。\nreferences:\n  - oxn-engine-domain\n  - oxn-cli-domain\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 7.6s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
      "status": "completed",
      "priority": "medium"
    },
    {
      "content": "P6: 验证 docs 已覆盖被删词",
      "status": "in_progress",
      "priority": "medium"
    },
    {
      "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7b: grep 最终确认无 docs/ 链接残留",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
    "status": "completed",
    "priority": "medium"
  },
  {
    "content": "P6: 验证 docs 已覆盖被删词",
    "status": "in_progress",
    "priority": "medium"
  },
  {
    "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7b: grep 最终确认无 docs/ 链接残留",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 4.3s)

## P7 + P7b — 全链路验证

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== P7b grep docs/ 残留 ===\"\ngrep -rn \"docs/zh-cn\\|docs/en\\|../../../docs\\|../../docs\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho\necho \"=== grep src/ packages/ 路径残留 ===\"\ngrep -nE \"src/[a-z]+|packages/[a-z]+/src/\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho\necho \"=== grep 7 个被删词残留 ===\"\nfor w in PackageEngine Barrel OXNPackageScope md-pipeline md-bridge EntityCompiler EntityRegistry; do\n  hits=$(grep -rn \"$w\" .openxenon/assets/domains/oxn-*.md 2>/dev/null | wc -l | tr -d ' ')\n  echo \"$w: $hits hits\"\ndone",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== P7b grep docs/ 残留 ===
✅ 0 命中

=== grep src/ packages/ 路径残留 ===
.openxenon/assets/domains/oxn-cli-domain.md:167:  payload schema 唯一权威是 src/daemon/protocol.ts；
.openxenon/assets/domains/oxn-proof-domain.md:28:- desc: OXN 自带资产（@oxn scope），位于 packages/engine/src/builtin/ 目录 .md 文件；版本号单调递增；不依赖任何 @prj 资产。
.openxenon/assets/domains/oxn-proof-domain.md:46:- desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。Schema 在 packages/engine/src/kernel/schemas/proof-schema.ts。

=== grep 7 个被删词残留 ===
PackageEngine: 0 hits
Barrel: 0 hits
OXNPackageScope: 0 hits
md-pipeline: 1 hits
md-bridge: 0 hits
EntityCompiler: 0 hits
EntityRegistry: 0 hits

```

---

## Assistant (Build · MiniMax-M3 · 3.2s)

3 残留路径 + 1 md-pipeline 残留需要清理。让我看下：

**Tool: bash**

**Input:**
```json
{
  "command": "grep -rn \"md-pipeline\" .openxenon/assets/domains/oxn-*.md\necho \"---\"\ngrep -rn \"src/daemon/protocol.ts\" .openxenon/assets/domains/oxn-*.md",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
.openxenon/assets/domains/oxn-cli-domain.md:108:  DSL 唯一权威改为 md-pipeline，由 Engine 包集中提供，本域不重定义其概念。
---
.openxenon/assets/domains/oxn-cli-domain.md:167:  payload schema 唯一权威是 src/daemon/protocol.ts；

```

---

## Assistant (Build · MiniMax-M3 · 3.5s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "limit": 15,
  "offset": 102
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md</path>
<type>file</type>
<content>
102:   - SOFT_FAIL
103: - desc: |
104:   CLI 参数层禁用 Flag/Option/Switch（用 Arg 一词）；i18n 禁用硬编码英文/绕过 t()；
105:   config 禁用 rcFile/dotFile/settingsFile（统一 OXnConfig/ProjectConfig）；
106:   错误处理禁用对人类 + AI 不同源的轨道混淆（VerdictAsException / FailureAsCrash）。
107:   v0.7.0 起：Langium / GrammarFile / registerOxnValidators 全部退役（见 ADR-0052），
108:   DSL 唯一权威改为 md-pipeline，由 Engine 包集中提供，本域不重定义其概念。
109: 
110: ## Invariants
111: 
112: ### inv-1
113: - value: OXN CLI = 命令解析（Command/SubCommand/Arg）+ 错误消费（TopCatch 4 档分流 / ExitCode）
114:   + I18n + Skill 分发 + Config 加载；任何 CLI 行为必须可拆解到这些子模块
115: 
116: ### inv-2

(Showing lines 102-116 of 174. Use offset=117 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "limit": 10,
  "offset": 163
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md</path>
<type>file</type>
<content>
163:   严禁 import `@openxenon/engine/src/...` 穿透（从 oxn-engine-domain.inv-4 前半承接）
164: 
165: ### inv-15
166: - value: cli↔daemon 仅走 unix socket + JSON payload；
167:   payload schema 唯一权威是 src/daemon/protocol.ts；
168:   cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）
169: 
170: ### inv-16
171: - value: 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，
172:   重名 term（OXN CLI）不重定义；

(Showing lines 163-172 of 174. Use offset=173 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "limit": 25,
  "offset": 25
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md</path>
<type>file</type>
<content>
25: - desc: OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。Work 视角执行单元见 [`oxn-work-domain.Part`](./oxn-work-domain.md#part)。
26: 
27: ### Builtin
28: - desc: OXN 自带资产（@oxn scope），位于 packages/engine/src/builtin/ 目录 .md 文件；版本号单调递增；不依赖任何 @prj 资产。
29: 
30: ### Scope
31: - desc: OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。
32: 
33: ### Registry
34: - desc: 内存中的 @oxn 资产查询表（OxnBuiltinRegistry 维护），CLI 加载期 fail-fast 校验；4 个内置 Provider（file/http/shell/git）。
35: 
36: ### Kernel
37: - desc: L0 纯逻辑验证模块（公证人非裁判 ADR-0031）：零 IO 约束，只接受 Infra 观测输出 Verdict，不调 fs/net/child_process。
38: 
39: ### Infra
40: - desc: L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。
41: 
42: ### Verdict
43: - desc: Proof 轴三态判定（PASSED / FAILED / INCONCLUSIVE），字段含 reason + interferenceFlags[] 等。公证人非裁判（ADR-0031）。
44: 
45: ### Frozen
46: - desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。Schema 在 packages/engine/src/kernel/schemas/proof-schema.ts。
47: 
48: ### Trace
49: - desc: Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。

(Showing lines 25-49 of 151. Use offset=50 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 9.3s)

4 处需清理（按 What/How 判据）：

1. **oxn-cli-domain.md:108** `DSL 唯一权威改为 md-pipeline` — md-pipeline 是实现词，按 ADR-0060 D1 → 改为 `DSL 唯一权威由 Engine 包集中提供`（不带实现名）
2. **oxn-cli-domain.md:167** `payload schema 唯一权威是 src/daemon/protocol.ts` — 代码路径，按 D5.3 → 改为 `payload schema 唯一权威由 Engine 包提供`
3. **oxn-proof-domain.md:28** `位于 packages/engine/src/builtin/ 目录 .md 文件` — 代码路径 → 删
4. **oxn-proof-domain.md:46** `Schema 在 packages/engine/src/kernel/schemas/proof-schema.ts` — 代码路径 → 删

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "v0.7.0 起：Langium / GrammarFile / registerOxnValidators 全部退役（见 ADR-0052），\n  DSL 唯一权威改为 md-pipeline，由 Engine 包集中提供，本域不重定义其概念。",
  "newString": "v0.7.0 起：Langium / GrammarFile / registerOxnValidators 全部退役（见 ADR-0052），\n  DSL 唯一权威由 Engine 包集中提供，本域不重定义其概念。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### inv-15\n- value: cli↔daemon 仅走 unix socket + JSON payload；\n  payload schema 唯一权威是 src/daemon/protocol.ts；\n  cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）",
  "newString": "### inv-15\n- value: cli↔daemon 仅走 unix socket + JSON payload；\n  payload schema 唯一权威由 Engine 包提供；\n  cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "### Builtin\n- desc: OXN 自带资产（@oxn scope），位于 packages/engine/src/builtin/ 目录 .md 文件；版本号单调递增；不依赖任何 @prj 资产。",
  "newString": "### Builtin\n- desc: OXN 自带资产（@oxn scope）；版本号单调递增；不依赖任何 @prj 资产。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "### Frozen\n- desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。Schema 在 packages/engine/src/kernel/schemas/proof-schema.ts。",
  "newString": "### Frozen\n- desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== P7b grep docs/ 残留 ===\"\ngrep -rn \"docs/zh-cn\\|docs/en\\|../../../docs\\|../../docs\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho\necho \"=== grep src/ packages/ 路径残留 ===\"\ngrep -nE \"src/[a-z]+|packages/[a-z]+/src/\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho\necho \"=== grep 7 个被删词残留 ===\"\nfor w in PackageEngine Barrel OXNPackageScope md-pipeline md-bridge EntityCompiler EntityRegistry; do\n  hits=$(grep -rn \"$w\" .openxenon/assets/domains/oxn-*.md 2>/dev/null | wc -l | tr -d ' ')\n  echo \"$w: $hits hits\"\ndone",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== P7b grep docs/ 残留 ===
✅ 0 命中

=== grep src/ packages/ 路径残留 ===
✅ 0 命中

=== grep 7 个被删词残留 ===
PackageEngine: 0 hits
Barrel: 0 hits
OXNPackageScope: 0 hits
md-pipeline: 0 hits
md-bridge: 0 hits
EntityCompiler: 0 hits
EntityRegistry: 0 hits

```

---

## Assistant (Build · MiniMax-M3 · 4.2s)

全部清理完毕。bump proof domain version:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "version: 0.2.0\nname: OxnProofDomain\nabstract: OXN Proof 业务领域。\nreferences:\n  - oxn-engine-domain\n  - oxn-work-domain\ncitations: 0\nsynced-at: 2026-07-16",
  "newString": "version: 0.2.1\nname: OxnProofDomain\nabstract: OXN Proof 业务领域。\nreferences:\n  - oxn-engine-domain\n  - oxn-work-domain\ncitations: 0\nsynced-at: 2026-07-17"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 9.5s)

现在跑全链路验证：

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== Lint ===\"\nbun run lint 2>&1 | tail -3\necho\necho \"=== Typecheck ===\"\nbun run typecheck 2>&1 | tail -3\necho\necho \"=== validate-deps ===\"\nbun scripts/validate-dependencies.ts 2>&1 | tail -3\necho\necho \"=== Domain validate × 7 ===\"\nfor d in oxn-domain oxn-cli-domain oxn-engine-domain oxn-asset-domain oxn-work-domain oxn-proof-domain oxn-insight-domain; do\n  result=$(bun run packages/cli/src/index.ts domain validate $d 2>&1 | grep -E \"✓ valid|✗|ERROR\")\n  echo \"$d: $result\"\ndone",
  "timeout": 180000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== Lint ===
$ eslint src/ packages/

=== Typecheck ===
$ tsc --noEmit

=== validate-deps ===
    "skippedTests": 6
  }
}

=== Domain validate × 7 ===
oxn-domain: Domain OxnDomain ✓ valid
oxn-cli-domain: Domain OxnCliDomain ✓ valid
oxn-engine-domain: Domain OxnEngineDomain ✓ valid
oxn-asset-domain: Domain OxnAssetDomain ✓ valid
oxn-work-domain: Domain OxnWorkDomain ✓ valid
oxn-proof-domain: Domain OxnProofDomain ✓ valid
oxn-insight-domain: Domain OxnInsightDomain ✓ valid

```

---

## Assistant (Build · MiniMax-M3 · 32.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== OxnDomain show ===\"\nbun run packages/cli/src/index.ts domain show OxnDomain 2>&1 | head -25\necho\necho \"=== OxnEngineDomain show ===\"\nbun run packages/cli/src/index.ts domain show OxnEngineDomain 2>&1 | head -25\necho\necho \"=== bun test ===\"\nbun test 2>&1 | tail -6\necho\necho \"=== docs:build ===\"\nbun run docs:build 2>&1 | tail -3",
  "timeout": 300000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== OxnDomain show ===
Domain: OxnDomain
File:   oxn-domain.md

Counts:
  Terms:      16
  Bans:       0
  Invariants: 4

Term groups:
  OpenXenon: OpenXenon, OXN, OXN CLI, OXN Engine, OXL, IAP, Intent, Align, Proof, Asset, Boundary, Work, Verdict, Insight, Hall, Daemon

Terms linking out: 6
  → oxn-cli-domain.md
  → oxn-engine-domain.md
  → oxn-proof-domain.md
  → oxn-asset-domain.md
  → oxn-work-domain.md
  → oxn-insight-domain.md

Referenced by (2 unique source Domains):
  OxnEngineDomain (2):
    - OXN Engine
    - OXL
  OxnCliDomain (1):
    - OXN CLI

=== OxnEngineDomain show ===
Domain: OxnEngineDomain
File:   oxn-engine-domain.md

Counts:
  Terms:      9
  Bans:       1
  Invariants: 6

Term groups:
  OXN Engine: OXN Engine, BuiltinAsset
  Kernel: Kernel, Infra, Daemon, OXL
  IAPError: IAPError, OXNCrash, CliInputError

Terms linking out: 1
  → oxn-domain.md

Referenced by (1 unique source Domain):
  OxnDomain (2):
    - OXN Engine
    - OXL
OpenXenon CLI
Run `oxn --help` for usage information

=== bun test ===

 1533 pass
 3 skip
 0 fail
 6460 expect() calls
Ran 1536 tests across 119 files. [24.88s]

=== docs:build ===
- rendering pages...
[32m✓[0m rendering pages...
build complete in 3.95s.

```

---

## Assistant (Build · MiniMax-M3 · 2.4s)

全绿。让我把 Engine Domain 最终面貌看一下，确认干净：

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.4.1
4: name: OxnEngineDomain
5: abstract: OXN Engine 领域。
6: references:
7:   - oxn-domain
8: citations: 0
9: synced-at: 2026-07-17
10: ---
11: 
12: # Domain: OxnEngineDomain
13: 
14: ## Terms: OXN Engine
15: 
16: ### OXN Engine
17: - desc: OpenXenon 核心引擎。root 抽象定义见 [`oxn-domain.OXN Engine`](./oxn-domain.md#oxn-engine)。
18: 
19: ### BuiltinAsset
20: - desc: Engine 编译时内置资产（@oxn scope）；与项目资产（@prj scope）严格隔离。
21: 
22: ## Terms: Kernel
23: 
24: ### Kernel
25: - desc: L0 纯逻辑验证模块（公证人非裁判）；只接受 Infra 通过 Port 暴露的观测结果，输出 Verdict。Kernel 禁用 fs/net/child_process/process.env/process.std*/EventEmitter。
26: 
27: ### Infra
28: - desc: L1 副作用/IO 执行模块；只回答事实不做 PASS/FAIL 判定，通过 Port 接口暴露 IO 能力（FsPort/PathPort/ProbePort/HashPort/OsPort/PartPort）。
29: 
30: ### Daemon
31: - desc: OXN Engine 后台守护进程；负责 Engine 常驻模式 + 文件监听 + Work 追踪 + Probe FAIL 阻止。
32: 
33: ### OXL
34: - desc: Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。root 定义见 [`oxn-domain.OXL`](./oxn-domain.md#oxl)。
35: 
36: ## Terms: IAPError
37: 
38: ### IAPError
39: - desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。
40: 
41: ### OXNCrash
42: - desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。
43: 
44: ### CliInputError
45: - desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。
46: 
47: ## Bans
48: 
49: ### forbidden-constructs
50: - items:
51:   - L2Domain
52:   - Tier
53:   - TierLevel
54:   - Stratum
55:   - Strata
56:   - ArsenalPromote
57:   - DraftAsset
58:   - CanonicalAsset
59:   - monolithic-cli
60:   - monolithic-engine
61:   - package-coupled
62:   - engine-internal-import
63:   - daemon-direct-import-from-cli
64:   - cli-direct-import-from-daemon
65:   - cross-package-circular
66:   - import-from-src
67:   - @engine-internal
68:   - CrashLoop
69:   - ForkDaemon
70:   - SystemdUnit
71:   - LaunchD
72:   - ANTLR
73:   - Yacc
74:   - PEG
75:   - TypeScriptGrammar
76:   - HandWrittenParser
77: - desc: |
78:   禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。
79:   Monorepo 禁用 monolithic-{cli,engine} / 跨包循环 / 穿透 import-from-src。
80:   Daemon 禁用 CrashLoop/ForkDaemon/SystemdUnit/LaunchD（必须走 oxn daemon * 命令）。
81:   OXL 禁用 ANTLR/Yacc/PEG/TypeScriptGrammar/HandWrittenParser（统一通过 unified 库实现 MD-native DSL，禁止再引 DSL 框架）。
82: 
83: ## Invariants
84: 
85: ### inv-1
86: - value: L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图
87: 
88: ### inv-2
89: - value: Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，
90:   不可互相包含
91: 
92: ### inv-3
93: - value: Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；
94:   Infra 只回答事实不做判定；Kernel 不能直接执行 Task；
95:   Infra 不能绕过 Daemon 自己宣布 Work 完成。
96:   Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter
97: 
98: ### inv-4
99: - value: Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，
100:   仅走 packages/engine 公共 API；
101:   packages/engine 不能 import packages/cli（engine 是被依赖方）
102: 
103: ### inv-5
104: - value: Daemon 不能 import CLI（必须走 socket 通信）；不能直接 import fs（必须通过 L1-Infra 收口）
105: 
106: ### inv-6
107: - value: 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，
108:   重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain

(End of file - total 108 lines)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 6.6s)

Engine Domain 现在很干净：9 词，3 组，0 docs 引用，0 代码路径，0 实现状态注释。

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
      "status": "completed",
      "priority": "medium"
    },
    {
      "content": "P6: 验证 docs 已覆盖被删词",
      "status": "completed",
      "priority": "medium"
    },
    {
      "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7b: grep 最终确认无 docs/ 链接残留",
      "status": "completed",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1: 删 oxn-{engine,cli,asset,work,proof,insight}-domain.md 中的 (package Domain 实现)/(module Domain) 括注",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 删 7 个实现词（PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2.1: root oxn-domain.md 新增 ### OXL term",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2.2: 重写 ### OXL desc（Engine 视角）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.1: Engine Domain 修 11 处违规（BuiltinAsset/Kernel/Daemon/IAPError/OXNCrash/CliInputError + forbidden-constructs + inv-2/3/5 + inv-4 barrel 引用）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.2: CLI Domain 修 3 处（OXN CLI 括注/Skill SSOT 路径/inv-8 SSOT 路径）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3.3: Module Domains 修 5 处（asset/work/proof/insight 各 1-2 处）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: RFC v0.7 §2 全景图 + §2.1 演进表同步",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 新建 ADR-0060-domain-vocabulary-boundary.md",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5b: ADR INDEX.md 加入 ADR-0060 条目",
    "status": "completed",
    "priority": "medium"
  },
  {
    "content": "P6: 验证 docs 已覆盖被删词",
    "status": "completed",
    "priority": "medium"
  },
  {
    "content": "P7: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7b: grep 最终确认无 docs/ 链接残留",
    "status": "completed",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 12.5s)

## 完成总结

### 核心变更（按 ADR-0060 D1-D7）

| ADR-0060 决策 | 落实动作 |
|---|---|
| **D1 双层判定**（What/How） | Engine Domain 16→9 词；CLI/Asset/Work/Proof 域 desc 清理 |
| **D2 词汇 4 分类** | 产品词+特性词（What）→Domain；实现词+通用词（How）→Stack/docs |
| **D3 root = 特性集合** | root oxn-domain.md 新增 `### OXL` |
| **D4 同名特性词多域共存** | root + Engine 同名 `OXL`，root 定义本质、Engine 补视角特性 |
| **D5 引用规则** | 删 14 处 docs 引用 + 4 处代码路径 + 2 处实现状态注释 |
| **D6 不变式自给自足** | inv-3 Kernel IO 禁用清单 inline 写入；inv-2 删 docs 引用 |
| **D7 OXL 拆分触发** | RFC §2.1 写明"OXL 相关契约词 > 5 才拆 `oxn-engine-oxl-domain`" |

### Engine Domain 现状

| H2 组 | Terms |
|---|---|
| `## Terms: OXN Engine` | OXN Engine / BuiltinAsset |
| `## Terms: Kernel` | Kernel / Infra / Daemon / OXL |
| `## Terms: IAPError` | IAPError / OXNCrash / CliInputError |

**9 词 · 跨版本稳定** · 无 docs/ 引用 · 无代码路径 · 无实现状态注释。

### 文件清单

| 类型 | 文件 | 变化 |
|---|---|---|
| ADR | `0060-domain-vocabulary-boundary.md` | 🆕 新建（决策 D1-D7） |
| ADR INDEX | `INDEX.md` | + ADR-0059 + ADR-0060 + ADR-0052 三条索引；总计 50→52 |
| RFC | `v0.7-domain-hierarchy-restructure-rfc.md` | §2 全景图 Engine 域删 7 词 + root 加 OXL；§2.1 演进表加 v0.4.1 行 |
| Domain | `oxn-engine-domain.md` | v0.4.0→v0.4.1；16→9 词；11 处 desc/invariant 清理 |
| Domain | `oxn-domain.md` | v0.4.0→v0.4.1；15→16 词（+OXL） |
| Domain | `oxn-cli-domain.md` | v0.4.0→v0.4.1；4 处清理（括注 + Skill 路径 + md-pipeline 引用 + inv-15 src/路径） |
| Domain | `oxn-work-domain.md` | v0.2.0→v0.2.1；2 处清理（括注 + docs 引用） |
| Domain | `oxn-asset-domain.md` | v0.2.0→v0.2.1；2 处清理（括注 + docs 引用） |
| Domain | `oxn-proof-domain.md` | v0.2.0→v0.2.1；2 处清理（Builtin 路径 + Frozen Schema 路径） |

### Backlinks 验证

```
OxnDomain backlinks:
  OxnEngineDomain (2): OXN Engine + OXL
  OxnCliDomain (1): OXN CLI

OxnEngineDomain backlinks:
  OxnDomain (2): OXN Engine + OXL    ← 同名特性词多域共存成功生效
```

### 验证

| 项 | 结果 |
|---|---|
| ESLint | ✅ pass |
| TypeScript | ✅ pass |
| validate-deps | ✅ 0 violation |
| 7 Domain validate | ✅ 全部 valid |
| `oxn domain show OxnDomain` | ✅ 16 terms / backlinks 工作 |
| `oxn domain show OxnEngineDomain` | ✅ 9 terms / 3 groups / OXL 双域共存 |
| bun test | ✅ **1533 pass / 0 fail / 6460 expects / 24.88s** |
| docs build | ✅ complete in 3.95s |
| grep `docs/` 残留 | ✅ 0 命中 |
| grep `src/` / `packages/.../src/` 路径残留 | ✅ 0 命中 |
| grep 7 个被删词残留 | ✅ 0 命中 |

### 副作用

- **删除 7 词** = deleting-only breaking change（被 docs/zh-cn/dev/oxn-engine.md §"OXL 解析链路" / §"模块结构" 已有同等描述覆盖）
- **新增 1 词** (root OXL) = adding-only
- **版本号** 全部 sync 到 0.4.1 / 0.2.1

---

## User

1、root 抽象定义见 [`oxn-domain.OXN Engine`](./oxn-domain.md#oxn-engine)。 这种是多余的，我删了。
2、“### IAPError
- desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。

### OXNCrash
- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。

### CliInputError
- desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。 “ 这三项定义很疑惑。
3、### ExitCode
- desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。
4、你再检查我修改后的oxn-engine-domain和oxn-cli-domain。分析为何你改动了还依然有定义“边界“的模糊与跨越问题呢。

---

## Assistant (Plan · GLM-5.2 · 17.1s)

_Thinking:_

用户提了 4 个问题，我现在在 Plan 模式（READ-ONLY）只能观察分析。让我先读完整的当前 4 个 Domain（root, engine, cli, proof, asset, work, insight），然后按用户的 4 个问题分析诊断。

注意用户已经在 #1 已经手动删了 "root 抽象定义见..." 这条尾巴，所以我要按"删后状态"看。实际我去读文件时如果还看到这条，那是用户没保存或我可以判断这是用户希望的目标态——我应该按"用户已删"为前提分析。

#1: 用户已经删了 "root 抽象定义见 oxn-domain.OXN Engine" 这条 MD link — 用户告诉我"这种是多余的"。这意味着用户拒绝的不只是这一条尾巴，而是**整个"在 term desc 里加 'root 抽象定义见 [oxn-domain.X]' 链接"模式**。我应该把其他 Domain 里同样的尾巴也识别为多余。

但我现在是 Plan 模式，不能编辑。我要先分析完所有问题，然后给一个 plan 等用户确认。

让我按顺序回答：

**Q1**: 多余的 root 抽象定义行 — 用户已手动删。我要扫描其他 6 个 Domain，找出所有同类"root 抽象定义见/见 [oxn-domain.X]"的尾巴，进 plan。

**Q2/Q3**: IAPError / OXNCrash / CliInputError / ExitCode 定义模糊与跨越 — 我要看 CLI Domain 和 Engine Domain，分析谁才是这三个错误类型的 SSOT，以及 ExitCode 应该如何归属。

**Q4**: 用户问"为何你改动了还依然有定义边界模糊与跨越问题"——这是对我之前工作的反思，我要诚实分析原因。

让我先并行读 4 个关键文件（实际是 6 个 Domain + CLI invariant 部分）。

我应该用 explore agent 吗？这个问题不需要跨大量文件搜索，只要精读几个文件，Read 工具就够了。

让我先读这些文件。

我在 Plan 模式先读所有相关文件做分析，不编辑。

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.4.1
4: name: OxnEngineDomain
5: abstract: OXN Engine 领域。
6: references:
7:   - oxn-domain
8: citations: 0
9: synced-at: 2026-07-17
10: ---
11: 
12: # Domain: OxnEngineDomain
13: 
14: ## Terms: OXN Engine
15: 
16: ### OXN Engine
17: - desc: OpenXenon 核心引擎。
18: 
19: ### BuiltinAsset
20: - desc: Engine 编译时内置资产（@oxn scope）；与项目资产（@prj scope）严格隔离。
21: 
22: ## Terms: Kernel
23: 
24: ### Kernel
25: - desc: L0 纯逻辑验证模块；通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。
26: 
27: ### Infra
28: - desc: L1 副作用/IO 执行模块；负责OpenXenon 跟 外部宿主环境的出入口，包括文件、网络等具有副作用的交互。
29: 
30: ### Daemon
31: - desc: OXN Engine 后台守护进程；负责 Engine 常驻模式 + 文件监听 + Work 追踪 + Probe FAIL 阻止。
32: 
33: ### OXL
34: - desc: Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。
35: 
36: ## Terms: IAPError
37: 
38: ### IAPError
39: - desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。
40: 
41: ### OXNCrash
42: - desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。
43: 
44: ### CliInputError
45: - desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。
46: 
47: ## Bans
48: 
49: ### forbidden-constructs
50: - items:
51:   - L2Domain
52:   - Tier
53:   - TierLevel
54:   - Stratum
55:   - Strata
56:   - ArsenalPromote
57:   - DraftAsset
58:   - CanonicalAsset
59:   - monolithic-cli
60:   - monolithic-engine
61:   - package-coupled
62:   - engine-internal-import
63:   - daemon-direct-import-from-cli
64:   - cli-direct-import-from-daemon
65:   - cross-package-circular
66:   - import-from-src
67:   - @engine-internal
68:   - CrashLoop
69:   - ForkDaemon
70:   - SystemdUnit
71:   - LaunchD
72:   - ANTLR
73:   - Yacc
74:   - PEG
75:   - TypeScriptGrammar
76:   - HandWrittenParser
77: - desc: |
78:   禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。
79:   Monorepo 禁用 monolithic-{cli,engine} / 跨包循环 / 穿透 import-from-src。
80:   Daemon 禁用 CrashLoop/ForkDaemon/SystemdUnit/LaunchD（必须走 oxn daemon * 命令）。
81:   OXL 禁用 ANTLR/Yacc/PEG/TypeScriptGrammar/HandWrittenParser（统一通过 unified 库实现 MD-native DSL，禁止再引 DSL 框架）。
82: 
83: ## Invariants
84: 
85: ### inv-1
86: - value: L0-L3 与 P0-P3 是两个正交概念：L0-L3 描述代码分层，P0-P3 描述产品路线图
87: 
88: ### inv-2
89: - value: Domain 实体（用户业务域）与 L0-L3 宪法（OXN 元域）通过 ContextMap 显式连接，
90:   不可互相包含
91: 
92: ### inv-3
93: - value: Kernel 与 Infra 司法/行政分离：Kernel 只做 PASS/FAIL 判定；
94:   Infra 只回答事实不做判定；Kernel 不能直接执行 Task；
95:   Infra 不能绕过 Daemon 自己宣布 Work 完成。
96:   Kernel 全面禁用 fs/net/child_process/process.env/process.std*/EventEmitter
97: 
98: ### inv-4
99: - value: Monorepo 包边界：packages/cli 不能 import packages/engine 内部模块，
100:   仅走 packages/engine 公共 API；
101:   packages/engine 不能 import packages/cli（engine 是被依赖方）
102: 
103: ### inv-5
104: - value: Daemon 不能 import CLI（必须走 socket 通信）；不能直接 import fs（必须通过 L1-Infra 收口）
105: 
106: ### inv-6
107: - value: 本域与 oxn-domain 单向引用：Engine 子域补父域未说的部分，
108:   重名 term（OXN Engine）不重定义；不向下引用 oxn-cli-domain/oxn-asset-domain

(End of file - total 108 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.4.1
4: name: OxnCliDomain
5: abstract: OXN CLI 领域。
6: references:
7:   - oxn-domain
8: citations: 0
9: synced-at: 2026-07-17
10: ---
11: 
12: # Domain: OxnCliDomain
13: 
14: ## Terms: OXN CLI
15: 
16: ### OXN CLI
17: - desc: OpenXenon 交互入口之一。
18: 
19: ## Terms: Command
20: 
21: ### Command
22: - desc: CLI 顶级命令，采用 citty 库。
23: 
24: ### SubCommand
25: - desc: Command 下子命令（如 `work add-task`、`domain validate`）。
26: 
27: ### Arg
28: - desc: 命令参数（必填或可选）。
29: 
30: ### OutputFormat
31: - desc: 输出格式（human/json/yaml/html/md）。
32: 
33: ### ExitCode
34: - desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。
35: 
36: ## Terms: Skill
37: 
38: ### Skill
39: - desc: OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。
40: 
41: ### SkillAdapter
42: - desc: 多 AI 助手适配器。
43: 
44: ### AdaptersRoot
45: - desc: SkillAdapter 对各自 AI 助手写入其配置目录以便识别。
46: 
47: ## Terms: Locale
48: 
49: ### Locale
50: - desc: 语言区域标识（仅支持 'zh-CN'）；DEFAULT_LOCALE = 'zh-CN' 兜底；ResolveLocale 优先级 `--locale > config.locale > LANG env > DEFAULT`。
51: 
52: ### I18nKey
53: - desc: 翻译 key 字符串（点号分隔命名空间）；zh-CN locale 字典是 SSOT。
54: 
55: ### TFunction
56: - desc: `t(key, args?)` 主翻译函数；从 zh-CN locale 字典解析；缺 key 抛 I18N_KEY_MISSING。
57: 
58: ### LocaleBundle
59: - desc: locale 字典 `{ [key: string]: string }` 平面结构；按 dot key 索引。
60: 
61: ## Terms: OXnConfig
62: 
63: ### OXnConfig
64: - desc: OXN 项目级配置（.oxnrc，git tracked）；存 leaderMode（CLI 路由模式）。
65: 
66: ### ProjectConfig
67: - desc: 项目运行时配置（.openxenon/.config，git ignored）；含 mode/locale/debug/tools。
68: 
69: ### ProjectBoundary
70: - desc: 项目物理边界目录 `.openxenon/`；存放所有运行时与意图资产。
71: 
72: ## Bans
73: 
74: ### forbidden-constructs
75: - items:
76:   - Flag
77:   - Option
78:   - Switch
79:   - ParserImpl
80:   - LexerImpl
81:   - GrammarFile
82:   - var
83:   - document.
84:   - window.
85:   - hardcodedString
86:   - englishFallback
87:   - i18n.bypass
88:   - t.bypass
89:   - locale.en-only
90:   - locale.legacy-iso-code
91:   - configFile
92:   - rcFile
93:   - dotFile
94:   - settingsFile
95:   - preferencesFile
96:   - VerdictAsException
97:   - FailureAsCrash
98:   - OXN_INTERNAL_ERROR_AS_IAP
99:   - StackTraceToAI
100:   - HARD_HALT_AS_IAP
101:   - HARD_FAIL
102:   - SOFT_FAIL
103: - desc: |
104:   CLI 参数层禁用 Flag/Option/Switch（用 Arg 一词）；i18n 禁用硬编码英文/绕过 t()；
105:   config 禁用 rcFile/dotFile/settingsFile（统一 OXnConfig/ProjectConfig）；
106:   错误处理禁用对人类 + AI 不同源的轨道混淆（VerdictAsException / FailureAsCrash）。
107:   v0.7.0 起：Langium / GrammarFile / registerOxnValidators 全部退役（见 ADR-0052），
108:   DSL 唯一权威由 Engine 包集中提供，本域不重定义其概念。
109: 
110: ## Invariants
111: 
112: ### inv-1
113: - value: OXN CLI = 命令解析（Command/SubCommand/Arg）+ 错误消费（TopCatch 4 档分流 / ExitCode）
114:   + I18n + Skill 分发 + Config 加载；任何 CLI 行为必须可拆解到这些子模块
115: 
116: ### inv-2
117: - value: 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；
118:   二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack
119: 
120: ### inv-3
121: - value: TopCatch 4 档分流：IAPError / OXNCrash / CliInputError / Crash 兜底；
122:   Crash 兜底绝不暴露给 AI（属于 OXNCrash 语义）
123: 
124: ### inv-4
125: - value: IAPError 的 action 字段 v1.0.2 后仅 YIELD_TO_HUMAN 一种（AI 不能自己改，必须叫人）
126: 
127: ### inv-5
128: - value: AI 调用必须传 --json；CLI 默认 human 模式走 t() 翻译；
129:   human 模式禁止硬编码英文/中文（biome lint 拒绝）
130: 
131: ### inv-6
132: - value: DEFAULT_LOCALE = 'zh-CN' 是唯一权威兜底；CLI / Skill / 文档站点全用此值；
133:   en locale 已废弃（不允许独立维护）
134: 
135: ### inv-7
136: - value: resolveLocale 优先级：--locale flag > config.locale > LANG env > DEFAULT ('zh-CN')
137: 
138: ### inv-8
139: - value: Skill SSOT 唯一来源由 CLI 包提供；
140:   不允许手写英文 Skill 字典（CLI init 时自动从 zh-CN 镜像）
141: 
142: ### inv-9
143: - value: oxn init 默认同时把同一份 SSOT Skill 编译到 3 套 AdaptersRoot
144:   （opencode/claude/agents）；compileAllSkills(toolIds, ...) 是入口
145: 
146: ### inv-10
147: - value: AdaptersRoot 互不重叠：opencode→.opencode/skills/；
148:   claude→.claude/skills/；agents→.agents/skills/
149: 
150: ### inv-11
151: - value: OxnConfig（.oxnrc，git tracked）只存 leaderMode；
152:   ProjectConfig（.openxenon/.config，git ignored）存 mode/locale/debug/tools 等
153: 
154: ### inv-12
155: - value: 命令名 kebab-case（与 Skill ID 命名一致）；OXN 不强制 PascalCase / kebab-case 风格，
156:   只强制声明 vs 文件规范化后一致（跨平台一致性保障）
157: 
158: ### inv-13
159: - value: CLI 顶层统一走 `oxn-config` 包；不允许直接读 .oxnrc 字符串拼接
160: 
161: ### inv-14
162: - value: CLI 必须通过 packages/engine barrel 消费 Engine 公共 API，
163:   严禁 import `@openxenon/engine/src/...` 穿透（从 oxn-engine-domain.inv-4 前半承接）
164: 
165: ### inv-15
166: - value: cli↔daemon 仅走 unix socket + JSON payload；
167:   payload schema 唯一权威由 Engine 包提供；
168:   cli 必须 import 共享类型，不得自造（从 oxn-engine-domain.inv-8 承接）
169: 
170: ### inv-16
171: - value: 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，
172:   重名 term（OXN CLI）不重定义；
173:   不向下引用 oxn-engine-domain/oxn-asset-domain；
174:   错误类型术语迁 Engine 域后本域只保留消费侧规则

(End of file - total 174 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.4.1
4: name: OxnDomain
5: abstract: OpenXenon 顶层领域。
6: references: []
7: citations: 0
8: synced-at: 2026-07-17
9: ---
10: 
11: # Domain: OxnDomain
12: 
13: ## Terms: OpenXenon
14: 
15: ### OpenXenon
16: - desc: 轻量级人机协作工具。
17: 
18: ### OXN
19: - desc: OpenXenon 缩写。
20: 
21: ### OXN CLI
22: - desc: OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。
23: 
24: ### OXN Engine
25: - desc: OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。
26: 
27: ### OXL
28: - desc: OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。
29: 
30: ### IAP
31: - desc: 工程师定意图（Intent），AI Agent 跑对齐（Align），OXN Engine 出证明（Proof）。
32: 
33: ### Intent
34: - desc: 人机协作的软件目标，AI Agent 对齐的工作对象。
35: 
36: ### Align
37: - desc: 人机协作的工作过程，AI Agent 遵守边界并收敛执行。
38: 
39: ### Proof
40: - desc: 人机协作的工作成果，OXN Engine 记录的客观事实。具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。
41: 
42: ### Asset
43: - desc: 工程师的资产，定义 AI Agent 工作时需要遵守的边界。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。
44: 
45: ### Boundary
46: - desc: Asset 的别名。
47: 
48: ### Work
49: - desc: 人机协作的工作空间，衔接 Asset 与 Proof。具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
50: 
51: ### Verdict
52: - desc: OXN Engine 的证明报告，提供工程师基于客观事实判断。
53: 
54: ### Insight
55: - desc: 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-insight-domain`](./oxn-insight-domain.md)。
56: 
57: ### Hall
58: - desc: 研讨厅，人机协作范围内的中央枢纽。
59: 
60: ### Daemon
61: - desc: OXN Engine 后台守护进程，监听人机协作的变化与边界预警。
62: 
63: ## Invariants
64: ### inv-1: single-source-of-truth
65: - value: OpenXenon = OXN CLI + OXN Engine
66: 
67: ### inv-2: root-no-downward-ref
68: - value: 本 Domain 是唯一 root Domain；references 为空；其他 Domain 在 references 字段中引用本 Domain
69: 
70: ### inv-3: product-boundary
71: - value: 本 Domain 定义 OpenXenon 产品词汇边界
72: 
73: ### inv-4: three-top-concepts-closed-loop
74: - value: Intent + Align + Proof 三者构成产品核心机制闭环

(End of file - total 74 lines)
</content>
```

---

## Assistant (Plan · GLM-5.2 · 22.6s)

_Thinking:_

现在我已经读完了 3 个核心 Domain。让我看 ExitCode 这个 term 在 CLI Domain line 33-34：

```
### ExitCode
- desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。
```

CLI Domain invariant 2 又写：
```
### inv-2
- value: 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；
  二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack
```

而 Engine Domain 有 IAPError / OXNCrash / CliInputError 三个 term。

用户提了 4 个问题，我一个一个分析：

---

**Q1**: "root 抽象定义见 [...](oxn-domain...#xxx)" 这种是多余的，已删。

用户已经删了 Engine Domain 里 "### OXN Engine" 后面的尾巴（line 17 已是 "- desc: OpenXenon 核心引擎。" 没有 root 抽象定义见）。

Engine Domain line 34 `### OXL` 也是 "- desc: Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。" 也已经删了。

但 root Domain line 22, 25, 28, 40, 43, 49, 55 里 "具体领域见 [oxn-xxx-domain]" 这种尾巴还在。用户说"这种是多余的"——应该是指**所有这种尾巴都多余**。

让我检查：
- root line 22 有 OXN CLI 后面 "具体领域见 [`oxn-cli-domain`]"
- root line 25 有 OXN Engine 后面 "具体领域见 [`oxn-engine-domain`]"
- root line 28 有 OXL 后面 "具体领域见 [`oxn-engine-domain.OXL`]"
- root line 40 有 Proof 后面 "具体领域见 [`oxn-proof-domain`]"
- root line 43 有 Asset 后面 "具体领域见 [`oxn-asset-domain`]"
- root line 49 有 Work 后面 "具体领域见 [`oxn-work-domain`]"
- root line 55 有 Insight 后面 "具体领域见 [`oxn-insight-domain`]"

那么用户的判断是：root term desc 不应该带"具体领域见"这种尾巴。理由：root 是顶层，term desc 应该 1 行说清楚；用户/AI 通过 backlinks（自动计算）可以发现子 Domain，不需要在 desc 内重复写 MD link。

这意味着 ADR-0059 §D2 的设计需要修订！ADR-0059 §D2 原来说"term desc 里的 markdown 链接表达该 term 有专门的子 Domain"——用户现在判断这是多余。

那 backlinks 由"扫描 desc 内 MD link"计算——如果 desc 里没有 MD link 了，怎么算 backlink？

重新想：用户删掉的是"root 抽象定义见 [...]"（子 Domain 回引 root）和"具体领域见 [...]"（root 引向子）——这是双向的两类尾巴。这两类实际是 ADR-0059 §D2 的实现。

但用户的判断是：这种尾巴在 term desc 里就是噪音。backlinks 怎么办？由 references frontmatter 推断？不，references 是 sub→root DAG，反向就是 root 的 backlinks（sub 的 references 列了 root）。

我先把这个问题当作 Plan 一部分提出。让我先扫所有 Domain 看有哪些类似的尾巴：

让我并行扫描其他子 Domain，看类似尾巴 + 处理 CLI/Engine 冲突点：

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.2.1
4: name: OxnAssetDomain
5: abstract: OXN Asset 业务领域。
6: references:
7:   - oxn-engine-domain
8:   - oxn-cli-domain
9: citations: 0
10: synced-at: 2026-07-17
11: ---
12: 
13: # Domain: OxnAssetDomain
14: 
15: ## Terms: Asset
16: 
17: ### Asset
18: - desc: Asset = oxn-domain.Asset 在 E1 业务层的完整定义。5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。
19: 
20: ### AssetKind
21: - desc: Asset 5 类收敛枚举（domain / workflow / stack / blueprint / roadmap），v0.6.1-alpha.4 三边界框架收敛结果。
22: 
23: ### AssetMode
24: - desc: Asset 模式 Work（`oxn work create --type asset --asset-kind X`），走 IAP 闭环但跳过 task DAG；只写 .openxenon/assets/{kind}/{name}.md + planLock。
25: 
26: ### AssetLifecycle
27: - desc: Asset 完整生命周期 3 阶段（create / evolve / archive）+ 附 delete（需 citations==0）。
28: 
29: ### PlanLock
30: - desc: Asset 创建后强校验卡（与 Work planLock 等效），锁 fileHash + citations + DAG；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH。
31: 
32: ### AssetCitation
33: - desc: Asset 反向引用计数（自动维护）：引用方变更 +1，archive 保留，删除要求 citations===0。
34: 
35: ### AssetDAG
36: - desc: Asset `references[]` 字段构建的依赖图（无环 + 跨 kind 隔离 + 数量预算 N=5）。
37: 
38: ### AssetPaper
39: - desc: Asset 论文结构 4 字段不变量（ADR-0051）：abstract + references + citations + auditTrail 缺一不可。学术论文↔Asset 映射。
40: 
41: ### AssetFrontmatter
42: - desc: Asset .md 文件的 YAML frontmatter schema（含 entity/version/name/abstract/references/citations/status/auditTrail 字段）。
43: 
44: ### AssetFileResolver
45: - desc: Asset 路径解析器（resolveAssetFile / resolveAssetDir），v0.6 primary `.openxenon/assets/{kind}/{name}.md` + v0.5 fallback。
46: 
47: ## Bans
48: 
49: ### forbidden-constructs
50: - items:
51:   - ignoreAssetLock
52:   - directWriteOxn
53:   - copyFromOldLayout
54:   - assetModeTask
55:   - assetBypassWork
56:   - AssetKindMix
57:   - CategoryMix
58:   - missingAbstract
59:   - missingReferences
60:   - missingCitations
61:   - missingAuditTrail
62:   - selfReference
63:   - cyclicReference
64:   - oldLayoutPath
65:   - oxn-asset-new
66:   - skipValidation
67:   - forceBypass
68: 
69: ## Invariants
70: 
71: ### inv-1: 5-asset-kind-whitelist
72: - value: 5 AssetKind 白名单不可混用（domain ≠ workflow ≠ stack ≠ blueprint ≠ roadmap）；H2 分类严格隔离；混用 → E_MD_CATEGORY_UNKNOWN
73: 
74: ### inv-2: asset-mode-requires-asset-kind
75: - value: --type asset 必填 --asset-kind X；5 AssetKind 之外的值 → OXN_INVALID_ASSET_KIND（CLI 加载期拒绝）
76: 
77: ### inv-3: asset-mode-skip-task-dag
78: - value: Asset 模式（--type asset）不走 task DAG；不写 .work / .run；只写 .openxenon/assets/{kind}/{name}.md + planLock
79: 
80: ### inv-4: asset-paper-4-fields-required
81: - value: Asset 论文结构 4 字段必填：abstract + references + citations + auditTrail 缺一不可；缺失 → IAP_INTENT_ASSET_INCOMPLETE
82: 
83: ### inv-5: asset-dag-no-cycles
84: - value: Asset 引用 DAG 无环：AssetA.references 含 AssetB + AssetB.references 含 AssetA → IAP_INTENT_DAG_CYCLE（含 cycleHint）
85: 
86: ### inv-6: asset-no-self-reference
87: - value: Asset 不能引用自己（v0.6.3+ hard-block）：Asset.references 含自身 → IAP_INTENT_SELF_REFERENCE
88: 
89: ### inv-7: planlock-hash-strict
90: - value: Asset 创建后 planLock 强校验 fileHash；漂移触发 IAP_ALIGN_LOCK_HASH_MISMATCH（与 Work planLock 4 组件 hash 等效）
91: 
92: ### inv-8: evolve-creates-new-version
93: - value: Asset 演进（--evolve-from）创建新版本，旧版 planLock 自动失效；新 Asset 必须有 auditTrail 引用旧版
94: 
95: ### inv-9: archive-preserves-citations
96: - value: Asset 归档（oxn asset archive X --reason Y）：文件 mv 到 .openxenon/.archived/{kind}/X.md；citations 保留；planLock 仍可查询（只读）
97: 
98: ### inv-10: delete-requires-no-refs
99: - value: Asset 删除（oxn asset delete X --force）：仅当无任何引用 + 业务团队同意才能硬删；否则 → IAP_ASSET_HAS_REFS (YIELD_TO_HUMAN)
100: 
101: ### inv-11: asset-physical-location
102: - value: Asset 物理位置 v0.6 默认：.openxenon/assets/{kind}/X.md；v0.5 fallback：.openxenon/{kind}/X.md（保留兼容但新项目不再使用）
103: 
104: ### inv-12: asset-naming-convention
105: - value: Asset 命名规范：domain PascalCase（MemberContext）；blueprint/stack/roadmap kebab-case（dev-workflow）
106: 
107: ### inv-13: asset-name-file-consistency
108: - value: Asset 名称规范化：toKebab(declared) === toKebab(file_stem)；不一致 → IAP_INTENT_NAME_FILE_MISMATCH (YIELD_TO_HUMAN)
109: 
110: ### inv-14: duplicate-name-conflict
111: - value: 重复创建同 name 资产 → OXN_ASSET_EXISTS (PATH_CONFLICT)；--force 覆盖；不静默合并
112: 
113: ### inv-15: kind-isolation-in-references
114: - value: Asset.references 仅可引用同 AssetKind（target name 必须在该 kind 文件夹下实际存在）；跨 kind 组合由 Roadmap scene.links 承担；跨 kind references 触发 IAP_INTENT_CROSS_KIND_REF（v0.6.2+ hard-block）
115: 
116: ### inv-16: refs-budget-limit
117: - value: Asset references 数量预算 N=5：单一节点 fan-out 上限（防依赖地狱）；超过触发 IAP_INTENT_REFS_BUDGET_EXCEEDED（v0.6.2+ soft-warn）；Roadmap scene.links 不受此限
118: 
119: ### inv-17: leaf-asset-legitimacy
120: - value: Leaf Asset legitimacy：Asset.references=[] 是合法 leaf 节点；叶子 Asset 可被 Work/Task/Roadmap 引用，不要求必须有引用方；僵尸判断由 Roadmap 是否引用 + citations==0 + 创建后未使用 共同决定
121: 
122: ### inv-18: asset-template-is-ssot
123: - value: Asset 模板（assets/{kind}.md）是 SSOT；CLI 创建时复用模板；禁止 in-place 改模板（改动必须走 PR）
124: 
125: ### inv-19: citations-auto-increment
126: - value: Asset 引用方（Work/Task/Asset）变更后，引用目标 citations 字段自动 +1；不需手工改
127: 
128: ### inv-20: asset-not-mixed-with-work
129: - value: Asset 不与 Work 混用：同一 .openxenon/ 目录下 Asset（.md）与 Work（.md）互不引用；Asset 通过 @prj 寻址被 Work 引用

(End of file - total 129 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.2.1
4: name: OxnWorkDomain
5: abstract: OXN Work 业务领域。
6: references:
7:   - oxn-domain
8:   - oxn-engine-domain
9:   - oxn-asset-domain
10: citations: 0
11: synced-at: 2026-07-17
12: ---
13: 
14: # Domain: OxnWorkDomain
15: 
16: ## Terms: Work
17: 
18: ### Work
19: - desc: Work = oxn-domain.Work 在 E2 业务层的完整定义。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。
20: 
21: ### WorkV1
22: - desc: Work v1.1 沙盒布局（works/<w>/{work.oxn, tasks/, .work/, .run/}），自 v0.6.1-alpha.3 起强制；V0 须先 `oxn work migrate`。
23: 
24: ### IAPPhase
25: - desc: Work 三阶段实体（Intent 工程师主权 / Align AI 主权 / Proof Engine 主权），v0.6.1 Phase D 收敛。主导权不可越权（inv-1）。
26: 
27: ### Phase
28: - desc: 单个 IAP 阶段（Intent/Align/Proof 之一），按顺序不可跳。子步骤按阶段分别定义。
29: 
30: ### Task
31: - desc: Align 执行单元，对齐 1 个 Blueprint 并可引用 N 个 Domain；内联 Part + Probe；DAG 无环（Kahn 校验）。
32: 
33: ### Slot
34: - desc: Blueprint 内拓扑节点（slot DAG），Engine 校验无环；Task 内 Part 名必须对齐 slot 名。
35: 
36: ### Part
37: - desc: Task 内 skill 执行单元（skill_context + acceptance），内联在 task.oxn 内不可独立成文件。验证视角见 [`oxn-proof-domain.Part`](./oxn-proof-domain.md#part)。
38: 
39: ### Probe
40: - desc: 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。三态判定见 [`oxn-proof-domain.Probe`](./oxn-proof-domain.md#probe)。
41: 
42: ### RefPool
43: - desc: Work 级声明的 ref 池（domain/blueprint/part/probe），Task 只能从 RefPool inject，不允许直接 import 资产。
44: 
45: ### SkillContext
46: - desc: AI 可见的三层上下文（work.context / task.context / part.skill_context）。
47: 
48: ### Round
49: - desc: Work 多轮 IAP 循环（v0.6 新增），手动触发（`oxn work next-round`），maxIterations 硬限制（默认 3）。
50: 
51: ### BirthCert
52: - desc: Work 静态门禁卡（.work 目录），写一次后只读（OS chmod 0o444），含 assets + context + diagnostics。
53: 
54: ### PlanLock
55: - desc: BirthCert 内不可变快照（3 组件 hash + allHash），锁后任何 .oxn 资产漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH。
56: 
57: ### AssetHash
58: - desc: 域/蓝图文件的 SHA-256（64-hex），OXN 启动期计算并存入 BirthCert.assets。与 [`oxn-proof-domain.ContentHash`](./oxn-proof-domain.md#contenthash) 同一算法族。
59: 
60: ### Artifact
61: - desc: Align 轴产出的物理事实（被 Probe 观测的对象），路径必须落在 Work 沙盒内或宿主项目目录。
62: 
63: ### Frozen
64: - desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。Schema 见 [`oxn-proof-domain.Frozen`](./oxn-proof-domain.md#frozen)。
65: 
66: ## Bans
67: 
68: ### forbidden-constructs
69: - items:
70:   - WorkV0Layout
71:   - V0Bypass
72:   - BypassLock
73:   - BypassValidate
74:   - BypassMigrate
75:   - oxn-work-new
76:   - oxn-work-task-create
77:   - PhaseSkip
78:   - DirectSubmit
79:   - UnlockedRun
80:   - InlineAsset
81:   - oxn work new
82:   - oxn work task create
83:   - auto-promote-work
84:   - DirectCopyToDocs
85:   - SkipPromoteWork
86:   - Job
87:   - TaskRun
88:   - Execution
89:   - Pipeline
90:   - VerdictAsException
91:   - Plugin
92:   - Extension
93:   - Hook
94:   - PromptTemplate
95: 
96: ## Invariants
97: 
98: ### inv-1: iap-phases-no-skip
99: - value: 3 IAP 阶段顺序不可跳：Intent → Align → Proof；违反 → IAPError 拒绝
100: 
101: ### inv-2: intent-substeps
102: - value: Intent 子步骤：create → [add-task?] → lock（内含 validate）；lock 内先 validate（语法+DAG+引用）再 hash
103: 
104: ### inv-3: lock-includes-validate
105: - value: lock 内含 validate：无需先跑 validate；lock --dry-run 保留只校验不锁
106: 
107: ### inv-4: lock-before-run
108: - value: lock 成功前不能 run：缺 planLock → 拒绝启动；unlock 状态可 run 但不写 .run/state.json
109: 
110: ### inv-5: run-before-submit
111: - value: run 成功后才能 submit：缺 .run/state.json → IAP_ALIGN_WORK_NOT_RUNNING (YIELD_TO_HUMAN)
112: 
113: ### inv-6: planlock-3-hash-consistency
114: - value: PlanLock 3 组件 hash 必一致：workOxn / blueprints / tasks 之一漂移 → IAP_ALIGN_LOCK_HASH_MISMATCH
115: 
116: ### inv-7: lock-then-no-drift
117: - value: lock 后任何 .oxn 资产漂移（域/蓝图/work.oxn/task.oxn 之一）→ 立即 LOCK_HASH_MISMATCH 阻断
118: 
119: ### inv-8: work-oxn-required
120: - value: work.oxn 失踪但 .work 还在 → IAP_ALIGN_WORK_REMOVED（区别于 WORK_NOT_FOUND）
121: 
122: ### inv-9: asset-kind-via-work
123: - value: --asset-kind X 走标准 Work 流程（Phase C）：选 asset-create workflow + 4 task 骨架；不再是短路
124: 
125: ### inv-10: v0-migrate-required
126: - value: V0 布局必须先 oxn work migrate 才能走 lock 守卫；V0 直接 run → IAP_ALIGN_V0_LEGACY_BLOCKED
127: 
128: ### inv-11: migrated-v0-preserve
129: - value: MigratedV0Dir 保留 V0 备份供审计；OXN 不自动清，工程师手动清理（避免误删导致不可恢复）
130: 
131: ### inv-12: ref-fail-fast
132: - value: Work 引用 Asset 用 domain X ref @prj/{dir}/{name}；@prj 寻址必须实际存在（CLI 加载期 fail-fast）
133: 
134: ### inv-13: task-part-slot-align
135: - value: Task 内 Part 名必须对齐 Blueprint Slot 名；不对齐 → work run 时找不到对齐目标（DEP_NOT_FOUND）
136: 
137: ### inv-14: task-dag-no-cycles
138: - value: Work 内 task DAG 必须无环（Kahn's algorithm 校验）；有环 → IAP_INTENT_DAG_CYCLE（YIELD_TO_HUMAN，含 cycleHint）
139: 
140: ### inv-15: asset-kind-not-shortcut
141: - value: --asset-kind 走标准 Work 流程（不是短路）；oxn asset create 是 alias（内部调 oxn work create --asset-kind）
142: 
143: ### inv-16: cli-required-args
144: - value: oxn work run --work-file 必填；oxn work submit --work-name + --task 必填；少参数 → OXN_CLI_INPUT_ERROR
145: 
146: ### inv-17: no-create-new-alias
147: - value: oxn work new 已在 v1.0 移除；CLI 拒绝 unknown command 'new'（不能是别名）；统一用 oxn work create
148: 
149: ### inv-18: round-preserves-passed
150: - value: Round 切换不重置 task 状态：passed 的 task 保留，failed/running 的回 pending 供工程师重跑或调整；roundHistory 不可丢（finalize 保留所有 round 记录供 E4 Insight）
151: 
152: ### inv-19: max-iterations-hard-limit
153: - value: maxIterations 硬限制：oxn work next-round 在 currentRound >= maxIterations 时拒绝，错误码 IAP_ALIGN_ROUND_MAX_EXCEEDED；提示用户用 oxn work finalize 收口；默认 maxIterations=3
154: 
155: ### inv-20: round-manual-trigger
156: - value: Round 切换手动触发（oxn work next-round --verdict FAILED），不自动循环（避免无限循环 + 便于人工调整 Intent）；verdict FAIL 不自动触发新 Round
157: 
158: ### inv-21: run-allow-rerun-pending
159: - value: oxn work run 行为变更：state.status=pending/running 时允许重新调用（re-run 自动重置 failed/running task → pending，passed 保留）；state.status ∈ {passed, failed, error}（已收口）时拒绝，报 OXN_WORK_ALREADY_FINALIZED
160: 
161: ### inv-22: frozen-immutable
162: - value: frozen.json 生成后不可修改（仅可读取作为判决书）；OS 层 chmod 0o444 + content_hash 自校验
163: 
164: ### inv-23: trace-append-only
165: - value: work-trace.jsonl 只能追加写，不能重写
166: 
167: ### inv-24: artifact-in-sandbox
168: - value: Artifact 路径必须落在 Work 沙盒内或宿主项目目录
169: 
170: ### inv-25: probe-from-blueprint
171: - value: Probe 标准必须来自 Blueprint 的 observe 数组（Intent 轴），不能由 Align 轴运行时追加
172: 
173: ### inv-26: domain-blueprint-isolated
174: - value: Domain 与 Blueprint 必须在不同文件、互不引用：业务 Intent 不知道技术 Intent，技术 Intent 不知道业务 Intent
175: 
176: ### inv-27: no-upstream-no-downstream
177: - value: 没有上游对象就不允许产生下游对象：没有 Domain 时 Blueprint 不许使用未定义的 term
178: 
179: ### inv-28: upstream-frozen-then-downstream
180: - value: 上游冻结后下游才能展开：Blueprint 未通过 oxn blueprint validate → Work 不许实例化
181: 
182: ### inv-29: task-no-reverse-blueprint
183: - value: Task 执行结果不能反改 Blueprint 声明（真相解释权单向，不允许对齐结果回灌意图）

(End of file - total 183 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.2.1
4: name: OxnProofDomain
5: abstract: OXN Proof 业务领域。
6: references:
7:   - oxn-engine-domain
8:   - oxn-work-domain
9: citations: 0
10: synced-at: 2026-07-17
11: ---
12: 
13: # Domain: OxnProofDomain
14: 
15: ## Terms: Proof
16: 
17: ### Proof
18: - desc: Proof = oxn-domain.Proof 在 E3 Engine 层的完整定义。执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。
19: 
20: ### Probe
21: - desc: OXN 内置探针（物理观测 + 纯函数判定），由 L1-Infra Provider 执行 + L0-Kernel 判定。Work 视角内联位置见 [`oxn-work-domain.Probe`](./oxn-work-domain.md#probe)。
22: 
23: ### Part
24: - desc: OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。Work 视角执行单元见 [`oxn-work-domain.Part`](./oxn-work-domain.md#part)。
25: 
26: ### Builtin
27: - desc: OXN 自带资产（@oxn scope）；版本号单调递增；不依赖任何 @prj 资产。
28: 
29: ### Scope
30: - desc: OXN 引用作用域（@oxn builtin / @prj 项目级；@gbl 已废弃）。
31: 
32: ### Registry
33: - desc: 内存中的 @oxn 资产查询表（OxnBuiltinRegistry 维护），CLI 加载期 fail-fast 校验；4 个内置 Provider（file/http/shell/git）。
34: 
35: ### Kernel
36: - desc: L0 纯逻辑验证模块（公证人非裁判 ADR-0031）：零 IO 约束，只接受 Infra 观测输出 Verdict，不调 fs/net/child_process。
37: 
38: ### Infra
39: - desc: L1 副作用 / IO 执行模块：只回答事实不做判定（不能给自己盖章）；3 个 IO Primitive（io.stat/io.read/io.exec）通过 ProviderRegistry 暴露。
40: 
41: ### Verdict
42: - desc: Proof 轴三态判定（PASSED / FAILED / INCONCLUSIVE），字段含 reason + interferenceFlags[] 等。公证人非裁判（ADR-0031）。
43: 
44: ### Frozen
45: - desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。
46: 
47: ### Trace
48: - desc: Work 执行轨迹（trace.jsonl），JSONL 追加式事件流；append-only + Trace-before-State（ADR-0009）。
49: 
50: ### ContentHash
51: - desc: SHA-256 内容哈希（64-hex），写入时计算读取时校验；frozen.json 用 self-excluding 协议。签名被外部篡改 → OXN_CRASH_SIGNATURE_MISMATCH。
52: 
53: ### Taint
54: - desc: Probe Signal Taint v2 完整体系（12 InterferenceFlag 8 RED + 4 YELLOW + 3 IO Primitive + Provider Registry + Sandbox + WorkPrecheck 精准阻断）。
55: 
56: ## Bans
57: 
58: ### forbidden-constructs
59: - items:
60:   - Resource
61:   - Template
62:   - Config
63:   - Definition
64:   - GlobalAsset
65:   - Evidence
66:   - Plan
67:   - Spec
68:   - Recipe
69:   - Job
70:   - Runbook
71:   - HARD_FAIL
72:   - SOFT_FAIL
73:   - VerdictAsException
74:   - FailureAsCrash
75:   - OXN_INTERNAL_ERROR_AS_IAP
76:   - StackTraceToAI
77:   - HARD_HALT_AS_IAP
78:   - Signal
79:   - Flag
80:   - TaintMark
81:   - Corruption
82:   - Pollution
83: 
84: ## Invariants
85: 
86: ### inv-1: builtin-probe-types
87: - value: Builtin 探针类型必须是 fs_exists / fs_not_exists / fs_match / shell_exec 之一（v0.1 范围）
88: 
89: ### inv-2: builtin-version-monotonic
90: - value: Builtin 资产版本（_version）单调递增，不可降级
91: 
92: ### inv-3: builtin-no-prj-dep
93: - value: Builtin 资产不依赖任何 @prj 资产（避免循环引用）
94: 
95: ### inv-4: kernel-zero-io
96: - value: Kernel 永远不触碰物理世界：不调用 fs.existsSync / 任何 IO（fs.* / net.* / child_process 一律不出现）
97: 
98: ### inv-5: infra-no-verdict
99: - value: Infra 只回答事实，不做判定：Infra 不能宣布 PASS / FAIL（不能给自己盖章）
100: 
101: ### inv-6: infra-no-self-done
102: - value: Infra 不能绕过 Daemon 自己宣布 Work 完成（行政不能给自己盖章）
103: 
104: ### inv-7: daemon-no-rule-mutate
105: - value: Daemon 不能修改 Kernel 规则（司法不能立法）
106: 
107: ### inv-8: kernel-no-direct-task
108: - value: Kernel 不能直接执行 Task（立法不能行政）
109: 
110: ### inv-9: escape-on-probe-fail
111: - value: Probe FAIL 时 Daemon 触发逃逸机制：① 预警 ② 阻止 Work 进入 done ③ 输出意图→对齐→证明链路快照
112: 
113: ### inv-10: proof-has-position
114: - value: Proof 是有立场的判定（不是中性的证据记录）：Core Engine 必须站在 Intent 一侧，不允许 Evidence 中立记录模式（ADR-0031 公证人非裁判的强化版）
115: 
116: ### inv-11: frozen-immutable
117: - value: FrozenJson（frozen.json）生成后只读：AI 与工程师都只能读，禁手改
118: 
119: ### inv-12: signature-tamper-detection
120: - value: frozen.json 签名被外部篡改 → 抛 OXN_CRASH_SIGNATURE_MISMATCH（防线击穿），进程退出 2
121: 
122: ### inv-13: trace-append-only
123: - value: Trace（work-trace.jsonl）只能追加写、不能重写；append-only 约束；Trace-before-State（ADR-0009）
124: 
125: ### inv-14: red-flag-inconclusive
126: - value: 8 项 RED flag 触发 INCONCLUSIVE：waf_detected / just_modified / detached_head / shallow_clone / sandbox_violation / network_timeout / response_truncated / permission_denied
127: 
128: ### inv-15: yellow-flag-pass-through
129: - value: 4 项 YELLOW flag 透传记录，不改变 verdict：cdn_cache / cache_path / symlink
130: 
131: ### inv-16: file-provider-no-exec
132: - value: FileProvider.ioExec 必须抛 IAPError（file provider does not implement io.exec; use shell:// URI）
133: 
134: ### inv-17: http-waf-blacklist
135: - value: HttpProvider WAF 头黑名单 6 项硬编码（cf-ray/x-sucuri-id/x-akamai-transformed/x-imperva-id/x-azure-ref/x-aws-waf-token）
136: 
137: ### inv-18: sandbox-no-code-gen
138: - value: 沙箱 context 禁动态代码生成（codeGeneration: { strings: false, wasm: false }）
139: 
140: ### inv-19: bootstrap-not-throw
141: - value: ProviderRegistry.bootstrapFromDisk 遇 CORRUPTED/MISSING 不抛错，仅标 status 计数
142: 
143: ### inv-20: workprecheck-only-this-work
144: - value: workPrecheck 仅阻断该 Work（v2 核心倒置：其他 Work 不受影响）
145: 
146: ### inv-21: daemon-startup-no-network
147: - value: daemonStartup 启动期只读 + 不触网（v2 核心倒置：CORRUPTED 标状态不阻断 Daemon）
148: 
149: ### inv-22: probe-from-blueprint
150: - value: Probe 标准必须来自 Blueprint 的 observe 数组（Intent 轴），不能由 Align 轴运行时追加

(End of file - total 150 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-insight-domain.md"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-insight-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.2.0
4: name: OxnInsightDomain
5: abstract: OXN Insight 业务领域。
6: references:
7:   - oxn-domain
8:   - oxn-engine-domain
9:   - oxn-work-domain
10:   - oxn-proof-domain
11:   - oxn-asset-domain
12: citations: 0
13: synced-at: 2026-07-16
14: ---
15: 
16: # Domain: OxnInsightDomain
17: 
18: ## Terms: Insight
19: 
20: ### Insight
21: - desc: Insight = oxn-domain.Insight 在 E4 涌现层的完整定义。整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。
22: 
23: ### Pattern
24: - desc: 跨 Work 模式识别与持久化（v0.7 新增），存 .openxenon/pools/insight-patterns/；CLI `oxn insight patterns list/show/promote/archive`。
25: 
26: ### CrossProofAccumulation
27: - desc: 跨 Proof 累积统计（数据源 .openxenon/.cache/probe-stats.json），用于 E4 综合推理的"统计事实底座"。Probes 不入 catalog（AI 盲区）。
28: 
29: ### ModeRecommendation
30: - desc: 基于跨 Work 模式的 Work 模式推荐（domain + occurrences≥3 → suggestedInvariant + confidence）；强约束：永不自动 apply，工程师 review/approve 后手动应用。
31: 
32: ### AuditTrail
33: - desc: Asset 修改历史审计链（version + date + author + changes[]），自动维护、不可篡改；Asset 演进必填引用旧版。
34: 
35: ### Citation
36: - desc: 资产反向引用计数 + 影响半径（impactRadius: low/medium/high/critical），自动维护、归档保留。
37: 
38: ### Pool
39: - desc: 5 类 Intent Pool union（research / design / issue / audit / journal），物理位置 .openxenon/pools/{kind}/<slug>.md；heading 模板互为独立 spec。
40: 
41: ### Raw
42: - desc: Insight 原始池（生命周期阶段 1），数据源 trace.jsonl 结构化事件（asset.violation / intent.drift）；状态 raw，未审核。
43: 
44: ### Audit
45: - desc: Insight 审核池（生命周期阶段 2），从 raw promote（工程师手动）；资产草案 `.openxenon/assets/{kind}/{name}.oxn.draft`；AI 永不自动覆盖 Asset。
46: 
47: ### Judged
48: - desc: Insight 已判定池（生命周期阶段 3+4），状态 approved/applied/archived；applied 后 Asset 更新 + planLock 重算。
49: 
50: ## Bans
51: 
52: ### forbidden-constructs
53: - items:
54:   - Forge
55:   - DesignNote
56:   - WorkLog
57:   - ResearchPaper
58:   - autoInsightApply
59:   - autoPatternPromote
60: 
61: ## Invariants
62: 
63: ### inv-1: pool-specs-isolated
64: - value: 5 池 heading 模板互为独立 spec，不可交叉（如 research 池不可出现 `# 决策记录`）
65: 
66: ### inv-2: pool-slug-convention
67: - value: pool-writer.ts slug 必须匹配 `/^[a-z0-9][a-z0-9-]*$/`（小写中划线）
68: 
69: ### inv-3: heading-skeleton-scope
70: - value: check-heading-skeleton.ts 仅检查 pools/ + forges/（不影响其他 .md）
71: 
72: ### inv-4: forge-deprecation-warning
73: - value: forges/ 兼容期：warnOnForgesDeprecated 默认 false（静默），Sprint 6 flip 后打印 WARN
74: 
75: ### inv-5: pool-entry-immutable
76: - value: pool 条目 frozen.json chmod 0o444 + content_hash 不可篡改（复用 writeFrozenImmutable）
77: 
78: ### inv-6: insight-manual-gate
79: - value: Insight 永不自动 apply；必须经过 review/approve 闸门，由工程师决定是否落实
80: 
81: ### inv-7: pattern-persistence
82: - value: Pattern 一经创建持久化（.openxenon/pools/insight-patterns/）；更新 / 归档不会丢失历史
83: 
84: ### inv-8: insight-output-scope
85: - value: Insight 不输出代码质量评分；只输出协作态势信号（边界使用 / 触碰 / Loop 收敛 / 退出模式）
86: 
87: ### inv-9: cross-work-pattern-threshold
88: - value: 模式识别阈值 occurrences ≥ 3；低于此阈值不进入 Pattern 库（避免噪声）
89: 
90: ### inv-10: insight-apply-validates
91: - value: `oxn insight apply` 必须先 validate Asset 草案；validate 失败回滚到 .bak 文件

(End of file - total 91 lines)
</content>
```

---

## Assistant (Plan · GLM-5.2 · 1550.8s)

_Thinking:_

现在我有完整的全景图。让我系统化回答 4 个问题：

---

## Q1 — "root 抽象定义见 [...]" 这类尾巴多余

### 用户已删的（Engine Domain）
- Engine line 17 `### OXN Engine` desc 末尾已无 "root 抽象定义见 [...]"
- Engine line 34 `### OXL` desc 末尾已无 "root 定义见 [...]"

### 用户待删（其他 Domain 我看到的）
按 ADR-0059 §D2 在 desc 内写 MD link 作为 sub→root 引用的尾巴——按用户判据应该全部删除：
- root `oxn-domain.md` line 22 OXN CLI "具体领域见 [`oxn-cli-domain`]"
- root `oxn-domain.md` line 25 OXN Engine "具体领域见 [`oxn-engine-domain`]"
- root `oxn-domain.md` line 28 OXL "具体领域见 [`oxn-engine-domain.OXL`]"
- root `oxn-domain.md` line 40 Proof "具体领域见 [`oxn-proof-domain`]"
- root `oxn-domain.md` line 43 Asset "具体领域见 [`oxn-asset-domain`]"
- root `oxn-domain.md` line 49 Work "具体领域见 [`oxn-work-domain`]"
- root `oxn-domain.md` line 55 Insight "具体领域见 [`oxn-insight-domain`]"

子 Domain 内的同类尾巴：
- `oxn-work-domain.md:37` Part "验证视角见 [`oxn-proof-domain.Part`]"
- `oxn-work-domain.md:40` Probe "三态判定见 [`oxn-proof-domain.Probe`]"
- `oxn-work-domain.md:58` AssetHash "与 [`oxn-proof-domain.ContentHash`] 同一算法族"
- `oxn-work-domain.md:64` Frozen "Schema 见 [`oxn-proof-domain.Frozen`]"
- `oxn-proof-domain.md:21` Probe "Work 视角内联位置见 [`oxn-work-domain.Probe`]"
- `oxn-proof-domain.md:24` Part "Work 视角执行单元见 [`oxn-work-domain.Part`]"

子向 root 的"X = oxn-domain.X 在..." 句式（其实是同义重复，但**不带 MD link**）：
- `oxn-asset-domain.md:18` Asset: "Asset = oxn-domain.Asset 在 E1 业务层的完整定义。..."
- `oxn-work-domain.md:19` Work: "Work = oxn-domain.Work 在 E2 业务层的完整定义。..."
- `oxn-proof-domain.md:18` Proof: "Proof = oxn-domain.Proof 在 E3 Engine 层的完整定义。..."
- `oxn-insight-domain.md:21` Insight: "Insight = oxn-domain.Insight 在 E4 涌现层的完整定义。..."

这 4 处不算 MD link 尾巴，但语句结构"X = oxn-domain.X 在..."是引用 root 定义式，可以考虑是否一并清理——但用户没说不让写 "X = 父域 X 在..." 句式，只删了 MD link 尾巴。我先按"只删 MD link 尾巴"理解。

那么 ADR-0059 §D2 必须修订！原来说"用 term desc 里的 markdown 链接代替 composes 字段"——用户现在判断这是噪音。

但 ADR-0059 §D3 "自动 backlinks" 说"扫描所有 Domain 文件中的 MD 链接，构建 backlink 索引"——如果所有 MD link 都删了，backlinks 怎么办？

回答：backlinks 的基础应该改为 **references frontmatter**（sub→root DAG 反向），不是 desc 内的 MD link。这才是 ADR-0059 §D3 应该走的方向。

`oxn domain show` 现在显示的 backlinks：
```
OxnEngineDomain (2): OXN Engine + OXL
```
这个 "2" 是扫描 Engine Domain desc 内 `[`oxn-domain.X`](./oxn-domain.md#...)` 这两个 MD link 来算的。如果 MD link 删了，应该改为：扫描 Engine Domain references 字段含 `oxn-domain` → "OxnEngineDomain references OxnDomain（1）"，不能枚举到具体 term。

或者更简洁：backlinks 仅显示"哪个 Domain 引用我"，不显示"哪个 term 引我"。后者本就是 desc 级精度，删掉 MD link 就放弃即可。

---

## Q2 — IAPError/OXNCrash/CliInputError 三定义模糊

当前 Engine Domain 把这三个 term 作为错误类型契约词放在 Engine Domain（v0.4 把它们从 CLI Domain 迁过来的）。但看用户反馈：

```
### IAPError
- desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。

### OXNCrash
- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。

### CliInputError
- desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。
```

模糊点：
1. **CliInputError 是用户输入错**——这明显是 CLI 视角的 term（用户输入来自 CLI）。放在 Engine Domain 物理位置（理由是代码 `kernel/errors/`）合理，但语义归属应在 CLI Domain。
2. **stdout/stderr/exit code** 这些是进程 IO 层概念——属于 CLI Domain 责任（CLI 才是进程的 IO 出入口），不属于 Engine 责任。
3. **轨道 1/2 概念** — 是错误分类逻辑，跨越 CLI（怎么处理）和 Engine（错误的代码定义）。
4. **"AI 消费/人类消费"** — 这是受众语义，是 CLI 输出档分流的责任，不是 Engine 的。
5. **"commander.* / citty.*"** — 这是 CLI 库实现细节（citty 是 commander 的替代名），违反 What/How 判据（属 How）。

更深的问题：**IAPError / OXNCrash / CliInputError 这三个错误类型的 desc 本身就在描述"如何在 CLI 中处理错误"，而不是"这个错误本身是什么"。**

更深的话题：**这三个错误类型的代码确实在 `packages/engine/src/kernel/errors/`**，但它们是 CLI/Engine 共享的契约词。如果按 "Domain = 视角" 模型，这三个 term 应该在 root Domain（共享契约），而不是 Engine Domain。

或者：在 Engine Domain 定义错误的本体（"什么是 IAPError/OXNCrash/CliInputError"），CLI Domain 定义如何分流处理它们（TopCatch 4 档 / ExitCode / stdout/stderr）。

这是边界跨越的本质：当前 Engine Domain 这 3 个 term 的 desc 描述的是 **CLI 处理方式**（stdout/stderr/exit code），不是 **Engine 错误本体**。

建议改写为：
```
### IAPError
- desc: 业务流转中预期内阻断错误的契约类。轨道 1，AI 消费的错误类型。

### OXNCrash
- desc: OXN 引擎自身 Bug / 底线被击穿错误的契约类。轨道 2，人类消费的错误类型。

### CliInputError
- desc: 用户 CLI 输入错的契约类。轨道 3（输出处理在 CLI 域 inv-2/inv-3）。
```

ExitCode / stdout/stderr 这些进程 IO 层都归 CLI Domain。

或者更激进：把这三个 term 从 Engine Domain 迁回 root Domain，因为它们是产品契约（"什么是 IAPError"是产品概念），CLI 和 Engine 都消费。但 root 用户当前没提这个，我先按"Engine 不动归属，但 desc 改为错误本体"理解。

---

## Q3 — ExitCode 定义

CLI Domain line 33-34:
```
### ExitCode
- desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。
```

inv-2 也写了：
```
### inv-2
- value: 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；
  二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack
```

问题：
- ExitCode desc 写"二轨不混"——但 inv-2 又重复写了一遍
- desc 描述的"二轨"含糊，inv-2 才明确指出"哪个错误码对应哪个 ExitCode"
- desc 与 inv-2 信息重复但精度不同——desc 抽象，inv-2 具体

按 ADR-0060 D6 不变式自给自足——inv-2 应完整 inline（已经完整）。
ExitCode desc 应该只描述 What（"进程退出码"），具体映射放 invariant：```
### ExitCode
- desc: OXN CLI 进程退出码；3 档（0=成功 / 1=业务阻断 / 2=引擎崩溃）。
```
然后 inv-2 已经详细写哪个错误码对应哪档——保持。

但更深的边界跨越问题：ExitCode 是 CLI 视角（进程退出），但 IAPError/OXNCrash/CliInputError 在 Engine Domain——ExitCode 在 CLI Domain 通过 inv-2 引用了 Engine Domain 的 3 个 term，按 ADR-0059 §D2 这其实需要 references 或者 desc MD link。但 CLI Domain references 只引 root，不引 Engine Domain。

这是真正的跨域引用问题——需要决策：
a) CLI Domain references 加入 `oxn-engine-domain`
b) 把 3 个错误类型 term 迁到 root Domain（CLI/Engine 共享）
c) inv-2 只描述档位映射的语义，不引用具体 term 名（语义弱）

---

## Q4 — 为何我改动了还依然有边界模糊

诚实反思：

1. **执行 ADR-0059 §D2 时把"MD link 在 desc 内表达 has-sub-Domain"机械地应用到了所有 term**——没问 "这个 link 是 What 还是 How / 是必要还是冗余"。我没把 ADR-0059 与 ADR-0060 D5.2（"禁止纯文本指向 docs"）的判据反向应用到 ADR-0059 §D2——D5.2 只说不指 docs，没说不指其他 Domain，但用户判据是更严：Domain 间 MD link 也是噪音。

2. **IAPError/OXNCrash/CliInputError 迁移判断只看代码物理位置（packages/engine/src/errors/），没看语义视角**——这三个 term 是 CLI/Engine 共享契约，错误处理（stdout/stderr/exit code）属于 CLI 视角，但 desc 全部用 CLI 视角描述了。我只关注了"代码物理在 engine → 进 Engine Domain"，没关注 "desc 内容应描述 Engine 视角的错误本体"。

3. **ExitCode/IAPError 跨域引用未识别**——CLI Domain inv-2/inv-3 大量使用 IAPError/OXNCrash/CliInputError 但 CLI references 只引 root。这是 ADR-0059 §D1 references DAG 的漏洞——references 应表达"我消费了哪些其他 Domain 的 term"。

4. **"重名 term 不重定义" 我只做了 root→子引"具体领域见"尾巴，没做反向清理**——子 Domain 内的 "Work 视角见 [`oxn-work-domain.Probe`]"（proof）和"验证视角见 [`oxn-proof-domain.Part`]"（work）这种"双向对引"也是噪音。这些 MD link 是"我看你怎么用 / 你看我怎么用"的视角互通，但实际是冗余——backlinks 由 references 算，不需要在 desc 内双向手写。

5. **inv-2/invariant 之间信息冗余未清理**——ExitCode desc 与 inv-2 重复、CliInputError 的 `commander.* / citty.*` 是 How 没清理、IAPError 的 stdout 输出方式属 CLI 视角未剥离。我只在 Engine Domain 内做了 P3.1 的 11 处清理，没把 CLI Domain 内的 invariant 与 term desc 之间做"信息分配"分析。

6. **没做"语义归位"**——错误处理这一主题横跨 CLI（输出/退出码）/ Engine（错误类型定义）/ Daemon（兜底捕获）三域，应该有一个明确的"哪个域管哪一段"切分。我把错误 term 全塞 Engine，但 CLI Domain 还在用它们描述自己的 inv-2/3——这就是边界跨越。

---

## 待用户确认的方案

让我准备 plan 给用户：

### Plan A
1. **Q1**: 全删 6 个 Domain 内的"具体领域见/验证视角见/Work 视角见/X 抽象定义见/Schema 见" 等所有 desc 内 MD link 尾巴。ADR-0059 §D2/D3 修订：backlinks 由 references frontmatter 计算（不扫 desc），desc 内 MD link 全部禁用。
2. **Q2**: Engine Domain 三个错误 term 的 desc 改写为"错误本体"（不写 stdout/stderr/exit code/commander.*/citty.*——这些是 CLI 处理视角）。
3. **Q3**: CLI Domain ExitCode desc 保留 3 档简述；inv-2 已 inline 完整映射不动。CLI Domain references 加入 `oxn-engine-domain`（因为 inv-2/3 消费 Engine 的错误 term）。
4. **Q4 边界跨越根因修复**：
   - 把"Term desc 是 What 描述" 判据扩展为"Term desc 只描述本 Domain 视角的 What"
   - Engine 域 错误 term desc 描述错误本体（不含处理方式）
   - CLI 域 描述如何分流处理（inv-2/3 已有，不动）
   - ExitCode 跨域引用：CLI Domain references 加 oxn-engine-domain（让 ADR-0059 §D1 DAG 正确反映跨域消费）
5. **ADR 修订**：
   - ADR-0059 §D2 修订：desc 内 MD link 改为禁用（之前是"允许且推荐"）；§D3 修订：backlinks 仅由 references frontmatter 计算
   - ADR-0060 加 D8："Domain 视角隔离"：term desc 仅描述本 Domain 视角的 What；跨 Domain 视角由 references + 子 Domain 的对应 term 表达

让我把这个写出来给用户。

但用户在 Plan 模式中，我只能分析+提问，不能编辑。让我给一个清晰的诊断报告 + Plan，等用户确认。

实际上，用户的 #1 已经是行动指令"我删了"——但我不在编辑。让我把"删 root 抽象定义见"作为已确认事项纳入诊断报告，并把其他类似尾巴识别为待执行任务。

Plan 应该清晰列出所有要改的点。

我现在在 Plan 模式，已读完全部 7 个 Domain。先给你诊断报告 + Plan，**不动任何文件**，等你确认。

---

## Q1 — "root 抽象定义见 [...]" 尾巴多余 — 已识别所有同类

### 你已删的（Engine Domain 2 处）
- Engine `### OXN Engine`（line 17）尾巴 — ✅ 已删
- Engine `### OXL`（line 34）尾巴 — ✅ 已删

### 等价同类尾巴（基于 ADR-0059 §D2 的同一种反模式）

**root → sub"具体领域见"型**（7 处 in `oxn-domain.md`）：
- line 22 OXN CLI → `具体领域见 [`oxn-cli-domain`]`
- line 25 OXN Engine → `具体领域见 [`oxn-engine-domain`]`
- line 28 OXL → `具体领域见 [`oxn-engine-domain.OXL`]`
- line 40 Proof → `具体领域见 [`oxn-proof-domain`]`
- line 43 Asset → `具体领域见 [`oxn-asset-domain`]`
- line 49 Work → `具体领域见 [`oxn-work-domain`]`
- line 55 Insight → `具体领域见 [`oxn-insight-domain`]`

**子↔子"视角见"型**（4 处 in work/proof）：
- `oxn-work-domain.md:37` Part → `验证视角见 [`oxn-proof-domain.Part`]`
- `oxn-work-domain.md:40` Probe → `三态判定见 [`oxn-proof-domain.Probe`]`
- `oxn-work-domain.md:58` AssetHash → `与 [`oxn-proof-domain.ContentHash`] 同一算法族`
- `oxn-work-domain.md:64` Frozen → `Schema 见 [`oxn-proof-domain.Frozen`]`
- `oxn-proof-domain.md:21` Probe → `Work 视角内联位置见 [`oxn-work-domain.Probe`]`
- `oxn-proof-domain.md:24` Part → `Work 视角执行单元见 [`oxn-work-domain.Part`]`### 这暴露了一个 ADR 缺陷

ADR-0059 §D2 原文规定"term desc 里的 markdown 链接表达'该 term 有专门的子 Domain'"、§D3 规定"扫描所有 Domain 文件中的 MD 链接，构建 backlink 索引"——这两个决策本身是错的。**desc 内嵌套 MD link = 在 term 描述里塞导航，违背 What/How 判据**（导航是"怎么找到信息"，不是"它是什么"）。

backlinks 应该只由 **references frontmatter** 计算（sub→root DAG 反向），不应扫 desc。

---

## Q2 — IAPError / OXNCrash / CliInputError 三 term 定义模糊诊断

当前 Engine Domain 写法：

```
### IAPError - desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。
### OXNCrash - desc: OXN 引擎自身 Bug（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。
### CliInputError - desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。
```

### 三个层次混淆

| 内容片段 | 真正归属域 |
|---|---|
| "业务流转中预期内阻断" / "OXN 引擎自身 Bug" / "用户 CLI 输入错" | ✅ 错误本体 → Engine Domain（term desc 应只写这个） |
| "轨道 1/2/3" | ✅ 错误分类契约 → Engine Domain（错误本体的一部分） |
| "AI 消费 / 人类消费" | ⚠️ 受众语义——可属 Engine Domain（错误类型契约）也可属 CLI Domain（输出档分流依据） |
| "stdout JSON 输出" / "stderr stack 输出" | ❌ CLI 处理方式 → CLI Domain（CLI 才是进程 IO 出入口） |
| "进程退出码 2" / "exit 1" | ❌ ExitCode 映射 → CLI Domain invariant（CLI Domain inv-2 已经写） |
| "commander.* / citty.* 白名单前缀" | ❌ 实现细节（citty 是库选择）→ 违反 ADR-0060 D1 How 判据，应删 |

### 真正的归属判断
- **Engine Domain**（错误本体）：IAPError 是什么 / OXNCrash 是什么 / CliInputError 是什么
- **CLI Domain**（输出分流）：inv-2/inv-3 已有完整映射（哪个错误 → 哪个流 → 哪个 exit code）——这是 CLI Domain 的责任

我迁移时只看了"代码物理在 `packages/engine/src/kernel/errors/`"，没做**语义视角切分**——结果是 Engine 域的 term desc 描述了 CLI 域的处理方式。

---

## Q3 — ExitCode 边界跨越诊断

CLI Domain 当前：
```
### ExitCode
- desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。

### inv-2
- value: 进程退出码：0=成功 / 1=IAPError 或 CliInputError / 2=OXNCrash 或未知异常；
  二轨不混：IAPError 走 stdout JSON，OXNCrash 走 stderr stack
```

### 三个问题

1. **desc 与 inv-2 重复** — desc 抽象版（"业务流阻断/引擎崩溃"），inv-2 具体版（"IAPError 或 CliInputError"）。按 ADR-0060 D6 不变式自给自足，desc 应只描述 What（"OXN CLI 进程退出码，3 档"），具体映射在 invariant 里 inline。

2. **inv-2 跨域引用未在 references 表达** — inv-2 写"IAPError / CliInputError / OXNCrash"——这是 Engine Domain 的 3 个 term。但 CLI Domain references 字段只有 `oxn-domain`，没引 `oxn-engine-domain`。**ADR-0059 §D1 references DAG** 应反映跨域消费——CLI 真的依赖 Engine Domain 的错误 term 定义，但 references 没写。

3. **inv-1 也跨域** — 写 "TopCatch 4 档分流" 含义依赖 CLI 自己理解，没问题；但 inv-4 写 "IAPError 的 action 字段..." 直接消费 Engine Domain 的 IAPError 字段结构——同上需要 references 表达。

### 边界修复
两个选择：
- **A**：CLI Domain `references` 字段加 `oxn-engine-domain`——让 DAG 反映真实跨域消费
- **B**：把 IAPError/OXNCrash/CliInputError 迁回 root Domain（CLI/Engine 共享契约）

---

## Q4 — 为何我改动了还依然有边界跨越（诚实反思）

6 个根因：

| # | 根因 | 体现 |
|---|---|---|
| 1 | **机械应用 ADR-0059 §D2 不反思** | "desc 内 MD link 表达 has sub-Domain"我没把 ADR-0060 What/How 判据反向校验它——MD link 本质是导航（How 找信息），违反 What-only desc |
| 2 | **代码物理位置驱动迁移，没做语义视角切分** | 把 IAPError 等 3 个错误 term 全塞 Engine Domain（因为代码在 `packages/engine/src/kernel/errors/`），但 desc 内容用了 CLI 视角（stdout/stderr/exit code），等于 "Engine 域 term 描述 CLI 域的处理" |
| 3 | **没识别跨域引用在 references 上未表达** | CLI inv-2/3/4 大量消费 Engine 的错误 term，但 CLI references 没引 Engine——ADR-0059 §D1 DAG 漏洞 |
| 4 | **"重名不重定义"只做了单向清理** | root→sub "具体领域见" 和 sub→sub "视角见" 双向对引都没清理；只删了 2 处你手点的尾巴 |
| 5 | **term desc 与 invariant 之间没做信息分配** | ExitCode desc 与 inv-2 重复；CliInputError desc 含 `commander.*/citty.*` 是 How 没清 |
| 6 | **没把"Domain 视角隔离"作为判据写进 ADR-0060** | ADR-0060 有 D1 What/How、D5 引用规则，但缺 D8 "term desc 仅描述本 Domain 视角" |

最核心的是 #2：我用了"代码物理位置"作为 Domain 归属判据，违反了 DDD "bounded context"原则——Domain 应按**语义边界**切，不按代码目录切。

---

## Plan（待你确认）

### P1 — 全删 desc 内 MD link 尾巴（共 17 处）
- root `oxn-domain.md` 7 处"具体领域见 [...]"
- `oxn-work-domain.md` 4 处"视角见/Schema 见/与 [...] 同一算法族"
- `oxn-proof-domain.md` 2 处"Work 视角见"

### P2 — Engine 域 3 个错误 term desc 改为"错误本体"
```
### IAPError
- desc: 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### OXNCrash
- desc: OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### CliInputError
- desc: 用户 CLI 输入错的契约类。轨道 3。
```
删 CLI 视角的处理方式（stdout/stderr/exit code）和 How（commander.*/citty.*）。

### P3 — CLI 域 ExitCode desc 精简
```
### ExitCode
- desc: OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。
```
具体映射保留在 inv-2（已是 inline 完整）。

### P4 — CLI 域 references 加 `oxn-engine-domain`
让 ADR-0059 §D1 references DAG 反映跨域消费（CLI inv-2/3/4 消费 Engine 的错误 term）。

### P5 — 删子 Domain 4 处 "X = oxn-domain.X 在 Y 业务层的完整定义" 句式
- `oxn-asset-domain.md:18` Asset
- `oxn-work-domain.md:19` Work
- `oxn-proof-domain.md:18` Proof
- `oxn-insight-domain.md:21` Insight

这种"X = 父域 X 在..."也是元信息（声明自己层级关系），不是 What。改为直接陈述 What：
- Asset → "Asset 是 E1 工程师定义边界的资产；5 类 AssetKind..."
- Work → "Work 是 E2 人机协作的工作空间；编排流程 3 IAP..."
- Proof → "Proof 是 E3 Engine 出具的证明；执行主体 OXN Engine..."
- Insight → "Insight 是 E4 涌现层；整体论 vs 前三层还原论..."

### P6 — ADR 修订
- **ADR-0059 §D2 修订**：desc 内 MD link 改为禁用（"Term desc 不可包含 MD link"）；§D3 修订：backlinks 仅由 references frontmatter 计算（sub→root DAG 反向），不扫 desc 内文本
- **ADR-0060 加 D8 "Domain 视角隔离"**：Term desc 仅描述本 Domain 视角的 What；跨视角信息由子 Domain 自有 term 描述 + references 表达；不通过 desc MD link 互通
- **新增 D9 "代码物理 ≠ Domain 归属"**：Domain 归属按语义边界切，不按代码目录切；共享契约词归 root 或最相关子域

### P7 — backlinks 引擎改造
`packages/engine/src/oxl/md-pipeline/backlinks.ts` 当前逻辑扫 desc 内 MD link → 改为基于 references frontmatter 反向建索引（"哪些 Domain 在 references 里列了我"）。

### P8 — 验证
- `bun test`：backlinks.test.ts fixture 需同步改造
- `oxn domain show` × 3 验证 backlinks 仍正确显示
- 全链路验证

---

## 几个需要你决策的问题

我需要先确认再生成最终 Plan：

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "header": "错误 term 归属",
      "options": [
        {
          "description": "IAPError/OXNCrash/CliInputError 留 Engine Domain，desc 改为错误本体描述（不含 stdout/stderr/exit code）；CLI Domain references 加 oxn-engine-domain 让 ADR-0059 §D1 DAG 反映跨域消费。优点：Domain 数不变，物理代码与归属一致。缺点：CLI 域 inv-2/3/4 跨域消费需要在 references 里表达。",
          "label": "P2+P4：留 Engine + references 加跨域（推荐）"
        },
        {
          "description": "把 IAPError/OXNCrash/CliInputError 从 Engine Domain 迁到 root oxn-domain.md，作为 CLI/Engine 共享契约。优点：root 可表达产品契约词；CLI/Engine 都从 root 消费，不需 CLI→Engine references。缺点：root 现有都是产品词（IAP/Asset/Work...），混入错误契约词可能破坏 root 纯度（但按 ADR-0060 D2 'root = 特性集合'这是允许的）。",
          "label": "错误 term 迁回 root"
        },
        {
          "description": "完全留 Engine Domain 但不动 CLI references，让 inv-2/3/4 隐式跨域消费。优点：改动最少。缺点：ADR-0059 §D1 references DAG 漏洞仍在，跨域消费不可检测。",
          "label": "不动 references（隐式跨域）"
        }
      ],
      "question": "IAPError 等 3 个错误 term 该归哪个 Domain？"
    },
    {
      "header": "backlinks 算法",
      "options": [
        {
          "description": "backlinks 由 references frontmatter 反向计算 'OxnEngineDomain references OxnDomain' ——精度到 Domain 级，不显示具体 term 反向引用。简单稳定，与 ADR-0059 §D1 DAG 一致。backlinks.test.ts fixture 需改造。",
          "label": "P7：基于 references（推荐）"
        },
        {
          "description": "保留当前 backlinks.ts 扫 desc MD link 算法不动。但这与 P1 '删所有 desc MD link' 冲突——如果 desc 没 MD link 了，backlinks 会显示空。逻辑上不可行。",
          "label": "保留扫 desc MD link"
        },
        {
          "description": "同时维护 references 反向（Domain 级 backlinks）+ 扫 desc MD link（term 级 backlinks）。但既然 P1 删所有 desc MD link，term 级 backlinks 永远空——两层并存无意义。",
          "label": "两层并存（不推荐）"
        }
      ],
      "question": "backlinks 引擎算法如何改造？"
    },
    {
      "header": "ADR 修订",
      "options": [
        {
          "description": "ADR-0059 §D2/D3 + ADR-0060 加 D8/D9 同步本次落地。优点：判据有 ADR 级不可撤回性。",
          "label": "同步修订两个 ADR（推荐）"
        },
        {
          "description": "ADR-0059 §D2/D3 修订 + ADR-0060 加 D8/D9，但只在 ADR 写明原则不改代码（backlinks.ts 不动）。缺点：P1 删 desc MD link 后 backlinks.ts 扫不到任何 link，oxn domain show 的 backlinks 区域会显示空——功能退化。",
          "label": "只改 ADR 不改 backlinks.ts"
        },
        {
          "description": "ADR 文字不改，直接改 desc/references，让 ADR 与实现脱节。不推荐。",
          "label": "ADR 不改（不推荐）"
        }
      ],
      "question": "ADR-0059 + ADR-0060 同步修订范围？"
    }
  ]
}
```

**Output:**
```
User has answered your questions: "IAPError 等 3 个错误 term 该归哪个 Domain？"="P2+P4：留 Engine + references 加跨域（推荐）", "backlinks 引擎算法如何改造？"="P7：基于 references（推荐）", "ADR-0059 + ADR-0060 同步修订范围？"="同步修订两个 ADR（推荐）". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · GLM-5.2 · 44.2s)

_Thinking:_

用户全部选了推荐选项：
- P2+P4: IAPError 留 Engine + CLI references 加跨域
- P7: backlinks 基于 references 反向计算
- 同步修订两个 ADR

现在我可以执行了。但注意：用户在系统提示中明确说 "I do not want you to execute yet" → 当前是 Plan mode READ-ONLY。

但用户回答问题的最后选择都是确认方案。我应该先确认一下 plan，再让用户最终授权执行。但是看 plan 模式的约束："Any modification attempt is a critical violation. ZERO exceptions." 

所以即使用户回答了澄清问题，我也不能立即开始编辑。我应该给一个最终 plan 然后等用户说 "执行"。

但其实用户已经在上面选完了 3 个决策点，按之前的模式（看 Q&A 历史）用户会下一步说"执行"。

但这是 Plan 模式下的 system reminder 要求严格 read-only。我应该展示最终化 plan 并等候用户明确说"执行"。

让我整理一个紧凑的最终 plan 给用户看，并明确说"等你说执行就开始"。

收到 3 个决策。基于选择，生成最终 Plan（**仍在 Plan 模式，不动文件**）：

---

## 最终 Plan（8 步）

### P1 · 全删 desc 内 MD link 尾巴（17 处）

**root `oxn-domain.md`（7 处）**：
- line 22 `### OXN CLI` → desc 改为 `OpenXenon 交互入口之一。`
- line 25 `### OXN Engine` → `OpenXenon 核心引擎。`
- line 28 `### OXL` → `OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。`
- line 40 `### Proof` → `人机协作的工作成果，OXN Engine 记录的客观事实。`
- line 43 `### Asset` → `工程师的资产，定义 AI Agent 工作时需要遵守的边界。`
- line 49 `### Work` → `人机协作的工作空间，衔接 Asset 与 Proof。`
- line 55 `### Insight` → `洞察 IAP 并提供涌现的可能性。`

**`oxn-work-domain.md`（4 处）**：
- line 37 `### Part` → 删尾巴"验证视角见 [...]"
- line 40 `### Probe` → 删尾巴"三态判定见 [...]"
- line 58 `### AssetHash` → 删"与 [...] 同一算法族"（保留前半 SHA-256 描述）
- line 64 `### Frozen` → 删"Schema 见 [...]"

**`oxn-proof-domain.md`（2 处）**：
- line 21 `### Probe` → 删"Work 视角内联位置见 [...]"
- line 24 `### Part` → 删"Work 视角执行单元见 [...]"

### P2 · Engine 域 3 个错误 term desc 改为"错误本体"

```
### IAPError
- desc: 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。

### OXNCrash
- desc: OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。

### CliInputError
- desc: 用户 CLI 输入错的契约类。轨道 3。
```

删 CLI 视角的处理方式（stdout/stderr/exit code）+ How（commander.*/citty.*）。

### P3 · CLI 域 ExitCode desc 精简

```
### ExitCode
- desc: OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。
```

inv-2 保留（已 inline 完整映射）。

### P4 · CLI 域 references 加 `oxn-engine-domain`

`oxn-cli-domain.md` frontmatter：
```yaml
references:
  - oxn-domain
  - oxn-engine-domain
```

inv-16 同步调整（原写"不向下引用 oxn-engine-domain"——需删除该句，因为现在 CLI 真的需要引用 Engine 的错误 term）。

### P5 · 删子 Domain 4 处 "X = oxn-domain.X 在 Y 层的完整定义" 句式

- `oxn-asset-domain.md:18` Asset → `Asset 是 E1 工程师定义边界的资产；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。`
- `oxn-work-domain.md:19` Work → `Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。`
- `oxn-proof-domain.md:18` Proof → `Proof 是 E3 Engine 出具的证明；执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。`
- `oxn-insight-domain.md:21` Insight → `Insight 是 E4 涌现层；整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。`

### P6 · ADR 修订

**ADR-0059 修订**：
- §D2 修订：从"用 desc MD link 表达 has sub-Domain" → **"Term desc 不可包含 MD link"**；has-sub-Domain 关系由 references frontmatter 隐式表达（root references 为空；子 Domain references 含 root）
- §D3 修订：backlinks 仅扫 references frontmatter 反向建索引（"哪些 Domain 在 references 里列了我"），不扫 desc
- §D5 拆分流程 Step 3 stub 化：同步改为 stub term desc 不含 MD link，用纯文本 "已拆分到 oxn-X-domain.Round term"

**ADR-0060 加两节**：
- **D8 Domain 视角隔离**：Term desc 仅描述本 Domain 视角的 What；跨视角信息由子 Domain 自有 term + references 表达
- **D9 代码物理 ≠ Domain 归属**：Domain 归属按语义边界切，不按代码目录切；共享契约词归 root 或最相关子域；处理方式（stdout/stderr/exit code）属消费侧 Domain

### P7 · backlinks.ts 改造

`packages/engine/src/oxl/md-pipeline/backlinks.ts`：
- 删掉扫 desc 内 MD link 的逻辑
- 改为：扫描全部 Domain 的 references frontmatter，对每个被引 Domain 反向建索引
- 输出格式：`Referenced by (N unique source Domains): OxnEngineDomain, OxnCliDomain, ...`（精度到 Domain 级，不再枚举到 term 级）
- backlinks.test.ts fixture 同步改造（删 desc 内 MD link → 测试期望值改为 references 反向）

### P8 · 验证

- `bun run lint` / `typecheck` / `validate-dependencies.ts`
- `bun test`（含改造后的 backlinks.test.ts）
- `oxn domain validate` × 7
- `oxn domain show OxnDomain` — backlinks 应显示 OxnCliDomain + OxnEngineDomain + ... （基于 references 反向）
- `oxn domain show OxnEngineDomain` — backlinks 应显示所有 references 含 oxn-engine-domain 的 Domain
- `oxn domain show OxnCliDomain` — references 显示 `[oxn-domain, oxn-engine-domain]`；backlinks 显示 root 的引用
- `bun run docs:build`
- grep 最终确认：所有 7 个 Domain 文件内 desc 无 `](`.md` 模式残留

---

## Plan 不动项

- `oxn-engine-domain.md` Kernel/Infra/Daemon 的 desc 你已手改（line 25/28），不动
- `oxn-cli-domain.md` 其他 term 你已手改（Command/SubCommand/Arg 等改得更简洁），不动
- `oxn-cli-domain.md` inv-2/3/4 保留原状（已 inline 完整）——只 inv-16 改（因 P4 references 加跨域）
- ADR-0059 D1/D4/D5/D6/D7 不动（只 D2/D3 修订）

---

确认 Plan 没问题说"执行"，我退出 Plan 模式开始落地。

---

## User

1、删掉MD link后，Root如何去Package，Package 如何去Module。

---

## Assistant (Plan · GLM-5.2 · 279.3s)

_Thinking:_

用户提出了一个核心问题：删掉 MD link 后，root 如何"指向"Package，Package 如何"指向"Module？

这是一个非常重要的设计问题。让我仔细思考。

当前我提议的方案：
- P1 删掉所有 desc 内 MD link
- P7 backlinks 仅扫 references frontmatter 反向建索引

但 ADR-0059 §D1 明确规定：references 是 sub→root DAG（子引用父）。

所以 references frontmatter：
- root `oxn-domain.md`：`references: []`
- package `oxn-cli-domain.md`：`references: [oxn-domain]`
- module `oxn-work-domain.md`：`references: [oxn-domain, oxn-engine-domain, oxn-asset-domain]`

references 是"我依赖谁编译"——子→父方向。这是 DAG 依赖语义。

那么 backlinks（反向）就是"谁依赖我"——父被哪些子引用。

但是——这里有一个我之前没看清的问题：

**Root 不能"去"Package；Package 不能"去"Module**——这是 ADR-0059 §D1 明确规定的"sub→root 单向引用"原则。

如果 Root 需要"知道"哪些 Package/Module 是自己的孩子，只能通过 backlinks（反向计算）——即扫所有 Domain 的 references，反向得知 "oxn-domain 被 OxnCliDomain + OxnEngineDomain + ... 引用"。这正是 P7 改造后 backlinks 要做的事。

但**关键问题来了**：backlinks 是运行时计算的派生索引，不写入文件。那么：
1. **HTTP/JSON 工具查询**：`oxn domain show OxnDomain` 会显示 backlinks = [OxnCliDomain, OxnEngineDomain, ...] ← 这是 P7 的输出
2. **文件本身**：root 文件 `oxn-domain.md` 内部**没有任何关于子 Domain 的信息**——纯根定义

这就是 ADR-0059 §D1 的设计意图：root 是被依赖方，不主动指子；子 Domain 通过 references 主动表达"我来自 root"。

这是 **DAG 单向 + 反向 backlinks 派生** 的架构。

让我再看看用户的疑惑具体是什么——他问"Root如何去Package，Package如何去Module"。

可能用户误解了我的 Plan：他以为删掉 MD link 后，导航/查询关系就断了。

实际答案是：
- **静态层**（文件内）：root 不主动指子；子通过 references frontmatter 指父（DAG 单向）
- **运行时层**（oxn domain show）：backlinks 算法扫描所有 Domain 的 references，反向得知"谁指了我"

所以：
1. Root "去" Package 只能通过 backlinks（运行时反向派生）
2. Package "去" Module 同样——通过 backlinks 知道哪些 Module references 了它

这正是 P7 要做的事——backlinks 算法从"扫 desc MD link"改为"扫 references frontmatter 反向"。

但用户的担心是合理的：如果完全无显式指向，AI Agent 只看文件本身怎么知道有子 Domain？让我想想 ADR-0059 §D1 的设计意图——root 不主动指子，是因为：
- 反转（root → sub）会形成循环（A → B → A）
- sub → root 方向与 Asset 拆分语义兼容
- 让 root 不被子 Domain 重构绑架

但 ADR-0059 §D2 原本设计了"通过 desc MD link 表达 has sub-Domain 关系"——这是我刚要废除的。

废除 desc MD link 后，root → sub 的"指向"关系就完全没了显式表达——只能靠 backlinks。

这是不是问题？

我觉得**有几个选项需要用户确认**：

**选项 A：完全依赖 backlinks**
- root 文件内部 0 指向子
- AI Agent 读 root 文件看到 OXN CLI term desc = "OpenXenon 交互入口之一。"——根本不知道有 oxn-cli-domain 文件
- 只有运行 `oxn domain show OxnDomain` 才看到 backlinks：OxnCliDomain
- AI Agent 看到纯文本"OpenXenon 交互入口之一"，没有 markdown link，不会跳转

**选项 B：保留 root→sub 显式 link，但 sub→sub 互引删掉**
- root `### OXN CLI` desc 保留"OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`]。"——保留导航
- 删 sub↔sub 的"视角见"链接（Part/Probe/Frozen/AssetHash）
- backlinks 算法可保留双向：扫 root→sub desc link + 扫 sub→root references frontmatter

但这违反 P1 全删 desc MD link。

**选项 C：在 references frontmatter 增加反向字段**
- ADR-0059 §D1 修订 references 为双向：
  - `references: [子依赖的父]` — 保留 sub→root 语义
  - `composed-by: [引用我的子]` — 新增字段表达 root→sub 关系
- root Domain `composed-by: [oxn-cli-domain, oxn-engine-domain, ...]`
- AI 读 root 文件看到"OXN CLI" term，desc 是纯文本无 link；但可在文件顶部 frontmatter 看到 composed-by 列表
- backlinks 仍由 composed-by 反向计算 OR 直接读 composed-by

选项 C 看起来最好——既解决纯文本 desc（ADR-0060 What-only），又解决 root→sub 导航问题。

但这会破坏 ADR-0059 §D1 "sub→root 单向"原则——root 主动列 children，等于 root 知道子域。

**选项 D：保留 desc 内 root → sub 的 link，但限定为只允许 root 指向 sub（不允许 sub↔sub 互引，不允许 sub→root）**
- root `### OXN CLI` desc 保留"具体领域见 [...]"（root→sub link）
- 删 sub↔sub 互引（Part/Probe/Frozen/AssetHash 4 处 work↔proof 互引）
- 删 sub→root "root 抽象定义见"（已删 2 处，无残留）
- backlinks 算法：扫 desc 内 root→sub link + 扫 references frontmatter sub→root，两者互补

但选项 D 保留了 ADR-0059 §D2 原始设计（desc link 表达 has sub-Domain）——只是限制方向（仅 root→sub）。

**选项 E：用 prose（纯文本描述）不嵌 link**
- root `### OXN CLI` desc：`OpenXenon 交互入口之一。具体领域由 OxnCliDomain 承载。`
- 不嵌 markdown link，但用 Domain name 在 desc 中点明"有子 Domain"
- AI 读 desc 看到文本"OxnCliDomain 承载"，知道有子，但不被 markdown link 引导跳转
- backlinks 仍由 references 计算

选项 E 让 AI 知道有子但不会跳转——这可能是合理平衡。

让我再仔细读用户问题：

> "1、删掉MD link后，Root如何去Package，Package 如何去Module。"

用户问的是"如何去"——他想知道删除 MD link 后，root→package、package→module 的关系如何表达。

我应该把这些选项展示给用户决策。

让我先看下 ADR-0059 §D1 原文，确认 references 方向：
- D1：references 字段方向不变（sub → root）
- D2：term 级 MD 链接代替 composes 字段

这里 D2 已经明确"代替 composes"——所以原来想用 composes 字段做 root→sub 表达，被 D2 改用 MD link 做。

我现在要废 D2 的 MD link——那用什么代替 composes 表达 root→sub？

选项 A：什么都不用，靠 backlinks 反向派生——root 文件内部 0 指向
选项 B：保留只 root→sub 单向 MD link
选项 C：新增 composed-by frontmatter 字段
选项 D：用 prose 纯文本点出子 Domain name 但不嵌 link
选项 E：ADR-0059 §D2 不动，保留 root→sub MD link，只删 sub↔sub 互引

让我把每个选项的权衡列清楚，问用户。

但同时要考虑另一个问题：ADR-0059 §D2 的 MD link 既允许 root→sub，也允许 sub↔sub 互引（如 work↔proof 的 Part/Probe）。我现在要废整个 D2 还是只废 sub↔sub？

如果要保留 root→sub 表达，但 ADR-0059 §D2 标题就是"term 级 MD 链接代替 composes 字段"——保留意味着 D2 整体不动。

那么 P1 应该改为：只删 sub↔sub 4 处互引 + 2 处 sub→root 尾巴，保留 root→sub 7 处。

让我重新分析 P1 的 17 处：

**root→sub 7 处**：
- oxn-domain.md line 22/25/28/40/43/49/55 都是 root→sub 的 link
- 这些正是 ADR-0059 §D2 设计的有意表达

**sub↔sub 4 处**：
- work↔proof 的 Part/Probe/Frozen/AssetHash 互引——这是 sub↔sub 互引，既非 D2 设计的 root→sub，也非 ADR-0059 任何明确允许的语义

**sub→root 2 处**：
- Engine Domain `### OXN Engine` 和 `### OXL` 写"root 定义见 [...]"——这是已删的（用户手删）
- 现在 `oxn-cli-domain.md:17` OXN CLI 也有"root 抽象定义见"——这是 sub→root 引用，与 references frontmatter 重复

所以分类应该是：
- root→sub MD link（7 处）：导航性质，是 user 问的"如何去"
- sub→root MD link（1 处还剩 oxn-cli-domain:17）：与 references 重复，可删
- sub↔sub MD link（4 处）：D2 设计外，可删

我的 Plan P1 全删是错的——应该只删 sub→root + sub↔sub 6 处，保留 root→sub 7 处。

让我让用户决策，把选项清晰呈现。

不过我现在在 Plan mode，且 system-reminder 强调我 READ-ONLY——必须严格遵守，不执行任何编辑。我只回答用户的问题，重新评估 Plan。

我应该：
1. 直接回答用户的问题——揭示我 P1 全删是错的
2. 给出选项让用户决策
3. 等用户确认后再执行

我现在严格只读，不动任何文件。

这是个关键的反击，直接戳破我 P1 全删 MD link 的错误。我先重新审视那 17 处——它们根本不是同一类。

## 分类重审

ADR-0059 §D2 的 MD link 设计是 *root→sub 表达 has sub-Domain*。我现在 P1 "全删 desc MD link"把这 17 处当成同一类，是错的：

| 类别 | 处数 | 方向 | 性质 | D2 立场 |
|---|---|---|---|---|
| **root→sub** | 7（oxn-domain.md 22/25/28/40/43/49/55）| root → sub 子 Domain | 导航+显式表达"has sub-Domain" | ✅ D2 原设计 |
| **sub↔sub** | 4（work↔proof Part/Probe/Frozen/AssetHash）| sub ↔ sub 互引 | 跨子域"视角见"互链 | ❌ D2 未允许，是我擅自引申 |
| **sub→root** | 3（已删 2 + cli-domain:17 OXN CLI "root 抽象定义见"）| sub → root | 与 references frontmatter 重复 | ❌ 与 D1 references 语义重复 |

## 你问"Root 如何去 Package"的正确答案

ADR-0059 §D1 + §D2 是配套设计：
- **D1 references frontmatter**（sub→root DAG）：表达"我编译依赖谁"——sub 主动声明父
- **D2 desc MD link**（root→sub）：表达"我有哪个子 Domain"——root 主动点名子
- **§D3 backlinks 派生**：扫描两者，构建双向索引

如果把 D2 整个废掉，root 文件内部 0 指向子 Domain——AI Agent 读 `oxn-domain.md` 看到 `### OXN CLI - desc: OpenXenon 交互入口之一。`，**根本不知道有 oxn-cli-domain.md 这个文件存在**。必须运行 `oxn domain show` 才能通过 backlinks 反查——对静态阅读完全失效。

这正是你提的问题：删掉 MD link 后,Root 如何去 Package？

## 我重新提议的 P1 范围（不是全删）

**只删 6 处**：
- 4 处 sub↔sub 互引（work↔proof Part/Probe/Frozen/AssetHash）
- 2 处 sub→root 尾巴（cli-domain:17 OXN CLI 已删 Engine 那两处；oxn-cli-domain 这处还在）

**保留 7 处 root→sub MD link** ——这是 ADR-0059 §D2 的原设计用途，正是回答你问的"Root 如何去 Package"。

## backlinks 算法相应调整（替代 P7）

不废 D2，但**算法双向**：
- root→sub 关系：扫 root Domain 的 desc MD link（指向哪些子 Domain）
- sub→root 关系：扫所有子 Domain 的 references frontmatter（依赖哪些父 Domain）
- backlinks = 两组取反向

backlinks.test.ts fixture 同步——但只改测试期望值，不重写算法。

## ADR-0059 修订范围相应缩小

- §D1 不动（references sub→root DAG 保留）
- §D2 不动（root→sub MD link 表达 has sub-Domain 保留）
- §D2 加一条约束："MD link 仅用于 root→sub 单向表达 has sub-Domain；禁止 sub→root（与 references 重复）和 sub↔sub（造成双向耦合）"
- §D3 backlinks 算法描述不变（已涵盖双向扫描）

## ADR-0060 加 D8 Domain 视角隔离（保留）

D8 仍然加——但只针对 sub↔sub 互引（work↔proof Part/Probe 这类）：
> Term desc 不可包含指向其他 sub Domain 同名 term 的 MD link（sub↔sub 互引造成双向耦合）；root→sub MD link 受 ADR-0059 §D2 保护，不受 D8 约束。

---

## 待确认

**Tool: question**

**Input:**
```json
{
  "questions": [
    {
      "header": "P1 范围",
      "options": [
        {
          "description": "保留 root→sub 7 处 MD link（ADR-0059 §D2 原设计）；删 sub→root 2 处（与 references 重复）；删 sub↔sub 4 处（造成双向耦合，总共 6 处。root 仍能动 idiom 'OXN CLI 具体领域见 oxn-cli-domain' 去 Package；Package 去 Module 同靠 Module Domain 的 references frontmatter（sub→root DAG）+ oxn domain show backlinks。",
          "label": "保留 root→sub + 删 6 处（推荐）"
        },
        {
          "description": "只删 sub↔sub 4 处（work↔proof Part/Probe/Frozen/AssetHash）。保留 sub→root 2 处（oxn-cli-domain:17 OXN CLI 'root 抽象定义见'）作为补充 navigation。缺点：sub→root MD link 与 references frontmatter 重复表达同一信息；ADR-0059 §D1 与 §D2 语义重叠。",
          "label": "只删 sub↔sub 互引 4 处"
        },
        {
          "description": "采 P1 原版全删 17 处。root 文件内部 0 指向子；AI 静态阅读 root Domain 时不知道有哪些子 Domain，必须动 oxn domain show 才能 backlinks 反查。需要额外在 ADR-0059 §D2 加 'root 精心维护 backlinks 索引指向子 Domain' 或新增 composed-by frontmatter 字段表达 root→sub。改动范围最大。",
          "label": "P1 原计划全删（静态阅读失效）"
        }
      ],
      "question": "desc 内 MD link 范围该如何处理？"
    },
    {
      "header": "backlinks 算法",
      "options": [
        {
          "description": "双向扫描：root→sub 从 root Domain desc MD link 扫；sub→root 从子 Domain references frontmatter 扫。两者取反向 union 后输出 backlinks。backlinks.test.ts fixture 需要 partial 调整但不是重写。",
          "label": "双向扫描（root→sub desc + sub→root references）（推荐）"
        },
        {
          "description": "P7 版计划：仅扫 references frontmatter 反向。root→sub 只在 root Domain 文件本身可见（desc MD link），但是运行时 oxn domain show root 时不显示 '谁是我孩子' 列表。可以运行时看不到 root→sub 的 backlinks，只能看到 sub→root 的。",
          "label": "仅扫 references（P7 版）"
        },
        {
          "description": "backlinks 算法不动（原本已扫 desc MD link）。如果上面选 '保留 root→sub + 删 6 处'，继续扫 desc MD link 能抓到 root→sub 7 处；sub↔sub 4 处删了不会干扰。只调 test fixture 的期望值。",
          "label": "维持现状，仅调 test fixture"
        }
      ],
      "question": "backlinks 算法该怎么调？"
    }
  ]
}
```

**Output:**
```
User has answered your questions: "desc 内 MD link 范围该如何处理？"="保留 root→sub + 删 6 处（推荐）", "backlinks 算法该怎么调？"="双向扫描（root→sub desc + sub→root references）（推荐）". You can now continue with the user's answers in mind.
```

---

## Assistant (Plan · GLM-5.2 · 39.1s)

收到。**仍在 Plan mode** — 只更新 Plan，不动文件。

## Plan 修订版（8 步）

### P1 · 只删 6 处 MD link（保留 root→sub 7 处）

**sub→root 1 处（与 references 重复）**：
- `oxn-cli-domain.md:17` `### OXN CLI` → 删"root 抽象定义见 [`oxn-domain.OXN CLI`]"尾巴

**sub↔sub 互引 5 处（造成双向耦合）**：
- `oxn-work-domain.md:37` Part → 删"验证视角见 [`oxn-proof-domain.Part`]"
- `oxn-work-domain.md:40` Probe → 删"三态判定见 [`oxn-proof-domain.Probe`]"
- `oxn-work-domain.md:58` AssetHash → 删"与 [`oxn-proof-domain.ContentHash`] 同一算法族"（保留前半 SHA-256 描述）
- `oxn-work-domain.md:64` Frozen → 删"Schema 见 [`oxn-proof-domain.Frozen`]"
- `oxn-proof-domain.md:21` Probe → 删"Work 视角内联位置见 [`oxn-work-domain.Probe`]"
- `oxn-proof-domain.md:24` Part → 删"Work 视角执行单元见 [`oxn-work-domain.Part`]"

**保留 root→sub 7 处**（oxn-domain.md 22/25/28/40/43/49/55）—— ADR-0059 §D2 原设计用途。

实际是 6 处需删（sub→root 1 + sub↔sub 5），上面写 6 处但列出来是 6 行 ✓。

### P2 · Engine 域 3 个错误 term desc 改为错误本体（不变）

```
### IAPError - desc: 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。
### OXNCrash - desc: OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。
### CliInputError - desc: 用户 CLI 输入错的契约类。轨道 3。
```

### P3 · CLI 域 ExitCode desc 精简（不变）

```
### ExitCode - desc: OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。
```

### P4 · CLI 域 references 加 oxn-engine-domain（不变）

```yaml
references:
  - oxn-domain
  - oxn-engine-domain
```
inv-16 同步调整（删"不向下引用 oxn-engine-domain"句）。

### P5 · 删子 Domain 4 处 "X = oxn-domain.X 在 Y 层的完整定义" 句式（不变）

- Asset → "Asset 是 E1 工程师定义边界的资产；5 类 AssetKind..."
- Work → "Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳..."
- Proof → "Proof 是 E3 Engine 出具的证明；执行主体 OXN Engine（公证人非裁判 ADR-0031）..."
- Insight → "Insight 是 E4 涌现层；整体论 vs 前三层还原论..."

### P6 · ADR 修订（范围缩小）

**ADR-0059 §D2 加约束**：
> desc MD link 仅用于 root→sub 单向表达 has sub-Domain；禁止 sub→root（与 references frontmatter 重复）和 sub↔sub（造成双向耦合）。已有 sub→root / sub↔sub MD link 在本次修订中删除。

**ADR-0059 §D3 backlinks 算法描述更新**：
> backlinks 由双向扫描派生：
> 1. **sub→root 反向**：扫描所有子 Domain 的 references frontmatter，反查"谁依赖了我"
> 2. **root→sub 反向**：扫描 root Domain 的 desc MD link，反查"root 主动点名了哪些子 Domain"
> 3. 两组取 union 后输出 backlinks 索引

**ADR-0060 加 D8 Domain 视角隔离**（范围缩小，只针对 sub↔sub）：
> Term desc 不可包含指向其他 sub Domain 同名 term 的 MD link（sub↔sub 互引造成双向耦合）。root→sub MD link 受 ADR-0059 §D2 保护，不受本节约束。

**ADR-0060 加 D9 代码物理 ≠ Domain 归属**（不变）：
> Domain 归属按语义边界切，不按代码目录切；共享契约词归 root 或最相关子域；处理方式（stdout/stderr/exit code）属消费侧 Domain。

### P7 · backlinks.ts 双向扫描改造

`packages/engine/src/oxl/md-pipeline/backlinks.ts`：
- 现有逻辑：扫 desc MD link 反向建索引
- 改造为：
  1. 扫描所有 Domain 的 references frontmatter → sub→root 反向索引
  2. 扫描 root Domain 的 desc MD link → root→sub 反向索引  
  3. union 输出
- backlinks.test.ts fixture 同步：测试用例需覆盖双向（sub→root + root→sub）

### P8 · 验证（不变）

- `bun run lint` / `typecheck` / `validate-dependencies.ts`
- `bun test`（含改造后的 backlinks.test.ts）
- `oxn domain validate` × 7
- `oxn domain show OxnDomain` — backlinks 应同时显示：sub→root 反向（OxnCliDomain + OxnEngineDomain + 4 个 module）+ root→sub 反向（root 自己 desc MD link 点名的 7 个子 Domain）
- `oxn domain show OxnEngineDomain` — backlinks 应显示：sub→root 反向（module 4 个 + oxn-cli-domain）+ root→sub 反向（root 自己 desc MD link 点名 OxnEngineDomain）
- `oxn domain show OxnCliDomain` — references 显示 `[oxn-domain, oxn-engine-domain]`
- `bun run docs:build`
- grep 确认：oxn-{cli,work,proof,asset,insight}-domain.md 内 desc 无 `](`.md` 模式残留

---

## Plan 不动项

- `oxn-domain.md` 7 处 root→sub MD link（line 22/25/28/40/43/49/55）保留
- `oxn-domain.md` line 27/33/36/39/42/45/48/51/54/57/60 其他 term desc 不动（OXL/Intent/Align/Boundary/Verdict/Hall/Daemon/IAP 等本身无 MD link）
- `oxn-engine-domain.md` Kernel/Infra/Daemon/OXL 的 desc（你已手改）不动
- `oxn-cli-domain.md` Command/SubCommand/Arg/OutputFormat 等已手改的 term desc 不动
- ADR-0059 D1/D4/D5/D6/D7 不动（只 D2 加约束、D3 算法描述更新）
- ADR-0060 D1-D7 不动（只加 D8/D9）

---

确认 Plan 没问题说"执行"，我退出 Plan 模式开始落地。

---

## User

执行

---

## Assistant (Build · MiniMax-M3 · 15.5s)

_Thinking:_

用户已经确认"执行"，并且系统从 plan mode 切换到 build mode。现在我可以执行编辑了。让我系统地执行 P1-P8。

让我先更新 todo list，然后开始执行：

1. P1 删 6 处 MD link（保留 root→sub 7 处）
2. P2 Engine 3 个错误 term desc 重写
3. P3 CLI ExitCode desc 精简
4. P4 CLI references 加 oxn-engine-domain + inv-16 改
5. P5 4 处子 Domain "X = oxn-domain.X 在..." 句式改
6. P6 ADR 修订（ADR-0059 §D2 加约束 + §D3 算法 + ADR-0060 D8/D9）
7. P7 backlinks.ts 双向扫描改造
8. P8 验证

让我开始执行 P1。

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P3: CLI Domain ExitCode desc 精简",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7.1: backlinks.ts 双向扫描改造",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7.2: backlinks.test.ts fixture 同步",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8b: grep 最终确认",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P3: CLI Domain ExitCode desc 精简",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7.1: backlinks.ts 双向扫描改造",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7.2: backlinks.test.ts fixture 同步",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8b: grep 最终确认",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 3.3s)

## P1 — 删 6 处 MD link（保留 root→sub 7 处）

### P1.1: oxn-cli-domain.md:17 OXN CLI sub→root 尾巴

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### OXN CLI\n- desc: OpenXenon 交互入口之一。",
  "newString": "### OXN CLI\n- desc: OpenXenon 交互入口之一。"
}
```

**Error:**
```
No changes to apply: oldString and newString are identical.
```

---

## Assistant (Build · MiniMax-M3 · 3.5s)

_Thinking:_

Wait, the user said OXN CLI in oxn-cli-domain.md line 17 was `OpenXenon 交互入口之一。root 抽象定义见 [`oxn-domain.OXN CLI`](../../assets/domains/oxn-domain.md#oxn-cli).` — but I already removed that earlier. Let mecheck current state.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "limit": 20
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md</path>
<type>file</type>
<content>
1: ---
2: entity: domain
3: version: 0.4.1
4: name: OxnCliDomain
5: abstract: OXN CLI 领域。
6: references:
7:   - oxn-domain
8: citations: 0
9: synced-at: 2026-07-17
10: ---
11: 
12: # Domain: OxnCliDomain
13: 
14: ## Terms: OXN CLI
15: 
16: ### OXN CLI
17: - desc: OpenXenon 交互入口之一。
18: 
19: ## Terms: Command
20: 

(Showing lines 1-20 of 174. Use offset=21 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 8.3s)

_Thinking:_

Already clean. User must have removed it earlier when I did P1 cleanup. Good.

Now P1.2 - oxn-work-domain.md sub↔sub 4 处

oxn-cli-domain.md:17 已无 sub→root 尾巴（P1.1 完成）。

### P1.2: oxn-work-domain.md 4 处 sub↔sub 互引

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "### Part\n- desc: Task 内 skill 执行单元（skill_context + acceptance），内联在 task.oxn 内不可独立成文件。验证视角见 [`oxn-proof-domain.Part`](./oxn-proof-domain.md#part)。",
  "newString": "### Part\n- desc: Task 内 skill 执行单元（skill_context + acceptance），内联在 task.oxn 内不可独立成文件。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "### Probe\n- desc: 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。三态判定见 [`oxn-proof-domain.Probe`](./oxn-proof-domain.md#probe)。",
  "newString": "### Probe\n- desc: 物理观测单元（prop 输入 + output 判定），内联在 part 内；标准必须来自 Blueprint observe 数组。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "### AssetHash\n- desc: 域/蓝图文件的 SHA-256（64-hex），OXN 启动期计算并存入 BirthCert.assets。与 [`oxn-proof-domain.ContentHash`](./oxn-proof-domain.md#contenthash) 同一算法族。",
  "newString": "### AssetHash\n- desc: 域/蓝图文件的 SHA-256（64-hex），OXN 启动期计算并存入 BirthCert.assets。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "### Frozen\n- desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。Schema 见 [`oxn-proof-domain.Frozen`](./oxn-proof-domain.md#frozen)。",
  "newString": "### Frozen\n- desc: Work finalize 后的判决书（frozen.json），生成后只读（chmod 0o444 + content_hash + signature）。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.7s)

### P1.3: oxn-proof-domain.md 2 处 sub↔sub 互引

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "### Probe\n- desc: OXN 内置探针（物理观测 + 纯函数判定），由 L1-Infra Provider 执行 + L0-Kernel 判定。Work 视角内联位置见 [`oxn-work-domain.Probe`](./oxn-work-domain.md#probe)。",
  "newString": "### Probe\n- desc: OXN 内置探针（物理观测 + 纯函数判定），由 L1-Infra Provider 执行 + L0-Kernel 判定。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "### Part\n- desc: OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。Work 视角执行单元见 [`oxn-work-domain.Part`](./oxn-work-domain.md#part)。",
  "newString": "### Part\n- desc: OXN 内置零件（封装可复用工程动作如 git-commit），引用 @oxn/parts/* scope。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.2s)

## P2 — Engine 域 3 个错误 term desc 改为错误本体

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md",
  "oldString": "### IAPError\n- desc: 业务流转中预期内阻断（轨道 1，AI 消费）；通过 stdout JSON 输出。\n\n### OXNCrash\n- desc: OXN 引擎自身 Bug / 底线被击穿（轨道 2，人类消费）；通过 stderr stack 输出，进程退出码 2。\n\n### CliInputError\n- desc: 用户 CLI 输入错（commander.* / citty.* 白名单前缀）；输出 stdout+exit 1。",
  "newString": "### IAPError\n- desc: 业务流转中预期内错误的契约类。轨道 1，AI 消费受众。\n\n### OXNCrash\n- desc: OXN 引擎自身 Bug 或底线被击穿的错误契约类。轨道 2，人类消费受众。\n\n### CliInputError\n- desc: 用户 CLI 输入错的契约类。轨道 3。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 2.9s)

## P3 — CLI Domain ExitCode desc 精简

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### ExitCode\n- desc: 进程退出码：0=成功 / 1=业务流阻断 / 2=引擎崩溃；二轨不混。",
  "newString": "### ExitCode\n- desc: OXN CLI 进程退出码，3 档（成功 / 业务阻断 / 引擎崩溃）。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.8s)

## P4 — CLI Domain references 加 oxn-engine-domain + inv-16 调整

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "references:\n  - oxn-domain",
  "newString": "references:\n  - oxn-domain\n  - oxn-engine-domain"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "### inv-16\n- value: 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，\n  重名 term（OXN CLI）不重定义；\n  不向下引用 oxn-engine-domain/oxn-asset-domain；\n  错误类型术语迁 Engine 域后本域只保留消费侧规则",
  "newString": "### inv-16\n- value: 本域与 oxn-domain 单向引用：CLI 子域补父域未说的部分，\n  重名 term（OXN CLI）不重定义；\n  错误类型术语归 Engine 域，本域 references 含 oxn-engine-domain 用于消费侧\n  TopCatch / ExitCode 映射引用；\n  不向下引用 oxn-asset-domain"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 6.6s)

## P5 — 子 Domain 4 处 "X = oxn-domain.X 在..." 句式

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-asset-domain.md",
  "oldString": "### Asset\n- desc: Asset = oxn-domain.Asset 在 E1 业务层的完整定义。5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。",
  "newString": "### Asset\n- desc: Asset 是 E1 工程师定义边界的资产；5 类 AssetKind（domain/workflow/stack/blueprint/roadmap）；Work 引用 Asset（单向）。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "### Work\n- desc: Work = oxn-domain.Work 在 E2 业务层的完整定义。编排流程：3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。",
  "newString": "### Work\n- desc: Work 是 E2 人机协作的工作空间；编排流程 3 IAP 阶段顺序不可跳；必经路径 create→lock→run→submit×N→finalize。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "### Proof\n- desc: Proof = oxn-domain.Proof 在 E3 Engine 层的完整定义。执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。",
  "newString": "### Proof\n- desc: Proof 是 E3 Engine 出具的证明；执行主体 OXN Engine（公证人非裁判 ADR-0031）；物理观测 L1-Infra + 业务判定 L0-Kernel；三态 PASSED/FAILED/INCONCLUSIVE。"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-insight-domain.md",
  "oldString": "### Insight\n- desc: Insight = oxn-domain.Insight 在 E4 涌现层的完整定义。整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。",
  "newString": "### Insight\n- desc: Insight 是 E4 涌现层；整体论 vs 前三层还原论；只输出协作态势信号（边界使用/触碰/Loop 收敛/退出模式），不输出代码质量评分；永不自动回写 Asset。"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 7.3s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3: CLI Domain ExitCode desc 精简",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7.1: backlinks.ts 双向扫描改造",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P7.2: backlinks.test.ts fixture 同步",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8b: grep 最终确认",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3: CLI Domain ExitCode desc 精简",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7.1: backlinks.ts 双向扫描改造",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P7.2: backlinks.test.ts fixture 同步",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8b: grep 最终确认",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 12.6s)

## P6.1 — ADR-0059 §D2 加约束 + §D3 算法描述更新

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/0059-domain-reference-model-v2.md",
  "oldString": "### D2：term 级 MD 链接代替 composes 字段\n\n不新增 `composes` 字段。改用 term desc 里的 markdown 链接表达\"该 term 有专门的子 Domain\"：\n\n```md\n### Work\n- desc: 人机协作的工作空间。E2 工程实现见 [`oxn-work-domain`](./oxn-work-domain.md)。\n```\n\n规则：\n- 仅在该 term 有专属 module 子 Domain 时添加链接（6 个 term 满足：OXN CLI / OXN Engine / Asset / Work / Proof / Insight）\n- 链接语法：标准 markdown `[`text`](./oxn-domain.md)`，target 是同目录下另一个 Domain 文件\n- 链接方向：root → sub（\"详见子 Domain\"），与 references 方向互补\n\n理由：\n- 单一 SSOT（链接只在 desc 中写一次，不重复）\n- 比 `composes` 字段更直观（desc 上下文自带语义）\n- Wiki 风格有机链接网络\n\n### D3：自动 backlinks\n\nOXN engine 扫描所有 Domain 文件中的 MD 链接，构建 backlink 索引（不存储在文件里，运行时计算）：\n\n```bash\n$ oxn domain show oxn-work-domain\n\nReferenced by (backlinks):\n  - oxn-domain.md → term \"Work\"\n  - oxn-proof-domain.md → term \"Frozen\"\n  - oxn-insight-domain.md → term \"Pattern\"\n\nTerms linking out:\n  - Work → ./oxn-domain.md#work\n  - Frozen → ./oxn-proof-domain.md#frozen\n```\n\n理由：\n- 不要求手写双向链接（避免失去层级关系）\n- backlinks 由 engine 派生，自然形成 wiki 式双向感受\n- 不参与 DAG 校验（仅展示用途）",
  "newString": "### D2：term 级 MD 链接代替 composes 字段\n\n不新增 `composes` 字段。改用 term desc 里的 markdown 链接表达\"该 term 有专门的子 Domain\"：\n\n```md\n### Work\n- desc: 人机协作的工作空间。E2 工程实现见 [`oxn-work-domain`](./oxn-work-domain.md)。\n```\n\n规则：\n- 仅在该 term 有专属 module 子 Domain 时添加链接（6 个 term 满足：OXN CLI / OXN Engine / Asset / Work / Proof / Insight）\n- 链接语法：标准 markdown `[`text`](./oxn-domain.md)`，target 是同目录下另一个 Domain 文件\n- 链接方向：root → sub（\"详见子 Domain\"），与 references 方向互补\n- **D2 约束（2026-07-17 修订）**：term desc MD link 仅允许 **root → sub 单向**表达 has sub-Domain；禁止 sub → root（与 references frontmatter 重复）和 sub ↔ sub（造成双向耦合、违反 Domain 视角隔离）。已有 sub → root / sub ↔ sub MD link 在本次修订中删除。\n\n理由：\n- 单一 SSOT（链接只在 desc 中写一次，不重复）\n- 比 `composes` 字段更直观（desc 上下文自带语义）\n- Wiki 风格有机链接网络\n- root Domain 文件本身保持\"我有哪些子 Domain\"的可读性，无需运行 `oxn domain show` 即可通过 desc MD link 静态发现子 Domain\n\n### D3：自动 backlinks\n\nOXN engine 扫描所有 Domain 文件，**双向**构建 backlink 索引（不存储在文件里，运行时计算）：\n\n```bash\n$ oxn domain show oxn-work-domain\n\nReferenced by (backlinks, 双源 union):\n  # sub → root 反向：扫描所有子 Domain 的 references frontmatter\n  - oxn-domain.md                    # oxn-work-domain.references 含 oxn-domain\n  - oxn-engine-domain.md             # oxn-work-domain.references 含 oxn-engine-domain\n  - oxn-asset-domain.md              # oxn-work-domain.references 含 oxn-asset-domain\n  # root → sub 反向（仅当 root 自己使用此功能时）：\n  - (root Domain 无 references 字段时此项空)\n\nTerms linking out:\n  - 无（sub Domain desc 不嵌 MD link，避免双向耦合）\n```\n\n**D3 算法（2026-07-17 修订）**：\n\n1. **sub → root 反向**：扫描所有非 root Domain 的 references frontmatter，对每个被引 Domain 反向建索引（\"哪些 Domain 在 references 里列了我\"）\n2. **root → sub 反向**：扫描 root Domain（如 oxn-domain）的 desc MD link，反向建索引（\"root 主动点名了哪些子 Domain\"）\n3. 两组取 union 后输出 backlinks 索引\n\n理由：\n- 不要求手写双向链接（避免失去层级关系）\n- backlinks 由 engine 派生，自然形成 wiki 式双向感受\n- 不参与 DAG 校验（仅展示用途）\n- 双向扫描兼顾 root→sub 显式导航 + sub→root DAG 反查"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 9.0s)

## P6.2 — ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/docs/adrs/0060-domain-vocabulary-boundary.md",
  "oldString": "### D7：OXL 子 Domain 拆分触发条件\n\nOXL 当前在 Engine Domain 内（1 个 term）。若 OXL 相关契约词 > 5 个（如未来增加 OXL Compiler / OXL Registry / OXL Pipeline 等契约词），触发拆出 `oxn-engine-oxl-domain`（依 RFC §2.2 命名规则）。本 ADR 不立即拆分。",
  "newString": "### D7：OXL 子 Domain 拆分触发条件\n\nOXL 当前在 Engine Domain 内（1 个 term）。若 OXL 相关契约词 > 5 个（如未来增加 OXL Compiler / OXL Registry / OXL Pipeline 等契约词），触发拆出 `oxn-engine-oxl-domain`（依 RFC §2.2 命名规则）。本 ADR 不立即拆分。\n\n### D8：Domain 视角隔离\n\nTerm desc 仅描述**本 Domain 视角**的 What；跨视角信息由子 Domain 自有 term + references 表达。\n\n**约束（2026-07-17 修订）**：\n\n- Term desc **不可**包含指向其他 sub Domain 同名 term 的 MD link（sub ↔ sub 互引造成双向耦合，违反视角隔离）\n- root → sub MD link 受 ADR-0059 §D2 保护，不受本节约束\n- 跨 Domain 视角信息表达机制：\n  1. 子 Domain 自有同名 term 描述该视角下的具体特性（依 ADR-0059 §D2 \"重名不重定义\"）\n  2. 跨 Domain 消费关系由 references frontmatter 表达（sub→root DAG）；不通过 desc 内 MD link 互通\n- 违反示例：Engine Domain `### IAPError` desc 描述\"通过 stdout JSON 输出\"（CLI 视角），CLI Domain `### ExitCode` desc 描述\"错误代码 2\"（错误类型视角）——这是视角跨越，应拆分到各自的 Domain\n\n### D9：代码物理 ≠ Domain 归属\n\nDomain 归属按**语义边界**切，不按代码目录切。\n\n**判据（2026-07-17 修订）**：\n\n- Domain 归属判据：术语的**语义视角归属**（业务/架构/错误处理/CLI 消费），而非代码物理路径\n- 共享契约词（被多个 Domain 视角共同消费）归 root 或最相关子域；不按物理位置（如 `packages/engine/src/kernel/errors/`）直接归 Engine Domain\n- 处理方式（stdout/stderr/exit code 等进程 IO 概念）属**消费侧** Domain（CLI），不属错误类型定义侧 Domain（Engine）\n- 违反示例：把 IAPError/OXNCrash/CliInputError 的代码物理位置在 `packages/engine/src/kernel/errors/`，就简单归 Engine Domain；但三个错误类型的\"错误处理\"语义归 CLI 视角（stdout/stderr/exit code），导致 Engine Domain desc 写了 CLI 视角的处理方式——违反 D8 视角隔离"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 6.3s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3: CLI Domain ExitCode desc 精简",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7.1: backlinks.ts 双向扫描改造",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "P7.2: backlinks.test.ts fixture 同步",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "P8b: grep 最终确认",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3: CLI Domain ExitCode desc 精简",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7.1: backlinks.ts 双向扫描改造",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "P7.2: backlinks.test.ts fixture 同步",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "P8b: grep 最终确认",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 2.6s)

## P7 — backlinks.ts 双向扫描改造

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts</path>
<type>file</type>
<content>
1: /**
2:  * md-pipeline/backlinks.ts — v0.7 ADR-0059 backlinks 引擎
3:  *
4:  * 角色：扫描所有 Domain .md 文件的 term.desc / ban.desc / invariant.value 字段里的
5:  *       MD 链接，构建反向索引（target Domain → 哪些 source Domain 的哪些 term 引用了它）。
6:  *
7:  * 不参与 DAG 校验，仅作 backlinks 展示用途（oxn domain show 时显示）。
8:  *
9:  * 设计要点：
10:  *   - 链接语法：标准 markdown `[`text`](./oxn-domain.md#anchor)`
11:  *   - 只索引 ## Terms / ## Bans / ## Invariants 下的 H3 term 描述里的链接
12:  *   - 一个 source Domain 可有多个 link，每个 link 是独立的 Backlink 记录
13:  *
14:  * L0–L3 兼容性：
15:  *   - L1-OXL 层
16:  *   - 不感知 fs 路径（由调用方传入 file content）
17:  *   - 不感知 OpenXenon Kernel
18:  */
19: 
20: import type { Root, Link, Heading, Text } from 'mdast'
21: import { visit } from 'unist-util-visit'
22: 
23: // =============================================================================
24: // 类型定义
25: // =============================================================================
26: 
27: /** 单个反向链接记录 */
28: export interface Backlink {
29:   /** 引用方 Domain 文件相对路径（如 'oxn-work-domain.md'）*/
30:   sourceFile: string
31:   /** 引用方 Domain 名（来自 frontmatter name）*/
32:   sourceDomain: string
33:   /** 链接所在的 H3 term 名（如 'Work'）*/
34:   sourceTerm: string
35:   /** 链接文本（如 'oxn-work-domain'）*/
36:   linkText: string
37:   /** 链接 target URL（如 './oxn-work-domain.md#work'）*/
38:   linkUrl: string
39: }
40: 
41: /** 反向链接索引：targetDomainFile → Backlink[] */
42: export type BacklinkIndex = Map<string, Backlink[]>
43: 
44: // =============================================================================
45: // 链接提取
46: // =============================================================================
47: 
48: /**
49:  * 从单个 .md 文件提取所有 term 描述字段里的 MD 链接
50:  *
51:  * 提取规则：
52:  *   - 只看 ## Terms / ## Bans / ## Invariants 下的 H3 term
53:  *   - 每个 H3 下的 paragraph 子节点（term.desc 内容）
54:  *   - 链接 target 必须以 .md 结尾（含 #anchor 形式）
55:  */
56: export function extractMdLinksFromDomain(
57:   content: string,
58:   parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
59: ): Omit<Backlink, 'sourceFile'>[] {
60:   const { tree, frontmatter } = parseMarkdown(content)
61:   const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'
62: 
63:   const results: Omit<Backlink, 'sourceFile'>[] = []
64: 
65:   visit(tree, 'heading', (node) => {
66:     const h = node as Heading
67:     if (h.depth !== 3) return
68: 
69:     // 该 H3 的父 H2 必须是 Terms/Bans/Invariants 之一
70:     const h2Parent = findParentH2(tree, h)
71:     if (!h2Parent) return
72: 
73:     const h3Name = headingText(h)
74:     if (!h3Name) return
75: 
76:     // 从 H3 后开始，向后遍历兄弟节点直到下一个 heading
77:     const children = tree.children
78:     const h3Idx = children.indexOf(h)
79:     if (h3Idx === -1) return
80: 
81:     for (let i = h3Idx + 1; i < children.length; i++) {
82:       const sib = children[i]
83:       if (!sib) continue
84:       if (sib.type === 'heading') break
85:       collectLinksFromNode(sib, results, h3Name, sourceDomain)
86:     }
87:   })
88: 
89:   return results
90: }
91: 
92: /** 找 heading 的父 H2（只允许 Terms / Bans / Invariants） */
93: function findParentH2(tree: Root, target: Heading): Heading | null {
94:   const children = tree.children
95:   const targetIdx = children.indexOf(target)
96:   if (targetIdx === -1) return null
97: 
98:   for (let i = targetIdx - 1; i >= 0; i--) {
99:     const c = children[i]
100:     if (c?.type !== 'heading') continue
101:     const h = c as Heading
102:     if (h.depth === 2) {
103:       const text = headingText(h)
104:       if (
105:         text === 'Terms' ||
106:         text.startsWith('Terms:') ||
107:         text === 'Bans' ||
108:         text.startsWith('Bans:') ||
109:         text === 'Invariants' ||
110:         text.startsWith('Invariants:')
111:       ) {
112:         return h
113:       }
114:       return null
115:     }
116:   }
117:   return null
118: }
119: 
120: /**
121:  * Inline 递归遍历节点找所有 link（避免嵌套 visit 的状态污染问题）
122:  * 一个 listItem > paragraph 内的 link 也算 term.desc 的一部分
123:  */
124: function collectLinksFromNode(
125:   node: unknown,
126:   results: Omit<Backlink, 'sourceFile'>[],
127:   h3Name: string,
128:   sourceDomain: string,
129: ): void {
130:   const n = node as { type?: string; children?: unknown[]; url?: string }
131:   if (!n || typeof n !== 'object') return
132:   if (n.type === 'link' && typeof n.url === 'string' && isMdLink(n.url)) {
133:     const linkNode = n as unknown as Link
134:     const text = collectLinkText(linkNode)
135:     results.push({
136:       sourceDomain,
137:       sourceTerm: h3Name,
138:       linkText: text,
139:       linkUrl: n.url,
140:     })
141:   }
142:   if (Array.isArray(n.children)) {
143:     for (const child of n.children) {
144:       collectLinksFromNode(child, results, h3Name, sourceDomain)
145:     }
146:   }
147: }
148: 
149: /** 判断 URL 是否指向 .md 文件（剥离 #anchor 后检查） */
150: function isMdLink(url: string): boolean {
151:   const withoutAnchor = url.split('#')[0] ?? url
152:   return withoutAnchor.endsWith('.md')
153: }
154: 
155: /** 提取 heading 文本 */
156: function headingText(h: Heading): string {
157:   return (h.children ?? [])
158:     .filter((c): c is Text => c.type === 'text')
159:     .map((c) => c.value)
160:     .join('')
161:     .trim()
162: }
163: 
164: /** 收集 link 节点的文本内容 */
165: function collectLinkText(link: Link): string {
166:   return (link.children ?? [])
167:     .filter((c): c is Text => c.type === 'text')
168:     .map((c) => c.value)
169:     .join('')
170:     .trim()
171: }
172: 
173: /**
174:  * 从链接 URL 提取目标文件 basename（作为 index key）
175:  *
176:  * 例：
177:  *   './oxn-domain.md#work' → 'oxn-domain.md'
178:  *   '../../assets/domains/oxn-domain.md' → 'oxn-domain.md'
179:  *   'oxn-engine-domain.md' → 'oxn-engine-domain.md'
180:  *
181:  * v0.7 假设 Domain 文件平铺在 .openxenon/assets/domains/ 下，basename 唯一
182:  * （如有目录嵌套需扩展此函数做完整路径规范化）
183:  */
184: export function normalizeLinkTarget(url: string): string {
185:   const hashIdx = url.indexOf('#')
186:   const withoutAnchor = hashIdx === -1 ? url : url.slice(0, hashIdx)
187:   // 提取 basename（最后一段路径分量）
188:   const segments = withoutAnchor.split('/')
189:   const basename = segments[segments.length - 1] ?? ''
190:   return basename.trim()
191: }
192: 
193: // =============================================================================
194: // 反向索引构建
195: // =============================================================================
196: 
197: /**
198:  * 从多个 Domain 文件内容构建反向链接索引
199:  *
200:  * @param entries 每个元素是 { filePath, content } — filePath 用于 sourceFile 字段
201:  * @param parseMarkdown md-pipeline 提供的 parseMarkdown 函数
202:  * @returns Map<targetDomainFile, Backlink[]>
203:  */
204: export function buildBacklinkIndex(
205:   entries: Array<{ filePath: string; content: string }>,
206:   parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
207: ): BacklinkIndex {
208:   const index: BacklinkIndex = new Map()
209: 
210:   for (const { filePath, content } of entries) {
211:     const links = extractMdLinksFromDomain(content, parseMarkdown)
212:     for (const link of links) {
213:       const target = normalizeLinkTarget(link.linkUrl)
214:       const backlink: Backlink = {
215:         sourceFile: filePath,
216:         sourceDomain: link.sourceDomain,
217:         sourceTerm: link.sourceTerm,
218:         linkText: link.linkText,
219:         linkUrl: link.linkUrl,
220:       }
221:       const arr = index.get(target) ?? []
222:       arr.push(backlink)
223:       index.set(target, arr)
224:     }
225:   }
226: 
227:   return index
228: }

(End of file - total 228 lines)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 3.3s)

_Thinking:_

Now I need to refactor backlinks.ts to support bidirectional scanning:
1. sub→root reverse via references frontmatter
2. root→sub reverse via desc MD link

Let me look at the current callsites to understand how this is wired in.

**Tool: grep**

**Input:**
```json
{
  "pattern": "buildBacklinkIndex|extractMdLinksFromDomain",
  "path": "/Users/issac/pro/openxenon/packages",
  "include": "*.ts"
}
```

**Output:**
```
Found 19 matches
/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts:
  Line 15: import { buildBacklinkIndex } from '@openxenon/engine/oxl/md-pipeline/backlinks.js'

  Line 417:     const backlinkIndex = buildBacklinkIndex(allEntries, parseMarkdown)

  Line 420:     // 当前 Domain 的 outbound links：让 buildBacklinkIndex 只看 current file

  Line 423:     const outLinkIndex = buildBacklinkIndex([{ filePath: 'self', content: currentContent }], parseMarkdown)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts:
  Line 110:   extractMdLinksFromDomain,

  Line 111:   buildBacklinkIndex,


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts:
  Line 7: import { extractMdLinksFromDomain, buildBacklinkIndex, normalizeLinkTarget } from '../backlinks'

  Line 56:   describe('extractMdLinksFromDomain', () => {

  Line 58:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)

  Line 70:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)

  Line 77:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)

  Line 85:       const links = extractMdLinksFromDomain(sampleDomain2, parseMarkdown)

  Line 101:       const links = extractMdLinksFromDomain(content, parseMarkdown)

  Line 108:   describe('buildBacklinkIndex', () => {

  Line 110:       const index = buildBacklinkIndex(

  Line 143:       const index = buildBacklinkIndex([{ filePath: 'empty.md', content }], parseMarkdown)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts:
  Line 56: export function extractMdLinksFromDomain(

  Line 204: export function buildBacklinkIndex(

  Line 211:     const links = extractMdLinksFromDomain(content, parseMarkdown)

```

---

## Assistant (Build · MiniMax-M3 · 3.2s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts",
  "offset": 395,
  "limit": 50
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts</path>
<type>file</type>
<content>
395:       return outputUserInputError('OXN_FILE_NOT_FOUND', `domain file not found: ${filePath}`, {
396:         suggestion: 'use `oxn domain list` to see registered domains',
397:         format,
398:       })
399:     }
400: 
401:     const result = await validateDomainFile(filePath)
402:     if (!result.ok || !result.ir) {
403:       return outputError(
404:         {
405:           code: 'OXN_DOMAIN_INVALID',
406:           message: result.errors.join('; '),
407:         },
408:         format,
409:       )
410:     }
411: 
412:     const ir = result.ir
413:     const fileName = basename(filePath)
414: 
415:     // 构建 backlinks 索引（扫所有 Domain 文件）
416:     const allEntries = collectAllDomainEntries(domainsDir)
417:     const backlinkIndex = buildBacklinkIndex(allEntries, parseMarkdown)
418:     const backlinks = backlinkIndex.get(fileName) ?? []
419: 
420:     // 当前 Domain 的 outbound links：让 buildBacklinkIndex 只看 current file
421:     // （Map 的 key = target Domain，value = current Domain 的引用记录）
422:     const currentContent = readFileSync(filePath, 'utf-8')
423:     const outLinkIndex = buildBacklinkIndex([{ filePath: 'self', content: currentContent }], parseMarkdown)
424:     const outLinks = new Set<string>(outLinkIndex.keys())
425: 
426:     // 按 sourceDomain 分组的 backlinks 列表
427:     const referencedBy = Array.from(new Set(backlinks.map((b) => b.sourceDomain)))
428: 
429:     output(
430:       {
431:         ok: true,
432:         data: {
433:           name: ir.name,
434:           file: fileName,
435:           description: ir.description,
436:           terms: ir.terms.length,
437:           termsByGroup: ir.terms.reduce<Record<string, number>>((acc, t) => {
438:             const g = t.group ?? '__default__'
439:             acc[g] = (acc[g] ?? 0) + 1
440:             return acc
441:           }, {}),
442:           bans: ir.bans.length,
443:           invariants: ir.invariants.length,
444:           backlinks: backlinks.map((b) => ({

(Showing lines 395-444 of 826. Use offset=445 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 2.7s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts</path>
<type>file</type>
<content>
1: /**
2:  * md-pipeline/__tests__/backlinks.test.ts — v0.7 ADR-0059 backlinks 引擎测试
3:  */
4: 
5: import { describe, expect, test } from 'bun:test'
6: import { parseMarkdown } from '../utils'
7: import { extractMdLinksFromDomain, buildBacklinkIndex, normalizeLinkTarget } from '../backlinks'
8: 
9: const sampleDomain1 = `---
10: entity: domain
11: version: 0.3.0
12: name: OxnWorkDomain
13: ---
14: 
15: # Domain: OxnWorkDomain
16: 
17: ## Terms: Work
18: 
19: ### Work
20: - desc: 人机协作的工作空间。root 抽象定义见 [\`oxn-domain\`](../../assets/domains/oxn-domain.md#work)。
21: 
22: ### Task
23: - desc: Align 执行单元。无外部链接。
24: 
25: ### Slot
26: - desc: Blueprint 内拓扑节点。详见 [\`oxn-domain\`](../../assets/domains/oxn-domain.md) 与 [\`oxn-engine-domain\`](./oxn-engine-domain.md)。
27: `
28: 
29: const sampleDomain2 = `---
30: entity: domain
31: version: 0.3.0
32: name: OxnProofDomain
33: ---
34: 
35: # Domain: OxnProofDomain
36: 
37: ## Terms
38: 
39: ### Probe
40: - desc: 物理观测单元。详见 [\`oxn-work-domain.Probe\`](./oxn-work-domain.md#probe)。
41: `
42: 
43: describe('md-pipeline/backlinks', () => {
44:   describe('normalizeLinkTarget', () => {
45:     test('removes #anchor', () => {
46:       expect(normalizeLinkTarget('./foo.md#bar')).toBe('foo.md')
47:     })
48:     test('removes ./ prefix', () => {
49:       expect(normalizeLinkTarget('./foo.md')).toBe('foo.md')
50:     })
51:     test('keeps plain file', () => {
52:       expect(normalizeLinkTarget('foo.md')).toBe('foo.md')
53:     })
54:   })
55: 
56:   describe('extractMdLinksFromDomain', () => {
57:     test('extracts links from term.desc', () => {
58:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)
59:       // Work term: 1 link (oxn-domain.md#work)
60:       // Task term: 0 links
61:       // Slot term: 2 links (oxn-domain.md, oxn-engine-domain.md)
62:       expect(links.length).toBe(3)
63:       const urls = links.map((l) => l.linkUrl)
64:       expect(urls).toContain('../../assets/domains/oxn-domain.md#work')
65:       expect(urls).toContain('../../assets/domains/oxn-domain.md')
66:       expect(urls).toContain('./oxn-engine-domain.md')
67:     })
68: 
69:     test('records sourceDomain from frontmatter', () => {
70:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)
71:       for (const link of links) {
72:         expect(link.sourceDomain).toBe('OxnWorkDomain')
73:       }
74:     })
75: 
76:     test('records sourceTerm (the H3 term)', () => {
77:       const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)
78:       const workLinks = links.filter((l) => l.sourceTerm === 'Work')
79:       const slotLinks = links.filter((l) => l.sourceTerm === 'Slot')
80:       expect(workLinks.length).toBe(1)
81:       expect(slotLinks.length).toBe(2)
82:     })
83: 
84:     test('extracts from ## Terms without suffix', () => {
85:       const links = extractMdLinksFromDomain(sampleDomain2, parseMarkdown)
86:       expect(links.length).toBe(1)
87:       expect(links[0]?.sourceTerm).toBe('Probe')
88:       expect(links[0]?.linkUrl).toBe('./oxn-work-domain.md#probe')
89:     })
90: 
91:     test('ignores non-.md links', () => {
92:       const content = `---
93: name: FooDomain
94: ---
95: 
96: ## Terms
97: 
98: ### Bar
99: - desc: Has [external](https://example.com) and [relative](./other.md) and [anchor](#x) links.
100: `
101:       const links = extractMdLinksFromDomain(content, parseMarkdown)
102:       // 只有 ./other.md 应该被识别（https 和 #anchor 不以 .md 结尾）
103:       expect(links.length).toBe(1)
104:       expect(links[0]?.linkUrl).toBe('./other.md')
105:     })
106:   })
107: 
108:   describe('buildBacklinkIndex', () => {
109:     test('builds inverted index from multiple files', () => {
110:       const index = buildBacklinkIndex(
111:         [
112:           { filePath: 'oxn-work-domain.md', content: sampleDomain1 },
113:           { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },
114:         ],
115:         parseMarkdown,
116:       )
117: 
118:       // oxn-domain.md 应被 oxn-work-domain 引用 2 次（Work + Slot 的两条）
119:       const oxnDomainBacklinks = index.get('oxn-domain.md') ?? []
120:       expect(oxnDomainBacklinks.length).toBe(2)
121:       expect(oxnDomainBacklinks.every((b) => b.sourceFile === 'oxn-work-domain.md')).toBe(true)
122: 
123:       // oxn-engine-domain.md 应被 oxn-work-domain 引用 1 次
124:       const engineBacklinks = index.get('oxn-engine-domain.md') ?? []
125:       expect(engineBacklinks.length).toBe(1)
126: 
127:       // oxn-work-domain.md 应被 oxn-proof-domain 引用 1 次（Probe term 提到）
128:       const workBacklinks = index.get('oxn-work-domain.md') ?? []
129:       expect(workBacklinks.length).toBe(1)
130:       expect(workBacklinks[0]?.sourceFile).toBe('oxn-proof-domain.md')
131:     })
132: 
133:     test('returns empty index for files with no outbound links', () => {
134:       const content = `---
135: name: EmptyDomain
136: ---
137: 
138: ## Terms
139: 
140: ### Foo
141: - desc: No links here.
142: `
143:       const index = buildBacklinkIndex([{ filePath: 'empty.md', content }], parseMarkdown)
144:       expect(index.size).toBe(0)
145:     })
146:   })
147: })

(End of file - total 147 lines)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 7.3s)

_Thinking:_

Now I understand the existing structure. Let me extend the backlinks.ts to also support references-based backlinks. I'll add a new function `extractReferencesBacklinks` that builds backlinks from references frontmatter, and integrate it into `buildBacklinkIndex`.

The approach:
1. Keep `extractMdLinksFromDomain` and `buildBacklinkIndex` for MD-link based backlinks (root→sub)
2. Add a new function `extractReferencesBacklinks` that scans references frontmatter → builds backlinks (sub→root reverse)
3. Combine both in `buildBacklinkIndex` to produce union

Let me design this:

```typescript
/** Backlink from references frontmatter */
export interface ReferencesBacklink {
  sourceFile: string
  sourceDomain: string
  sourceReferences: string[]  // the references list
}

/** Extract references-based backlinks from a Domain file */
export function extractReferencesBacklinks(
  content: string,
  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },
): ReferencesBacklink[]
```

And update `buildBacklinkIndex` to handle both. Actually, since both produce different shapes (MD link has sourceTerm, references doesn't), maybe better to keep two separate indexes and merge at the consumer (CLI command) level.

Or we can unify by making Backlink have an optional `sourceTerm` field. Let me look at how the CLI uses it.

Looking at domain.ts:
- `backlinks` is consumed at line 444 onwards — letme see the output format

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts",
  "offset": 444,
  "limit": 60
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts</path>
<type>file</type>
<content>
444:           backlinks: backlinks.map((b) => ({
445:             sourceFile: b.sourceFile,
446:             sourceDomain: b.sourceDomain,
447:             sourceTerm: b.sourceTerm,
448:           })),
449:           referencedBy,
450:           outLinks: Array.from(outLinks),
451:         },
452:         human: formatShowHuman(ir.name, fileName, ir, backlinks, referencedBy, outLinks),
453:       },
454:       format,
455:     )
456:   },
457: })
458: 
459: function formatShowHuman(
460:   name: string,
461:   file: string,
462:   ir: import('@openxenon/engine/oxl/md-pipeline/transformers/domain').DomainIR,
463:   backlinks: import('@openxenon/engine/oxl/md-pipeline/backlinks').Backlink[],
464:   referencedBy: string[],
465:   outLinks: Set<string>,
466: ): string {
467:   const lines: string[] = []
468:   lines.push(`Domain: ${name}`)
469:   lines.push(`File:   ${file}`)
470:   if (ir.description) lines.push(`Desc:   ${ir.description}`)
471:   lines.push('')
472:   lines.push(`Counts:`)
473:   lines.push(`  Terms:      ${ir.terms.length}`)
474:   lines.push(`  Bans:       ${ir.bans.length}`)
475:   lines.push(`  Invariants: ${ir.invariants.length}`)
476: 
477:   // 术语分组
478:   const groups = new Map<string, string[]>()
479:   for (const t of ir.terms) {
480:     const g = t.group ?? '(no group)'
481:     const arr = groups.get(g) ?? []
482:     arr.push(t.name)
483:     groups.set(g, arr)
484:   }
485:   if (groups.size > 0) {
486:     lines.push('')
487:     lines.push(`Term groups:`)
488:     for (const [g, terms] of groups) {
489:       lines.push(`  ${g}: ${terms.join(', ')}`)
490:     }
491:   }
492: 
493:   // Outgoing links
494:   if (outLinks.size > 0) {
495:     lines.push('')
496:     lines.push(`Terms linking out: ${outLinks.size}`)
497:     for (const url of outLinks) {
498:       lines.push(`  → ${url}`)
499:     }
500:   }
501: 
502:   // Backlinks（v0.7 ADR-0059: 自动计算的反向索引）
503:   lines.push('')

(Showing lines 444-503 of 826. Use offset=504 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 2.5s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts",
  "offset": 503,
  "limit": 35
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts</path>
<type>file</type>
<content>
503:   lines.push('')
504:   lines.push(`Referenced by (${referencedBy.length} unique source Domain${referencedBy.length === 1 ? '' : 's'}):`)
505:   if (backlinks.length === 0) {
506:     lines.push(`  (none — this Domain is not linked by any other Domain)`)
507:   } else {
508:     // 按 sourceDomain 分组
509:     const bySource = new Map<string, string[]>()
510:     for (const bl of backlinks) {
511:       const arr = bySource.get(bl.sourceDomain) ?? []
512:       arr.push(bl.sourceTerm)
513:       bySource.set(bl.sourceDomain, arr)
514:     }
515:     for (const [src, terms] of bySource) {
516:       lines.push(`  ${src} (${terms.length}):`)
517:       for (const t of terms) lines.push(`    - ${t}`)
518:     }
519:   }
520: 
521:   return lines.join('\n')
522: }
523: 
524: // ---------------------------------------------------------------------------
525: // Subcommand: list
526: // ---------------------------------------------------------------------------
527: const listSubcommand = defineCommand({
528:   meta: {
529:     name: 'list',
530:     description: t('domain.list.description'),
531:   },
532:   args: {
533:     '--json': { type: 'boolean', description: t('format.json') },
534:     '--yaml': { type: 'boolean', description: t('format.yaml') },
535:   },
536:   async run(ctx) {
537:     const format = getFormatFromArgs(ctx.args as Record<string, unknown>)

(Showing lines 503-537 of 826. Use offset=538 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 16.0s)

_Thinking:_

Now I understand the full picture. I need to:

1. Extend `backlinks.ts` to also extract references-based backlinks
2. The Backlink interface needs an optional `viaReferences: boolean` flag to indicate which kind it is
3. Update `buildBacklinkIndex` to merge both
4. Update CLI `formatShowHuman` to display the new info

Let me design the change minimally:

```typescript
export interface Backlink {
  sourceFile: string
  sourceDomain: string
  sourceTerm?: string  // optional for references-based
  linkText?: string   // optional for references-based
  linkUrl?: string    // optional for references-based
  viaReferences?: string[]  // for references-based: which domain names
}
```

Actually, let me create a cleaner approach. Keep the existing Backlink type for MD-link based, and add a new ReferencesBacklink type. The CLI combines them.

Or even simpler: make `Backlink.sourceTerm` optional, and add a new optional `viaReferences: string[]` field. The CLI deduplicates by sourceDomain and shows accordingly.

Let me implement.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts",
  "oldString": "/**\n * md-pipeline/backlinks.ts — v0.7 ADR-0059 backlinks 引擎\n *\n * 角色：扫描所有 Domain .md 文件的 term.desc / ban.desc / invariant.value 字段里的\n *       MD 链接，构建反向索引（target Domain → 哪些 source Domain 的哪些 term 引用了它）。\n *\n * 不参与 DAG 校验，仅作 backlinks 展示用途（oxn domain show 时显示）。\n *\n * 设计要点：\n *   - 链接语法：标准 markdown `[`text`](./oxn-domain.md#anchor)`\n *   - 只索引 ## Terms / ## Bans / ## Invariants 下的 H3 term 描述里的链接\n *   - 一个 source Domain 可有多个 link，每个 link 是独立的 Backlink 记录\n *\n * L0–L3 兼容性：\n *   - L1-OXL 层\n *   - 不感知 fs 路径（由调用方传入 file content）\n *   - 不感知 OpenXenon Kernel\n */\n\nimport type { Root, Link, Heading, Text } from 'mdast'\nimport { visit } from 'unist-util-visit'\n\n// =============================================================================\n// 类型定义\n// =============================================================================\n\n/** 单个反向链接记录 */\nexport interface Backlink {\n  /** 引用方 Domain 文件相对路径（如 'oxn-work-domain.md'）*/\n  sourceFile: string\n  /** 引用方 Domain 名（来自 frontmatter name）*/\n  sourceDomain: string\n  /** 链接所在的 H3 term 名（如 'Work'）*/\n  sourceTerm: string\n  /** 链接文本（如 'oxn-work-domain'）*/\n  linkText: string\n  /** 链接 target URL（如 './oxn-work-domain.md#work'）*/\n  linkUrl: string\n}\n\n/** 反向链接索引：targetDomainFile → Backlink[] */\nexport type BacklinkIndex = Map<string, Backlink[]>",
  "newString": "/**\n * md-pipeline/backlinks.ts — v0.7 ADR-0059 + ADR-0060 backlinks 引擎\n *\n * 角色：扫描所有 Domain .md 文件，构建反向索引（target Domain → 哪些 source Domain 引用了它）。\n *       双向扫描（v0.7.1）：\n *         1. sub → root 反向：扫描子 Domain 的 references frontmatter\n *         2. root → sub 反向：扫描 root Domain desc 内 MD link\n *       不参与 DAG 校验，仅作 backlinks 展示用途（oxn domain show 时显示）。\n *\n * 设计要点：\n *   - MD link 语法：标准 markdown `[`text`](./oxn-domain.md#anchor)`\n *   - references frontmatter：YAML `references: [oxn-domain, oxn-engine-domain]`\n *   - references → MD link 名称映射：references 元素（如 'oxn-engine-domain'）映射到\n *     对应的 Domain 文件 basename（如 'oxn-engine-domain.md'）\n *\n * L0–L3 兼容性：\n *   - L1-OXL 层\n *   - 不感知 fs 路径（由调用方传入 file content）\n *   - 不感知 OpenXenon Kernel\n */\n\nimport type { Root, Link, Heading, Text } from 'mdast'\nimport { visit } from 'unist-util-visit'\n\n// =============================================================================\n// 类型定义\n// =============================================================================\n\n/** 单个反向链接记录 */\nexport interface Backlink {\n  /** 引用方 Domain 文件相对路径（如 'oxn-work-domain.md'）*/\n  sourceFile: string\n  /** 引用方 Domain 名（来自 frontmatter name）*/\n  sourceDomain: string\n  /** 链接所在的 H3 term 名（如 'Work'）—— 仅 MD link 类 backlink 有值 */\n  sourceTerm?: string\n  /** 链接文本（如 'oxn-work-domain'）—— 仅 MD link 类有值 */\n  linkText?: string\n  /** 链接 target URL（如 './oxn-work-domain.md#work'）—— 仅 MD link 类有值 */\n  linkUrl?: string\n  /** 来源类型 */\n  source: 'md-link' | 'references-frontmatter'\n  /** references 来源——若 source = references-frontmatter，记录引用了哪些 Domain 名（key 形式） */\n  references?: string[]\n}\n\n/** 反向链接索引：targetDomainFile → Backlink[] */\nexport type BacklinkIndex = Map<string, Backlink[]>"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 13.7s)

现在添加 references-frontmatter 提取 + 改 buildBacklinkIndex 为双向 union：

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts",
  "oldString": "/**\n * 从单个 .md 文件提取所有 term 描述字段里的 MD 链接\n *\n * 提取规则：\n *   - 只看 ## Terms / ## Bans / ## Invariants 下的 H3 term\n *   - 每个 H3 下的 paragraph 子节点（term.desc 内容）\n *   - 链接 target 必须以 .md 结尾（含 #anchor 形式）\n */\nexport function extractMdLinksFromDomain(\n  content: string,\n  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },\n): Omit<Backlink, 'sourceFile'>[] {\n  const { tree, frontmatter } = parseMarkdown(content)\n  const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'\n\n  const results: Omit<Backlink, 'sourceFile'>[] = []\n\n  visit(tree, 'heading', (node) => {\n    const h = node as Heading\n    if (h.depth !== 3) return\n\n    // 该 H3 的父 H2 必须是 Terms/Bans/Invariants 之一\n    const h2Parent = findParentH2(tree, h)\n    if (!h2Parent) return\n\n    const h3Name = headingText(h)\n    if (!h3Name) return\n\n    // 从 H3 后开始，向后遍历兄弟节点直到下一个 heading\n    const children = tree.children\n    const h3Idx = children.indexOf(h)\n    if (h3Idx === -1) return\n\n    for (let i = h3Idx + 1; i < children.length; i++) {\n      const sib = children[i]\n      if (!sib) continue\n      if (sib.type === 'heading') break\n      collectLinksFromNode(sib, results, h3Name, sourceDomain)\n    }\n  })\n\n  return results\n}",
  "newString": "/**\n * 从单个 .md 文件提取所有 term 描述字段里的 MD 链接\n *\n * 提取规则：\n *   - 只看 ## Terms / ## Bans / ## Invariants 下的 H3 term\n *   - 每个 H3 下的 paragraph 子节点（term.desc 内容）\n *   - 链接 target 必须以 .md 结尾（含 #anchor 形式）\n *\n * 返回的 backlink source = 'md-link'，含 sourceTerm。\n */\nexport function extractMdLinksFromDomain(\n  content: string,\n  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },\n): Omit<Backlink, 'sourceFile'>[] {\n  const { tree, frontmatter } = parseMarkdown(content)\n  const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'\n\n  const results: Omit<Backlink, 'sourceFile'>[] = []\n\n  visit(tree, 'heading', (node) => {\n    const h = node as Heading\n    if (h.depth !== 3) return\n\n    // 该 H3 的父 H2 必须是 Terms/Bans/Invariants 之一\n    const h2Parent = findParentH2(tree, h)\n    if (!h2Parent) return\n\n    const h3Name = headingText(h)\n    if (!h3Name) return\n\n    // 从 H3 后开始，向后遍历兄弟节点直到下一个 heading\n    const children = tree.children\n    const h3Idx = children.indexOf(h)\n    if (h3Idx === -1) return\n\n    for (let i = h3Idx + 1; i < children.length; i++) {\n      const sib = children[i]\n      if (!sib) continue\n      if (sib.type === 'heading') break\n      collectLinksFromNode(sib, results, h3Name, sourceDomain)\n    }\n  })\n\n  return results\n}\n\n/**\n * 从单个 .md 文件的 frontmatter 提取 references 字段，构建 backlinks 记录。\n *\n * ADR-0059 §D1: references 是 sub→root DAG 表达。我对它求反向：扫描每个文件的\n * references 列表，对每个被引 Domain 建一条 backlink。\n *\n * 返回的 backlink source = 'references-frontmatter'，不含 sourceTerm（精度到 Domain 级）。\n *\n * 例：\n *   oxn-work-domain.md frontmatter `references: [oxn-domain, oxn-engine-domain, oxn-asset-domain]`\n *   → 对 oxn-domain.md / oxn-engine-domain.md / oxn-asset-domain.md 各建 1 条 backlink\n *     { source: 'references-frontmatter', references: ['oxn-domain', 'oxn-engine-domain', 'oxn-asset-domain'] }\n */\nexport function extractReferencesBacklinks(\n  content: string,\n  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },\n): Omit<Backlink, 'sourceFile'>[] {\n  const { frontmatter } = parseMarkdown(content)\n  const sourceDomain = typeof frontmatter.name === 'string' ? frontmatter.name : '<unknown>'\n  const refs = frontmatter.references\n\n  if (!Array.isArray(refs) || refs.length === 0) {\n    return []\n  }\n\n  const refList = refs.filter((r): r is string => typeof r === 'string' && r.length > 0)\n\n  return refList.map((refKey) => ({\n    sourceDomain,\n    source: 'references-frontmatter' as const,\n    references: [refKey],\n  }))\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 6.4s)

现在需要更新 `collectLinksFromNode` 的 source 字段 + `buildBacklinkIndex` 双向 union：

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts",
  "oldString": "/**\n * Inline 递归遍历节点找所有 link（避免嵌套 visit 的状态污染问题）\n * 一个 listItem > paragraph 内的 link 也算 term.desc 的一部分\n */\nfunction collectLinksFromNode(\n  node: unknown,\n  results: Omit<Backlink, 'sourceFile'>[],\n  h3Name: string,\n  sourceDomain: string,\n): void {\n  const n = node as { type?: string; children?: unknown[]; url?: string }\n  if (!n || typeof n !== 'object') return\n  if (n.type === 'link' && typeof n.url === 'string' && isMdLink(n.url)) {\n    const linkNode = n as unknown as Link\n    const text = collectLinkText(linkNode)\n    results.push({\n      sourceDomain,\n      sourceTerm: h3Name,\n      linkText: text,\n      linkUrl: n.url,\n    })\n  }\n  if (Array.isArray(n.children)) {\n    for (const child of n.children) {\n      collectLinksFromNode(child, results, h3Name, sourceDomain)\n    }\n  }\n}",
  "newString": "/**\n * Inline 递归遍历节点找所有 link（避免嵌套 visit 的状态污染问题）\n * 一个 listItem > paragraph 内的 link 也算 term.desc 的一部分\n */\nfunction collectLinksFromNode(\n  node: unknown,\n  results: Omit<Backlink, 'sourceFile'>[],\n  h3Name: string,\n  sourceDomain: string,\n): void {\n  const n = node as { type?: string; children?: unknown[]; url?: string }\n  if (!n || typeof n !== 'object') return\n  if (n.type === 'link' && typeof n.url === 'string' && isMdLink(n.url)) {\n    const linkNode = n as unknown as Link\n    const text = collectLinkText(linkNode)\n    results.push({\n      sourceDomain,\n      sourceTerm: h3Name,\n      linkText: text,\n      linkUrl: n.url,\n      source: 'md-link',\n    })\n  }\n  if (Array.isArray(n.children)) {\n    for (const child of n.children) {\n      collectLinksFromNode(child, results, h3Name, sourceDomain)\n    }\n  }\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 17.0s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/backlinks.ts",
  "oldString": "/**\n * 从多个 Domain 文件内容构建反向链接索引\n *\n * @param entries 每个元素是 { filePath, content } — filePath 用于 sourceFile 字段\n * @param parseMarkdown md-pipeline 提供的 parseMarkdown 函数\n * @returns Map<targetDomainFile, Backlink[]>\n */\nexport function buildBacklinkIndex(\n  entries: Array<{ filePath: string; content: string }>,\n  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },\n): BacklinkIndex {\n  const index: BacklinkIndex = new Map()\n\n  for (const { filePath, content } of entries) {\n    const links = extractMdLinksFromDomain(content, parseMarkdown)\n    for (const link of links) {\n      const target = normalizeLinkTarget(link.linkUrl)\n      const backlink: Backlink = {\n        sourceFile: filePath,\n        sourceDomain: link.sourceDomain,\n        sourceTerm: link.sourceTerm,\n        linkText: link.linkText,\n        linkUrl: link.linkUrl,\n      }\n      const arr = index.get(target) ?? []\n      arr.push(backlink)\n      index.set(target, arr)\n    }\n  }\n\n  return index\n}",
  "newString": "/**\n * 从多个 Domain 文件内容构建反向链接索引（双向 union）\n *\n * ADR-0059 §D3（2026-07-17 修订）+ ADR-0060 D8：双向扫描\n *   1. **sub → root 反向**：扫描每个 Domain 的 references frontmatter\n *   2. **root → sub 反向**：扫描每个 Domain desc 内的 MD link\n *   3. 两组 union 输出 backlinks 索引\n *\n * 两种 backlink 区分（Backlink.source 字段）：\n *   - 'md-link': 来自 desc MD link，含 sourceTerm 精度到 term 级\n *   - 'references-frontmatter': 来自 references frontmatter，精度到 Domain 级\n *\n * @param entries 每个元素是 { filePath, content } — filePath 用于 sourceFile 字段\n * @param parseMarkdown md-pipeline 提供的 parseMarkdown 函数\n * @returns Map<targetDomainFile, Backlink[]>\n */\nexport function buildBacklinkIndex(\n  entries: Array<{ filePath: string; content: string }>,\n  parseMarkdown: (s: string) => { tree: Root; frontmatter: Record<string, unknown> },\n): BacklinkIndex {\n  const index: BacklinkIndex = new Map()\n\n  /** 把 backlink 按 target file 入索引 */\n  function addToIndex(target: string, backlink: Backlink): void {\n    const arr = index.get(target) ?? []\n    arr.push(backlink)\n    index.set(target, arr)\n  }\n\n  // 第一遍：references frontmatter（sub → root 反向）\n  // 同时构建 references key → file basename 映射，用于把 'oxn-engine-domain'\n  // 转换为 'oxn-engine-domain.md' 作为索引 key。\n  const keyToFile = new Map<string, string>()\n  for (const { filePath, content } of entries) {\n    const { frontmatter } = parseMarkdown(content)\n    const name = typeof frontmatter.name === 'string' ? frontmatter.name : null\n    if (!name) continue\n    const fileBasename = filePath.split('/').pop() ?? filePath\n    // name 如 'OxnEngineDomain'，references 如 'oxn-engine-domain'\n    // 通过 file basename 推导 key：去掉 .md，加 '-domain' 后缀\n    const key = inferReferencesKey(fileBasename, name)\n    if (key) keyToFile.set(key, fileBasename)\n  }\n\n  for (const { filePath, content } of entries) {\n    const refBacklinks = extractReferencesBacklinks(content, parseMarkdown)\n    for (const rb of refBacklinks) {\n      const refs = rb.references ?? []\n      for (const refKey of refs) {\n        const target = keyToFile.get(refKey)\n        if (!target) continue\n        const backlink: Backlink = {\n          sourceFile: filePath,\n          sourceDomain: rb.sourceDomain,\n          source: 'references-frontmatter',\n          references: refs,\n        }\n        addToIndex(target, backlink)\n      }\n    }\n  }\n\n  // 第二遍：desc MD link（root → sub 反向）\n  for (const { filePath, content } of entries) {\n    const mdLinks = extractMdLinksFromDomain(content, parseMarkdown)\n    for (const link of mdLinks) {\n      if (!link.linkUrl) continue\n      const target = normalizeLinkTarget(link.linkUrl)\n      const backlink: Backlink = {\n        sourceFile: filePath,\n        sourceDomain: link.sourceDomain,\n        sourceTerm: link.sourceTerm,\n        linkText: link.linkText,\n        linkUrl: link.linkUrl,\n        source: 'md-link',\n      }\n      addToIndex(target, backlink)\n    }\n  }\n\n  return index\n}\n\n/**\n * 从 Domain 文件名推导 references 列表中的 key。\n *\n * Domain 文件命名约定：\n *   - oxn-engine-domain.md → references key 'oxn-engine-domain'\n *   - oxn-cli-domain.md → 'oxn-cli-domain'\n *\n * 推导规则：basename 去 .md 后缀即为 key（约定 references 元素与 basename 一致）。\n */\nfunction inferReferencesKey(basename: string, _name: string): string | null {\n  if (basename.endsWith('.md')) {\n    return basename.slice(0, -3)\n  }\n  return null\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 3.9s)

更新 index.ts exports：

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts",
  "oldString": "extractMdLinksFromDomain,\n\n  buildBacklinkIndex,",
  "newString": "extractMdLinksFromDomain,\n  extractReferencesBacklinks,\n  buildBacklinkIndex,"
}
```

**Error:**
```
Could not find oldString in the file. It must match exactly, including whitespace, indentation, and line endings.
```

---

## Assistant (Build · MiniMax-M3 · 3.0s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts"
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts</path>
<type>file</type>
<content>
1: /**
2:  * md-pipeline/index.ts — v0.4 PR-C1/C2/C3 unified-native 统一出口
3:  *
4:  * 角色：unified pipeline 编排 (把 md 字符串 → mdast → 处理 → 序列化)
5:  *   取代 src/oxl/md-bridge/pipeline.ts (hybrid unified + 自研)
6:  *
7:  * 关键不变量：
8:  *   - 不感知 fs (只接收 content 字符串)
9:  *   - 不感知 OpenXenon Kernel (只输出 mdast)
10:  *   - 失败抛 E_MD_INVALID_SYNTAX 错误 (与 v0.3.4 兼容)
11:  *
12:  * L0–L3 兼容性：
13:  *   - L1-OXL 层
14:  *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
15:  *
16:  * 迁移路径 (RFC §4 PR-C 序列)：
17:  *   - PR-C1: 基建 + utils.ts + utility functions ✓
18:  *   - PR-C2: 5 EntityCompilers → 5 unified transformer plugins ✓
19:  *   - PR-C3: mdast-validator → remark-canonical plugin ✓
20:  *   - PR-C4: 收口 — 删 driver-registry / extract-* / 切到 work.md ✓
21:  */
22: 
23: // --- utils (PR-C1) ---
24: export {
25:   collectHeadings,
26:   findFirstHeading,
27:   collectHeadingContexts,
28:   collectListFields,
29:   parseMarkdown,
30:   stringifyMarkdown,
31:   countNodes,
32:   extractYamlFromTree,
33:   // compat aliases (PR-C4 兼容 md-bridge 自研层 5 compilers)
34:   extractHeadingContexts,
35:   findH1,
36:   extractListFields,
37:   type CollectedHeading,
38:   type HeadingContext,
39:   type ListField,
40: } from './utils'
41: 
42: // --- transformers (PR-C2) ---
43: export {
44:   extractDomainIR,
45:   extractBlueprintIR,
46:   extractWorkIR,
47:   extractTaskIR,
48:   extractProofIR,
49:   remarkDomainExtractor,
50:   remarkBlueprintExtractor,
51:   remarkWorkExtractor,
52:   remarkTaskExtractor,
53:   remarkProofExtractor,
54:   DOMAIN_CATEGORIES,
55:   BLUEPRINT_CATEGORIES,
56:   WORK_CATEGORIES,
57:   TASK_CATEGORIES,
58:   type DomainCategory,
59:   type DomainIR,
60:   type DomainTerm,
61:   type DomainBan,
62:   type DomainInvariant,
63:   type DomainStackEntry,
64:   type BlueprintCategory,
65:   type BlueprintIR,
66:   type BlueprintProp,
67:   type BlueprintSlot,
68:   type WorkCategory,
69:   type WorkIR,
70:   type WorkContext,
71:   type WorkRef,
72:   type WorkTaskIR,
73:   type WorkPart,
74:   type TaskCategory,
75:   type TaskIR,
76:   type TaskPart,
77:   type TaskProbe,
78:   type ProofIR,
79:   type ProofProbeIR,
80: } from './transformers'
81: 
82: // --- plugins (PR-C3) ---
83: export {
84:   remarkCanonical,
85:   validateCanonical,
86:   ENTITY_H2_WHITELIST,
87:   VALID_ENTITIES,
88:   VALID_STATUS,
89:   type CanonicalErrorCode,
90:   type CanonicalIssue,
91:   type CanonicalResult,
92:   type RemarkCanonicalOptions,
93: } from './plugins/remark-canonical'
94: 
95: // --- sync-hash (v0.4 Phase 1: .oxn ↔ .md 同步元数据) ---
96: export {
97:   computeSha256,
98:   readSyncMetadata,
99:   writeSyncMetadata,
100:   composeSyncContent,
101:   readCacheSha,
102:   writeCacheSha,
103:   getCachePath,
104:   getCacheMdPath,
105:   type SyncMetadata,
106: } from './sync-hash'
107: 
108: // --- backlinks (v0.7 ADR-0059: MD 链接反向索引) ---
109: export {
110:   extractMdLinksFromDomain,
111:   buildBacklinkIndex,
112:   normalizeLinkTarget,
113:   type Backlink,
114:   type BacklinkIndex,
115: } from './backlinks'
116: 
117: // --- oxn-serializer (v0.4 Phase 2: IR → .oxn 反向编译, deprecated in v0.7) ---
118: // export { serializeDomainToOxn, serializeBlueprintToOxn, serializeWorkToOxn } from './oxn-serializer'

(End of file - total 118 lines)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 4.1s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts",
  "oldString": "// --- backlinks (v0.7 ADR-0059: MD 链接反向索引) ---\nexport {\n  extractMdLinksFromDomain,\n  buildBacklinkIndex,\n  normalizeLinkTarget,\n  type Backlink,\n  type BacklinkIndex,\n} from './backlinks'",
  "newString": "// --- backlinks (v0.7 ADR-0059 + ADR-0060: 双向 backlink 索引) ---\nexport {\n  extractMdLinksFromDomain,\n  extractReferencesBacklinks,\n  buildBacklinkIndex,\n  normalizeLinkTarget,\n  type Backlink,\n  type BacklinkIndex,\n} from './backlinks'"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 18.4s)

## P7.2 — backlinks.test.ts fixture 同步

**Tool: write**

**Input:**
```json
{
  "content": "/**\n * md-pipeline/__tests__/backlinks.test.ts — v0.7 ADR-0059 + ADR-0060 backlinks 引擎测试\n *\n * 双向扫描（2026-07-17 修订）：\n *   - sub → root 反向：references frontmatter\n *   - root → sub 反向：desc MD link\n */\n\nimport { describe, expect, test } from 'bun:test'\nimport { parseMarkdown } from '../utils'\nimport { extractMdLinksFromDomain, extractReferencesBacklinks, buildBacklinkIndex, normalizeLinkTarget } from '../backlinks'\n\nconst sampleDomain1 = `---\nentity: domain\nversion: 0.3.0\nname: OxnWorkDomain\nreferences:\n  - oxn-domain\n  - oxn-engine-domain\n  - oxn-asset-domain\n---\n\n# Domain: OxnWorkDomain\n\n## Terms: Work\n\n### Work\n- desc: 人机协作的工作空间。\n\n### Task\n- desc: Align 执行单元。无外部链接。\n\n### Slot\n- desc: Blueprint 内拓扑节点。\n`\n\nconst sampleDomain2 = `---\nentity: domain\nversion: 0.3.0\nname: OxnProofDomain\nreferences:\n  - oxn-domain\n  - oxn-engine-domain\n  - oxn-work-domain\n---\n\n# Domain: OxnProofDomain\n\n## Terms\n\n### Probe\n- desc: 物理观测单元。\n`\n\nconst sampleDomain3_root = `---\nentity: domain\nversion: 0.4.1\nname: OxnDomain\nreferences: []\n---\n\n# Domain: OxnDomain\n\n## Terms\n\n### OXN CLI\n- desc: OpenXenon 交互入口之一。具体领域见 [\\`oxn-cli-domain\\`](./oxn-cli-domain.md)。\n\n### OXN Engine\n- desc: OpenXenon 核心引擎。具体领域见 [\\`oxn-engine-domain\\`](./oxn-engine-domain.md)。\n`\n\ndescribe('md-pipeline/backlinks', () => {\n  describe('normalizeLinkTarget', () => {\n    test('removes #anchor', () => {\n      expect(normalizeLinkTarget('./foo.md#bar')).toBe('foo.md')\n    })\n    test('removes ./ prefix', () => {\n      expect(normalizeLinkTarget('./foo.md')).toBe('foo.md')\n    })\n    test('keeps plain file', () => {\n      expect(normalizeLinkTarget('foo.md')).toBe('foo.md')\n    })\n  })\n\n  describe('extractMdLinksFromDomain', () => {\n    test('extracts links from term.desc (root Domain sample)', () => {\n      const links = extractMdLinksFromDomain(sampleDomain3_root, parseMarkdown)\n      expect(links.length).toBe(2)\n      const urls = links.map((l) => l.linkUrl)\n      expect(urls).toContain('./oxn-cli-domain.md')\n      expect(urls).toContain('./oxn-engine-domain.md')\n      for (const link of links) {\n        expect(link.source).toBe('md-link')\n        expect(link.sourceDomain).toBe('OxnDomain')\n      }\n    })\n\n    test('sub Domain sample has no MD links (per ADR-0059 §D2 D2 约束)', () => {\n      const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)\n      expect(links.length).toBe(0)\n    })\n  })\n\n  describe('extractReferencesBacklinks', () => {\n    test('extracts references list from sub Domain', () => {\n      const backlinks = extractReferencesBacklinks(sampleDomain1, parseMarkdown)\n      expect(backlinks.length).toBe(3)\n      const refs = backlinks.flatMap((b) => b.references ?? [])\n      expect(refs).toContain('oxn-domain')\n      expect(refs).toContain('oxn-engine-domain')\n      expect(refs).toContain('oxn-asset-domain')\n      for (const bl of backlinks) {\n        expect(bl.source).toBe('references-frontmatter')\n        expect(bl.sourceDomain).toBe('OxnWorkDomain')\n      }\n    })\n\n    test('root Domain has empty references', () => {\n      const backlinks = extractReferencesBacklinks(sampleDomain3_root, parseMarkdown)\n      expect(backlinks.length).toBe(0)\n    })\n  })\n\n  describe('buildBacklinkIndex (双向 union)', () => {\n    test('sub → root 反向：扫描 references', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )\n\n      // oxn-domain.md 应被 oxn-work-domain + oxn-proof-domain 引用\n      const oxnDomainBacklinks = index.get('oxn-domain.md') ?? []\n      const sourceDomains = new Set(oxnDomainBacklinks.map((b) => b.sourceDomain))\n      expect(sourceDomains.has('OxnWorkDomain')).toBe(true)\n      expect(sourceDomains.has('OxnProofDomain')).toBe(true)\n      for (const bl of oxnDomainBacklinks) {\n        expect(bl.source).toBe('references-frontmatter')\n      }\n    })\n\n    test('root → sub 反向：扫描 desc MD link', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )\n\n      // oxn-cli-domain.md 应被 oxn-domain 通过 MD link 引用\n      const cliBacklinks = index.get('oxn-cli-domain.md') ?? []\n      expect(cliBacklinks.length).toBe(1)\n      expect(cliBacklinks[0]?.sourceDomain).toBe('OxnDomain')\n      expect(cliBacklinks[0]?.sourceTerm).toBe('OXN CLI')\n      expect(cliBacklinks[0]?.source).toBe('md-link')\n    })\n\n    test('双向 union：references 引用 + MD link 引用合并到同一索引', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )\n\n      // oxn-engine-domain.md 应同时被 3 个 Domain 引用：\n      //   - oxn-work-domain.references（含 oxn-engine-domain）\n      //   - oxn-proof-domain.references（含 oxn-engine-domain）\n      //   - oxn-domain.md desc MD link（指向 oxn-engine-domain.md）\n      const engineBacklinks = index.get('oxn-engine-domain.md') ?? []\n      const sources = new Set(engineBacklinks.map((b) => b.sourceDomain))\n      expect(sources.has('OxnWorkDomain')).toBe(true)\n      expect(sources.has('OxnProofDomain')).toBe(true)\n      expect(sources.has('OxnDomain')).toBe(true)\n\n      // 其中 1 条来自 MD link（OxnDomain），其余来自 references\n      const mdLinkCount = engineBacklinks.filter((b) => b.source === 'md-link').length\n      const refsCount = engineBacklinks.filter((b) => b.source === 'references-frontmatter').length\n      expect(mdLinkCount).toBe(1)\n      expect(refsCount).toBe(2)\n    })\n\n    test('returns empty index for files with no inbound links', () => {\n      const content = `---\nname: EmptyDomain\nreferences: []\n---\n\n## Terms\n\n### Foo\n- desc: No links here.\n`\n      const index = buildBacklinkIndex([{ filePath: 'empty.md', content }], parseMarkdown)\n      expect(index.size).toBe(0)\n    })\n  })\n})",
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts"
}
```

**Output:**
```
Wrote file successfully.
```

---

## Assistant (Build · MiniMax-M3 · 8.7s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3: CLI Domain ExitCode desc 精简",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7.1: backlinks.ts 双向扫描改造",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7.2: backlinks.test.ts fixture 同步",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "P8b: grep 最终确认",
      "status": "pending",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3: CLI Domain ExitCode desc 精简",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7.1: backlinks.ts 双向扫描改造",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7.2: backlinks.test.ts fixture 同步",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "P8b: grep 最终确认",
    "status": "pending",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 5.3s)

## P8 — 全链路验证

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== Typecheck ===\"\nbun run typecheck 2>&1 | tail -10",
  "timeout": 120000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== Typecheck ===
$ tsc --noEmit
packages/cli/src/commands/domain.ts(512,16): error TS2345: Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  Type 'undefined' is not assignable to type 'string'.

```

---

## Assistant (Build · MiniMax-M3 · 2.8s)

_Thinking:_

TypeScript error in domain.ts because I made sourceTerm optional. Let me look at thatcode.

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts",
  "offset": 505,
  "limit": 15
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts</path>
<type>file</type>
<content>
505:   if (backlinks.length === 0) {
506:     lines.push(`  (none — this Domain is not linked by any other Domain)`)
507:   } else {
508:     // 按 sourceDomain 分组
509:     const bySource = new Map<string, string[]>()
510:     for (const bl of backlinks) {
511:       const arr = bySource.get(bl.sourceDomain) ?? []
512:       arr.push(bl.sourceTerm)
513:       bySource.set(bl.sourceDomain, arr)
514:     }
515:     for (const [src, terms] of bySource) {
516:       lines.push(`  ${src} (${terms.length}):`)
517:       for (const t of terms) lines.push(`    - ${t}`)
518:     }
519:   }

(Showing lines 505-519 of 826. Use offset=520 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 5.9s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/cli/src/commands/domain.ts",
  "oldString": "// 按 sourceDomain 分组\n    const bySource = new Map<string, string[]>()\n    for (const bl of backlinks) {\n      const arr = bySource.get(bl.sourceDomain) ?? []\n      arr.push(bl.sourceTerm)\n      bySource.set(bl.sourceDomain, arr)\n    }\n    for (const [src, terms] of bySource) {\n      lines.push(`  ${src} (${terms.length}):`)\n      for (const t of terms) lines.push(`    - ${t}`)\n    }\n  }",
  "newString": "// 按 sourceDomain 分组，区分 md-link 与 references-frontmatter 来源\n    const bySource = new Map<string, { mdLinks: string[]; refsDomains: Set<string> }>()\n    for (const bl of backlinks) {\n      let entry = bySource.get(bl.sourceDomain)\n      if (!entry) {\n        entry = { mdLinks: [], refsDomains: new Set() }\n        bySource.set(bl.sourceDomain, entry)\n      }\n      if (bl.source === 'md-link' && bl.sourceTerm) {\n        entry.mdLinks.push(bl.sourceTerm)\n      } else if (bl.source === 'references-frontmatter') {\n        for (const refKey of bl.references ?? []) entry.refsDomains.add(refKey)\n      }\n    }\n    for (const [src, entry] of bySource) {\n      const total = entry.mdLinks.length + entry.refsDomains.size\n      lines.push(`  ${src} (${total} backlink${total === 1 ? '' : 's'}):`)\n      for (const t of entry.mdLinks) lines.push(`    - ${t} (via md-link)`)\n      for (const r of entry.refsDomains) lines.push(`    - <Domain via references> ← ${r}`)\n    }\n  }"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 5.1s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== Typecheck ===\"\nbun run typecheck 2>&1 | tail -10",
  "timeout": 120000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== Typecheck ===
$ tsc --noEmit

```

---

## Assistant (Build · MiniMax-M3 · 8.0s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== Lint ===\"\nbun run lint 2>&1 | tail -5\necho\necho \"=== validate-deps ===\"\nbun scripts/validate-dependencies.ts 2>&1 | tail -3\necho\necho \"=== Domain validate × 7 ===\"\nfor d in oxn-domain oxn-cli-domain oxn-engine-domain oxn-asset-domain oxn-work-domain oxn-proof-domain oxn-insight-domain; do\n  result=$(bun run packages/cli/src/index.ts domain validate $d 2>&1 | grep -E \"✓ valid|✗|ERROR\")\n  echo \"$d: $result\"\ndone",
  "timeout": 180000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== Lint ===
$ eslint src/ packages/

=== validate-deps ===
    "skippedTests": 6
  }
}

=== Domain validate × 7 ===
oxn-domain: Domain OxnDomain ✓ valid
oxn-cli-domain: Domain OxnCliDomain ✓ valid
oxn-engine-domain: Domain OxnEngineDomain ✓ valid
oxn-asset-domain: Domain OxnAssetDomain ✓ valid
oxn-work-domain: Domain OxnWorkDomain ✓ valid
oxn-proof-domain: Domain OxnProofDomain ✓ valid
oxn-insight-domain: Domain OxnInsightDomain ✓ valid

```

---

## Assistant (Build · MiniMax-M3 · 2.9s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== backlinks.test.ts 单元 ===\"\nbun test packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts 2>&1 | tail -20",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== backlinks.test.ts 单元 ===
      at <anonymous> (/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts:180:44)
175 |       //   - oxn-work-domain.references（含 oxn-engine-domain）
176 |       //   - oxn-proof-domain.references（含 oxn-engine-domain）
177 |       //   - oxn-domain.md desc MD link（指向 oxn-engine-domain.md）
178 |       const engineBacklinks = index.get('oxn-engine-domain.md') ?? []
179 |       const sources = new Set(engineBacklinks.map((b) => b.sourceDomain))
180 |       expect(sources.has('OxnWorkDomain')).toBe(true)
                                                 ^
error: expect(received).toBe(expected)

Expected: true
Received: false

      at <anonymous> (/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts:180:44)
(fail) md-pipeline/backlinks > buildBacklinkIndex (双向 union) > 双向 union：references 引用 + MD link 引用合并到同一索引 (attempt 2) [3.30ms]

 8 pass
 3 fail
 20 expect() calls
Ran 11 tests across 1 file. [71.00ms]

```

---

## Assistant (Build · MiniMax-M3 · 13.0s)

_Thinking:_

3 测试失败 — bidirectional union 的索引 key 没匹配上。让我调试：

问题：references key 是 `oxn-engine-domain`，但我们用 `inferReferencesKey` 推导出 key = basename 去 .md。但这里 `filePath` 是 `oxn-work-domain.md`，basename = `oxn-work-domain.md`，key = `oxn-work-domain` ——对的。

但反过来，当 oxn-work-domain.references 含 `oxn-engine-domain`，我们用 `keyToFile.get('oxn-engine-domain')` 来找目标 ——需要 `keyToFile` 包含 `oxn-engine-domain → oxn-engine-domain.md`。

但当前测试的 entries 里**没有 oxn-engine-domain.md 文件**——只 sampleDomain1/sampleDomain2/sampleDomain3_root 是 oxn-work-domain/oxn-proof-domain/oxn-domain。

所以 `keyToFile` 里没有 `oxn-engine-domain`，反向查找返回 undefined，target 被跳过 → backlinks 不会进索引。

需要在测试 fixture 里加入一个 oxn-engine-domain 的样本。让我改测试 fixture。

实际上现实也是这样：现实中有 7 个 Domain 文件，references 互相引用都会找到目标。但测试只放了 3 个文件，需要补充样本。

让我修复测试：

测试 fixture 缺 oxn-engine-domain 样本——现实中 7 个 Domain 都存在，反向引用能匹配上；测试 fixture 只放了 3 个，references key 找不到对应文件。补充：

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts",
  "oldString": "const sampleDomain3_root = `---\nentity: domain\nversion: 0.4.1\nname: OxnDomain\nreferences: []\n---\n\n# Domain: OxnDomain\n\n## Terms\n\n### OXN CLI\n- desc: OpenXenon 交互入口之一。具体领域见 [\\`oxn-cli-domain\\`](./oxn-cli-domain.md)。\n\n### OXN Engine\n- desc: OpenXenon 核心引擎。具体领域见 [\\`oxn-engine-domain\\`](./oxn-engine-domain.md)。\n`",
  "newString": "const sampleDomain3_root = `---\nentity: domain\nversion: 0.4.1\nname: OxnDomain\nreferences: []\n---\n\n# Domain: OxnDomain\n\n## Terms\n\n### OXN CLI\n- desc: OpenXenon 交互入口之一。具体领域见 [\\`oxn-cli-domain\\`](./oxn-cli-domain.md)。\n\n### OXN Engine\n- desc: OpenXenon 核心引擎。具体领域见 [\\`oxn-engine-domain\\`](./oxn-engine-domain.md)。\n`\n\nconst sampleDomain4_engine = `---\nentity: domain\nversion: 0.4.1\nname: OxnEngineDomain\nreferences:\n  - oxn-domain\n---\n\n# Domain: OxnEngineDomain\n\n## Terms: OXN Engine\n\n### OXN Engine\n- desc: OpenXenon 核心引擎。\n`"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts",
  "oldString": "test('sub → root 反向：扫描 references', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )",
  "newString": "test('sub → root 反向：扫描 references', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts",
  "oldString": "test('root → sub 反向：扫描 desc MD link', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )",
  "newString": "test('root → sub 反向：扫描 desc MD link', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts",
  "oldString": "test('双向 union：references 引用 + MD link 引用合并到同一索引', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )",
  "newString": "test('双向 union：references 引用 + MD link 引用合并到同一索引', () => {\n      const index = buildBacklinkIndex(\n        [\n          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },\n          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },\n          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },\n          { filePath: 'oxn-domain.md', content: sampleDomain3_root },\n        ],\n        parseMarkdown,\n      )"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 2.9s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== backlinks.test.ts 单元 ===\"\nbun test packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts 2>&1 | tail -10",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== backlinks.test.ts 单元 ===
Expected: true
Received: false

      at <anonymous> (/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts:199:44)
(fail) md-pipeline/backlinks > buildBacklinkIndex (双向 union) > 双向 union：references 引用 + MD link 引用合并到同一索引 (attempt 2) [2.91ms]

 8 pass
 3 fail
 20 expect() calls
Ran 11 tests across 1 file. [66.00ms]

```

---

## Assistant (Build · MiniMax-M3 · 3.7s)

**Tool: bash**

**Input:**
```json
{
  "command": "bun test packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts 2>&1 | grep -A2 \"fail\"",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
(fail) md-pipeline/backlinks > extractReferencesBacklinks > extracts references list from sub Domain (attempt 2) [0.48ms]
151 |       )
152 | 
--
(fail) md-pipeline/backlinks > buildBacklinkIndex (双向 union) > sub → root 反向：扫描 references (attempt 2) [3.51ms]
194 |       //   - oxn-work-domain.references（含 oxn-engine-domain）
195 |       //   - oxn-proof-domain.references（含 oxn-engine-domain）
--
(fail) md-pipeline/backlinks > buildBacklinkIndex (双向 union) > 双向 union：references 引用 + MD link 引用合并到同一索引 (attempt 2) [3.01ms]

 8 pass
 3 fail
 20 expect() calls
Ran 11 tests across 1 file. [63.00ms]

```

---

## Assistant (Build · MiniMax-M3 · 2.8s)

**Tool: bash**

**Input:**
```json
{
  "command": "bun test packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts 2>&1 | grep -B1 -A8 \"extracts references list\"",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
121 |   describe('extractReferencesBacklinks', () => {
122 |     test('extracts references list from sub Domain', () => {
123 |       const backlinks = extractReferencesBacklinks(sampleDomain1, parseMarkdown)
124 |       expect(backlinks.length).toBe(3)
                                     ^
error: expect(received).toBe(expected)

Expected: 3
Received: 0

--
121 |   describe('extractReferencesBacklinks', () => {
122 |     test('extracts references list from sub Domain', () => {
123 |       const backlinks = extractReferencesBacklinks(sampleDomain1, parseMarkdown)
124 |       expect(backlinks.length).toBe(3)
                                     ^
error: expect(received).toBe(expected)

Expected: 3
Received: 0

      at <anonymous> (/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts:124:32)
(fail) md-pipeline/backlinks > extractReferencesBacklinks > extracts references list from sub Domain (attempt 2) [0.37ms]
151 |       )
152 | 
153 |       // oxn-domain.md 应被 oxn-work-domain + oxn-proof-domain 引用
154 |       const oxnDomainBacklinks = index.get('oxn-domain.md') ?? []
155 |       const sourceDomains = new Set(oxnDomainBacklinks.map((b) => b.sourceDomain))
156 |       expect(sourceDomains.has('OxnWorkDomain')).toBe(true)
                                                       ^
error: expect(received).toBe(expected)

```

---

## Assistant (Build · MiniMax-M3 · 3.3s)

_Thinking:_

extractReferencesBacklinks returns 0 entries from sampleDomain1 which has references [oxn-domain, oxn-engine-domain, oxn-asset-domain]. Let me debug — maybe frontmatter.references isn't being parsed correctly.

Let me checkparseMarkdown implementation and what frontmatter format it expects.

**Tool: grep**

**Input:**
```json
{
  "pattern": "parseMarkdown|extractYaml",
  "path": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline",
  "include": "utils.ts"
}
```

**Output:**
```
Found 3 matches
/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts:
  Line 234: export function parseMarkdown(content: string): { tree: Root; frontmatter: Record<string, unknown> } {

  Line 242:     frontmatter: extractYamlFromTree(tree),

  Line 247: export function extractYamlFromTree(tree: Root): Record<string, unknown> {

```

---

## Assistant (Build · MiniMax-M3 · 2.4s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts",
  "offset": 230,
  "limit": 40
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts</path>
<type>file</type>
<content>
230:  * Parse markdown into mdast Root + extract frontmatter.
231:  * remarkFrontmatter plugin removes the yaml node from tree.children and stores
232:  * parsed frontmatter in `tree.data.frontmatter` (via processor.run).
233:  */
234: export function parseMarkdown(content: string): { tree: Root; frontmatter: Record<string, unknown> } {
235:   const processor = unified().use(remarkParse).use(remarkFrontmatter)
236:   const tree = processor.parse(content) as Root
237:   processor.runSync(tree)
238:   // remark-frontmatter v11 不解析 yaml 内部数据, 只把 yaml 节点留在 tree.children
239:   // 这里用简单正则提取 key: value 对
240:   return {
241:     tree,
242:     frontmatter: extractYamlFromTree(tree),
243:   }
244: }
245: 
246: /** 从 mdast 提取 yaml frontmatter (简单 key: value 解析, 不引入 js-yaml) */
247: export function extractYamlFromTree(tree: Root): Record<string, unknown> {
248:   const fm: Record<string, unknown> = {}
249:   for (const child of tree.children) {
250:     if (child.type === 'yaml') {
251:       const value = (child as { value: string }).value
252:       for (const line of value.split('\n')) {
253:         const m = line.match(/^([\w-]+):\s*(.*)$/)
254:         if (m) {
255:           const v = m[2]!.trim()
256:           // 简单类型推断
257:           if (v === 'true') fm[m[1]!] = true
258:           else if (v === 'false') fm[m[1]!] = false
259:           else if (/^\d+$/.test(v)) fm[m[1]!] = Number(v)
260:           else fm[m[1]!] = v.replace(/^["']|["']$/g, '')
261:         }
262:       }
263:     }
264:   }
265:   return fm
266: }
267: 
268: /**
269:  * unified 出口: 把 mdast Root 序列化回 markdown 字符串

(Showing lines 230-269 of 324. Use offset=270 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 4.2s)

_Thinking:_

The extractYamlFromTree is a simple line-by-line parser that doesn't handle YAML lists (`- oxn-domain` indented bullets). It only handles `key: value` pairs.

This is why references never gets parsed as a list - the frontmatter parsing is too primitive.

Two options:
1. Fix extractYamlFromTree to handle YAML lists
2. Use proper YAML parser (js-yaml, gray-matter, etc.)

Let me check if js-yaml or gray-matteris available.

**Tool: bash**

**Input:**
```json
{
  "command": "grep -E \"yaml|frontmatter\" packages/engine/package.json packages/cli/package.json 2>&1 | head -20",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
packages/engine/package.json:    "remark-frontmatter": "^5.0.0",
packages/engine/package.json:    "yaml": "^2.9.0",

```

---

## Assistant (Build · MiniMax-M3 · 5.2s)

_Thinking:_

`yaml` 包已经存在（2.9.0）。让我修改 extractYamlFromTree 用 yaml 包来解析。

Actually, this is a significant change. Let me think — the simplest fix is to use the `yaml` package's parse function which handles YAML lists correctly.

Let me look at where else extractYamlFromTree is called to see whatside-effects might happen.

`yaml` 包已存在。修复 `extractYamlFromTree` 用 YAML 解析器处理 lists：

**Tool: grep**

**Input:**
```json
{
  "pattern": "extractYamlFromTree",
  "path": "/Users/issac/pro/openxenon/packages",
  "include": "*.ts"
}
```

**Output:**
```
Found 17 matches
/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/index.ts:
  Line 32:   extractYamlFromTree,


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/transformers/task.ts:
  Line 6: import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

  Line 121:     const frontmatter = extractYamlFromTree(tree)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/transformers/domain.ts:
  Line 24: import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

  Line 273:     const frontmatter = extractYamlFromTree(tree)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/transformers/work.ts:
  Line 6: import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

  Line 253:     const frontmatter = extractYamlFromTree(tree)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts:
  Line 242:     frontmatter: extractYamlFromTree(tree),

  Line 247: export function extractYamlFromTree(tree: Root): Record<string, unknown> {


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/transformers/proof.ts:
  Line 6: import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

  Line 34:   const fm = Object.keys(frontmatter).length > 0 ? frontmatter : extractYamlFromTree(root)

  Line 105:     const frontmatter = extractYamlFromTree(tree)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/transformers/blueprint.ts:
  Line 12: import { collectHeadingContexts, collectListFields, type ListField, extractYamlFromTree } from '../utils'

  Line 293:     const frontmatter = extractYamlFromTree(tree)


/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/plugins/__tests__/remark-canonical.test.ts:
  Line 14: import { parseMarkdown, extractYamlFromTree } from '../../utils'

  Line 183:     const fm = extractYamlFromTree(tree)

  Line 204:     const fm = extractYamlFromTree(tree)

```

---

## Assistant (Build · MiniMax-M3 · 5.5s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts",
  "oldString": "/** 从 mdast 提取 yaml frontmatter (简单 key: value 解析, 不引入 js-yaml) */\nexport function extractYamlFromTree(tree: Root): Record<string, unknown> {\n  const fm: Record<string, unknown> = {}\n  for (const child of tree.children) {\n    if (child.type === 'yaml') {\n      const value = (child as { value: string }).value\n      for (const line of value.split('\\n')) {\n        const m = line.match(/^([\\w-]+):\\s*(.*)$/)\n        if (m) {\n          const v = m[2]!.trim()\n          // 简单类型推断\n          if (v === 'true') fm[m[1]!] = true\n          else if (v === 'false') fm[m[1]!] = false\n          else if (/^\\d+$/.test(v)) fm[m[1]!] = Number(v)\n          else fm[m[1]!] = v.replace(/^[\"']|[\"']$/g, '')\n        }\n      }\n    }\n  }\n  return fm\n}",
  "newString": "/** 从 mdast 提取 yaml frontmatter (用 yaml 包解析, 支持嵌套 list/map) */\nexport function extractYamlFromTree(tree: Root): Record<string, unknown> {\n  let yamlText = ''\n  for (const child of tree.children) {\n    if (child.type === 'yaml') {\n      yamlText = (child as { value: string }).value\n      break\n    }\n  }\n  if (!yamlText) return {}\n  const parsed = YAML.parse(yamlText) ?? {}\n  if (typeof parsed !== 'object' || Array.isArray(parsed)) return {}\n  return parsed as Record<string, unknown>\n}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 2.8s)

**Tool: read**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts",
  "limit": 20
}
```

**Output:**
```
<path>/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts</path>
<type>file</type>
<content>
1: /**
2:  * md-pipeline/utils.ts — v0.4 PR-C1 unified-native 工具集
3:  *
4:  * 角色：用 mdast-util-visit / mdast-util-to-markdown 取代自研层。
5:  *   - extract-headings.ts     →  collectHeadings() (mdast-util-visit)
6:  *   - extract-list-fields.ts  →  collectListFields() (mdast-util-visit)
7:  *   - mdast-validator.ts      →  remark-canonical plugin (PR-C3)
8:  *   - driver-registry.ts      →  删 (PR-C4)
9:  *
10:  * 不变量：
11:  *   - 不感知 fs（只接收 Root AST）
12:  *   - 不感知 OpenXenon Kernel（只输出 mdast 工具函数）
13:  *   - 输入输出 AST 是标准 mdast（unified 生态通用）
14:  *
15:  * L0–L3 兼容性：
16:  *   - L1-OXL 层（src/oxl/md-pipeline/）
17:  *   - 不 import L0-Processor / L1-Infra / L2-Work / L3
18:  */
19: 
20: import type { Heading, List, ListItem, Paragraph, PhrasingContent, Root, Text } from 'mdast'

(Showing lines 1-20 of 317. Use offset=21 to continue.)
</content>
```

---

## Assistant (Build · MiniMax-M3 · 2.7s)

**Tool: grep**

**Input:**
```json
{
  "pattern": "^import|^export",
  "path": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline",
  "include": "utils.ts"
}
```

**Output:**
```
Found 22 matches
/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts:
  Line 20: import type { Heading, List, ListItem, Paragraph, PhrasingContent, Root, Text } from 'mdast'

  Line 21: import { visit } from 'unist-util-visit'

  Line 27: export interface CollectedHeading {

  Line 34: export function collectHeadings(root: Root): CollectedHeading[] {

  Line 54: export function findFirstHeading(root: Root, depth: 1 | 2 | 3 | 4 | 5 | 6 = 1): CollectedHeading | null {

  Line 77: export interface HeadingContext {

  Line 86: export function collectHeadingContexts(root: Root): HeadingContext[] {

  Line 147: export interface ListField {

  Line 154: export function getScalar(fields: ListField[], key: string): string | null {

  Line 163: export function getArray(fields: ListField[], key: string): string[] {

  Line 174: export function collectListFields(list: List): ListField[] {

  Line 224: import { unified } from 'unified'

  Line 225: import remarkParse from 'remark-parse'

  Line 226: import remarkFrontmatter from 'remark-frontmatter'

  Line 227: import remarkStringify from 'remark-stringify'

  Line 234: export function parseMarkdown(content: string): { tree: Root; frontmatter: Record<string, unknown> } {

  Line 247: export function extractYamlFromTree(tree: Root): Record<string, unknown> {

  Line 265: export function stringifyMarkdown(root: Root): string {

  Line 272: export function countNodes(root: Root): number {

  Line 290: export const extractHeadingContexts = collectHeadingContexts

  Line 292: export const extractListFields = collectListFields

  Line 299: export function findH1(

```

---

## Assistant (Build · MiniMax-M3 · 3.0s)

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/packages/engine/src/oxl/md-pipeline/utils.ts",
  "oldString": "import { unified } from 'unified'\nimport remarkParse from 'remark-parse'\nimport remarkFrontmatter from 'remark-frontmatter'\nimport remarkStringify from 'remark-stringify'",
  "newString": "import { unified } from 'unified'\nimport remarkParse from 'remark-parse'\nimport remarkFrontmatter from 'remark-frontmatter'\nimport remarkStringify from 'remark-stringify'\nimport YAML from 'yaml'"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 4.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== Typecheck ===\"\nbun run typecheck 2>&1 | tail -10",
  "timeout": 120000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== Typecheck ===
$ tsc --noEmit

```

---

## Assistant (Build · MiniMax-M3 · 29.7s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== backlinks.test.ts 单元 ===\"\nbun test packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts 2>&1 | tail -10",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== backlinks.test.ts 单元 ===
bun test v1.3.10 (30e609e0)

 11 pass
 0 fail
 37 expect() calls
Ran 11 tests across 1 file. [90.00ms]

```

---

## Assistant (Build · MiniMax-M3 · 36.5s)

backlinks 11/11 通过。但 extractYamlFromTree 改用 yaml 包后会影响其他 transformer。验证全链路：

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== bun test ===\"\nbun test 2>&1 | tail -8",
  "timeout": 300000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== bun test ===
[EntityRegistry] overwriting compiler for 'mock' (previous: MockCompiler, new: MockCompiler)
[EntityRegistry] overwriting compiler for 'mock' (previous: MockCompiler, new: MockCompiler)

 1534 pass
 3 skip
 0 fail
 6474 expect() calls
Ran 1537 tests across 119 files. [24.13s]

```

---

## Assistant (Build · MiniMax-M3 · 5.2s)

**1534 pass / 0 fail / 6474 expects / 24.13s** (比上次 +1 测试是 backlinks 新增的)。继续验证 show 和 docs：

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== OxnDomain show ===\"\nbun run packages/cli/src/index.ts domain show OxnDomain 2>&1 | head -40\necho\necho \"=== OxnEngineDomain show ===\"\nbun run packages/cli/src/index.ts domain show OxnEngineDomain 2>&1 | head -40\necho\necho \"=== OxnCliDomain show ===\"\nbun run packages/cli/src/index.ts domain show OxnCliDomain 2>&1 | head -45",
  "timeout": 60000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== OxnDomain show ===
Domain: OxnDomain
File:   oxn-domain.md

Counts:
  Terms:      16
  Bans:       0
  Invariants: 4

Term groups:
  OpenXenon: OpenXenon, OXN, OXN CLI, OXN Engine, OXL, IAP, Intent, Align, Proof, Asset, Boundary, Work, Verdict, Insight, Hall, Daemon

Terms linking out: 6
  → oxn-cli-domain.md
  → oxn-engine-domain.md
  → oxn-proof-domain.md
  → oxn-asset-domain.md
  → oxn-work-domain.md
  → oxn-insight-domain.md

Referenced by (4 unique source Domains):
  OxnEngineDomain (1 backlink):
    - <Domain via references> ← oxn-domain
  OxnInsightDomain (1 backlink):
    - <Domain via references> ← oxn-domain
  OxnCliDomain (1 backlink):
    - <Domain via references> ← oxn-domain
  OxnWorkDomain (1 backlink):
    - <Domain via references> ← oxn-domain
OpenXenon CLI
Run `oxn --help` for usage information

=== OxnEngineDomain show ===
Domain: OxnEngineDomain
File:   oxn-engine-domain.md

Counts:
  Terms:      9
  Bans:       1
  Invariants: 6

Term groups:
  OXN Engine: OXN Engine, BuiltinAsset
  Kernel: Kernel, Infra, Daemon, OXL
  IAPError: IAPError, OXNCrash, CliInputError

Referenced by (6 unique source Domains):
  OxnAssetDomain (1 backlink):
    - <Domain via references> ← oxn-engine-domain
  OxnInsightDomain (1 backlink):
    - <Domain via references> ← oxn-engine-domain
  OxnProofDomain (1 backlink):
    - <Domain via references> ← oxn-engine-domain
  OxnCliDomain (1 backlink):
    - <Domain via references> ← oxn-engine-domain
  OxnWorkDomain (1 backlink):
    - <Domain via references> ← oxn-engine-domain
  OxnDomain (2 backlinks):
    - OXN Engine (via md-link)
    - OXL (via md-link)
OpenXenon CLI
Run `oxn --help` for usage information

=== OxnCliDomain show ===
Domain: OxnCliDomain
File:   oxn-cli-domain.md

Counts:
  Terms:      16
  Bans:       1
  Invariants: 16

Term groups:
  OXN CLI: OXN CLI
  Command: Command, SubCommand, Arg, OutputFormat, ExitCode
  Skill: Skill, SkillAdapter, AdaptersRoot
  Locale: Locale, I18nKey, TFunction, LocaleBundle
  OXnConfig: OXnConfig, ProjectConfig, ProjectBoundary

Referenced by (2 unique source Domains):
  OxnAssetDomain (1 backlink):
    - <Domain via references> ← oxn-cli-domain
  OxnDomain (1 backlink):
    - OXN CLI (via md-link)
OpenXenon CLI
Run `oxn --help` for usage information

```

---

## Assistant (Build · MiniMax-M3 · 11.3s)

**双向 backlinks 工作正常**：
- root Domain backlinks：4 个 sub Domain 通过 references 反向 + root 自己 desc MD link outbound 6 个 sub
- Engine Domain backlinks：5 个 sub Domain 通过 references 反向（asset/insight/proof/cli/work） + 1 个 root Domain 通过 MD link 反向（2 个 term: OXN Engine + OXL）
- CLI Domain backlinks：1 个 module (asset) 通过 references 反向 + 1 个 root (OxnDomain) 通过 MD link 反向

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== docs build ===\"\nbun run docs:build 2>&1 | tail -3\necho\necho \"=== P8b grep 残留 ===\"\necho \"--- docs/ markdown link in Domain desc ---\"\ngrep -rn \"](../../../docs\\|](../../docs\\|](../../../docs-cn\\|](../../../docs-en\\|](../../../en/\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho \"--- code path in Domain ---\"\ngrep -nE \"src/[a-z]+|packages/[a-z]+/src/\" .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"\necho \"--- removed 7 words residue ---\"\nfor w in PackageEngine Barrel OXNPackageScope md-pipeline md-bridge EntityCompiler EntityRegistry; do\n  hits=$(grep -rn \"$w\" .openxenon/assets/domains/oxn-*.md 2>/dev/null | wc -l | tr -d ' ')\n  echo \"$w: $hits hits\"\ndone\necho \"--- sub→sub MD link residue ---\"\ngrep -nE '\\[\\\\`oxn-(work|proof)-domain\\.' .openxenon/assets/domains/oxn-*.md 2>&1 || echo \"✅ 0 命中\"",
  "timeout": 120000,
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== docs build ===
- rendering pages...
[32m✓[0m rendering pages...
build complete in 3.73s.

=== P8b grep 残留 ===
--- docs/ markdown link in Domain desc ---
✅ 0 命中
--- code path in Domain ---
✅ 0 命中
--- removed 7 words residue ---
PackageEngine: 0 hits
Barrel: 0 hits
OXNPackageScope: 0 hits
md-pipeline: 0 hits
md-bridge: 0 hits
EntityCompiler: 0 hits
EntityRegistry: 0 hits
--- sub→sub MD link residue ---
✅ 0 命中

```

---

## Assistant (Build · MiniMax-M3 · 4.4s)

**Tool: bash**

**Input:**
```json
{
  "command": "echo \"=== root→sub MD link 应保留（7 处）===\"\ngrep -nE '\\[\\`oxn-(cli|engine|proof|asset|work|insight)-domain' .openxenon/assets/domains/oxn-domain.md",
  "workdir": "/Users/issac/pro/openxenon"
}
```

**Output:**
```
=== root→sub MD link 应保留（7 处）===
22:- desc: OpenXenon 交互入口之一。具体领域见 [`oxn-cli-domain`](./oxn-cli-domain.md)。
25:- desc: OpenXenon 核心引擎。具体领域见 [`oxn-engine-domain`](./oxn-engine-domain.md)。
28:- desc: OpenXenon Language，OpenXenon 的特定领域语言（DSL），用于声明与校验 OXN 实体。具体领域见 [`oxn-engine-domain.OXL`](./oxn-engine-domain.md#oxl)。
40:- desc: 人机协作的工作成果，OXN Engine 记录的客观事实。具体领域见 [`oxn-proof-domain`](./oxn-proof-domain.md)。
43:- desc: 工程师的资产，定义 AI Agent 工作时需要遵守的边界。具体领域见 [`oxn-asset-domain`](./oxn-asset-domain.md)。
49:- desc: 人机协作的工作空间，衔接 Asset 与 Proof。具体领域见 [`oxn-work-domain`](./oxn-work-domain.md)。
55:- desc: 洞察 IAP 并提供涌现的可能性。具体领域见 [`oxn-insight-domain`](./oxn-insight-domain.md)。

```

---

## Assistant (Build · MiniMax-M3 · 4.9s)

7 处 root→sub MD link 完整保留（按 ADR-0059 §D2 D2 约束）。

## 最终版本 bump（同步 doc state）

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-work-domain.md",
  "oldString": "version: 0.2.1\nname: OxnWorkDomain",
  "newString": "version: 0.2.2\nname: OxnWorkDomain"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-proof-domain.md",
  "oldString": "version: 0.2.1\nname: OxnProofDomain",
  "newString": "version: 0.2.2\nname: OxnProofDomain"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-cli-domain.md",
  "oldString": "version: 0.4.1\nname: OxnCliDomain",
  "newString": "version: 0.4.2\nname: OxnCliDomain"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/Users/issac/pro/openxenon/.openxenon/assets/domains/oxn-engine-domain.md",
  "oldString": "version: 0.4.1\nname: OxnEngineDomain",
  "newString": "version: 0.4.2\nname: OxnEngineDomain"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · MiniMax-M3 · 7.3s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P3: CLI Domain ExitCode desc 精简",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7.1: backlinks.ts 双向扫描改造",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P7.2: backlinks.test.ts fixture 同步",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
      "status": "completed",
      "priority": "high"
    },
    {
      "content": "P8b: grep 最终确认",
      "status": "completed",
      "priority": "high"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "P1.1: 删 oxn-cli-domain.md:17 OXN CLI sub→root 尾巴",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.2: 删 oxn-work-domain.md 4 处 sub↔sub 互引（Part/Probe/AssetHash/Frozen）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P1.3: 删 oxn-proof-domain.md 2 处 sub↔sub 互引（Probe/Part）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P2: Engine Domain 3 个错误 term desc 改写为错误本体",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P3: CLI Domain ExitCode desc 精简",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P4: CLI Domain references 加 oxn-engine-domain + inv-16 调整",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P5: 子 Domain 4 处 'X = oxn-domain.X 在...' 句式重写",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.1: ADR-0059 §D2 加约束 + §D3 算法描述更新",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P6.2: ADR-0060 加 D8 Domain 视角隔离 + D9 代码物理≠Domain 归属",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7.1: backlinks.ts 双向扫描改造",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P7.2: backlinks.test.ts fixture 同步",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P8: 全链路验证（lint/typecheck/test/validate-deps/validate x7/show x3/docs build）",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "P8b: grep 最终确认",
    "status": "completed",
    "priority": "high"
  }
]
```

---

## Assistant (Build · MiniMax-M3 · 12.6s)

## 完成总结

### P1-P5 Domain 清理

| 文件 | 改动 |
|---|---|
| `oxn-engine-domain.md` v0.4.2 | 3 个错误 term desc 改为错误本体（去 stdout/stderr/exit code/commander.*） |
| `oxn-cli-domain.md` v0.4.2 | ExitCode desc 精简 + references 加 oxn-engine-domain + inv-16 调整 |
| `oxn-work-domain.md` v0.2.2 | 删 4 处 sub↔sub 互引 + 1 处 "X = oxn-domain.X 在" 句式重写 |
| `oxn-proof-domain.md` v0.2.2 | 删 2 处 sub↔sub 互引 + 1 处 "X = oxn-domain.X 在" 句式重写 |
| `oxn-asset-domain.md` v0.2.1 | 1 处 "X = oxn-domain.X 在" 句式重写 |
| `oxn-insight-domain.md` v0.2.0 | 1 处 "X = oxn-domain.X 在" 句式重写 |

### P6 ADR 修订

| ADR | 修订 |
|---|---|
| **ADR-0059** | §D2 加 D2 约束（仅 root→sub 单向 MD link 允许）；§D3 算法描述改为双向 union |
| **ADR-0060** | 加 D8 Domain 视角隔离（禁止 sub↔sub MD link）+ D9 代码物理≠Domain 归属 |

### P7 backlinks 双向扫描引擎

| 改动 | 内容 |
|---|---|
| `backlinks.ts` | 新增 `extractReferencesBacklinks` 函数；`Backlink` 增加 `source` 字段（'md-link' \| 'references-frontmatter'）+ 可选 `sourceTerm/linkText/linkUrl/references`；`buildBacklinkIndex` 改为双向 union：先扫 references frontmatter 反向 + 再扫 desc MD link 反向 |
| `backlinks.test.ts` | 11 个测试覆盖双向（sub→root references + root→sub MD link + union 合并） |
| `utils.ts` `extractYamlFromTree` | 改用 yaml 包（2.9.0）替代手写正则解析，支持嵌套 list/map（references 列表才能被正确解析） |
| `index.ts` | exports 加 `extractReferencesBacklinks` |
| `domain.ts` CLI | `formatShowHuman` 按 source 区分显示 md-link / references 类型 |

### 双向 backlinks 验证

**`oxn domain show OxnDomain`**：
- Outbound：6 个 root→sub MD link（OXN CLI / OXN Engine / OXL / Proof / Asset / Work / Insight）
- Backlinks：4 个 sub Domain 通过 references 反向（cli/engine/work/insight）+ 6 outbound MD link

**`oxn domain show OxnEngineDomain`**：
- Backlinks：5 个 sub Domain 通过 references 反向（asset/insight/proof/cli/work）+ 1 个 root Domain 通过 MD link 反向（OXN Engine + OXL 共 2 个 term）

**`oxn domain show OxnCliDomain`**：
- references: `[oxn-domain, oxn-engine-domain]`
- Backlinks：1 个 module 通过 references 反向（asset）+ 1 个 root 通过 MD link 反向（OXN CLI term）

### 验证

| 项 | 结果 |
|---|---|
| ESLint | ✅ pass |
| TypeScript | ✅ pass |
| validate-deps | ✅ 0 violation |
| 7 Domain validate | ✅ 全部 valid |
| `oxn domain show × 3` | ✅ 双向 backlinks 正确显示 |
| backlinks.test.ts | ✅ **11 pass / 0 fail / 37 expects / 90ms** |
| bun test 全量 | ✅ **1534 pass / 0 fail / 6474 expects / 24.13s** |
| docs build | ✅ complete in 3.73s |
| grep docs/ 残留 | ✅ 0 命中 |
| grep src/ paths | ✅ 0 命中 |
| grep 7 个被删词 | ✅ 0 命中 |
| grep sub→sub MD link | ✅ 0 命中 |
| grep root→sub MD link | ✅ **7 处保留**（按 ADR-0059 §D2 D2 约束） |

### 关键修复

P7 测试发现 `extractYamlFromTree` 是手写正则解析，**不支持 YAML list**（如 `references: [oxn-domain, oxn-engine-domain]`）——这导致 `references` 字段一直为空。修复方法：改用已存在的 `yaml` 包（v2.9.0）做规范解析。这个 bug 之前未暴露是因为 backlinks.ts 之前只扫 desc MD link，不依赖 references。现在双向 backlinks 让这个潜在 bug 浮出水面，顺手修复。

---

## User

---

## Assistant (Compaction · GLM-5.2 · 151.8s)

_Thinking:_

Let me carefully analyze the conversation history to update the anchored summary. I need to:

1. Preserve still-true details from the previous summary
2. Remove stale details
3. Merge in new facts from the conversation

Let me trace through the conversation:

**Previous summary state**: The summary describes a v0.7 Domain three-layer architecture restructure. It was in the middle of replacing "Layer 0/1/2" with "root/package/module" across files.

**New conversation developments**:

1. **ADR-0060 created**: Domain vocabulary boundary (What/How 判据). Key decisions:
   - D1: What vs How judgment (重写测试)
   - D2: 4 vocabulary categories (产品词汇/特性词汇/实现词汇/通用技术词)
   - D3: root Domain = 特性集合 (not just business words)
   - D4: 同名特性词多域共存 (e.g., OXL in both root + Engine)
   - D5: Reference rules (no docs/ links, no code paths, no implementation status, ADR references allowed as noun statements)
   - D6: Invariant self-sufficiency
   - D7: OXL sub-Domain split trigger (>5 contract words)
   - D8: Domain 视角隔离 (added later - sub↔sub MD links forbidden, root→sub protected)
   - D9: 代码物理 ≠ Domain 归属 (added later - semantic boundary, not code directory)

2. **Engine Domain v0.4.1**: Deleted 7 implementation words (PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry). Reduced from 16→9 terms. All docs/ references, code paths, implementation status annotations removed from desc/invariants.

3. **root oxn-domain.md v0.4.1**: Added OXL as top-level feature term. Now 16 terms.

4. **CLI Domain v0.4.1**: references now includes `oxn-engine-domain` (for cross-domain consumption of error terms). ExitCode desc simplified. inv-16 updated.

5. **Error terms (IAPError/OXNCrash/CliInputError)**: Stayed in Engine Domain but desc rewritten to "错误本体" only (removed stdout/stderr/exit code which are CLI视角).

6. **ADR-0059 modified**: 
   - §D2 constraint added: MD link only root→sub; sub→root and sub↔sub forbidden
   - §D3 algorithm updated: bidirectional scanning (sub→root via references frontmatter + root→sub via desc MD link)

7. **backlinks.ts refactored**: 
   - Backlink interface changed: sourceTerm/linkText/linkUrl now optional; added `source: 'md-link' | 'references-frontmatter'` and `references?: string[]`
   - New function `extractReferencesBacklinks` added
   - `buildBacklinkIndex` now does bidirectional union scan
   - `collectLinksFromNode` updated with `source: 'md-link'`

8. **backlinks.test.ts rewritten**: New fixtures with references frontmatter, 4 test domains (work/proof/root/engine), tests for extractMdLinksFromDomain, extractReferencesBacklinks, buildBacklinkIndex bidirectional union.

9. **domain.ts CLI updated**: `formatShowHuman` now distinguishes md-link vs references-frontmatter backlinks in display.

10. **6 MD links deleted** (sub→root 1 + sub↔sub 5): 
    - oxn-cli-domain.md:17 OXN CLI sub→root tail (already clean)
    - oxn-work-domain.md: Part/Probe/AssetHash/Frozen sub↔sub links (4)
    - oxn-proof-domain.md: Probe/Part sub↔sub links (2)

11. **7 root→sub MD links preserved** in oxn-domain.md (lines 22/25/28/40/43/49/55)

12. **4 "X = oxn-domain.X 在..." patterns rewritten** in asset/work/proof/insight domains to direct What statements.

13. **Current failure**: 3 tests failing in backlinks.test.ts. The `extractReferencesBacklinks` test and 2 `buildBacklinkIndex` union tests are failing. The issue appears to be that `extractReferencesBacklinks` returns one backlink per reference entry, but the test expects them to be found by sourceDomain. Need to debug further.

Actually wait, let me re-read the test failures more carefully:

Test failures:
1. `extractReferencesBacklinks > extracts references list from sub Domain` - line 151
2. `buildBacklinkIndex > sub → root 反向：扫描 references` - line 194/195
3. `buildBacklinkIndex > 双向 union` - line 199

The issue might be in how `extractReferencesBacklinks` works - it returns one entry per reference key, each with `references: [refKey]`. But wait, looking at the code:

```typescript
export function extractReferencesBacklinks(
  content: string,
  parseMarkdown: ...
): Omit<Backlink, 'sourceFile'>[] {
  ...
  return refList.map((refKey) => ({
    sourceDomain,
    source: 'references-frontmatter' as const,
    references: [refKey],
  }))
}
```

This returns 3 entries (one per ref), each with `references: [refKey]` (single element array).

Test expects:
```typescript
const backlinks = extractReferencesBacklinks(sampleDomain1, parseMarkdown)
expect(backlinks.length).toBe(3)
const refs = backlinks.flatMap((b) => b.references ?? [])
expect(refs).toContain('oxn-domain')
expect(refs).toContain('oxn-engine-domain')
expect(refs).toContain('oxn-asset-domain')
for (const bl of backlinks) {
  expect(bl.source).toBe('references-frontmatter')
  expect(bl.sourceDomain).toBe('OxnWorkDomain')
}
```

Hmm, this should work... Let me think about what might be going wrong.

Wait, the test says `expect(backlinks.length).toBe(3)` but maybe the parsing isn't extracting the references array properly? The frontmatter in sampleDomain1 is:
```yaml
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
```

The `parseMarkdown` function returns `frontmatter` as `Record<string, unknown>`. If the YAML parser correctly parses this as an array, it should work. But maybe the frontmatter parsing doesn't handle YAML arrays properly?

Actually, I need to check if the test was already failing or if I need to debug further. The conversation shows the user said nothing after the last test run - the assistant was in the middle of debugging.

Let me check the error output more carefully:
```
(fail) md-pipeline/backlinks > extractReferencesBacklinks > extracts references list from sub Domain (attempt 2) [0.48ms]
151 |       )
```

Line 151 is in the `extractReferencesBacklinks` test. The test is failing. The most likely issue is that the `parseMarkdown` function's frontmatter parsing doesn't correctly handle YAML arrays in the format used.

Actually, I need to look at what `parseMarkdown` returns for frontmatter. The function signature says `frontmatter: Record<string, unknown>`, and if YAML arrays are parsed as strings instead of arrays, `Array.isArray(refs)` would return false.

But wait - the existing domain files already use `references:` as YAML arrays and the domain validator works fine. So the parsing should work.

Let me check if there's something else wrong. Maybe the issue is that `extractReferencesBacklinks` is creating separate entries per reference (3 entries), but the test's `flatMap` might not work as expected...

Actually, I think I see it now. The function returns:
```typescript
refList.map((refKey) => ({
  sourceDomain,
  source: 'references-frontmatter' as const,
  references: [refKey],
}))
```

So 3 entries, each with `references: ['oxn-domain']`, `references: ['oxn-engine-domain']`, `references: ['oxn-asset-domain']`.

The `flatMap` then gives `['oxn-domain', 'oxn-engine-domain', 'oxn-asset-domain']` - this should work.

Hmm, maybe the issue is with the YAML parsing of the test fixture. Let me look at the sample more carefully:

```yaml
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
```

Wait, maybe parseMarkdown isn't extracting the frontmatter correctly from the test fixture strings? Or maybe the YAML array format is being parsed as a string?

Actually, let me look at the error more carefully. The test file shows line 151, but the test code starts at around line 140-ish. Let me count...

Actually, I think the issue might be something else entirely. Let me re-read the conversation. The last thing shown is:

```
8 pass
3 fail
20 expect() calls
```

And the 3 failing tests are:
1. `extractReferencesBacklinks > extracts references list from sub Domain`
2. `buildBacklinkIndex > sub → root 反向：扫描 references`
3. `buildBacklinkIndex > 双向 union`

So the core issue is `extractReferencesBacklinks` not working. This needs to be debugged.

Now, for the summary, I need to capture:
- All the work done in this round
- The current failing tests that need to be fixed
- The overall state of the project

Let me also check if there were any other version bumps. Looking back:
- oxn-domain.md: v0.4.0 → v0.4.1
- oxn-engine-domain.md: v0.4.0 → v0.4.1
- oxn-cli-domain.md: v0.4.0 → v0.4.1
- oxn-work-domain.md: v0.2.0 → v0.2.1
- oxn-asset-domain.md: v0.2.0 → v0.2.1
- oxn-proof-domain.md: v0.2.0 → v0.2.1
- oxn-insight-domain.md: still v0.2.0 (not bumped in this round)

Let me also note the ADR changes:
- ADR-0059: §D2 constraint added, §D3 algorithm rewritten
- ADR-0060: New ADR created with D1-D9

And the index.ts export update and domain.ts CLI display update.

Now let me write the updated summary.

Wait, I also need to note that the user manually edited some files:
- oxn-engine-domain.md: Kernel desc, Infra desc (user rewrote them to be more concise)
- oxn-cli-domain.md: abstract changed, Command/SubCommand/Arg/OutputFormat desc simplified, Skill desc rewritten

Also important: the user raised 5 questions about Domain content quality:
1. "package Domain 实现" is meaningless self-referential metadata
2. Barrel is too implementation-detail
3. OXNPackageScope is npm config, not Domain
4. Domain shouldn't reference docs/ (mutable SSOT layer below)
5. DDD boundary: does Domain include technical implementation vocabulary?

The user's key insight on DDD boundary:
- Domain = What (是什么), not How (怎么实现)
- "Domain是契约词，其可以指Domain内产品词汇、也能是技术词汇。但后者不是指技术如何实现，而是指这是什么技术领域的"
- OXL example: "Engine 通过unified库实现MD语法的特性，包括编译、校验" is What; "md-pipeline怎么实现的" is How
- "不用提实现见开发手册。那会引导AI又去读取的"

The user's insight on MD links:
- After deleting all MD links, user asked "删掉MD link后，Root如何去Package，Package如何去Module"
- This led to keeping root→sub MD links (7) and only deleting sub→root (1) and sub↔sub (5)

The user's insight on error terms:
- IAPError/OXNCrash/CliInputError should stay in Engine Domain (error ontology) but desc should NOT contain CLI视角 (stdout/stderr/exit code)
- CLI Domain references should include oxn-engine-domain to express cross-domain consumption

Now for the current state of test failures - 3 tests failing. The issue seems to be with `extractReferencesBacklinks` function not correctly parsing the references from frontmatter, or the `buildBacklinkIndex` not correctly mapping reference keys to file basenames.

Let me think about what the actual bug might be...

Looking at `extractReferencesBacklinks`:
```typescript
const refs = frontmatter.references
if (!Array.isArray(refs) || refs.length === 0) {
  return []
}
```

If `frontmatter.references` is not parsed as an array by `parseMarkdown`, this returns empty. The question is: does `parseMarkdown` from `../utils` correctly parse YAML arrays in frontmatter?

Looking at the existing domain files, they all have `references:` as YAML arrays, and `oxn domain validate` works. So the parsing should handle arrays.

But wait - in the test fixture, the YAML has:
```yaml
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
```

While in the real domain files, it's:
```yaml
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
```

These look the same. So maybe the issue is something else...

Actually, let me look at the `parseMarkdown` function more carefully. It returns `{ tree: Root; frontmatter: Record<string, unknown> }`. The frontmatter extraction might use a specific YAML parser that handles arrays differently.

Or maybe the issue is that `extractReferencesBacklinks` returns 3 separate backlink objects (one per reference), each with `references: [singleKey]`. But then in `buildBacklinkIndex`, the code does:

```typescript
for (const { filePath, content } of entries) {
    const refBacklinks = extractReferencesBacklinks(content, parseMarkdown)
    for (const rb of refBacklinks) {
      const refs = rb.references ?? []
      for (const refKey of refs) {
        const target = keyToFile.get(refKey)
        if (!target) continue
        ...
      }
    }
  }
```

This iterates each backlink, then each refKey in backlink.references. Since each backlink has `references: [singleKey]`, this should work.

But the `keyToFile` map is built by:
```typescript
for (const { filePath, content } of entries) {
    const { frontmatter } = parseMarkdown(content)
    const name = typeof frontmatter.name === 'string' ? frontmatter.name : null
    if (!name) continue
    const fileBasename = filePath.split('/').pop() ?? filePath
    const key = inferReferencesKey(fileBasename, name)
    if (key) keyToFile.set(key, fileBasename)
  }
```

And `inferReferencesKey` returns `basename` without `.md`. So for `filePath: 'oxn-work-domain.md'`, it returns `'oxn-work-domain'`.

Then in `buildBacklinkIndex`, when we process oxn-work-domain.md's references `['oxn-domain', 'oxn-engine-domain', 'oxn-asset-domain']`, we look up `keyToFile.get('oxn-domain')`. This should map to `'oxn-domain.md'` if oxn-domain.md is in the entries.

Wait, but in the test, the entries include `{ filePath: 'oxn-domain.md', content: sampleDomain3_root }`. The sampleDomain3_root has `name: OxnDomain`. So `keyToFile` should have `'oxn-domain' → 'oxn-domain.md'`.

Hmm, actually maybe the issue is that `parseMarkdown` doesn't extract frontmatter from the test fixture strings? Let me think...

Actually, looking at the error trace more carefully:

```
(fail) md-pipeline/backlinks > extractReferencesBacklinks > extracts references list from sub Domain (attempt 2) [0.48ms]
151 |       )
```

Line 151 in the test... Let me count lines. The test function starts somewhere around line 140. The `expect(backlinks.length).toBe(3)` might be at line 151. If `backlinks.length` is 0, that means `extractReferencesBacklinks` returned empty array, which means `frontmatter.references` was not an array.

This suggests that `parseMarkdown` from `../utils` might not parse YAML arrays correctly in the test fixture format. Or perhaps the frontmatter extraction works differently than expected.

This is the current debugging state. The assistant needs to figure out why `extractReferencesBacklinks` returns empty.

Possible fix: maybe need to use a different approach to extract frontmatter, or check how `parseMarkdown` handles YAML arrays.

Actually, I just realized - maybe the issue is simpler. Let me look at the `parseMarkdown` function. It returns `{ tree: Root; frontmatter: Record<string, unknown> }`. But how does it extract frontmatter? It might use `extractYamlFromTree` which parses the MDAST YAML node. If the YAML node is parsed as a string rather than an object, `frontmatter.references` might be a string like `"- oxn-domain\n- oxn-engine-domain\n- oxn-asset-domain"` instead of an array.

This is likely the bug. The `parseMarkdown` function might return frontmatter values as strings for array types, and we need to properly parse them.

OK, let me now write the summary with all this information.

Let me also identify what was completed vs what's still in progress:

**Completed in this round:**
- ADR-0060 created (D1-D7 initially, D8-D9 added later)
- Engine Domain: 7 implementation words deleted, 9 remaining terms cleaned
- root oxn-domain.md: OXL term added
- CLI Domain: references added oxn-engine-domain, ExitCode simplified, inv-16 updated
- 6 sub→root and sub↔sub MD links deleted
- 4 "X = oxn-domain.X 在..." patterns rewritten
- ADR-0059 §D2 constraint + §D3 algorithm updated
- ADR-0060 D8/D9 added
- backlinks.ts refactored for bidirectional scanning
- backlinks.test.ts rewritten
- domain.ts CLI display updated
- index.ts exports updated
- All version bumps done (except insight-domain which wasn't changed)
- Lint ✅, Typecheck ✅, validate-deps ✅, 7 Domain validate ✅

**Active/failing:**
- 3 tests failing in backlinks.test.ts:
  1. `extractReferencesBacklinks > extracts references list from sub Domain`
  2. `buildBacklinkIndex > sub → root 反向：扫描 references`
  3. `buildBacklinkIndex > 双向 union`
- Root cause likely: `parseMarkdown` frontmatter extraction not parsing YAML arrays correctly, so `frontmatter.references` is not `Array.isArray`
- Need to debug `extractReferencesBacklinks` function

**Also not yet done:**
- Full `bun test` (only ran backlinks.test.ts subset, 3 failing)
- `oxn domain show` verification with new backlinks
- `bun run docs:build`
- grep final confirmation

Let me also note: the user manually edited several desc fields in oxn-engine-domain.md and oxn-cli-domain.md:
- Engine: Kernel desc → "L0 纯逻辑验证模块；通过 Infra 调用带副作用的 Probe 来观测客观事实并验证。"
- Engine: Infra desc → "L1 副作用/IO 执行模块；负责OpenXenon 跟 外部宿主环境的出入口，包括文件、网络等具有副作用的交互。"
- Engine: OXL desc → "Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验。"
- Engine: OXN Engine desc → "OpenXenon 核心引擎。" (removed root link)
- CLI: abstract → "OXN CLI 领域。"
- CLI: Command → "CLI 顶级命令，采用 citty 库。"
- CLI: SubCommand → "Command 下子命令（如 `work add-task`、`domain validate`）。"
- CLI: Arg → "命令参数（必填或可选）。"
- CLI: OutputFormat → "输出格式（human/json/yaml/html/md）。"
- CLI: Skill → "OXN 内置给 AI 助手的技能，用于AI 助手里通过 Skill 对 OpenXenon CLI 交互。"
- CLI: SkillAdapter → "多 AI 助手适配器。"
- CLI: AdaptersRoot → "SkillAdapter 对各自 AI 助手写入其配置目录以便识别。"

OK now let me also make sure I capture the What/How judgment correctly:
- **What = "是什么"**: the concept/capability/technology domain → Domain
- **How = "怎么实现"**: implementation details, code paths, framework choices → Stack/docs
- **重写测试**: "If rewritten in Rust or impl renamed, would this word still exist?"
- **OXL example**: "Engine 通过 unified 库实现 MD 语法的特性" = What (mentions unified library is OK as it tells What technology); "md-pipeline 怎么实现的" = How

And the MD link policy (final decision):
- root→sub MD links: ✅ PRESERVED (7 in oxn-domain.md) — ADR-0059 §D2 original design
- sub→root MD links: ❌ DELETED (1 in oxn-cli-domain.md) — duplicates references frontmatter
- sub↔sub MD links: ❌ DELETED (5 in work/proof domains) — causes bidirectional coupling

backlinks algorithm (final decision):
- Bidirectional: sub→root via references frontmatter + root→sub via desc MD link
- Both union into single index
- Backlink interface: `source: 'md-link' | 'references-frontmatter'`, sourceTerm optional

Now let me write this all up concisely.

## Objective
- Execute v0.7 Domain three-layer architecture restructure with DDD vocabulary boundary (ADR-0060 What/How 判据), bidirectional backlinks engine, and clean term desc hygiene across 7 Domain files.

## Important Details
- **Domain = What, not How**: Domain 收"是什么"特性词（产品词+项目特定技术词），不收"怎么实现"细节词（代码路径/框架选择/实现状态/库选择如 citty）。判据="重写测试"：若用 Rust 重写或实现改名，该词还需存在？
- **OXL example**: `Engine 通过 unified 库实现 MD 语法的特性，包括编译、校验` = What（告知用什么技术领域）；`md-pipeline 怎么实现` = How。desc 不能含"详见 docs/..."——会引导 AI 去读 How 层。
- **Domain 层级命名**: root / package / module (NOT "Layer 0/1/2"). L0-L3 = Engine 代码分层，与 Domain 层级无关。
- **MD link policy (ADR-0059 §D2 约束)**: root→sub ✅ preserved (7 in oxn-domain.md); sub→root ❌ deleted (duplicates references frontmatter); sub↔sub ❌ deleted (causes bidirectional coupling). User 反击"删掉 MD link 后 Root 如何去 Package" led to preserving root→sub.
- **Error terms (IAPError/OXNCrash/CliInputError)**: Stay in Engine Domain (错误本体); desc must NOT contain CLI视角 (stdout/stderr/exit code). CLI Domain references now includes `oxn-engine-domain` for cross-domain consumption.
- **同名特性词多域共存**: root defines essence; sub-Domain supplements perspective-specific What (e.g., OXL in root = "DSL for OXN entities"; in Engine = "Engine 通过 unified 实现 MD 语法特性").
- **ADR-0060 D8 视角隔离**: Term desc 仅描述本 Domain 视角的 What; 跨视角信息由 references 表达.
- **ADR-0060 D9 代码物理 ≠ Domain 归属**: Domain 归属按语义边界切, 不按代码目录切.
- **`.openxenon/assets/` is gitignored** by default.

## Work State
### Completed
- **ADR-0060 created** (`.openxenon/docs/adrs/0060-domain-vocabulary-boundary.md`): D1 What/How 判据 + 重写测试; D2 4 词汇分类; D3 root=特性集合; D4 同名特性词多域共存; D5 引用规则 (no docs/ links, no code paths, no impl status, ADR as noun statement OK); D6 不变式自给自足; D7 OXL 拆分触发 (>5 词); D8 视角隔离; D9 代码物理≠Domain归属.
- **ADR-0059 modified**: §D2 added constraint (MD link only root→sub); §D3 rewritten (bidirectional scan: sub→root via references frontmatter + root→sub via desc MD link, union output).
- **ADR INDEX.md**: Added section "7. Domain 词汇架构" with ADR-0052/0059/0060; total 50→52.
- **Engine Domain v0.4.1** (`oxn-engine-domain.md`): 16→9 terms. Deleted 7 impl words (PackageEngine/Barrel/OXNPackageScope/md-pipeline/md-bridge/EntityCompiler/EntityRegistry). 3 groups: OXN Engine(OXN Engine,BuiltinAsset) / Kernel(Kernel,Infra,Daemon,OXL) / IAPError(IAPError,OXNCrash,CliInputError). All docs/ links, code paths, @pending-migration removed. Invariants inline (Kernel IO ban list, no docs refs). User manually rewrote Kernel/Infra/OXL desc.
- **root oxn-domain.md v0.4.1**: 15→16 terms (added OXL). 7 root→sub MD links preserved.
- **CLI Domain v0.4.1**: references now `[oxn-domain, oxn-engine-domain]`. ExitCode desc simplified. inv-16 updated (allows engine-domain reference). User manually rewrote many term desc (Command/SubCommand/Arg/Skill/etc).
- **Module Domains v0.2.1** (asset/work/proof): "X = oxn-domain.X 在..." pattern rewritten to direct What. sub↔sub MD links deleted (work↔proof Part/Probe/AssetHash/Frozen). docs/ links removed.
- **backlinks.ts refactored**: `Backlink` interface — sourceTerm/linkText/linkUrl now optional; added `source: 'md-link' | 'references-frontmatter'` + `references?: string[]`. New `extractReferencesBacklinks()` function. `buildBacklinkIndex()` now bidirectional union. `collectLinksFromNode` adds `source: 'md-link'`.
- **index.ts**: Exports `extractReferencesBacklinks` added.
- **domain.ts CLI**: `formatShowHuman` updated to distinguish md-link vs references-frontmatter backlinks. TypeScript fix for optional sourceTerm.
- **backlinks.test.ts rewritten**: 4 sample domains (work/proof/root/engine), tests for extractMdLinksFromDomain/extractReferencesBacklinks/buildBacklinkIndex.
- **Lint ✅, Typecheck ✅, validate-deps ✅, 7 Domain validate ✅** all pass.

### Active
- **3 tests failing in backlinks.test.ts**: `extractReferencesBacklinks > extracts references list from sub Domain`, `buildBacklinkIndex > sub→root 反向`, `buildBacklinkIndex > 双向 union`. Root cause likely: `parseMarkdown` frontmatter not parsing YAML arrays correctly → `frontmatter.references` not `Array.isArray` → `extractReferencesBacklinks` returns empty. Need to debug how `parseMarkdown` from `../utils` handles YAML array frontmatter values.
- Full `bun test` not yet run (only backlinks.test.ts subset attempted).
- `oxn domain show` not yet verified with new bidirectional backlinks.
- `bun run docs:build` not yet run.

### Blocked
- backlinks.test.ts 3 failures need debugging (likely `parseMarkdown` YAML array parsing).
- `oxn domain index` still reports all Domains as invalid (pre-existing `domain-index-builder.ts:153` only handles .oxn/DSL format).
- daemon physical migration `src/daemon/` → `packages/engine/src/daemon.ts` (independent sprint).

## Next Move
1. Debug `extractReferencesBacklinks`: check if `parseMarkdown` returns `frontmatter.references` as array or string; if string, parse it or use `extractYamlFromTree` differently.
2. Fix 3 failing backlinks tests, run full `bun test`.
3. Run `oxn domain show OxnDomain` / `OxnEngineDomain` / `OxnCliDomain` to verify bidirectional backlinks display correctly.
4. Run `bun run docs:build` + grep final confirmation (no docs/ links, no code paths, no sub↔sub MD links in Domain files).

## Relevant Files
- `.openxenon/assets/domains/oxn-domain.md`: root v0.4.1, 16 terms (added OXL), 7 root→sub MD links preserved.
- `.openxenon/assets/domains/oxn-engine-domain.md`: v0.4.1, 9 terms, 3 groups, all impl words/docs links/code paths removed.
- `.openxenon/assets/domains/oxn-cli-domain.md`: v0.4.1, references `[oxn-domain, oxn-engine-domain]`, ExitCode simplified, inv-16 updated.
- `.openxenon/assets/domains/oxn-{asset,work,proof}-domain.md`: v0.2.1, "X=oxn-domain.X..." rewritten, sub↔sub MD links deleted.
- `.openxenon/assets/domains/oxn-insight-domain.md`: v0.2.0 (unchanged this round except P5 desc rewrite).
- `.openxenon/docs/adrs/0059-domain-reference-model-v2.md`: §D2 constraint added, §D3 algorithm rewritten (bidirectional).
- `.openxenon/docs/adrs/0060-domain-vocabulary-boundary.md`: NEW — D1-D9 (What/How, vocabulary categories, root=features, same-name multi-domain, reference rules, invariant self-sufficiency, OXL split trigger, 视角隔离, 代码物理≠归属).
- `.openxenon/docs/adrs/INDEX.md`: Added "7. Domain 词汇架构" section with ADR-0052/0059/0060.
- `.openxenon/docs/rfcs/v0.7-domain-hierarchy-restructure-rfc.md`: §2 全景图 Engine terms reduced to 9; root terms added OXL; §2.1 演进表 added v0.4.1 row.
- `packages/engine/src/oxl/md-pipeline/backlinks.ts`: Refactored — bidirectional scan (references frontmatter + desc MD link), `Backlink` interface changed, `extractReferencesBacklinks` added, `buildBacklinkIndex` does union.
- `packages/engine/src/oxl/md-pipeline/__tests__/backlinks.test.ts`: Rewritten — 4 sample domains, 11 tests (8 pass, 3 fail).
- `packages/engine/src/oxl/md-pipeline/index.ts`: Added `extractReferencesBacklinks` export.
- `packages/cli/src/commands/domain.ts`: `formatShowHuman` updated for bidirectional backlinks display (md-link vs references-frontmatter).
- `packages/engine/src/oxl/md-pipeline/utils.ts`: `parseMarkdown` — need to check how it handles YAML array frontmatter (root cause of test failures).

---

