---
title: Intent axis
---

# Intent axis

> The Intent axis is the engineer's sovereignty. Domain locks the business glossary; Blueprint locks the technical topology.
> Without Intent, AI does not act, OXN does not prove.

## What — Two core assets of the Intent axis

The Intent axis is composed of two orthogonal assets:

| Asset | Concerns with | Maintained by |
|---|---|---|
| Domain | Business-wise "what to say / what not to say" | Business expert / architect |
| Blueprint | Technically "how many steps, what inter-step dependencies" | Tech lead |

The two **do not reference each other** — Domain has no slots, Blueprint has no terms. Work binds them together only when orchestrating.

---

## Domain: business glossary

Domain is the executable expression of a DDD bounded context. It tells AI "what words to use, what words to avoid, what rules to obey".

### Full structure

```oxn
domain "<DomainName>" {
  description = "<one-line business positioning>"

  term {
    "<Noun>":   "<business definition>",
    "<Verb>":   "<business definition>"
  }

  ban { "<banned word 1>", "<banned word 2>" }

  invariant {
    "<business invariant 1>"
  }

  context_map {
    imports "<OtherDomain>" as "<Alias>"
  }
}
```

### Field reference

| Field | Required | Description |
|---|---|---|
| `description` | No | One-line business positioning |
| `term` | No | Core glossary. AI **must** use these words when writing code |
| `ban` | No | Banned words. AI **must not** use these |
| `invariant` | No | Business invariants. Documented in v0.1, enforced via Probe in v0.2 |
| `context_map` | No | Cross-domain reference declaration (only declares "who I deal with", does not transitively import dependencies) |

### Full example

```oxn
domain "MemberContext" {
  description = "Member bounded context: manages registration, authentication, and member tiers"

  term {
    "Member":   "A registered member entity",
    "Account":  "A member's login credential",
    "Register": "Submitting a registration form to create a Member"
  }

  ban { "User", "Customer", "AccountHolder" }

  invariant {
    "Passwords must never be stored in plaintext"
    "The same email cannot be registered twice in this context"
  }

  context_map {
    imports "OrderContext" as "Order"
  }
}
```

### Naming conventions

- Domain name: PascalCase (`MemberContext`)
- File name: kebab-case (`member-context.oxn`)
- Physical location: `.openxenon/domains/<kebab-case>.oxn`

### Autonomy principle

A Domain must:
- Not reference Assets (no `ref "@prj/..."`)
- Not hold Slots (no slot/observe)
- Not hold Probes (no probe references)

---

## Blueprint: technical blueprint

Blueprint is a pure-technical template for "how many steps". It only declares slot topology and dependency relations, with no business semantics.

### Full structure

```oxn
blueprint "<name>" {
  description = "<one-line technical positioning>"
  version     = 1

  prop "<name>" { type = <type>; default? = <value> }

  slot "<name>" {
    deps    = ["<other-slot>", ...]
    observe = ["<SignalType>", ...]
  }
}
```

### Field reference

| Field | Required | Description |
|---|---|---|
| `description` | No | One-line technical positioning |
| `version` | No | Version number, incremented on Promote |
| `prop` | No | Parameter declaration. `type`: `string` / `number` / `boolean` / `enum(A,B,C)` |
| `slot` | **Yes** | Minimum topology node. Repeatable |

### Slot fields

| Field | Required | Description |
|---|---|---|
| `name` | **Yes** | Unique slot name (kebab-case); Part aligns via name |
| `deps` | No | List of other slot names it depends on (forms a DAG) |
| `observe` | No | List of physical observation signals; documented in v0.1, wired to Probe in v0.2 |

### DAG orchestration example

```oxn
blueprint "ci-pipeline" {
  description = "CI pipeline"
  version = 1

  slot "build"   { deps = [] }
  slot "test"    { deps = ["build"] }
  slot "lint"    { deps = ["build"] }
  slot "deploy"  { deps = ["test", "lint"] }
}
```

```
build ─┬─→ test  ─┐
       └─→ lint  ─┴─→ deploy
```

### Parameterized example

```oxn
blueprint "deploy-service" {
  prop "env"    { type = enum("dev", "staging", "prod"); default = "dev" }
  prop "region" { type = string; default = "us-west" }
  prop "replicas" { type = number; default = 3 }

  slot "build"  { deps = [] }
  slot "deploy" { deps = ["build"] }
}
```

