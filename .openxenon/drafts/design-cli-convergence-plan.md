# CLI 收敛执行计划：基于"定义边界 + 协作"目标的功能取舍

> **日期**：2026-08-07
> **参与者**：工程师 + AI Agent
> **来源**：grilling session（grill-with-docs + domain-modeling skill）
> **状态**：active（待转 Work 执行）
> **关联**：ADR-0078（边界工程不做知识工程）/ ADR-0066（术语精简）/ ADR-0067（彻底不判）/ introduction.md（"工程师定义 AI Agent 协作边界的工具"）

---

## 1. 会话起点

工程师主张：OpenXenon 应聚焦"**定义**知识工程 + **协作边界**上下文工程"，通过 Asset、Work 实现成足够稳固的程度；验证只保留两层副作用：(1) 目标产物是否存在，(2) 是否沉淀知识工程。并提"至少 Proof 相关可暂停甚至隐藏"作为待盘问假设。

经过 `/grilling` session 盘问后，该假设被**证伪**，原主张被锐化为可执行计划。

## 2. 术语收口（grilling 关键决议）

| 问题 | 答案 | 影响 |
|---|---|---|
| "知识工程"是 OXN 的新使命还是 Asset 的承载属性？ | **承载属性** —— Asset 承载知识，OXN 不做知识工程 | `ADR-0078` 不动，口号不改 |
| 口号要改吗？ | **不动** —— "工程师定义 AI Agent **协作**边界的工具"，"协作"是目标，"边界"是 OXN 产物，知识是流经协作的介质，沉淀是副作用 | 8 个文件不动 |
| Proof 砍不砍？ | **不砍** —— 工程师盘问后自否定（grilling 的价值） | `ADR-0066/0067` 全保留 |
| "沉淀"是什么？ | **副作用，非目标** —— a/b（改 Domain / 新建 Workflow）算沉淀；e（违反 invariant 的改）由工程师认可决定 | 不引入新术语 |
| deviation 怎么处理？ | **(a) 非阻断但知情** —— Proof 本来就不阻断（`inv-9` post-ADR-0067），仅通知 | 与现状一致 |

**结论**：本次是**纯 CLI 表面/代码层面的取舍**，不动术语、不动 ADR、不动 glossary、不动 Domain invariants。

## 3. 完整工具的闭环验证（反推必要功能链）

**目标**：工程师定义边界 → AI 在边界内协作 → OXN 如实记录。

```
①定义边界              ② 进入协作             ③ 锁定边界(可执行)        ④协作+如实记录          ⑤收口
─────                ─────                 ─────────              ──────────            ─────
Asset 生命周期         assetmap suggest       work create            work run              work finalize
(domain/workflow/     → AI 按 goal+scene    → 引用 Blueprint        work submit           → Domain invariant
 stack/blueprint)      路由到 Blueprint       work inject            (默认不跑脚本probe)    → boundaryViolations
 asset evolve          work context           work add-task                                  → 最终 frozen.json
                       (Blueprint Context     work lock
                        Template 喂给 AI)     (PlanLock 5-hash)
                                              ↑ 边界从 SSOT 变成可执行约束的瞬间
```

**端到端命令序列**（每条都有对应 CLI 实现）：

| 步 | 命令 | 实现证据 |
|---|---|---|
| 定义 | `oxn asset create --kind domain/workflow/stack/blueprint` | `asset.ts:170`（= `work create --asset-kind` 别名） |
| 路由 | `oxn assetmap suggest --goal G --scene S` | `assetmap.ts:133` |
| 建协作 | `oxn work create <name> --blueprint B --domain D --stack S --goal G` | `work.ts:562` |
| 注入 | `oxn work inject <name> --paths/--context/--memory` | `work.ts:1979` |
| 编排 | `oxn work add-task <name> --task T --blueprint B` | `work.ts:1058` |
| 锁边界 | `oxn work lock <name>`（5-hash PlanLock） | `work.ts:2799` |
| 执行 | `oxn work run <name>` → `oxn work submit <name> --task T` | `work.ts:1573,1870` |
| 续轮 | `oxn work next-round <name> --outcome COMPLETED\|DEVIATED\|INCONCLUSIVE` | `work.ts:3154` |
| 收口 | `oxn work finalize <name>` → DomainProofs + 最终 frozen.json | `work.ts:3298,3344,3408` |

