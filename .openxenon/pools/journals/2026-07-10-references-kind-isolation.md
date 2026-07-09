# Journal — 2026-07-10 — references kind-isolation + AssetPaper backfill

> Session log entry by oxn work `asset-paper-backfill` (IAP closed).

## 目标

为新增的 4 个 Asset (`AssetLifecycleContext` + `asset-{create,evolve,archive}`) backfill AssetPaper 4 字段 (`abstract` / `references` / `citations` / `auditTrail`)，同时为 `AssetModeContext` 与 `AssetLifecycleContext` 加 3+1 条新 invariant 文档化「references 同 kind」决策，最后同步 Roadmap `oxn-system` 的 `scene:dev` + `scene:onboard`。

## 关键决策（来自用户）

| # | 决策 | 当前 Work 实施 |
|---|---|---|
| 1 | AssetKind 内引用隔离 | ✅ 加 3 条 new invariant (AssetModeContext.inv-XX/inv-YY/inv-ZZ + AssetLifecycleContext.inv-XX) 文档化；references 全 `[]` |
| 2 | Roadmap 承担跨类型组合 | ✅ 不让跨类型 reference 走 Asset；Roadmap scene table 列多 kind |
| 3 | references 仅同 kind，避免依赖地狱 | ✅ 4 新 Asset references=[] + 数量预算 N=5 |
| 4 | Blueprint=Scene 实例 | ⏭️ 推迟到 v0.6.3 RFC（路线图选项） |

## Work 8 阶段闭环

### Stage-1：4 Asset 的 AssetPaper 4 字段 backfill（8 files）

| Asset | abstract | references | citations | auditTrail |
|---|---|---|---|---|
| `domain/AssetLifecycleContext` | "Asset lifecycle v0.6.x..." | `[]` | `0` | `// created by oxn-asset Skill at 2026-07-10` |
| `blueprint/asset-create` | "Asset creation pipeline..." | `[]` | `0` | 同上 |
| `blueprint/asset-evolve` | "Asset evolve pipeline..." | `[]` | `0` | 同上 |
| `blueprint/asset-archive` | "Asset archive pipeline..." | `[]` | `0` | 同上 |

验证：
- `validateAssetPaper4Fields` × 4 → 全部 `ok=true, warnings=0`
- `oxn domain validate AssetLifecycleContext` ✓ 14 terms + 13 ban + 11 invariants
- `oxn blueprint validate asset-{create,evolve,archive}` ✓ 各 4/3/3 slots

### Stage-2：3 新 invariant + 2 新术语 + Roadmap 更新

**AssetModeContext.md 加 3 条 invariant**：

```
- inv-XX: AssetKind reference isolation — references only same AssetKind; cross-kind via Roadmap scene; v0.6.2+ hard-block
- inv-YY: Asset references count budget N=5 — single node fan-out upper bound; Roadmap scene.links exempt
- inv-ZZ: Leaf Asset legitimacy — references=[] is legitimate leaf; "orphan" judgment = not-in-Roadmap AND citations==0 AND never-referenced
```

→ 19 → 22 invariants.

**AssetLifecycleContext.md 加 2 个术语 + 1 条 invariant**：

- term `AssetReferenceScope` — references 同 kind 的语义边界
- term `AssetRefBudget` — N=5 fan-out 上限
- inv-XX: 同源，跨文档呼应

→ 12 → 14 terms；10 → 11 invariants.

**Roadmap `oxn-system.md` 更新**：

- `scene:dev`：修 AssetModeContext 描述（"5 AssetKind" → "6 AssetKind (incl. roadmap)"）；新增 4 行（domain/AssetLifecycleContext + 3 个 asset-{create,evolve,archive} Blueprint）。
- `scene:onboard`：新增 1 行（domain/AssetLifecycleContext 让新人理解 Asset 生命周期）。

→ `oxn roadmap validate oxn-system` ✓ valid.

## Work 8 阶段对齐（IAP）

| Phase | 命令 | 结果 |
|---|---|---|
| 1. create | `oxn work create asset-paper-backfill --blueprint dev-workflow` | OK，2 slots (stage-1 + stage-2) |
| 2. add-task | `oxn work add-task asset-paper-backfill --task {stage-1,stage-2}` | OK（tasks 自动随 work create 生成） |
| 3. validate | `oxn work validate asset-paper-backfill --json` | valid:true, domains 0 (cosmetic), blueprints 1, tasks 2 |
| 4. lock | `oxn work lock asset-paper-backfill --json` | 4 组件 hash 锁定 (workOxn/workDomains/blueprints/tasks) + allHash |
| 5. run | `oxn work run asset-paper-backfill --json` | overallStatus: running |
| 6. submit × 2 | `oxn work submit ... --task stage-{1,2}` | passed × 2 |
| 7. finalize | `oxn work finalize asset-paper-backfill --json` | finalVerdict: FAILED (dev-workflow observe=[] 已知行为) |

## 撤销项与"不做什么"

- ❌ 5 个跨类型 references 边（违反决策 1）→ 全部 `[]`
- ❌ AssetModeContext.citations=5 → 0 inbound refs，全 `[]` 后无引用边
- ❌ 决策 4（Blueprint=Scene 实例）→ 路线图选项，不在本 work
- ❌ 全项目 40 个存量 Asset backfill → 不在本 work（避免引爆 cycle 风险）

## 未来 Work（Roadmap）

- **WF-1 [v0.6.2]**：grammar `references = [kind::X, ...]` 类型化 + `dag-validator` 强制 cross-kind fail + 处理 `test 13` case（`MemberContext.references=['dev-workflow']` 跨类型）。
- **WF-2 [v0.6.3 RFC]**：决策 4 强版（Blueprint 实例化 Roadmap scene + 参数化 props + per-scene-config 机制）。
- **WF-3 [随同 WF-1]**：存量 40 Asset 是否需要 backfill 4 字段（背压时机）；依工程团队判断。
- **WF-4 [伴随]**：AssetModeContext.md 自身加 `abstract` + `references=[]` + `citations=N` + `auditTrail` 4 字段（当前 work 未动存量，仅文档化新 invariant）。

## 验证快照（最终）

| Check | 结果 |
|---|---|
| `validateAssetPaper4Fields` × 5 (3 new + 2 legacy) | ✅ 3 新 ok=true 0 warnings；2 legacy ok=false 4 warnings（与本次无关） |
| `oxn asset validate --all` (DAG) | ✅ ok=true, cycles=[], selfRefs=[], orphans=[] |
| `oxn domain validate Asset{Lifecycle,Mode}Context` | ✅ valid |
| `oxn blueprint validate asset-{create,evolve,archive}` | ✅ valid |
| `oxn roadmap validate oxn-system` | ✅ valid |
| `bun run typecheck` | ✅ 0 error |
| `git commit` | ✅ landed on `feat/doc-three-tier-arch` branch |

## Commits

本 work 1 个 commit：

```
fix(asset): backfill AssetPaper 4 fields for 4 new Assets + add cross-kind invariant documentation + Roadmap sync
```

10 文件变更（1 commit 落地，未触发 work dir 的 planLock 漂移 — Asset 不在 work planLock hash 计算内）。
