# 三层 Proof 架构 v2：Work-Tasks / Work-Domains / Domains 全量

> **日期**：2026-06-14 | **状态**：Design Draft v2.0
>
> **v1 → v2 关键反转**（基于 6 轮讨论的最终结论）：
>
> | 维度 | v1（已弃） | v2（本设计） |
> |---|---|---|
> | **Invariant 承载** | `verify = probe { contract, goal }` | **`script = "path/to/script"`**（退出码即判定） |
> | **Probe Contract** | `stat` / `read` / `exec` 三选一 | **仅 `exec` 一种**（脚本 = 退出码） |
> | **Kernel 判定职责** | 维护 `GoalRegistry` + `evaluate()` 纯函数 | **退化为"退出码解析"**（0=PASS, 1=FAIL, 2=ERROR） |
> | **Domain 物理布局** | 升为目录（`Domain/oxn + invariants/*.ts`） | **保持单文件**（`Domain/*.oxn`），script 路径自寻址 |
> | **Work 引用 Invariant** | `domain_impact { Domain: [rule] }` | `domain_proofs: [domainId/rule]` 路径列表 |
> | **轴耦合** | Intent 混入 Proof 细节（IAP 轴不洁） | **Intent 保持纯净**，脚本实现细节在 Domain 内部自洽 |
>
> **核心反转**：任何复杂的业务约束都可以收敛为一个脚本的退出码。一旦接受这个前提，stat/read/exec 的映射、Goal Registry、VerifyVerb 映射表、Probe 组合爆炸——**全部消失**。这是 Unix 哲学在 IAP 范式下的极致体现。
>
> **关联文档**：
>
> - [`2026-06-14-probe-signal-taint-design.md`](./2026-06-14-probe-signal-taint-design.md) — Probe 行为降维到 3 个 IO 原语；本设计**不破坏**，第一层 Blueprint observe 仍走 3 IO 原语，第二层 + 第三层走 `exec` 调脚本
> - [`2026-06-13-intent-pool-design.md`](./2026-06-13-intent-pool-design.md) — Pool 5 类；本设计 calibrationSignals 走 research 池
> - [`2026-06-12-c2-retraction.md`](./2026-06-12-c2-retraction.md) — forges/ 双重身份澄清
> - [AGENTS.md §OXN DSL](../../AGENTS.md) — OXL 语法边界（`invariant` 已是 Domain 一等公民）
>
> **一句话定位**：把 Proof 拆成**微观/中观/宏观三层**——第一层验证"做完了事"（Blueprint 驱动，AI 编排 + 3 IO 原语），第二层验证"预期边界没破"（AI 显式筛选 Domain Invariant，**每条 Invariant 走一段脚本**），第三层验证"所有边界都没破"（系统全量跑所有 Domain Invariant 脚本）。**第二层与第三层的差异是 AI 校准信号**——未预期的边界破坏比已预期的更危险，这个信号直接流入 Research Pool。

---

## 0. 元信息

- **作者**：opencode（基于 domains-proof-1.md 6 轮讨论推导 v2）
- **目标读者**：架构师 + OXN 维护者 + AI 协作者
- **关联 IAP 轴**：Proof（核心）、Intent（calibrationSignals 出口 + Domain 脚本资产）
- **影响路径**：
  - 改造 L2 层（OXL DSL）：`src/oxl/langium/oxn.langium`
    - `InvariantDecl` 扩字段（向后兼容）：`script?: STRING` + `scope?: ScopeDecl` + `manual?: boolean`
    - `WorkDeclaration` 增字段（向后兼容）：`domain_proofs?: STRING[]`（路径列表，IAP 标准寻址）
    - `ScopeDecl` 新规则：`affectedPaths: STRING[]`（保留用于第二层 + 第三层的 scope 预过滤）
  - 改造 L3 层（CLI）：`src/cli/proof.ts`
    - `subCommands.audit` —— 独立 `oxn proof audit <workId>`（第三层入口）
  - 改造 L3 层（Runtime）：`src/infra/frozen/immutable.ts`
    - 新增第二层 frozen 节点类型 `workDomainsProof`
    - 新增第三层 frozen 节点类型 `projectDomainsProof`
  - 新建 L3 层（CLI 子命令骨架）：`src/cli/proof-audit.ts`
  - 改造 L3 层（Work finalize 钩子）：`src/cli/work.ts`
    - `oxn work finalize` 前置触发第二层（**硬阻断**），并自动建 journal 骨架
  - 改造 Pool：第二层产出 `calibrationSignals: CalibrationSignal[]`
    - 当出现 "AI 第二层未选 / 第三层 FAIL" 时，写入 `.openxenon/pools/research/POOL-R<N>-<slug>/`
  - 文档：`docs/proof.md` 新增 §"三层 Proof 模型"；`docs/cli.md` 新增 `oxn proof audit` 条目
- **依赖**：
  - 前置：v0.1.2 Proof-First 入口（`oxn proof create/probe/run/list/show`）— **本设计扩展 proof CLI**
  - 前置：OXL `invariant` 语法（v0.1-final DDD）— **本设计扩展 InvariantDecl，不破坏**
  - 前置：Probe Signal Taint v1（`io.stat/io.read/io.exec` 3 原语 + `interference_flags`）— **本设计不破坏**：第一层 Blueprint observe 仍走 3 IO 原语；第二层 + 第三层走 `exec` 调 Domain 脚本（脚本内部若需要 IO，由 Infra 自处理）
  - 前置：Intent Pool 5 类（research/journal/...）— **calibrationSignals 走 research 池**
  - 关联：v1.1 8 阶段 work 流程（init→migrate→create→add-task→validate→lock→run→submit/status）— **不破坏**，第二层作为 `submit` → `finalize` 之间的钩子
- **范围之外（Non-Goals）**：
  - N1：**不**把第二层 + 第三层嵌入 `work run`（AI 反馈速度要求分离）
  - N2：**不**让第二层与 Blueprint `observe` 合一（语义不同：observe 是"做完了事"、domain_proofs 是"预期触及边界"）
  - N3：**不**提供 AI override 跳过第二层 FAIL（硬阻断，必须修复）
  - N4：**不**实现远程 Probe / 远程 Invariant 脚本（与 Probe Taint v1 ADR-1 同源立场）
  - N5：**不**改造 frozen.json 的不可变机制（`content_hash` + `chmod 0o444` 保留）
  - N6：**不**改动 Kernel 三 IO 原语（第一层仍用；第二层 + 第三层由 Infra `exec` 探针自处理）
  - N7：**不**把 Domain 升级为目录（保持 `Domain/*.oxn` 单文件，script 路径自寻址）
  - N8：**不**维护 Goal Registry / VerifyVerb 映射表（v1 已弃，v2 退回 Unix 哲学）

---

## What

