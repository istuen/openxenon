# IAP Cheatsheet

> 三大法则速记卡。一页可打印。

---

## IAP 第一法则

> **主导权不交叉，证明不可绕过。**

- AI 不得越过 Blueprint 的 slot 边界（对齐权受制于意图权）
- 工程师不得在 Probe 检查前宣布完成（意图权受制于证明权）
- OXN 不得修改 Domain 术语或 Blueprint 规则（证明权不得篡权）

---

## IAP 第二法则（纯洁性）

> **Infra 不能绕过 Daemon 自我宣布完成**

| 模块 | 能做 | 不能做 |
|---|---|---|
| Kernel | 纯逻辑校验 | 执行 IO / 改规则 |
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
       Intent轴                    Align轴
   Domain(.oxn)                Work(.oxn)
        │                            │
        ▼                            ▼
   Blueprint(.oxn)             Task → Artifact
        │   Probe标准               │  Artifact事实
        └────────────┬───────────────┘
                     │
                     ▼
                 Proof轴
              Proof(Verdict)
                     │
                     └──▶ Intent 演化（P → I 反馈）
```

---

## v1.1 8 阶段流程

```
create → add-task → validate → lock → run → submit → status
                      │         │
                      ▼         ▼
                   .work    .work.planLock
                静态门禁卡   4 组件 hash
```

---

## 错误码三剑客

| 错误码 | 触发条件 |
|---|---|
| `IAP_ALIGN_LOCK_NOT_FOUND` | 未调 `oxn work lock` |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | 锁后资产漂移 |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn 被删除 |

---

## 反模式 TOP 5

1. **跳过 validate + lock 直接 run** → `IAP_ALIGN_LOCK_NOT_FOUND`
2. **lock 后修改 .oxn** → `IAP_ALIGN_LOCK_HASH_MISMATCH`
3. **AI 直接写 frozen.json** → 绕过 Proof 轴
4. **Domain 里写 slot** → Domain / Blueprint 正交
5. **把 ref 和 align 混为一谈** → `domain "X" ref "..."` 是 work 级声明，task 内 `domain "X"` 是 align