**沉淀副作用回流边**：Work 跑出的描述性产物 → `oxn draft create` → `oxn draft promote --target asset/rfc/work`（`draft.ts:110,356`）→ 新 Asset。

**关键代码证据**（关于 finalize 的非可选下限）：
- `work submit` 不带 `--run-probes` → 调 `submitTask`（sync，不写 per-task frozen.json 带 probes），带 → 调 `submitTaskWithProbes`（async 真跑 probe，`work.ts:1904-1915` / `dual-state-exec.ts:215,352`）。**脚本 probe 本来就是可选缝**。
- `work finalize` **无论 --run-probes 与否**都会：① 跑 Domain invariant（`collectWorkDomainProofs` + `finalizeWorkDomains`，`work.ts:3344,3363,3388`）→ `boundaryViolations`（不阻断，仅记录）② 写最终 `frozen.json`（`finalizeWork`，`work.ts:3408`）。

**结论：能拼成完整工具**。"定义 → 协作 → 记录" 三段都有实现，且 `work finalize` 把"边界校验 + 如实记录"做成了非可选下限 —— 这正好是"两层副作用"的兜底层。

## 4. 收敛执行计划（21 任务，5 阶段）

### 阶段 1 — 删死码（零风险，对闭环零影响）

| ID | 动作 | 文件 |
|---|---|---|
| T1 | 删 `oxn pool *` 命令组（全部抛 `OXN_POOL_DEPRECATED`） | `commands/pool.ts` + `index.ts:174` 摘注册 |
| T2 | 删 `oxn daemon *` 死码（`index.ts:143-195` 未注册，运行时不可达） | `daemon.ts` / `daemon-{start,stop,status}.ts` |
| T3 | 删 `oxn dev-pool-migrate`（v0.6.0 一次性 D4 迁移，使命已完） | `dev-pool-migrate.ts` + `index.ts:177` |

**验证**：`bun run typecheck` + `bun test`（确保无反向引用）

### 阶段 2 — Hide/Freeze（CLI 表面收口，代码留存）

| ID | 动作 | 处理 |
|---|---|---|
| T4 | `oxn probe *`（三方 Provider add/list/fix） | 从 `index.ts:172` 摘注册 → **Hide**（builtin 4 探针够用） |
| T5 | `oxn token ingest` | 从 `index.ts:169` 摘注册 → **Hide**（token 记账与边界正交） |
| T6 | `oxn insight *`（3 模式） | 保留注册但 freeze 开发 → **Freeze**（E4 哲学占位） |
| T7 | `oxn external *`（3 子命令） | 保留注册但 freeze 开发 → **Freeze**（nice-to-have） |
| T8 | `oxn dev unpack\|migrate-yaml` | 保留注册但 freeze 开发 → **Freeze**（Langium 已退休） |
| T9 | `oxn goal *` / `version *` | 保留注册但 freeze 开发 → **Freeze at v0.7+**（OXN 自身 ops，非协作核心） |

**验证**：`bun run build` + 闭环 smoke：`oxn init → asset create → work create → lock → run → submit → finalize`

### 阶段 3 — J2 实施（核心改动，唯一动语义的项）

**决议**：拆 `work submit --run-probes` flag；per-task frozen.json 改由 `work submit` 无条件写（**方案 A**）；CLI 形态保持 flat（**不动 19 子命令一致性**）。

| ID | 动作 | 实施要点 |
|---|---|---|
| T10 | 拆 `work submit --run-probes` flag | `work.ts:1879,1887,1904-1915` |
| T11 | `work submit` 无条件写 per-task frozen.json（方案 A） | 只装客观执行事实：part 索引 / 时间戳 / `--evidence` 引用 / state machine 推进；**不跑脚本 probe**。复用 `submitTask` 路径扩展，不走 `submitTaskWithProbes` |
| T12 | 保留 `submitTaskWithProbes` 函数，改为内部仅被 `oxn proof run` 调用路径使用 | 或保留函数但去掉 `work submit` 的入口 |
| T13 | 更新 `oxn-work` skill instruction：去掉 `--run-probes` 教学 | `packages/cli/src/skills/locales/zh-CN/oxn-work/instruction.md` → `bun run packages/cli/src/index.ts init -f` 重建 |