### Naming conventions

- Blueprint name: kebab-case (`dev-workflow`, `fix-issue`)
- Physical location: `.openxenon/blueprints/<name>.oxn`

---

## Program Domain: built-in programming glossary

OXN ships `@oxn/domains/ProgramContext` built in, covering common programming concepts (SourceFile / Module / Function / BuildArtifact / TestSuite, etc.). Engineers can use Blueprint **without writing DDD**.

Companion built-in Probes:
- `fs-exists` / `fs-not-exists` / `fs-content-match` / `fs-parseable`
- `shell-exec` / `test-pass` / `ts-compiles` / `lint-check` / `deps-resolved`
- `http-responds` / `file-exports`

See [Proof](./proof.md) for the full Probe type list.

---

## v0.3 Unified MD Canonical Form

> **The whole point of v0.3.0 reform**: completely replace `.oxn` container directives (`:::intent{...}`) with **pure native Markdown** hierarchy.
> 0 `:::intent{...}` directives, 0 new npm dependencies, 0 Langium/.oxn baggage.
>
> **.md is always the canonical source**. `.oxn` is an optional compilation product (CLI does not yet ship `oxn domain compile`).

### 3 Canonical Principles

1. **H3 = canonical name** —— `### Cart` is already the official name of a term/prop/slot/task/part/probe/verdict. **Do not write `- name: Cart` again**.
2. **One `- key: value` per line** —— do not use `;` to concatenate multiple keys on one line.
3. **Arrays use indented lists** —— do not use `items: A, B, C` comma strings or `values: [a, b, c]` inline arrays.

### 5 Entity Types Unified Form

#### Domain (business glossary)

```markdown
## Terms

### Cart
- desc: User's unsettled shopping cart (with line items and price snapshot)

### Order
- desc: Immutable order record after submission

## Bans

### forbidden-constructs
- items:
  - cart-job
  - order-pipeline
- desc: Do not express cart/order/charge as Job/Pipeline pattern

## Invariants

### inv-cart-immutability
- value: Cart → Order transformation is immutable
```

#### Blueprint (technical blueprint)

```markdown
## Props

### timeout
- type: number
- required: true
- default: 60000

### env
- type: enum
- values:
  - dev
  - staging
  - prod

## Slots

### build
- deps: []
- observe:
  - deps-resolved

### verify
- deps:
  - build
  - test
- observe:
  - lint-check
  - ts-compiles
```

#### Work (orchestration)

```markdown
## Context

### primary
- goal: Demonstrate Work canonical form
- constraints:
  - must use oxn work commands
- max_iterations: 3

## Tasks

### t1-build
- blueprint: order-workflow
- domain: OrderDomain
- part: build
  - skill_context: build artifact
```

#### Task (execution unit)

```markdown
## Parts

### build
- skill_context: build artifact

## Probes

### schema-valid
- scheme: schema
- expect: every LineItem has all of sku quantity unit_price
```

#### Proof (verdict record)

```markdown
## Verdicts

### build-exists
- type: pass
- value: dist/oxn file exists with sha256 matching lock

### type-check
- type: fail
- value: bun run typecheck 1 error

## Runtime

### snapshot
- observed_at: 2026-06-23T12:00:00Z
- probes_run: 3
- probes_passed: 2
- probes_inconclusive: 1
```

### 5 Anti-Patterns (all forbidden in v0.3.0)

| Anti-pattern | Wrong example | Correct example |
|---|---|---|
| `;` inline key separator | `- type: string; default: USD; required: true` | Split into 3 lines: `- type: string` / `- default: USD` / `- required: true` |
| Redundant `- name:` | `### Cart` + `- name: Cart` | Keep only `### Cart` |
| `items: A, B, C` comma string | `- items: cart-job, order-pipeline` | `- items:` + indented list |
| `values: [a, b, c]` inline array | `- values: [dev, staging, prod]` | `- values:` + indented list |
| Meaningless wrapper H3 | `### main` (work context) | `### primary` |

### Natural-Language Fields Allow `;`

`desc` / `value` / `expect` / `guidance` / `instruction` are natural-language fields and **allow `;`** (Chinese commonly uses `;` as intra-sentence separator).

