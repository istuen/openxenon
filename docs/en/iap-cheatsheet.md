---
title: IAP Cheatsheet
---

# IAP Cheatsheet

> A one-page printable cheatsheet of the three great laws.

---

## IAP First Law

> **Ownership does not cross; proof cannot be bypassed.**

- AI must not cross Blueprint slot boundaries (alignment power is bound by intent power)
- Engineers must not declare done before Probe checks (intent power is bound by proof power)
- OXN must not modify Domain terms or Blueprint rules (proof power must not usurp)

---

## IAP Second Law (Purity)

> **Infra must not bypass Daemon and self-declare done**

| Module | May | May not |
|---|---|---|
| Kernel | Pure logic verification | Execute IO / modify rules |
| Infra | Observe facts | Make PASS/FAIL verdicts |
| Daemon | Manage runtime | Modify Kernel rules |

---

## IAP Third Law (Information Hiding)

> **AI sees only "what to do", not "what to satisfy"**

```
AI visible ✅              AI NOT visible ❌
───────────                ─────────────
Domain term/ban            Probe inside Part
Blueprint slot             frozen.json write permission
skill_context              state.json write permission
```

---

## Y-flow diagram

```
       Intent axis               Align axis
   Domain(.oxn)               Work(.oxn)
        │                            │
        ▼                            ▼
   Blueprint(.oxn)            Task → Artifact
        │   Probe standard       │  Artifact fact
        └────────────┬───────────────┘
                     │
                     ▼
                 Proof axis
              Proof(Verdict)
                     │
                     └──▶ Intent evolution (P → I feedback)
```

---

## v1.1 8-stage flow

```
create → add-task → validate → lock → run → submit → status
                      │         │
                      ▼         ▼
                   .work    .work.planLock
                static gate   4-component hash
                  card
```

---

## The three error codes

| Error code | Trigger |
|---|---|
| `IAP_ALIGN_LOCK_NOT_FOUND` | `oxn work lock` was not called |
| `IAP_ALIGN_LOCK_HASH_MISMATCH` | Asset drift after lock |
| `IAP_ALIGN_WORK_REMOVED` | work.oxn was deleted |

---

## Top 5 anti-patterns

1. **Skip validate + lock and run directly** → `IAP_ALIGN_LOCK_NOT_FOUND`
2. **Modify `.oxn` after lock** → `IAP_ALIGN_LOCK_HASH_MISMATCH`
3. **AI writes `frozen.json` directly** → bypasses the Proof axis
4. **Put a slot in a Domain** → Domain / Blueprint must stay orthogonal
5. **Confuse `ref` with `align`** → `domain "X" ref "..."` is work-level declaration; `domain "X"` inside a task is align