> **一句话总结**：把当前"AI 读 Domain invariant 文本 → 自己设计 Probe → 写进 Blueprint → 执行"的黑箱，拆成**三个有明确语义与触发点的 Proof 层**。Invariant 的承载从 `verify = probe { contract, goal }` 翻转为 `script = "<path>"` —— **每条 Invariant = 1 个脚本 = 退出码即判定**（0=PASS、1=FAIL、2=ERROR），Probe 退化为 `exec` 一种形态。第一层（**Work-Tasks Proof**，微观/主动）由 Blueprint 驱动、AI 编排、每个 Task 即时产出 `tasks/<t>/frozen.json`；第二层（**Work-Domains Proof**，中观/预期）在 `oxn work finalize` 前置触发，AI 必须在 `work.oxn` 显式声明 `domain_proofs`（预期触及哪些 Domain 的哪些 Invariant），系统**只跑**AI 选中的 Invariant 脚本、产出 `works/<w>/work-domains-frozen.json`，**硬阻断** finalize；第三层（**Domains Proof**，宏观/兜底）由独立命令 `oxn proof audit <workId>` 触发，**完全绕开 AI 预期**、系统全量跑所有 Domain Invariant 脚本、按 `scope.affectedPaths` 增量过滤、产出 `works/<w>/project-domains-frozen.json`，**未预期的边界破坏**会以 `calibrationSignals` 形式流入 Research Pool，作为 AI 自我校准的反馈源。

---

## 1. 背景与动机

### 1.1 当前的断裂：Domain invariant 文本与实际验证机制脱节

`AGENTS.md:81` 把 `forges/` 描述为 Forge 设计笔记，但 Domain 文件里的 invariant 现状是：

```oxn
// .openxenon/domains/proof.oxn
domain "ProofDomain" {
  invariant {
    "Kernel 永远不触碰物理世界"
  }
}
```

**invariant 只是一句自然语言**——AI 可以忽略它，人类可以忘记它。当前实际执行靠的是：

- `bun scripts/validate-dependencies.ts`（静态分析，CI 跑）
- 代码审查（人工）
- **没有任何 Probe 在自动验证这条 invariant**

Blueprint `observe` 看起来像是在验证，但语义不同：

```oxn
observe "代码不引入 fs" using fs-not-exists  // ← 检查"某个文件不存在"
//  ≠  "代码里没有 fs 调用"（编译时/扫描时问题）
```

### 1.2 6 轮讨论的演进：从 verify=probe 到 invariant=脚本

| 轮次 | 核心命题 | 关键决定 | 状态 |
|---|---|---|---|
| 1 | invariant 与 Probe 能否绑死 | **解耦为 `invariant + verify`**，verify 4 选 1（static/lint/schema/probe/manual） | 保留 verify 思想 |
| 2 | 双层 Proof + scope 自动过滤 | 解决"Probe 太多全跑太慢" | 升华为第三层 |
| 3 | 三层 Proof + AI 校准信号 | 微观/中观/宏观递进 | **保留为骨架** |
| 4 | 谨慎回顾 + 分阶段 | v1.0 → v2.0 → v3.0 三阶段落地 | 整合进 ADR |
| 5 | 引入 Goal Registry 解决组合爆炸 | `verify = probe { contract, goal }` | **v2 推翻** |
| 6 | Goal 暴露 4 层机制（Registry / OXL / CLI / frozen） | — | **v2 推翻** |
| 7 | 警惕轴耦合 | Domain 不应暴露 Probe 细节，IAP 轴必须分离 | **v2 推翻** |
| 8 | Invariant 收敛为脚本 + exec 一统 | **v2 最终方案** | **采用** |

**第 8 轮的关键反转**：

> 任何复杂的业务约束，最终都可以收敛为一个**脚本的退出码**（0=PASS，非 0=FAIL）。一旦接受这个前提，stat/read/exec 的映射、Goal Registry、VerifyVerb 映射表、Probe 组合爆炸——**全部消失**。

这是 Unix 哲学在 IAP 范式下的极致体现。v1 草案里那些精心设计的 Goal Registry、4 层暴露机制——都是不必要的复杂度。

### 1.3 设计目标

1. ✅ **Invariant 即脚本**——`script = "path"`，1 脚本 = 1 invariant，退出码即判定
2. ✅ **三层 Proof 拆开 AI 主动预期与系统被动兜底**——避免单层过载
3. ✅ **AI 校准信号**——`calibrationSignals` 显式记录"AI 未预期但被破坏的 Invariant"，流入 Research Pool
4. ✅ **不破坏 v1.1 8 阶段 work 流程**——第二层是 `submit` 与 `finalize` 之间的钩子；第三层是独立命令
5. ✅ **不破坏 Probe Signal Taint v1**——第一层仍走 3 IO 原语；第二/三层走 `exec` 调脚本（脚本内部 IO 由 Infra 自处理）
6. ✅ **不破坏 Domain 单文件布局**——保持 `Domain/*.oxn`，script 路径自寻址（不强制 .ts 也不强制目录）
7. ✅ **向后兼容**——没有 `script` 的 invariant 仍是纯文本；没有 `domain_proofs` 的 work 不强制跑第二层（v2.0 阶段）

---

## 2. 核心架构

### 2.1 三层 Proof 总览（v2 简化版）

```
┌─────────────────────────────────────────────────────────────┐
│  第一层：Work-Tasks Proof（微观 / 主动 / 做了什么）         │
│                                                             │
│  驱动：Blueprint observe                                    │
│  编排：AI                                                   │
│  语义："我声称改了 X，X 现在符合预期"                       │
│  时机：oxn work run / submit，每 Task 即时出                │
│  产出：works/<w>/.run/tasks/<t>/frozen.json                 │
│  失败：阻断 Task，回滚 Task                                 │
│  Probe 数：2-5 / Task（走 Probe Taint v1 3 IO 原语）        │
│  速度：< 5s / Task                                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ 所有 Task PASS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  第二层：Work-Domains Proof（中观 / 预期 / 触及什么边界）   │
│                                                             │
│  驱动：work.oxn 的 domain_proofs 列表                       │
│  筛选：AI 显式选择相关 Domain + Invariant                   │
│  语义："我预期触及了这些边界，确认没有越界"                 │
│  时机：oxn work finalize 前置（v1.2+ 引入，submit 之后）   │
│  执行：Infra exec 探针跑 invariant.script，退出码即判定   │
│  产出：works/<w>/work-domains-frozen.json                   │
│  失败：硬阻断 finalize，AI 必修复（无 override）            │
│  脚本数：3-8 / Work（AI 筛选）                              │
│  速度：< 30s / Work                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ 所有 Invariant 脚本 PASS
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  第三层：Domains Proof（宏观 / 兜底 / 全量边界完整性）      │
│                                                             │
│  驱动：Domain invariant.script 全部                         │
│  筛选：OpenXenon 全量执行（不依赖 AI 预期）                 │
│  语义："不管你预期了什么，项目的所有硬规则都没被打破"       │
│  时机：独立命令 oxn proof audit <workId>（CI / 手动）       │
│  执行：Infra exec 探针跑所有 invariant.script              │
│  产出：works/<w>/project-domains-frozen.json                │
│  失败：阻断 work "audit passed" 标记，触发架构审查         │
│  脚本数：22+ 全量（按 scope.affectedPaths 增量过滤）        │
│  速度：1-3 min / Work（并行执行）                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 与现有流程的耦合

```bash
# 现有 v1.1 8 阶段（AGENTS.md 锁定的流程）
oxn work init           # Phase 1
oxn work migrate        # Phase 2
oxn work create <name>  # Phase 3
oxn work add-task       # Phase 4
oxn work validate       # Phase 5
oxn work lock           # Phase 6（防 work 漂移）
oxn work run            # Phase 7  ← 第一层触发
oxn work submit         # Phase 8  ← 第一层收敛
oxn work status

