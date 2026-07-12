---
title: DDD in Practice
---

# DDD in Practice

> When to upgrade from Program Domain to Business Domain. Executable DDD bounded-context practice in OpenXenon.

## What — Program Domain vs Business Domain

OpenXenon offers two levels of Domain abstraction:

| Level | Type | Source | When to use |
|---|---|---|---|
| Program Domain | Programming concept glossary | OXN built-in `@oxn/domains/ProgramContext` | Solve technical problems; no business modeling needed |
| Business Domain | Business bounded context | Engineer defines `.openxenon/domains/<name>.md` | Business complexity emerges; shared business language needed |

**Program Domain** covers: SourceFile / Module / Function / BuildArtifact / TestSuite / TestCase / Dependency / ConfigFile / EntryPoint / APIEndpoint, and other general programming concepts.

---

## Why — Why two levels

The two emergence paths correspond to two real pain points:

### Emergence 1: Proof → Blueprint

```
Manual Proof once  → "AI's false-done got caught"
Manual Proof 5 times → "Re-entering the same probe each time is annoying"
Manual Proof 10 times → "Can I save these probes?"
                       ↓
              Introduce Blueprint (Probe templating)
              Introduce Program Domain (concept vocabulary)
```

### Emergence 2: Program Domain → Business Domain

```
Use Program Domain to fix bugs   → "Blueprint + built-in Domain is so convenient"
Use Program Domain for 3 features → "Blueprint is full of tech jargon"
Use Program Domain for 10 features → "AI understands the tech jargon, but not the business intent"
                                    ↓
                            Introduce Business Domain (DDD)
                            Introduce team-shared intent space
```

**You don't have to start with DDD.** First use Program Domain to solve technical problems; the need for DDD will naturally emerge as business complexity grows.

---

## How — Upgrade from Program Domain to Business Domain

### Signal: when to upgrade

- The same term has 3 different names in the team (`User` / `Customer` / `Member` mixed)
- Words you don't want to see appear in AI-written code
- The Blueprint's `skill_context` has too much business explanation
- Probe FAIL is not because the code is wrong, but because AI "misunderstood the business intent"

### Upgrade steps

#### 1. Identify bounded contexts

Find the business nouns that keep appearing in existing code and group them:

```
Member-related: Member, Register, Authenticate, Account
Order-related: Order, Cart, Payment, Invoice
```

Each group is a candidate Domain.

#### 2. Create the Domain

```bash
oxn domain create MemberContext
```

Edit `.openxenon/domains/member-context.md`:

```oxn
domain "MemberContext" {
  description = "Member bounded context: registration, authentication, member tiers"

  term {
    "Member":       "A registered member entity",
    "Account":      "A member's login credential",
    "Register":     "Submitting a registration form to create a Member",
    "Authenticate": "Validating login credentials"
  }

  ban { "User", "Customer", "AccountHolder", "Client" }

  invariant {
    "Passwords must never be stored in plaintext"
    "The same email cannot be registered twice in this context"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

#### 3. Validate

```bash
oxn domain validate MemberContext
# DDD in practice
```

After validation passes, this Domain can be referenced from any Work's task.

#### 4. Reference it in a Work

```oxn
work "develop-member" {
  domain "MemberContext" ref "@prj/domains/MemberContext"

  task "register-member" {
    domain "MemberContext"
    // AI sees MemberContext's language inside skill_context
    part "build" { skill_context = "Implement the Member registration API" }
  }
}
```

When AI fetches the context via `oxn work context`, it receives:

```json
{
  "allowedLanguage": {
    "mustUseNouns": ["Member", "Account", "Register"],
    "banned": ["User", "Customer", "AccountHolder", "Client"]
  }
}
```

---

## CI gating: bring Domain into the CI pipeline

In v0.1 Domain's `invariant` is documented, but in CI you can verify it indirectly through Probes:

```bash
# DDD in practice
oxn domain validate MemberContext
oxn proof run check-domain-compliance
```

v0.2 will introduce the `language-ban-checker` Probe, which directly scans code for ban words and FAILs.

---

## Context Map: cross-domain collaboration

When your system has multiple Domains, use `context_map` to declare their relationships:

```oxn
domain "MemberContext" {
  context_map {
    imports "OrderContext" as "Order"
  }
}
```

This is documentation-only; it does not transitively import dependencies. Actual cross-domain orchestration is at the Work layer:

```oxn
work "NewUserOnboarding" {
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"

  task "RegisterMember" { domain "MemberContext" }
  task "GrantBonus"     { domain "OrderContext"; deps = ["RegisterMember"] }
}
```

## → Reference

- [Intent](./intent.md) — Full Domain syntax
- [Recipes](./recipes.md) — Full cross-domain orchestration example
- [Architecture](./architecture.md) — Where Domain lives in the L0–L3 layering
