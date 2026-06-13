---
title: AI Collaborator Entry
---

# AI Collaborator Entry

> ⚠️ **FOR AI AGENTS ONLY**
> Human readers, please enter via the root [README.md](https://github.com/istuen/openxenon#readme), or via [index.md](../index.md) under docs/.

## Who you are

You are assisting an OpenXenon engineer. OpenXenon is an "engineer + AI" collaboration workbench; its core paradigm is IAP (Intent–Align–Proof), and its core engine is called OXN.

**IAP three axes**:
- **Intent axis** (engineer sovereignty): Domain locks the business language, Blueprint locks the technical topology
- **Align axis** (AI sovereignty): you — orchestrate Work/Task/Part within the Blueprint slot boundaries
- **Proof axis** (OXN sovereignty): independently emit tamper-proof `frozen.json`

> **IAP First Law**: ownership does not cross; proof cannot be bypassed.

## Required reading

1. **[Core Concepts](./core-concepts.md)** — must read; understand the IAP three axes
2. **[Quickstart](./quickstart.md)** — read once, but do not reproduce
3. **[Align](./align.md)** — AI collaboration protocol
4. **[CLI](./cli.md)** — CLI whitelist

## CLI whitelist

✅ Allowed:
- `oxn proof create|probe add|run|list|show`
- `oxn work context|create|add-task|run|submit|status|validate|list-tasks|task-status|task-edit|lock|unlock|migrate`
- `oxn blueprint create|validate|list`
- `oxn domain create|validate|list`
- `oxn dev compile|unpack|validate|migrate-yaml|promote`

❌ Forbidden:
- Direct read/write of `.openxenon/proofs/*/frozen.json`
- Direct read/write of `.openxenon/works/*/state.json`
- Direct read/write of `.openxenon/works/*/tasks/*/frozen.json`
- Modifying Domain terms or Blueprint rules
- Using `--force` to bypass Proof
- Modifying any `.oxn` asset after lock (triggers `IAP_ALIGN_LOCK_HASH_MISMATCH`)

## Workflow

1. `oxn work context --work <w> --task <t> --json` to fetch the context
2. Strictly obey `allowedLanguage` (must use term, avoid ban)
3. Write code in the order of `taskParts`
4. After each part, `oxn work submit --work <w> --task <t> --json`
5. Read the verdict in `frozen.json` to decide the next step

## Failure handling

- Verdict PASS → proceed to the next part, or end the task
- Verdict FAIL → read the expected/actual in `frozen.json`, fix and re-run
- `IAPError` → see [CLI § Error-code quick reference](./cli.md#error-code-quick-reference)
- `IAP_ALIGN_LOCK_HASH_MISMATCH` → asset drift after lock, report to engineer and step back

## Output format

- Code changes referenced via `file_path:line_number`
- Completion status accompanied by `oxn work status --json` output
- On unrecoverable errors, report the specific error code and pause
