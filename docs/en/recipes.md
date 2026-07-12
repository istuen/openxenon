---
title: Recipes
---

# Recipes

> 5 end-to-end recipes: from single-file verification to cross-domain team collaboration. Each Recipe is independently runnable; full source is in `docs/examples/`.

## Choose your Recipe

| Scenario | Recipe | Pattern | Source |
|---|---|---|---|
| First-time entry: verify a file | [Recipe 1: Single-file verification](#recipe-1-single-file-verification) | Proof-First | — |
| Single-domain full development | [Recipe 2: Develop a new feature](#recipe-2-develop-a-new-feature) | Develop | `examples/develop-member/` |
| Cross business domains | [Recipe 3: Cross-domain orchestration](#recipe-3-cross-domain-orchestration) | Onboarding | `examples/onboarding/` |
| Bug-fix process | [Recipe 4: Fix a failure](#recipe-4-fix-a-failure) | Fix | `examples/fix-issue/` |
| Explore an unknown module | [Recipe 5: Explore and analyze](#recipe-5-explore-and-analyze) | Explore | `examples/explore-dsl/` |

---

## Recipe 1: Single-file verification

**Scenario**: verify that an AI-generated `dist/index.js` exists and is runnable. No Domain / Blueprint involved.

```bash
# Recipes
oxn init

# Recipes
oxn proof create check-build

# Recipes
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof probe add file-exports --target ./dist/index.js --export handler

# Recipes

# Recipes
oxn proof run check-build
# Recipes
# Recipes
# Recipes

# Recipes
oxn proof show check-build
cat .openxenon/proofs/check-build/frozen.json
```

**When to upgrade**: when you reuse the same Probe combination repeatedly, upgrade to [Recipe 2](#recipe-2-develop-a-new-feature).

---

## Recipe 2: Develop a new feature

**Scenario**: implement the "member registration" feature, using Domain to constrain terminology and Blueprint to orchestrate steps.

### Step 1: Define Domain

```bash
oxn domain create MemberContext
```

Edit `.openxenon/domains/member-context.md`:

```oxn
domain "MemberContext" {
  description = "Member bounded context"
  term {
    "Member":   "A registered member entity",
    "Register": "Submitting a registration form"
  }
  ban { "User", "Customer" }
  invariant { "Passwords must never be stored in plaintext" }
}
```

```bash
oxn domain validate MemberContext
# Recipes
```

### Step 2: Define Blueprint

```bash
oxn blueprint create dev-workflow --slots build,test,verify
```

Edit `.openxenon/blueprints/dev-workflow.md` (optionally set DAG dependencies).

```bash
oxn blueprint validate dev-workflow
```

### Step 3: Create Work + Task

```bash
oxn work create develop-member --blueprint dev-workflow
```

Edit `work.md`, adding the domain ref and task:

```oxn
work "develop-member" {
  context {
    goal = "Implement new-member registration"
    constraints = ["Must use MemberContext.term.Member"]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/MemberContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "register-member" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "build"  { skill_context = "Implement the Member registration API" }
    part "test"   { skill_context = "Write unit tests for Member registration" }
    part "verify" { skill_context = "End-to-end verify the registration flow" }
  }
}
```

```bash
oxn work add-task --work develop-member --task-name register-member \
  --blueprint dev-workflow --domain MemberContext
```

### Step 4: Lock and run

```bash
oxn work validate develop-member --json
oxn work lock develop-member --json
oxn work run develop-member --json

# Recipes
oxn work submit --work develop-member --task register-member --json

# Recipes
oxn work status --work develop-member --json
```

---

## Recipe 3: Cross-domain orchestration

**Scenario**: a new-member registration also needs to operate on OrderContext — two bounded contexts collaborate.

Key characteristic: declare N domain refs at the work level, each task aligns to one.

```oxn
work "NewUserOnboarding" {
  context {
    goal = "Complete new-member registration and issue the welcome bonus"
    constraints = ["Must not read the order DB directly"]
    loop_policy { max_iterations = 5 }
  }
  domain "MemberContext" ref "@prj/domains/MemberContext"
  domain "OrderContext"  ref "@prj/domains/OrderContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"
    blueprint "dev-workflow"
    deps = []
    part "build" { skill_context = "Implement the Member registration API" }
  }

  task "GrantWelcomeBonus" {
    domain "OrderContext"
    blueprint "dev-workflow"
    deps = ["RegisterMember"]
    part "build" { skill_context = "Issue the welcome bonus per OrderContext" }
  }
}
```

Full source: [examples/onboarding/README.md](./examples/onboarding/README.md)

---

## Recipe 4: Fix a failure

**Scenario**: fix a bug using a multi-task chain: diagnose → locate → fix → verify.

```oxn
work "fix-issue" {
  context {
    goal = "Fix the bug where work state was not persisted promptly after submit"
    constraints = ["Do not break the existing state machine"]
    loop_policy { max_iterations = 5 }
  }
  domain "WorkContext" ref "@prj/domains/WorkContext"
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue"

  task "diagnose" { domain "WorkContext"; blueprint "fix-issue"; deps = []
    part "diagnose" { skill_context = "Reproduce the bug and record the scene" }
  }
  task "locate" { domain "WorkContext"; blueprint "fix-issue"; deps = ["diagnose"]
    part "locate" { skill_context = "Locate the root cause" }
  }
  task "fix" { domain "WorkContext"; blueprint "fix-issue"; deps = ["locate"]
    part "fix" { skill_context = "Apply the fix" }
  }
  task "verify" { domain "WorkContext"; blueprint "fix-issue"; deps = ["fix"]
    part "verify" { skill_context = "Verify the fix" }
  }
}
```

Full source: [examples/fix-issue/README.md](./examples/fix-issue/README.md)

---

## Recipe 5: Explore and analyze

**Scenario**: figure out a module's structure and write an analysis report. The simplest 1 work + 1 task pattern.

```oxn
work "explore-dsl" {
  context {
    goal = "Explore OXL syntax structure and produce an analysis report"
    constraints = ["Use oxn commands rather than reading source directly"]
    loop_policy { max_iterations = 3 }
  }
  domain "DSLContext" ref "@prj/domains/dsl-context"
  blueprint "explore-analyze-report" ref "@prj/blueprints/explore-analyze-report"

  task "explore" {
    domain "DSLContext"
    blueprint "explore-analyze-report"
    deps = []
    part "explore" {
      skill_context = "Explore the four modules: grammar, schema, validator, compiler"
    }
  }
}
```

Full source: [examples/explore-dsl/README.md](./examples/explore-dsl/README.md)

---

## Pattern selection quick reference

| Your need | Recipe | Key signal |
|---|---|---|
| First try-out | 1 (single file) | 1 Proof + 1–2 Probes |
| Single-domain development | 2 (Develop) | 1 task, multiple parts (= Blueprint multiple slots) |
| Cross-domain collaboration | 3 (Onboarding) | N domains at work level + tasks inject as needed |
| Bug fix | 4 (Fix) | N tasks in serial `deps` |
| Explore and analyze | 5 (Explore) | 1 task + 1 Blueprint slot |

## → Reference

- [Intent](./intent.md) — How to create Domain + Blueprint
- [Align](./align.md) — Detailed v1.1 8-stage flow
- [DDD in Practice](./ddd-in-practice.md) — When to upgrade to a Business Domain