# 新增（本设计 v2.0 引入）
oxn work finalize       # v1.2+ 新增；前置触发第二层；硬阻断
oxn proof audit <w>     # 独立命令；触发第三层
```

**关键不破坏性**：
- v1.1 8 阶段中前 6 阶段不动
- 第一层完全在 `run`/`submit` 内部完成（不破坏现有 Test）
- `work finalize` 是**新**的子命令，v1.1 流程不强制使用（v2.0 阶段过渡）
- `proof audit` 完全独立于 work 流程
- 第一层仍走 [Probe Signal Taint v1](./2026-06-14-probe-signal-taint-design.md) 的 3 IO 原语（不破坏）

### 2.3 三层职责矩阵

| 维度 | 第一层 Task Proof | 第二层 Work-Domains | 第三层 Project-Domains |
|---|---|---|---|
| **驱动者** | AI 编排 | AI 显式选择 | 系统全量 |
| **来源** | Blueprint `observe` | work.oxn `domain_proofs` 列表 | Domain `invariant.script` 全部 |
| **执行机制** | Probe Taint v1 3 IO 原语 | Infra `exec` 探针 + 脚本 | Infra `exec` 探针 + 脚本 |
| **判定方式** | Probe 内置 verdict | **退出码 0/1/2** | **退出码 0/1/2** |
| **执行时机** | `work run` / `submit` | `work finalize` 前置 | `proof audit` 命令 |
| **筛选机制** | 业务相关 | AI 选择 | scope 预过滤 + 全量 |
| **产出文件** | `tasks/<t>/frozen.json` | `work-domains-frozen.json` | `project-domains-frozen.json` |
| **失败行为** | 阻断 Task | 硬阻断 finalize | 阻断 audit passed |
| **失败修复** | 改代码 + 重跑 Task | 改代码或调整 domain_proofs | 触发架构审查 + AI 校准 |
| **速度要求** | 快（< 5s/Task） | 中（< 30s/Work） | 慢（1-3 min/Work） |
| **AI 认知负担** | 高（要设计 Probe） | 中（要选择 Invariant） | 零（系统接管） |
| **可审计性** | frozen.json | frozen.json + skippedByAI | frozen.json + calibrationSignals |
| **典型条目数** | 2-5 Probe/Task | 3-8 Invariant/Work | 22+ Invariant/Work |

---

## 3. OXL 语法扩展（向后兼容）

### 3.1 设计原则（v2 反转）

**v1 草案的问题**：`verify = probe { contract = "stat", goal = "file-is-immutable" }` 让 Domain（Intent 轴）暴露了 Probe Contract（Proof 轴）——**IAP 轴耦合**。架构师写 Domain 时被迫懂 stat/read/exec，增加认知负担。

**v2 翻转**：Domain 不关心"用什么 Probe"，只声明"用什么脚本验证"。脚本是 Domain 的**业务资产**（不是 Probe 资产），写在 Domain 内部或仓库约定路径下，由 Infra `exec` 探针统一执行。

**核心契约**：

> **1 Invariant = 1 脚本 = 退出码即判定**（0=PASS、1=FAIL、2=ERROR）
>
> 脚本可以是 `.ts` / `.sh` / `.py` / `.js`——Kernel **不关心**是哪种，由 Infra `exec` 探针处理。错了就直接 FAIL。

### 3.2 `InvariantDecl` 扩字段

**当前语法**（`src/oxl/langium/oxn.langium:195-197`）：

```oxn
InvariantDecl:
    value=STRING ';'?;
```

**扩展后**：

```oxn
InvariantDecl:
    value=STRING
    (script=ScriptDecl)?
    (manual=ManualDecl)?
    (scope=ScopeDecl)?
    ';'?;

ScriptDecl:
    'script' '=' path=STRING ';'?;

ManualDecl:
    'manual' ';'?;    // 标记为人工审查（无脚本）

ScopeDecl:
    'scope' '{' 'affectedPaths' '=' '[' (paths+=STRING (',' paths+=STRING)*)? ']' ';' '}';
```

**字段语义**：

| 字段 | 类型 | 含义 | 缺省行为 |
|---|---|---|---|
| `script` | STRING | 脚本路径（相对工作区根或绝对） | 缺省 = 纯文本，**不在第二/三层执行** |
| `manual` | flag | 标记为人工审查（无脚本） | 缺省 = 视为纯文本 |
| `scope` | block | 受影响路径（用于第二/三层的 scope 预过滤） | 缺省 = 全局 invariant（每次都跑） |

**`script` 与 `manual` 互斥**：二选一；同写 → 编译报错 `IAP_INVARIANT_SCRIPT_MANUAL_CONFLICT`。

### 3.3 完整 Domain 示例

```oxn
domain "ProofDomain" {
  // ── 用脚本验证（v2 主路径）──

  invariant {
    "Kernel 永远不触碰物理世界：不调用 fs.* / net.* / child_process"
    script = "scripts/invariants/proof/check-kernel-zero-io.ts"
    scope { affectedPaths = ["src/kernel/**"] }
  }

  invariant {
    "FrozenJson 生成后只读（权限 + 哈希）"
    script = "scripts/invariants/proof/check-frozen-immutable.ts"
    scope { affectedPaths = ["src/infra/frozen/**", "src/core/engine.ts"] }
  }

  invariant {
    "Builtin 不依赖 @prj"
    script = "scripts/invariants/proof/check-builtin-no-prj-deps.ts"
    scope { affectedPaths = ["src/builtin/**"] }
  }

  invariant {
    "Trace 只追加写、不能重写"
    script = "scripts/invariants/proof/check-trace-append-only.sh"
    scope { affectedPaths = [".openxenon/works/*/work-trace.jsonl"] }
  }

  // ── 人工审查（v2 显式标记）──

  invariant {
    "Proof 是有立场的判定（不是中性的证据记录）"
    manual
  }
  // 无 scope = 全局不变式
}
```

**脚本示例**（`scripts/invariants/proof/check-frozen-immutable.ts`）：

```typescript
#!/usr/bin/env bun
/**
 * Invariant: FrozenJson 生成后只读（权限 + 哈希）
 *
 * 规范：
 *   - 退出码 0 = PASS
 *   - 退出码 1 = FAIL，stdout/stderr 输出原因
 *   - 退出码 2 = ERROR（脚本自身异常）
 *
 * 调用：oxn exec-invariant <work-dir> <proof-dir>
 */
import { stat, readFile } from 'node:fs/promises'
import { join } from 'node:path'