**方案 A 语义说明**（贴合两层副作用论点）：
- 层 1（产物存在）= `work submit` 写 evidence 引用进 task frozen
- 层 2（边界完整性）= `work finalize` 跑 Domain invariant
- 脚本 probe = 正交可选件，走独立 `oxn proof run`

**验证**：
- `bun test`（`trust-closure.test.ts:36` 直接依赖 `submitTaskWithProbes`，需调整测试入口走 `proof run`，或保留函数仅去 CLI flag）
- 闭环 smoke：submit 后 `.run/tasks/<t>/frozen.json` 存在且不含 probeResults
- `oxn proof run <name>` 独立入口仍能写带 probeResults 的 frozen.json

### 阶段 4 — CLI 表面合并（保守，alias/文档级）

| ID | 动作 | 处理 |
|---|---|---|
| T14 | `asset create` 文档标注为 `work create --asset-kind` 别名 | 文档/帮助文本 |
| T15 | `domain/blueprint create` 文档降级为 `asset create` 的薄包装 | 文档/帮助文本 |
| T16 | `assetmap validate` 文档标注"内部委托 asset validate"（已是行为，仅文档） | 文档 |
| T17 | `proof verify` 文档并入 `proof show`（show 已做 hash 校验） | 文档 |
| T18 | `work verify-task-path` 文档并入 `work validate` | 文档 |
| T19 | `work task-status` / `list-task` 文档合一为"task 读侧" | 文档 |

### 阶段 5 — Onboard 重路由

| ID | 动作 | 处理 |
|---|---|---|
| T20 | `oxn onboard --existing --proof-first` 改为 **definition-first 5 分钟回路** | `onboard.ts:454-476` 命令序列改为：init → asset create → work create --blueprint → lock → run → submit → finalize |
| T21 | 同步更新 `oxn-work` skill 里的 onboard 引用 | skill 重建 |

## 5. 执行顺序与依赖

```
T1–T3  并行删死码          ──┐
T4–T9  并行 Hide/Freeze     ──┼── 这些都互不依赖
                             │
T10–T13  J2 实施（串行）     ──┘  ← 唯一动语义的项，单独验证后再继续
                             │
T14–T19  文档级合并（并行）   ──┐  ← J2 验证通过后做
T20–T21  onboard 重路由     ──┘
```

## 6. 关键风险点

1. **T10–T13 的测试调整**：`trust-closure.test.ts:36` 直接依赖 `submitTaskWithProbes`，拆缝后要么改测试入口（走 `proof run`），要么保留函数、仅去 CLI flag。**推荐后者**（保留函数、仅去 CLI flag），代价最小。
2. **T11 的 frozen.json schema**：per-task frozen 不再含 `probeResults` 字段，但保留 `evidence` / `partIndex` / `submittedAt`。需确认 finalize 汇总时不依赖 per-task probeResults（应只取 task 状态和 evidence）。
3. **T9 的 `goal`/`version` 命令**：如果 `.changes/` 或 `dev/versions/` 流程依赖它们做版本切，freeze 前要确认无 CI/脚本依赖。

## 7. 强制约束（来自 AGENTS.md）

- 执行须走 `oxn work create <name> --blueprint <bp>` 正式 Asset/Work 流程，不裸奔写代码
- 改 skill 走 `locales/{zh-CN,en}/<skill>/instruction.md` → `bun run packages/cli/src/index.ts init -f` 流
- 不动 `.openxenon/assets/domains/*.md` 的 invariants（`check-doc-boundary.ts` 守门）
- 不动 glossary（改术语走 Domain + `sync-domain-glossary.ts`）
- 版本号中性原则：本 draft 不带版本号；scheduling 后才在 `dev/versions/` 补 `version:`

## 8. Grilling 纪律备注

本 draft 记录的是 grilling session 的**过程决议与执行计划**，不是 ADR。grilling 期间未写 `CONTEXT.md`/ADR —— 因为本次决议**不动术语、不动 ADR**（ADR-0078/0066/0067 全保留），无需 supersede。若未来 T10–T13 的语义改动引发新 ADR 需求，再走 `oxn draft promote --target rfc` 正式流程提升为 RFC。
