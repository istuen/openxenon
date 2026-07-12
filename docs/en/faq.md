---
title: FAQ
---

# FAQ
## Concepts

### How is OpenXenon different from GitHub Copilot / Cursor?

OpenXenon does not replace AI coding tools. It is an engine that **independently verifies results** after AI has written code. Copilot helps you write code; OXN helps you prove the code is right.

### Do I have to learn Domain + Blueprint first?

No. The entry is [Proof-First](./quickstart.md): just `oxn proof create` → `oxn proof probe add` → `oxn proof run`, running through in 5 minutes.

### Is the IAP paradigm mandatory? Can I just use the Proof axis?

Yes. The `oxn proof` command family lets the Proof axis operate standalone, without depending on Domain / Blueprint. See [Quickstart](./quickstart.md).

### What's the difference between Domain and Blueprint?

Domain = business glossary (what to say / what not to say); Blueprint = technical template (how many steps). The two are orthogonal and do not reference each other.

---

## Install and config

### Do I need Node.js?

No. OpenXenon is built on [Bun](https://bun.sh); it only needs Bun >= 1.0.0.

### What does `oxn init` do?

It creates the `.openxenon/` project boundary directory, including `config.json`, `domains/`, `blueprints/`, `works/`, and other subdirectories.

### How do I use it in different AI assistants?

```bash
oxn init --ai cursor     # Cursor Skill
oxn init --ai opencode   # OpenCode Skill
oxn init --ai codex      # Codex Skill
```

AI calls the CLI through the Skill protocol. See [Align](./align.md).

---

## Usage

### Can I modify frozen.json?

No. `frozen.json` is the inspection report issued by the OXN Engine; both AI and engineers can only read it. If AI could modify `frozen.json`, the Proof axis would be a name in name only.

### What if I modify work.md after lock?

It triggers `IAP_ALIGN_LOCK_HASH_MISMATCH`. You need `oxn work unlock` → edit → `oxn work lock` to re-freeze.

### How many built-in Probes are there?

11: `fs-exists`, `fs-not-exists`, `fs-content-match`, `fs-parseable`, `shell-exec`, `test-pass`, `ts-compiles`, `lint-check`, `deps-resolved`, `http-responds`, `file-exports`. See [Proof](./proof.md).

### Work vs Task?

Work = orchestrator (declares the ref pool + arranges the task DAG); Task = execution unit (1 Blueprint + N Parts). One Work can have multiple Tasks.

### Part vs Probe?

Part = execution step (AI-visible `skill_context`); Probe = acceptance standard (AI-**invisible** verification logic). Probes are inlined in Parts.

---

## Troubleshooting

### `OXN_NO_PROJECT`

Project not initialized. Run `oxn init`.

### `OXN_TASK_OXN_MISSING`

A Task is declared in work.md but the corresponding task.md does not exist. Run `oxn work add-task`.

### `OXN_WORK_ALREADY_EXISTS`

The Work is already running. First use `oxn work status` to check the current state.

### `IAP_ALIGN_LOCK_NOT_FOUND`

The work is not locked. Run `oxn work validate` → `oxn work lock`.

### `IAP_ALIGN_LOCK_HASH_MISMATCH`

An asset (`.md` file) was modified after lock. After confirming the modification is justified, `oxn work unlock` → re-`lock`.

For the full error-code quick reference see [CLI](./cli.md#error-code-quick-reference).

---

## Advanced

### How do I add a custom Probe?

Inline-declare it in a Part, or use `ref` to reference a custom probe. See [Extending](./extending.md).

### How do I integrate with CI?

```bash
# FAQ
oxn domain validate MemberContext
oxn blueprint validate dev-workflow
oxn work validate onboarding --json
oxn proof run check-deploy
```

### Can I share Domains across projects?

Currently shared at the Git-repo level. `@prj` references in-project assets. The cross-project `@glo` is deprecated.

---

## Migration

### How do I migrate from v0 to v1?

```bash
oxn work migrate <work-name>
# FAQ
```

### Which terms are deprecated?

`noun` → `term`, `verb` → removed, `domain_rules` → `invariant`, `expectation` / `rule` → carried by Probe, `stage` → `slot`, `@glo` → `@prj`. See [Glossary](./glossary.md) for the full list.