async function main() {
  const workDir = process.argv[2]
  if (!workDir) {
    console.error('Usage: check-frozen-immutable.ts <work-dir>')
    process.exit(2)
  }

  // 扫描所有 frozen.json
  const frozenFiles = await glob(`${workDir}/.openxenon/proofs/*/frozen.json`)
  let violations = 0
  for (const file of frozenFiles) {
    const s = await stat(file)
    if ((s.mode & 0o222) !== 0) {
      console.error(`FAIL: ${file} is writable (mode=${s.mode.toString(8)})`)
      violations++
    }
  }
  if (violations > 0) process.exit(1)
  console.log('PASS: all frozen.json are immutable')
}

main().catch((e) => {
  console.error(`ERROR: ${e.message}`)
  process.exit(2)
})
```

### 3.4 `WorkDeclaration` 增 `domain_proofs`

**当前语法**（`src/oxl/langium/oxn.langium:201-209`）：

```oxn
WorkDeclaration:
    'work' name=STRING '{'
        (context=WorkContext)?
        (domains+=DomainRefDecl)*
        (blueprints+=BlueprintRefDecl)*
        (parts+=PartRefDecl)*
        (probes+=ProbeRefDecl)*
        (tasks+=TaskDeclaration)*
    '}';
```

**扩展后**（在 `tasks` 之后增可选 `domain_proofs`）：

```oxn
WorkDeclaration:
    'work' name=STRING '{'
        (context=WorkContext)?
        (domains+=DomainRefDecl)*
        (blueprints+=BlueprintRefDecl)*
        (parts+=PartRefDecl)*
        (probes+=ProbeRefDecl)*
        (tasks+=TaskDeclaration)*
        (domainProofs+=DomainProofRef)?
    '}';

DomainProofRef:
    'domain_proofs' '=' '[' (refs+=STRING (',' refs+=STRING)*)? ']' ';';
```

**第二层 AI 显式声明示例**：

```oxn
work "fix-grammar-deps" {
  context {
    source_pool = "POOL-D001-grammar-deps-fix"
    goal = "修复语法依赖写法"
  }
  // … 既有 domain/blueprint/tasks …

  // ← 第二层：AI 显式声明"我预期会触及这些 Domain 边界"
  domain_proofs = [
    "ProofDomain/Kernel 永远不触碰物理世界",       // ← 改了 Kernel 代码
    "ProofDomain/Builtin 不依赖 @prj"               // ← 改了 Builtin 注册
  ]
  // 路径格式：<DomainName>/<invariant.value>
  // AI 没选 DocContext 的不变式，因为 AI 预期不涉及文档
}
```

**路径解析规则**：`domain_proofs` 数组中的每条路径格式为 `<DomainName>/<invariant.value>`：
- `DomainName` 必须**完全匹配** `work.domains[]` 中已声明的 Domain
- `invariant.value` 必须**完全匹配** Domain 文件中某条 invariant 的 `value`
- 不匹配 → `oxn work validate` 报错 `IAP_WORK_INVARIANT_NOT_FOUND`
- `manual` 类型的 invariant 出现在 `domain_proofs` 中 → 报错 `IAP_MANUAL_INVARIANT_NOT_PROVABLE`

### 3.5 向后兼容矩阵

| 旧写法 | 新写法 | 行为 |
|---|---|---|
| `invariant { "rule" }` | 同左（无 script/manual） | 纯文本；不出现在第二层/第三层 |
| `invariant { "rule" script = "..." }` | 新 | 第二层 + 第三层都跑（Infra `exec` 执行脚本） |
| `invariant { "rule" manual }` | 新 | 仅文本；v2 阶段人工审查，不阻断 finalize |
| `work "w" { tasks { ... } }` | 同左（无 domain_proofs） | 第一层照常；第二层跳过（v2.0 阶段过渡）；第三层照常 |
| `work "w" { tasks { ... } domain_proofs = [...] }` | 新 | 第一层 + 第二层 + 第三层都跑（硬阻断） |

---

## 4. 三层执行流程

### 4.1 第一层 Work-Tasks Proof（已存在，本设计不破坏）

**执行时机**：`oxn work run` 与 `oxn work submit` 内部。

**数据流**（现有逻辑，本设计不修改）：

```
Blueprint observe  ──→  解析为 Probe 列表
                          ↓
                   每个 Task 跑完后执行
                          ↓
                   .run/tasks/<t>/frozen.json
                          ↓
                   PASS/FAIL 推进状态机
```

**V2.0 行为契约**：

- AI 在 Blueprint 中 `observe` 声明 Probe
- 每次 Task 跑完 → 立即产出 `tasks/<t>/frozen.json`
- 任一 Probe FAIL → Task 失败（不阻断 Work，但 Task 重跑）
- Work 全部 Task PASS → 进入 `work submit` 收敛
- 第一层 Probe 走 [Probe Signal Taint v1](./2026-06-14-probe-signal-taint-design.md) 的 3 IO 原语（不破坏）

### 4.2 第二层 Work-Domains Proof

**执行时机**：`oxn work finalize` 前置（v1.2+）。

**`oxn work finalize <name>` 内部流程（v2 简化版）**：

```
1. 读 work.oxn 的 domain_proofs 数组
   → AI 声明的预期边界清单（路径格式：<DomainName>/<invariant.value>）
2. 系统对每条声明做存在性校验
   → invariant.value 在对应 Domain 文件中存在？
   → 不存在 → 报错 IAP_WORK_INVARIANT_NOT_FOUND
   → invariant 标了 manual → 报错 IAP_MANUAL_INVARIANT_NOT_PROVABLE
3. 对每条 script 类型的 invariant：
   a. 解析 invariant.script 路径
   b. 走 Infra exec 探针：<script-path> <work-dir> <proof-dir>
   c. 捕获退出码：0 → PASS, 1 → FAIL, 2 → ERROR
   d. 捕获 stdout/stderr 写入 frozen
4. 写 works/<w>/work-domains-frozen.json
5. 全部 PASS → finalize 通过
6. 任一 FAIL/ERROR → 硬阻断，输出失败清单
```

**`work-domains-frozen.json` 结构（v2）**：

```json
{
  "workId": "fix-grammar-deps",
  "timestamp": "2026-06-14T00:00:00Z",
  "schemaVersion": 2,
  "layer": "work-domains",
  "driver": "AI_SELECTION",
  "status": "PASSED",
  "triggeredInvariants": [
    {
      "domain": "ProofDomain",
      "rule": "Kernel 永远不触碰物理世界",
      "script": "scripts/invariants/proof/check-kernel-zero-io.ts",
      "verdict": "PASSED",
      "exitCode": 0,
      "stdout": "PASS: Kernel has zero IO imports",
      "stderr": "",
      "durationMs": 245
    },
    {
      "domain": "ProofDomain",
      "rule": "Builtin 不依赖 @prj",
      "script": "scripts/invariants/proof/check-builtin-no-prj-deps.ts",
      "verdict": "PASSED",
      "exitCode": 0,
      "stdout": "PASS: no @prj dependencies",
      "stderr": "",
      "durationMs": 312
    }
  ],
  "skippedByAI": [
    {
      "domain": "DocContext",
      "rule": "Sidebar 6 桶固定",
      "reason": "AI assessed no impact"
    }
  ],
  "signature": "sha256:..."
}
```

**硬阻断契约**：

- 第二层 FAIL/ERROR → finalize 退出码 1（IAPError）
- 输出 `failedInvariants: FailedInvariant[]`（domain/rule/exitCode/stdout/stderr 完整记录）
- **不允许 override**（与 v0.1 Probe Taint ADR-1 同源立场：确定性优先）
- AI 修复路径：要么改代码（让脚本退出码变 0）、要么调整 `domain_proofs` 声明（如果 AI 误判了边界）

### 4.3 第三层 Project-Domains Proof

**执行时机**：独立命令 `oxn proof audit <workId>`（CI pipeline / 手动触发）。

**与 Work 流程的解耦**：

- 第三层**不**嵌入 `work finalize`——独立命令，按需触发
- Work 在 finalize 后状态是 `done`，不代表 `audit passed`
- Work 显式状态新增 `audit_passed: boolean`（true 当且仅当第三层最近一次运行 PASS）

**`oxn proof audit <workId>` 内部流程（v2 简化版）**：

```
1. 读 works/<w>/work.oxn + work.oxn 引用的所有 Domain 文件
2. 收集所有含 script 字段的 invariant（无 script = 纯文本，不跑）
3. 按 scope.affectedPaths 过滤：
   a. git diff --name-only HEAD~1（与上次 audit 相比的改动）
   b. 匹配 invariant.scope.affectedPaths
   c. 无 scope = 全局（必跑）