Structured fields (`type` / `default` / `required` / `items` / `values` / `deps` / `observe` / `domain` / `blueprint` / `part` / `scheme` / `name`) **forbid `;`**.

### Complete Examples

The 5 entity types' complete canonical .md examples are at [`src/oxl/examples-md/`](https://github.com/istuen/openxenon/tree/feat/v0.3-md-ssot/src/oxl/examples-md) (e-commerce Order scenario unified).

### CI Guard

`bun scripts/check-md-canonical.ts <dir>` —— scan any .md directory, enforce the 5 canonical rules.
Exit code 0 = all pass; 1 = has violations (with file:line:rule details).

| Rule | Trigger |
|---|---|
| E_MD_CANONICAL_NAME_REDUNDANT | Redundant `- name: <H3-text>` |
| E_MD_CANONICAL_ITEMS_COMMA_STRING | `items: A, B, C` comma string |
| E_MD_CANONICAL_VALUES_INLINE_ARRAY | `values: [a, b, c]` inline array |
| E_MD_CANONICAL_SEMICOLON_INLINE | Structured field contains `;` |
| E_MD_INVALID_SYNTAX | md-bridge pipeline parse failure |

---

## How — How to use

### Create and validate Domain

```bash
oxn domain create MemberContext
# Intent axis
oxn domain validate MemberContext
# Intent axis

oxn domain list
```

### Create and validate Blueprint

```bash
oxn blueprint create dev-workflow --slots build,test,verify
# Intent axis
oxn blueprint validate dev-workflow
# Intent axis

oxn blueprint list
```

### Domain vs Blueprint relationship

The two are **orthogonal**. Domain does not reference Blueprint; Blueprint does not reference Domain. Work binds them through `domain` / `blueprint` ref only when orchestrating.

```oxn
// work.oxn — Intent is bound together only in the Align axis
work "Onboarding" {
  domain    "MemberContext" ref "@prj/domains/MemberContext"
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"

  task "RegisterMember" {
    domain "MemberContext"        // aligned to this domain
    blueprint "dev-workflow"      // aligned to this blueprint
    part "build" { skill_context = "implement Member registration" }
  }
}
```

See [Align](./align.md) for the full Work → Task → Part orchestration flow.

## → Reference

- Full Domain syntax: legacy [OXN DSL reference](./reference/oxn-dsl.md)
- Blueprint DAG design rationale: [Architecture](./architecture.md)
- How to wire Intent assets to AI: [Align](./align.md)

## Intent Pool 第一轮落地 (v0.2 Sprint 4 T8)

Intent Pool v3 把 v0.1.x 的 `forges/` 设计笔记分化为 5 个池 (research / design / issue / audit / journal)。本 PR (Sprint 4) 是**第一轮最小切片**:

- **当前仅 `pools/research/` 池可用** — 其他 4 池 union 留 Sprint 6 启用
- **Hall 扫描迁移**：`scanIntentPools()` 新增, 兼容期仍扫 `scanForgeDrafts()`
- **forges/ 兼容期**：`warnOnForgesDeprecated` 开关默认 `false` (静默), Sprint 6 flip 后打印 WARN
- **Heading 模板**：research 池 `# What` `# Why` `# How` 三公共必填 (留 `# Reference` 可选)
- **lint 集成**：`bun scripts/check-heading-skeleton.ts` 扫 pools/ + forges/, 退出码 0/1
- **lefthook pre-commit 钩子**：第 5 个 hook `heading-skeleton` (其他 4 个: biome / eslint / typecheck / test)

### 5 池 heading 模板 (设计稿约定, Sprint 6 启用)

| 池 | 必填 heading |
|---|---|
| research | `# What` `# Why` `# How` (`# Reference` 可选) |
| design | `# What` `# Why` `# How` `# 决策记录` `# 范围之外` |
| issue | `# What` `# Why` `# How` `# 复现步骤` `# 期望` `# 实际` |
| audit | `# What` `# Why` `# How` `# 证据` `# 结论` |
| journal | `# What` `# Why` `# How` `# 时间线` |

### 相关命令

```bash
# 校验 heading 骨架
bun scripts/check-heading-skeleton.ts .openxenon/pools/research/

# 启用 forges/ WARN
oxn config set warnOnForgesDeprecated true

# Hall 扫描 (含 pools + forges)
bun src/hall/index.ts
```
