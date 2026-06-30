# Blueprint Format Reference (for oxn-work)

> **Based on unified OXL (`src/oxl/langium-driver/oxn.langium`)**. Not compatible with any "legacy" syntax from the mvp / reference era — follow this document.

## Blueprint Structure

```oxn
blueprint "<name>" {
  version = 1                          // Required (recommended)
  description = "<one-line description>" // Recommended

  // Optional: blueprint-level props (injected into all parts)
  prop "<name>" { type = string; default = "dev" }

  // Required: ≥1 slot
  slot "<stage-1>" { deps = [] }
  slot "<stage-2>" { deps = ["<stage-1>"] }
}
```

> **Removed in v0.1**: `expectation` / `rule` / `context` (blueprint-level AI context) blocks. Validation is handled by Probes; blueprint-level AI context goes in work.oxn's `context { goal / constraints }`.

## Slot Fields

| Field | Required | Description |
|------|------|------|
| `slot "name"` | ✅ | Slot name (kebab-case recommended) |
| `deps = ["other"]` | No | List of other slots this depends on (empty = no deps) |
| `observe = ["ShellExec"]` | No | Probe names this slot observes (triggers on `submit --run-probes`) |

## 4 Slot DAG Patterns

`oxn blueprint create --slots` generates a **linear chain** (`a → b → c`) by default. But deps between slots can express any DAG:

### 1. Linear Pipeline (Sequential)

```oxn
blueprint "linear" {
  slot "build"  { deps = [] }
  slot "test"   { deps = ["build"] }
  slot "deploy" { deps = ["test"] }
}
```

### 2. Fan-out (One-to-Many)

```oxn
blueprint "fan-out" {
  slot "build"  { deps = [] }
  slot "lint"   { deps = ["build"] }
  slot "type-check" { deps = ["build"] }  // build done → lint + type-check in parallel
  slot "test"   { deps = ["lint", "type-check"] }  // both pass → test
}
```

### 3. Fan-in (Many-to-One)

```oxn
blueprint "fan-in" {
  slot "input-a"  { deps = [] }
  slot "input-b"  { deps = [] }
  slot "merge"    { deps = ["input-a", "input-b"] }
}
```

### 4. Parallel + Final (General)

```oxn
blueprint "ci-pipeline" {
  slot "build"   { deps = [] }
  slot "test"    { deps = ["build"] }
  slot "lint"    { deps = ["build"] }
  slot "e2e"     { deps = ["test", "lint"] }
  slot "release" { deps = ["e2e"] }
}
```

**Anti-patterns**:
- ❌ Always using linear chain (even when branching is more appropriate) — resist the CLI default's temptation
- ❌ Using PascalCase for slot names — must be kebab-case
- ❌ Cycles in deps — `oxn blueprint validate` will reject them

## Prop Design (Blueprint-level Parameters)

`prop` is injected into **all parts** of this blueprint (shared across slots):

```oxn
blueprint "dev-workflow" {
  prop "env"      { type = string; default = "dev" }       // String with default
  prop "timeout"  { type = number; default = 30000 }      // Number with default
  prop "branches" { type = list<string>; required = true }  // List, required
  prop "regions"  { type = map<string>; default = {} }   // Map

  slot "develop" { deps = [] }
  slot "test"    { deps = ["develop"] }
}
```

Supported `type` values: `string` / `number` / `boolean` / `list<T>` / `map<T>` / `any`.

**Anti-patterns**:
- ❌ Using prop as a part-local variable (prop is blueprint-level, shared across all slots)
- ❌ Uppercase prop names (must be kebab-case)

## observe Referencing Builtin Probes

```oxn
blueprint "dev-workflow" {
  slot "test" {
    deps = ["develop"]
    observe = ["lint-check", "type-check", "test-runner"]   // Reference builtins
  }
}
```

Builtin probes (`@oxn/...` namespace):

| Builtin Name | Purpose |
|---|---|
| `@oxn/probes/shell_exec` | Run shell command (returns exit_code / stdout / stderr) |
| `@oxn/probes/fs_exists` | Check if file/directory exists |
| `@oxn/probes/lint-check` | Run linter |
| `@oxn/probes/test-runner` | Run test suite |
| `@oxn/probes/type-check` | Run type check |

**Anti-patterns**:
- ❌ Reinventing the wheel when a builtin already solves it (increases maintenance cost)
- ❌ Misspelling builtin names in observe (triggers `probe not found` at runtime)

## Three Ways to Create a Blueprint

### 1. Generate Skeleton via CLI (Recommended)

```bash
oxn blueprint create my-blueprint --slots build,test,deploy
# Generates .openxenon/blueprints/my-blueprint.oxn
oxn blueprint validate my-blueprint
oxn work create my-work --blueprint my-blueprint
```

### 2. Write by Hand

```bash
$EDITOR .openxenon/blueprints/my-blueprint.oxn
```

Minimal template:

```oxn
blueprint "tiny" {
  version = 1
  description = "tiny test"
  slot "alpha" { deps = [] }
  slot "beta" { deps = ["alpha"] }
}
```

### 3. Derive from Builtin

```bash
cp src/builtin/blueprints/verify-pipeline.oxn .openxenon/blueprints/mine.oxn
$EDITOR .openxenon/blueprints/mine.oxn
```

`src/builtin/blueprints/*.oxn` is already written using the unified grammar.

## Validation + Driving

```bash
oxn blueprint validate my-blueprint          # Syntax check
oxn work create my-work --blueprint my-blueprint  # Start state machine
oxn work submit --work-name my-work         # Advance
oxn work status --work-name my-work        # Read status
```

## ❌ Common Mistakes

1. **Using reference-era "type field" or "part slot" syntax**
   ```oxn
   # Wrong (reference syntax)
   blueprint "X" type "task" { part slot "y" { } }

   # Correct (unified syntax)
   blueprint "X" { slot "y" { } }
   ```

2. **Using `expectation` / `rule` blocks (v0.0.x leftover, removed in v0.1)**
   ```oxn
   # Wrong (removed in v0.1)
   blueprint "X" {
     expectation "..." { probe = "..." }
     rule "..." { condition = ... }
   }

   # Correct: validation is handled by Probe (inline in task.part.probe block)
   ```

3. **Using `@prj/...` scheme reference (reference-era, never implemented)**
   ```
   # Wrong
   ref = "@prj/blueprints/my-bp"

   # Correct
   ref = "@oxn/blueprints/my-bp"
   ```

4. **Writing probes / parts to `.openxenon/arsenals/{probes,parts}/` (v0.0.x leftover)**
   ```
   # Wrong: since v0.1, probe/part are not standalone assets
   mkdir .openxenon/arsenals/probes/

   # Correct: write inline in task.oxn's part block
   task "..." {
     part "..." {
       skill_context = "..."
       probe "my-probe" { prop "..." { ... }; output { ... } }
     }
   }
   ```