4. 对每条 script 类型的 invariant：
   a. 走 Infra exec 探针：<script-path> <work-dir> <proof-dir>
   b. 捕获退出码：0 → PASS, 1 → FAIL, 2 → ERROR
5. 并行执行（invariant 间无依赖；Domain 间无依赖）
6. 写 works/<w>/project-domains-frozen.json
7. 收集 calibrationSignals：
   - 比对 layer2.skippedByAI 与 layer3.allInvariants
   - 任何"layer2 未选 + layer3 FAIL/ERROR"的项 = 校准信号
8. 全部 PASS + 无信号 → audit 通过
9. 出现 FAIL/ERROR 或 calibrationSignals 非空 → 输出报告
```

**`project-domains-frozen.json` 结构（v2）**：

```json
{
  "workId": "fix-grammar-deps",
  "timestamp": "2026-06-14T00:00:00Z",
  "schemaVersion": 2,
  "layer": "project-domains",
  "driver": "OPENXENON_FULL",
  "status": "PASSED",
  "allInvariants": [
    {
      "domain": "ProofDomain",
      "rule": "Kernel 永远不触碰物理世界",
      "script": "scripts/invariants/proof/check-kernel-zero-io.ts",
      "verdict": "PASSED",
      "exitCode": 0,
      "scope": { "affectedPaths": ["src/kernel/**"] }
    },
    {
      "domain": "DocContext",
      "rule": "Sidebar 6 桶固定",
      "script": "scripts/invariants/doc/check-sidebar-6-buckets.sh",
      "verdict": "PASSED",
      "exitCode": 0,
      "scope": { "affectedPaths": ["docs/.vitepress/config.ts"] }
    }
  ],
  "skippedByScope": [
    {
      "domain": "ProofDomain",
      "rule": "Builtin 不依赖 @prj",
      "reason": "affectedPaths [src/builtin/**] not matched by work changes"
    }
  ],
  "calibrationSignals": [
    {
      "domain": "DocContext",
      "rule": "Sidebar 6 桶固定",
      "layer2": "skipped",
      "layer3": "FAILED",
      "exitCode": 1,
      "stderr": "FAIL: sidebar order drift detected at line 42",
      "detail": "AI 在第二层未选，但第三层发现 sidebar 顺序漂移"
    }
  ],
  "signature": "sha256:..."
}
```

### 4.4 frozen.json 三层结构对比

| 字段 | 第一层 `tasks/<t>/frozen.json` | 第二层 `work-domains-frozen.json` | 第三层 `project-domains-frozen.json` |
|---|---|---|---|
| **路径** | `works/<w>/.run/tasks/<t>/frozen.json` | `works/<w>/work-domains-frozen.json` | `works/<w>/project-domains-frozen.json` |
| **driver** | `BLUEPRINT` | `AI_SELECTION` | `OPENXENON_FULL` |
| **status 字段** | `PASSED` / `FAILED` | `PASSED` / `FAILED` | `PASSED` / `FAILED` / `WITH_CALIBRATION_SIGNALS` |
| **triggered** | Probe 列表 | AI 选的 Invariant 列表 | 全量（按 scope 过滤后） |
| **skipped** | — | `skippedByAI[]` | `skippedByScope[]` |
| **校准** | — | — | `calibrationSignals[]` |
| **不可变性** | content_hash + chmod 0o444 | 同左 | 同左 |

---

## 5. calibrationSignals 回路：流入 Research Pool

### 5.1 触发条件

**仅当出现以下情况时生成 calibrationSignals**：

1. 第二层 `skippedByAI[]` 中某条 script-invariant，在第三层 FAIL/ERROR
2. 或 work.oxn **没有** `domain_proofs` 数组（v2.0 阶段过渡）但第三层有 FAIL/ERROR
3. **manual 类型的 invariant 不构成校准信号**（人工审查，无法机器判定）

**校准信号结构（v2）**：

```ts
interface CalibrationSignal {
  domain: string
  rule: string                          // invariant.value
  layer2: 'selected' | 'skipped' | 'not-declared'
  layer3: 'PASSED' | 'FAILED' | 'ERROR' | 'SKIPPED_BY_SCOPE'
  script: string                        // invariant.script 路径
  exitCode: number | null
  stderr: string                        // 脚本 stderr 摘要（最多 500 字符）
  detail: string                        // 人类可读的漂移解释
  evidenceRef: string                   // 指向 project-domains-frozen.json 路径
}
```

### 5.2 写入 Research Pool

**触发点**：`oxn proof audit` 第三层执行完毕后（带 `--calibrate` 时）。

**写入流程**：

```
1. 收集 calibrationSignals（去重 by domain+rule）
2. 若非空：
   a. 生成 .openxenon/pools/research/POOL-R<N>-<slug>/ 目录
      - slug = 第一个 signal 的 domain + "-" + 时间戳
   b. 写 content.md（自动套 research 池模板，与 check-heading-skeleton.ts 兼容）
   c. 写 meta.json（含 reference 指向 project-domains-frozen.json）
   d. 状态 drafting（v2.0 阶段不自动 finalize）
3. 输出："发现 N 条 AI 校准信号 → 写入 Research Pool POOL-R<N>-<slug>"
```

**Research Pool content.md 自动骨架**（与 `scripts/check-heading-skeleton.ts` 兼容）：

```md
# 标题：三层 Proof 校准信号（<domain> + <时间戳>）

> **创建日期** 2026-06-14 | **状态** drafting
> **关联** 上游 [.openxenon/works/<w>/project-domains-frozen.json]

## 0. 元信息
- 类型：research
- 作者：opencode（自动生成）
- 关联 IAP 轴：proof
- 影响路径：src/...

## What
[自动] 此次 audit 发现 N 条 AI 未预期但被破坏的不变式

