---
id: engine-closure-self-verify
theme: Engine 闭环自证（Asset + Work + Proof 三轴联动）
priority: critical
status: planned
created-at: 2026-07-27
scheduled-version: ~
synced-at: 2026-07-27
branch: feat/goal-engine-closure-self-verify
source: direct
note: |
  2026-07-27 grilling session 产出。Engine 闭环 v2 定义：
  Asset 生命周期 ∪ Work 生命周期 ∪ Proof 采集 = 自举完成。
  本 entry 是验证模板，不是版本交付物。
---

# engine-closure-self-verify — Engine 闭环自证 Work 模板

> **目的**：用一个真实端到端 Work 验证 OXN Engine 跑通 Asset + Work + Proof 三轴联动。
> **判据**：Work 闭环产出 frozen.json 满足 `outcome={completed: N, deviated: 0, inconclusive: 0}`。
> **场景选择**（Q4 答）：`dev-workflow` Blueprint 实例化（通用开发场景）作为第一 Scene。
> **Asset lifecycle 补验**：跑 `asset-create` Workflow 作为第二 Scene。

## 第一 Scene — dev-workflow 验证 Work 生命周期 + Proof 采集

### 执行步骤

```bash
# 1. 选一个真实小任务作为验证目标（候选：从 dev/versions/ 清理留下的 5 个 pool entry 中
#    任挑一个跑 asset-evolve，或修一个 .openxenon/ 下的真实 bug）
oxn work create --blueprint dev-workflow --name "self-bootstrap-closure-verify"

# 2. 跑 4 stage (retrieve → design → develop → test)：
#    - Task 1: retrieve —— 读 .openxenon/drafts/ 一个真实 RFC 草稿
#    - Task 2: design —— 写 RFC 模板（按 doc-rfc-workflow.md 的 RFC 模板）
#    - Task 3: develop —— 写 RFC 内容 + 跑 oxn lint-check 验证
#    - Task 4: test —— 跑 docs-heading-check Probe 验证 + 落盘 docs/rfc/zh-cn/RFC-XXXX-<theme>.md

# 3. 锁 + 跑 + 提交：
oxn work lock <name>
oxn work run <name>
oxn work submit <name> --task all

# 4. 验证 frozen.json:
cat .openxenon/works/<name>/frozen.json | jq '.outcome'
# 期望：{ "completed": N, "deviated": 0, "inconclusive": 0 }
```

### 验证清单（Work 生命周期）

- [ ] `oxn work create` 成功（work.md + .work/BirthCert 落盘）
- [ ] `add-task` 4 个 Task 全成功
- [ ] `lock` 通过 planLock 校验（3 组件 hash 一致）
- [ ] `run` 跑通所有 Task（Probe 全 COMPLETED）
- [ ] `submit` 后 frozen.json 完整：
  - [ ] `outcome` = `{completed: ≥1, deviated: 0, inconclusive: 0}`
  - [ ] `boundary_deviations` = []
  - [ ] `interference_flags` = []
  - [ ] `signature` 完整（content_hash 自校验通过）
- [ ] `trace.jsonl` 事件流连续（Trace-before-State 顺序）
- [ ] `state.json` 最终 status = `finalized`

### 验证清单（Proof 采集）

- [ ] ProbeOutcome 三态都有覆盖测试（COMPLETED / DEVIATED / INCONCLUSIVE 各跑过至少一次）
- [ ] frozen.json chmod 0o444（只读）
- [ ] `oxn work show <name>` Report 完整呈现 outcome + ProbeOutcome 列表

## 第二 Scene — asset-create 验证 Asset 生命周期

### 执行步骤

```bash
# 1. 创建一个新 Workflow Asset (e.g., 一个新的 dev/pool/<slug>.md 或 .openxenon/assets/workflows/X.md)
oxn work create --blueprint asset-create --name "verify-asset-lifecycle"
# 内部 task 骨架（4 task）：inspect-template → draft-content → apply-asset → verify-locks

# 2. 跑完后验证 Asset lifecycle 全行为：
oxn asset create --kind workflow --name test-lifecycle
oxn asset evolve test-lifecycle --from test-lifecycle
oxn asset archive test-lifecycle --reason "verify test"
oxn asset delete test-lifecycle --force   # 验证 citations==0 才允许
```

### 验证清单（Asset 生命周期）

- [ ] `asset create` 落盘 + planLock + content_hash 正确
- [ ] `asset evolve` 创建新版本 + 旧版 planLock 失效
- [ ] `asset archive` 文件 mv 到 `.openxenon/.archived/{kind}/` + citations 保留
- [ ] `asset delete` 验证 citations==0 才允许；非零 → IAP_ASSET_HAS_REFS (YIELD_TO_HUMAN)
- [ ] `oxn asset validate` 全 Asset 扫描通过

## 三轴联动验证（v2 自举完成核心）

```bash
# 单一 Work 同时穿过 Asset + Work + Proof 三轴
oxn work create --blueprint doc-rfc-workflow --name "promote-rfc-0013-actual"
# 此 Work：
#   - Asset 变更: 新 RFC 文件落 docs/rfc/zh-cn/ + planLock 更新
#   - Work 产物: work.md + 4 task + frozen.json
#   - Proof 证据: ProbeOutcome + trace.jsonl + state.json
# 期望: 三轴同时产生物理变化 = Lifecycle Linkage 验证通过
```

## 通过判据

| 维度 | 通过条件 |
|---|---|
| **Work 生命周期** | frozen.json outcome = `{completed: ≥4, deviated: 0, inconclusive: 0}` |
| **Asset 生命周期** | create/evolve/archive/delete 4 动作全跑通 |
| **Proof 采集** | Probe 三态覆盖 + frozen.json 只读 + signature 完整 |
| **三轴联动** | 单 Work 同时产生三类物理产物 |

**全通过 = 自举完成 v2 达成 = OXN ≡ 完整产品 ≡ Release-Ready**

## 失败处置

- **Work 失败**：`oxn work show <name>` Report 读 ProbeOutcome → DEVIATED 探针定位 → 修 Workflow Asset → 开新 Work
- **Asset 失败**：`oxn asset validate --rebuild-citations` 重检 → 修 planLock / content_hash → 重跑
- **Proof 失败**：`oxn proof rerun <task>` 重跑 Probe（如果 wiring 存在）或开新 Work
- **联动失败**：拆解单 Work 为多 Work（每 Work 单一轴），先验证单轴后做联动

## 阻塞解除后立即动作

- 更新 `.changes/0-X-Y-bootstrap-closure.md` 记录通过
- 更新 `[oxn-engine-domain](../../.openxenon/assets/domains/oxn-engine-domain.md)` 增加 `BootstrappingClosureAchieved: 0.X.Y` 字段（如需）
- 进入 npm ship path（见 `dev/pool/npm-ship-path.md`）

## 参考

- [RFC-0013 Errata 2026-07-27](../versions/README.md) —— 版本政策
- [`oxn-work-domain.md`](../../.openxenon/assets/domains/oxn-work-domain.md) —— Work lifecycle invariants
- [`oxn-asset-domain.md`](../../.openxenon/assets/domains/oxn-asset-domain.md) —— Asset lifecycle invariants
- [`oxn-proof-domain.md:inv-23`](../../.openxenon/assets/domains/oxn-proof-domain.md) —— probe-pass-implies-fixed
- [`dev-workflow.md`](../workflows/dev-workflow.md) —— 第一 Scene Blueprint
- [`doc-rfc-workflow.md`](../blueprints/doc-rfc-workflow.md) —— 三轴联动验证 Blueprint
- 2026-07-27 grilling session 产出