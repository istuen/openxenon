---
redirectFrom:
  - /zh-cn/iap-cheatsheet.html
title: IAP 速记卡
---

# IAP 速记卡

> 三大法则速记卡。一页可打印。

> **OpenXenon —— 工程师定意图，AI Agent 跑对齐，OXN Engine 出证明。**

---

## IAP 协作流水线（核心法则）

> **三方各司其职，OXN 出证明，工程师定信任。**

- 工程师定意图：维护 Asset（Domain / Blueprint / Stack），不写实现代码
- AI Agent 跑对齐：在 Asset 边界内编排 Work / Task / Part，但不得修改边界
- OXN Engine 出证明：跑 Probe 记录客观事实（脚本退出码、测试覆盖率、文件路径），不评判"工作合格不合格"——合格与否由工程师对照 Asset 自定

---

## IAP 第二法则（纯洁性）

> **Infra 不能绕过 Daemon 自我宣布完成；Kernel 严禁概率模型**

| 模块 | 能做 | 不能做 |
|---|---|---|
| Kernel | 纯逻辑校验 | 执行 IO / 改规则 / **引入概率性数学模型** |
| Infra | 观测事实 | 做 PASS/FAIL 判定 |
| Daemon | 管理运行时 | 修改 Kernel 规则 |

---

## IAP 第三法则（信息隐藏）

> **AI 只看到"该做什么"，看不到"该满足什么"**

```
AI 可见 ✅              AI 不可见 ❌
─────────              ──────────
Domain term/ban        Part 内的 Probe
Blueprint slot          frozen.json 写权限
skill_context           state.json 写权限
```

---

## Y 型流转图

```
       Intent                    Align
   Domain(.md)                Work(.md)
        │                            │
        ▼                            ▼
   Blueprint(.md)             Task → Artifact
        │   Probe标准               │  Artifact事实
        └────────────┬───────────────┘
                     │
                     ▼
                 Proof
              Proof(Verdict)
                     │
                     └──▶ Intent 演化（P → I 反馈）
```

---

## v1.1 3 IAP 阶段流程

```
Intent (工程师主权)          Align (AI 主权)           Proof (Engine 主权)
create → [add-task?] → lock   run → submit × N          finalize
                │                                        │
           .work.planLock                          .run/frozen.json
           3 组件 hash                              终态快照
```

> lock 内含 validate（语法+DAG+引用）；validate = lock --dry-run

---

## 错误码三剑客

| 错误码 | 触发条件 |
|---|---|
| `IAP_ALIGN_LOCK_NOT_FOUND` | 未调 `oxn work lock` |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | 锁后资产漂移 |
| `IAP_ALIGN_WORK_REMOVED` | work.md 被删除 |

---

## 反模式 TOP 5

1. **跳过 lock 直接 run** → `IAP_ALIGN_LOCK_NOT_FOUND`
2. **lock 后修改 .md** → `IAP_ALIGN_LOCK_HASH_MISMATCH`
3. **AI 直接写 frozen.json** → 绕过 Proof 轴
4. **Domain 里写 slot** → Domain / Blueprint 正交
5. **把 ref 和 align 混为一谈** → `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