## 现状快照
- Domain 数：X
- Invariant 数：Y
- 第二层 AI 选中：Z
- 第三层全量：W
- 校准信号数：N

## 漂移点
[自动] calibrationSignals 列表（含 script 路径 + exitCode + stderr）

## 风险评估
[自动] 这些漂移是"AI 认知盲区"还是"Domain 脚本本身有 bug"？

## 参考
- 关联 work：<w>
- 关联 frozen.json：project-domains-frozen.json
```

### 5.3 不回路的边界

**不写入** Research Pool 的情况：

- 第二层 PASS + 第三层 PASS：正常路径
- 第二层 FAIL + 第三层 FAIL：AI 已知失败，无校准价值（修代码即可）
- 第二层 skipped + 第三层 skipped_by_scope：scope 过滤掉了，无漂移
- manual 类型的 invariant：人工审查，不构成机器校准信号
- 第三层 ERROR（脚本自身崩溃）：**仍**构成信号（脚本 bug 反馈到 Research Pool）

### 5.4 与现有 research 池的差异

现有 24 篇 forges 中 ~8 篇是 research 池前身。三层 Proof 的 calibrationSignals 走**新**的研究池路径（`pools/research/`），与 `forges/` 目录隔离（避免双重身份混淆）。迁移时机见 [2026-06-12-c2-retraction.md](./2026-06-12-c2-retraction.md)。

---

## 6. CLI 触点

### 6.1 新增 `oxn proof audit`

**位置**：`src/cli/proof-audit.ts`（新建）

**注册**：`src/cli/proof.ts:726-738` 的 `subCommands` 增 `audit: auditSubcommand`

**命令签名**：

```bash
oxn proof audit <workId>
  --json              # JSON 输出
  --include-scope     # 强制跑全量（忽略 scope 过滤）
  --calibrate         # 把校准信号写入 Research Pool
  --fail-on-signal    # 校准信号非空也视为 FAIL（默认 WARN）
  --parallel N        # 并行执行数（默认 4）
  --timeout-ms N      # 单个脚本超时（默认 30s）
```

**v2 行为契约**：

- 自动跳过 `manual` 类型 invariant（`--include-manual` 可强制包含但不阻断）
- 自动跳过 `script` 缺失的 invariant
- 失败 = 退出码 1 + stderr 摘要（最多 500 字符）
- ERROR = 退出码 2（脚本自身崩溃） + 完整 stacktrace

**输出（成功）**：

```json
{
  "ok": true,
  "workId": "fix-grammar-deps",
  "layer": "project-domains",
  "status": "PASSED",
  "allInvariants": 22,
  "passed": 22,
  "failed": 0,
  "errors": 0,
  "calibrationSignals": 0,
  "frozenRef": "works/fix-grammar-deps/project-domains-frozen.json"
}
```

**输出（校准信号）**：

```json
{
  "ok": true,
  "workId": "fix-grammar-deps",
  "layer": "project-domains",
  "status": "WITH_CALIBRATION_SIGNALS",
  "allInvariants": 22,
  "passed": 21,
  "failed": 1,
  "errors": 0,
  "calibrationSignals": 1,
  "signals": [
    {
      "domain": "DocContext",
      "rule": "Sidebar 6 桶固定",
      "script": "scripts/invariants/doc/check-sidebar-6-buckets.sh",
      "layer2": "skipped",
      "layer3": "FAILED",
      "exitCode": 1,
      "stderr": "FAIL: sidebar order drift at line 42",
      "detail": "AI 在第二层未选，但第三层发现 sidebar 顺序漂移"
    }
  ],
  "researchPoolRef": ".openxenon/pools/research/POOL-R042-2026-06-14-doc-context-drift",
  "frozenRef": "works/fix-grammar-deps/project-domains-frozen.json"
}
```

### 6.2 `oxn work finalize`（v1.2+ 引入）

**位置**：`src/cli/work.ts` 增子命令 `finalize`（不在 v1.1 8 阶段内，本设计不破坏现有阶段）

**命令签名**：

```bash
oxn work finalize <name>
  --skip-domain-proofs  # v2.0 阶段过渡用，跳过第二层
  --json
```

**v2 行为契约**：

- v2.0 阶段：默认要求 `work.oxn` 含 `domain_proofs`；`--skip-domain-proofs` 跳过第二层
- v2.2 阶段：强制要求 `domain_proofs`（不写 → 拒绝 finalize）
- 走第二层 → 失败硬阻断
- 成功 → Work 状态 `done` + 自动建 Journal Pool 骨架（参考 [intent-pool-design.md](./2026-06-13-intent-pool-design.md) §3.5）

### 6.3 不破坏现有 CLI

| 命令 | 行为变化 |
|---|---|
| `oxn work run` | 无变化（第一层在内部跑） |
| `oxn work submit` | 无变化 |
| `oxn work status` | 增字段 `audit_passed: boolean`（v2.2+） |
| `oxn proof create/probe/run/list/show` | 无变化 |
| `oxn domain validate` | 增 `script` 字段校验（缺 script 仍合法，但 WARN） |

---

## 7. 决策记录（ADR）

### ADR-1：三层架构 vs 双层架构

**决策**：选**三层**（Work-Tasks / Work-Domains / Project-Domains），不选双层（合并 2 + 3）。

**理由**：

| 维度 | 双层（合并 2+3） | 三层（拆分 2+3） |
|---|---|---|
| **AI 校准** | AI 选择什么就跑什么，无法发现"AI 盲区" | 校准信号显式记录盲区 |
| **速度** | finalize 时跑全量，慢（1-3min） | finalize 跑 AI 选的 3-8 个，< 30s |
| **职责清晰** | AI 同时承担"预期"与"兜底"，角色冲突 | AI 显式声明预期，系统独立兜底 |
| **可观测** | 只有"是否通过"，无 AI 预期可见性 | `skippedByAI` + `calibrationSignals` 双视角 |

**替代方案**：

- A. 合并 2+3 → 失去 AI 校准信号
- B. 4+ 层 → 复杂度爆炸，无收益
- C. 单层（仅第三层）→ AI 无预期表达，盲区无法结构化

**结论**：三层是"AI 主动预期"与"系统被动兜底"的最小必要分离。

### ADR-2：第二层硬阻断，禁止 override

**决策**：第二层 FAIL/ERROR → 硬阻断 `work finalize`，**不允许** AI override / 架构师 skip。

**理由**：

- 与 v0.1 Probe Signal Taint v1 ADR-1 同源立场：Proof 轴**确定性优先**，不允许软路径
- 第二层是 AI 显式声明的"预期"——如果预期失败，要么 AI 改代码、要么 AI 改预期，没有第三条路
- override 会让"AI 预期"沦为形式（"我随便写一个 domain_proofs，过不了就 override"）

**替代方案**：

- A. 软警告 + 架构师 override → 失去硬约束，预期沦为形式（拒）
- B. 降级到第三层统一处理 → 失去第二层"AI 预期"的反馈价值（拒）
- C. 第二层仅 WARN → 与双层架构同质（拒）

### ADR-3：第三层独立命令，不嵌入 work finalize

**决策**：第三层用独立 `oxn proof audit <workId>`，**不**嵌入 `work finalize`。

**理由**：

- **速度**：第三层 1-3 min，AI 在 finalize 阶段需要 < 30s 快速反馈
- **职责分离**：finalize 是"Work 内部闭环"；audit 是"Work 对项目的承诺"
- **CI 灵活性**：CI 可以在不同 stage 触发 audit（PR 阶段 / 合并前 / 定时）
- **状态独立**：Work 可以 `done` 但 `audit_passed = false`（不互锁）

**替代方案**：

- A. 嵌入 finalize → 速度太慢，AI 体验差（拒）
- B. 嵌入 submit → 与第一层混淆（拒）
- C. CI 必须跑（不提供独立命令）→ AI 手动跑不通（拒）

### ADR-4：calibrationSignals 走 Research Pool，不留 frozen.json 内部

**决策**：校准信号**独立写** Research Pool，**不**仅留 frozen.json。

**理由**：

- frozen.json 是"已发生的事实"，不可变；校准信号需要被人类/AI **响应**（迭代 Domain 文档、改进 AI 决策）
- Research Pool 已有 lifecycle（drafting → finalized → consumed）支持这个迭代
- 与现有 [intent-pool-design.md](./2026-06-13-intent-pool-design.md) 5 类池一致

**替代方案**：

- A. 仅 frozen.json 留档 → 无响应链路，校准价值打折扣
- B. 走 Issue Pool → Issue 是"待修复的具体缺陷"，校准信号是"AI 认知盲区"，语义不匹配
- C. 走 Journal Pool → Journal 是"已发生的事后记录"，与"待迭代的研究"语义相反

### ADR-5（v2 重写）：Invariant = 脚本，退出码即判定

**决策**：`InvariantDecl` 只声明 `script` 路径（`.ts` / `.sh` / `.py` / `.js` 任意），由 Infra `exec` 探针执行，**退出码即判定**（0=PASS、1=FAIL、2=ERROR）。**不**维护 Goal Registry / VerifyVerb 映射表 / 5 选 1 verify 联合。

**v1 草案 → v2 反转的演进**：

| 轮次 | 命题 | 状态 |
|---|---|---|
| 1 | `verify` 是好思路（解耦验证方式） | 保留 verify 思想 |
| 5 | `verify = probe { contract, goal }` 解决组合爆炸 | **v2 推翻** |
| 6 | 4 层暴露机制（Registry / OXL / CLI / frozen） | **v2 推翻** |
| 7 | IAP 轴耦合：Intent 不应混入 Proof 细节 | **v2 推翻** |
| 8 | 任何复杂业务约束 = 一个脚本的退出码 | **v2 采用** |

**理由**：

- **Unix 哲学**：`exit code` 是进程间最古老、最稳定的契约。0/非 0 足以表达 PASS/FAIL。
- **IAP 轴分离**：Domain（Intent）只声明"用什么脚本验证"；Infra（Proof）负责执行 + 解析退出码。不暴露 `stat/read/exec` 给架构师。
- **架构师认知负担最小化**：只需理解"写一个退出码正确的脚本"。不需要懂 Probe Contract / Goal Registry / 判定函数。
- **第三方扩展性**：第三方可以写任意语言的脚本，注册到 Domain 即可，**不**需要写 TS Probe 实现。
- **调试简单**：脚本 stdout/stderr 直接进 frozen.json，工程师看 stderr 就能 debug。

**替代方案**：

- A. 5 选 1 verify 联合（v1 草案）→ 语法复杂、组合爆炸、IAP 轴耦合（拒）
- B. Goal Registry + 4 层暴露 → 过度设计（拒）
- C. VerifyVerb 业务动词映射表 → 第三方要学新概念（拒）

**风险与缓解**：

- 脚本崩溃（退出码 2）→ ERROR 走 frozen.json，不阻断 audit；calibrationSignals 仍写入 Research Pool
- 脚本语言不统一（混用 .ts / .sh）→ Infra `exec` 探针统一处理；性能差异由 timeout 控制
- 脚本路径不写 → 缺省 = 纯文本，**不**在第二/三层跑

### ADR-6：scope.affectedPaths 走 glob 匹配，不引入新依赖

**决策**：`affectedPaths` 用 gitignore 风格的 glob（`src/**` / `**/*.ts`），不引入 micromatch / fast-glob。

**理由**：

- glob 语法有 de facto 标准（gitignore 风格）
- `picomatch` 是 Bun 自带依赖（已验证），无需新增
- 22 条 invariant 的 scope 不会超过 50 条规则，朴素实现可接受

**替代方案**：

- A. 引入 micromatch → 体积 +20KB，没必要
- B. 引入 fast-glob → 同上
- C. 朴素实现 + 缓存 → v2.0 阶段够用

### ADR-7（v2 新增）：Domain 保持单文件，不升级为目录

**决策**：`Domain/*.oxn` 维持 v0.1-final DDD 的**单文件布局**。`script` 路径是**字符串寻址**（相对工作区根或绝对），不强制 `.ts` 也不强制 Domain 目录共存。

**v1 草案 → v2 反转**：

- v1 草案：Domain 升级为 `Domain/oxn + invariants/*.ts` 目录
- v2 修订：保持 `Domain/oxn` 单文件，script 路径自寻址

**理由**：

- **不破坏现状**：`Domain/*.oxn` 是 v0.1-final DDD 的现有布局，22 篇 forges / Pool 都基于单文件
- **物理解耦**：脚本可以放在任何约定路径（`scripts/invariants/<domain>/` / `tests/invariants/<domain>/` / Domain 开发者自选）
- **语言无关**：script 不强制 `.ts`，可以是 `.sh` / `.py` / `.js`——Kernel 不关心，由 Infra exec 探针处理
- **错误可见**：脚本路径写错 / 不存在 / 不可执行 → exec 探针直接 ERROR（退出码 2），进 frozen.json 的 stderr

**替代方案**：

- A. v1 草案（升级为目录）→ 破坏现有 Domain 资产，需要迁移脚本（拒）
- B. 强制 .ts 后缀 → 排斥 .sh / .py 等更轻量的实现（拒）
- C. 禁止 script 在 Domain 外部 → 失去共享（拒）

---

## 8. 迁移路径

### 8.1 v2.0 阶段（建议 1-2 个 PR）

**PR-1：OXL 语法扩展 + 解析兼容**

- 改 `src/oxl/langium/oxn.langium`：`InvariantDecl` 加可选 `script` / `manual` / `scope`；`WorkDeclaration` 加可选 `domain_proofs`
- 跑 `bun run langium:generate` 重新生成 AST
- **向后兼容**：旧 `value=STRING ';'` 仍合法；`oxn domain validate` 加 WARN（无 script/manual）
- 不动 CLI 行为

**PR-2：第二层 CLI 实现 + sample 脚本**

- 新建 `src/cli/proof-domain-impact.ts`（被 `work finalize` 调用的内部模块）
- 改 `src/cli/work.ts`：`work finalize` 子命令 + 第二层流程
- 新建 frozen writer：`src/infra/frozen/work-domains.ts`
- 新建 sample 脚本：`scripts/invariants/proof/check-kernel-zero-io.ts`（5 个 sample 脚本）
- 单元测试：`src/cli/__tests__/work-finalize-domain-proofs.test.ts`

### 8.2 v2.1 阶段

**PR-3：第三层 CLI 实现 + 独立 audit 命令**

- 新建 `src/cli/proof-audit.ts`
- 改 `src/cli/proof.ts`：subCommands 加 `audit`
- 新建 frozen writer：`src/infra/frozen/project-domains.ts`
- E2E：`src/cli/__tests__/proof-audit-e2e.test.ts`

**PR-4：calibrationSignals → Research Pool**

- 新建 `src/cli/proof-audit-calibrate.ts`（自动生成 research 池骨架）
- 走 [intent-pool-design.md](./2026-06-13-intent-pool-design.md) 的 `oxn pool create` 复用
- E2E：`src/cli/__tests__/proof-audit-calibrate-e2e.test.ts`

### 8.3 v2.2 阶段

**PR-5：domain_proofs 强制化 + 优化**

- `work finalize` 不再支持 `--skip-domain-proofs`
- `oxn work validate` 检查 `domain_proofs` 与 Domain 文件一致性
- 性能优化：第三层并行执行 + scope 预过滤缓存
- 默认提供 20+ sample 脚本覆盖 ProofDomain / IntentDomain / DocContext

### 8.4 v3.0 阶段（远期）

- 第三方 Domain 信任机制（`oxn domain trust <id>`）
- 第三方脚本注册（`oxn invariant register <script>`）
- AI 校准信号自动消化（AI 收到 research 池后自动更新 domain_proofs 模板）

---

## 9. 风险与未决项

### 9.1 风险

| 风险 | 影响 | 缓解 |
|---|---|---|
| **scope 写错导致 invariant 漏跑** | 边界破坏被漏检 | v2.0 阶段 `--include-scope` 强制全量；v2.2 AI 辅助校准 scope |
| **AI domain_proofs 写错** | 第二层误判 | v2.0 阶段 `oxn work validate` 加 existence 校验；v2.2 阶段 AI 模板推荐 |
| **22 条 invariant 跑全量很慢** | CI 反馈慢 | scope 预过滤 + 并行执行 + 增量验证（v2.2 优化） |
| **脚本路径写错 / 不存在** | ERROR 误报为 FAIL | exec 探针退出码 2 单独标 ERROR，不计入 FAIL；stderr 进 frozen.json |
| **脚本语言混用（.ts/.sh/.py）** | 性能 + 维护差异 | 约定 `.ts` 为主，特殊场景用 `.sh`；由 timeout 控制最长执行时间 |
| **calibrationSignals 噪声过多** | Research Pool 被刷屏 | v2.0 阶段去重 + 阈值（每 Work ≤ 3 条 signals）；v3.0 AI 聚类 |
| **脚本有副作用（污染环境）** | 重复跑结果不一致 | v2.0 阶段 sandbox + 临时目录；v2.1 阶段快照还原 |
| **Domain 脚本不随版本走** | Proof 行为漂移 | v2.2 阶段把 script 路径锁定到 git commit hash |

### 9.2 未决项

- **U1**：第三方 Domain 的脚本信任链（与 Probe Taint v1 协同，待 v3.0 统一）
- **U2**：`oxn proof audit` 是否支持 `--diff-from <commit>` 跑增量（v2.2 阶段评估）
- **U3**：calibrationSignals 触发的 research 池是否需要"自动 finalize"（v2.0 阶段 drafting，v3.0 评估）
- **U4**：脚本签名机制（v2.0 阶段无；v3.0 评估是否要求所有 script 必须有签名）
- **U5**：脚本执行沙箱（v2.0 阶段靠 timeout 限制；v3.0 评估独立 sandbox）

### 9.3 与其他 Forge 的耦合确认

- **Probe Signal Taint v1**：本设计的**第一层** Blueprint observe 仍走 3 IO 原语（不破坏）；**第二/三层** 走 `exec` 调脚本——脚本内部若需要 IO，由 Infra `exec` 探针自处理，不绕过 3 IO 原语
- **Intent Pool v3**：本设计的 calibrationSignals 走 research 池；work finalize 触发 journal 骨架（与 intent-pool §3.5 一致）
- **Daemon Functional Design**：本设计的 `proof audit` 可走 Daemon socket（v2.2+ 阶段评估）

---

## 10. 一句话总结

> **三层 Proof 是微观/中观/宏观的递进：第一层验证"做完了事"（Blueprint 驱动，AI 编排 + 3 IO 原语），第二层验证"预期边界没破"（AI 显式声明 `domain_proofs`，**硬阻断** finalize，**每条 Invariant 走一段脚本 + 退出码判定**），第三层验证"所有边界都没破"（独立 `oxn proof audit` 命令，系统全量跑 Domain 脚本）。第二层与第三层的差异是 AI 校准信号——`calibrationSignals` 显式记录"AI 未预期但被破坏的 Invariant"，自动写入 Research Pool。核心反转：Invariant = 脚本 + 退出码即判定，Probe 退化为唯一 `exec` 形态，IAP 轴保持纯净。**

---

## 参考

- **关联设计**：
  - [`.openxenon/forges/2026-06-14-probe-signal-taint-design.md`](./2026-06-14-probe-signal-taint-design.md) — Probe 行为降维到 3 IO 原语；本设计第一层仍用，第二/三层走 `exec` 调脚本（不破坏）
  - [`.openxenon/forges/2026-06-13-intent-pool-design.md`](./2026-06-13-intent-pool-design.md) — Pool 5 类 + work finalize journal 骨架
  - [`.openxenon/forges/2026-06-12-c2-retraction.md`](./2026-06-12-c2-retraction.md) — forges/ 双重身份澄清
- **讨论原文**：`domains-proof-1.md`（6 轮讨论 → v2 反转推导）
- **AGENTS.md**：
  - §"OXN DSL" — `invariant` 已是 Domain 一等公民（v0.1-final DDD，单文件布局保留）
  - §"CLI 架构" — proof 子命令注册位置 `src/cli/proof.ts:726-738`
  - §"工作流 8 阶段" — v1.1 work 流程（init→...→submit/status）
  - §"硬性规则 L0–L3 宪法" — Kernel 零 IO（脚本执行走 Infra `exec`，不破坏）
- **OXL 语法**：
  - `src/oxl/langium/oxn.langium:195-197` — 当前 `InvariantDecl`（仅 `value=STRING`，v2 扩字段）
  - `src/oxl/langium/oxn.langium:201-209` — 当前 `WorkDeclaration`（无 `domain_proofs`，v2 增字段）
  - `src/oxl/langium/oxn.langium:201-209` — 当前 `WorkDeclaration`（无 `domain_impact`）
- **CLI 触点**：
  - `src/cli/proof.ts:726-738` — proof subCommands 注册（增 `audit`）
  - `src/cli/work.ts:1-32` — v1.1 8 阶段工作流（不破坏）
  - `src/infra/frozen/immutable.ts` — frozen.json 不可变机制
- **scripts**：
  - `scripts/check-heading-skeleton.ts` — calibrationSignals 自动写的 research 池骨架需通过此校验
