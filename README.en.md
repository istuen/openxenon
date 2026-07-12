# OpenXenon

> **Engineers define intent, AI Agents run alignment, OXN Engine emits proof.**
> **Engineers trust AI Agents' execution results within boundaries.**

> A lightweight human–AI collaboration tool for AI Agents.
>
> Plugs into AI Agent workbenches (OpenCode, Claude Code, Codex, Cursor) to prove AI-generated results with tamper-proof `frozen.json`.
>
> [中文版](./README.md) · [Full Documentation](./docs/en/index.md) · [AI Collaborator Entry](./docs/en/llm-prompt.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org)

## What is OpenXenon

OpenXenon is a lightweight human-AI collaboration engine.
It is injected as Skills into existing AI Agent workbenches (Cursor, OpenCode, Codex, Claude Code).
It focuses on turning the engineer's intent into boundaries that AI can align with, and rigorously proves AI's work results.
OpenXenon aims to build a stronger trust foundation for the collaboration between engineers and AI models.

> **AI Agent** in this document refers specifically to the AI coding workbench an engineer uses to collaborate with AI models (e.g., OpenCode, Claude Code, Codex, Cursor) — **not** the AI model itself. See [Glossary](./docs/en/glossary.md).

## Why OpenXenon

When I use AI Agents for programming, their early performance is often impressive. But in deep, continuous development, I start running into frequent drift, tampering with existing code, and even false completions. I find myself spending a lot of energy on "priming context" and "reviewing its work".

I believe AI models will keep getting stronger, but their underlying probabilistic principle means that **drift and hallucination** will keep happening.

This is what OpenXenon is exploring: turn the engineer's intent into the basis that AI can align with, and crystallize it into an iterative, reusable asset; let AI fully exercise its creativity within strict intent boundaries; and finally, have **OXN** stand in for the engineer to verify whether AI's output is actually true.

OpenXenon is still imperfect at this stage, but I hope it can help engineers focus their energy on building the **quality of software engineering** — and trust that AI's results match their intent.

## 5-Minute Quick Start

### Install

```bash
git clone https://github.com/istuen/openxenon.git
cd openxenon
bun install
oxn --version
```

> The repository is the dev base. v0.5+ is no longer published to npm. Developers should `git clone` + `bun install` for local development. Build via `bun run build` to produce `dist/cli.js`.

### Path A — Direct CLI

```bash
oxn init                                    # Initialize .openxenon/
oxn proof create check-deploy
oxn proof probe add fs-exists --target ./dist/index.js
oxn proof run check-deploy
# → Verdict: PASS / FAIL
# → Proof saved: .openxenon/proofs/check-deploy/frozen.json
```

### Path B — From inside an AI Agent

```bash
oxn init --ai opencode      # Generate OpenCode Skill (claude / codex / cursor work the same way)
```

Then in OpenCode / Claude Code / Codex / Cursor, type:

```
/oxn-work verify that src/index.ts exists (v0.6 entry point moved to packages/cli/src/index.ts)
```

The AI Agent calls `oxn` via Skill, result flows back to `frozen.json`.

## The IAP Paradigm

### Collaboration pipeline (Engineer ↔ AI Agent ↔ OXN Engine)

| Stage | Actor | Output | Locked by |
|---|---|---|---|
| **Intent** (define) | Engineer | Domain / Blueprint / Stack | `term` / `ban` / `invariant` boundaries (planLock + content_hash) |
| **Align** (run) | AI Agent | Work / Task / Part | Blueprint `slot` lock; AI must not modify Asset |
| **Proof** (emit) | OXN Engine | Proof (`frozen.json` + `verdict.md`) | Tamper-proof (chmod 0o444 + content_hash) |

> **OXN Engine is a notary, not a judge** — it records "what happened" (script exit codes, test coverage, file paths as objective facts) and does not judge whether the work is "acceptable". The "acceptability" judgment belongs to the engineer, based on comparing Asset against Proof.

### E1-E4 structural entities (v0.6 philosophical layer)

| Entity | Nature | Owner |
|---|---|---|
| E1 Asset  | Static boundary (Domain / Blueprint / Stack) | Engineer |
| E2 Work   | Dynamic collaboration (IAP + Round) | Engineer ↔ AI Agent |
| E3 Engine | Independent notarization (Probe + frozen.json + hash) — control structure, not execution env | OXN Engine |
| E4 Insight | Emergence layer (1+1>2) + **behavior-characteristic observation** | AI reasoning |

> **E1-E4 + L0-L3**: the E1-E4 entities explain *why*; the L0-L3 layers explain *dependency direction*. See [Core Concepts](./docs/en/core-concepts.md) and [Architecture](./docs/en/architecture.md).

### Work 3 modes + Round

```
Work (my-feature)
├── Mode A: Asset   — Intent asset-ize (Domain/Blueprint/Stack write-to-disk)
├── Mode B: Develop — Align execution (Round multi-cycle IAP)
└── Mode C: Proof   — Independent acceptance (frozen.json tamper-proof)

Round: oxn work next-round <name>   # explicitly start next IAP cycle
        oxn work finalize <name>     # aggregate all rounds
```

## Architecture

v0.6+ uses a **Monorepo dual-package** layout (see [v0.6 Monorepo RFC](./.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-monorepo-packages.md)):

```
openxenon/
├── packages/
│   ├── engine/         ← L1 Infra + L2 Engine (12+ modules)
│   │                    @openxenon/engine (12+ submodules)
│   │                    Asset / Intent / Align / Proof / Insight / Pool / Work
│   │                    errors / infra / kernel / oxl
│   └── cli/             ← L3 CLI (thin orchestration layer)
│                        @openxenon/cli (38 subcommands + 8 locales)
└── src/                 ← retained: daemon/ + builtin/ + watcher/
```

| Layer | Physical location | Role |
|---|---|---|
| L0 Kernel | `packages/engine/src/kernel/` | Types/constants/verdicts/catalog (Lambda vacuum) |
| L1 OXL+Infra | `packages/engine/src/{oxl,infra}/` | DSL parsing + filesystem + socket + frozen |
| L2 Engine | `packages/engine/src/{Asset,Intent,Align,Proof,Insight,Pool,Work}/` | 6+1 DDD modules, pure-function exports |
| L3 Tools | `packages/cli/src/commands/` + `src/daemon/` + `packages/cli/src/skills/` | CLI shell + daemon + AI Skills |

## AI Agent Integrations

`oxn init --ai <agent>` generates the corresponding Skill in one step, then the AI Agent can call the `oxn` CLI.

| AI Agent | Init command | Skill | Status |
|---|---|---|---|
| **OpenCode**    | `oxn init --ai opencode` | `/oxn-work` | ✓ supported |
| **Claude Code** | `oxn init --ai claude`   | `/oxn-work` | ✓ supported |
| **Codex**       | `oxn init --ai codex`    | `/oxn-work` | ✓ supported |
| **Cursor**      | `oxn init --ai cursor`   | `/oxn-work` | ✓ supported |

> As of v0.6 Skills are unified into a single `/oxn-work` (the IAP paradigm unified entry point). The legacy `oxn-cli` / `oxn-proof` Skills were removed.

**Integration flow:**

```
[Engineer] ──> [AI Agent: OpenCode / Claude Code / Codex / Cursor]
                          │         │
                          │  Skill  ▼  /oxn-work
                          │      ┌─────────┐
                          │      │  oxn CLI │
                          │      └────┬────┘
                          │           │
                          │           ▼
                          │   .openxenon/proofs/<name>/frozen.json
                          │           │
                          └───────────┘
                          Verdict flows back to the AI Agent
```

> Integration details: [CLI Reference](./docs/en/cli.md)
> Protocol details (for AI models): [AI Collaborator Entry](./docs/en/llm-prompt.md)

## Documentation

- 📖 **[Full documentation site](./docs/en/index.md)** — 12 chapters + 3 appendices, SSOT
- 🟦 **[AI Collaborator Entry](./docs/en/llm-prompt.md)** — AI model protocol (**for AI only**)
- 🏛️ **[Architecture & L0–L3 Constitution](./docs/en/architecture.md)**
- 🧪 **[OXL DSL Syntax](./docs/en/intent.md)**

## Roadmap

| Version | Goal | Status |
|---|---|---|
| **v0.1.8** | IAP paradigm / closed loop / self-bootstrap | ✓ released on npm |
| **v0.2.0** | Proof First / Infra Probe | ✓ released on npm |
| **v0.3.0** | MD-Native assets / Daemon | ✓ released on npm |
| **v0.4.0** | OXL 1.3 + three-layer architecture | ✓ released on npm |
| **v0.5.0** | Proof Insight Loop | ✓ released on npm (v0.5+ npm publishing paused) |
| **v0.6.0** | **E1-E4 + L0-L3 + Monorepo dual-package** | ✓ released on npm (v0.5+ npm publishing paused) |

> v0.6 is an **architectural reshape** release: from the IAP three-axis narrative to E1-E4 four structural entities + L0-L3 engineering layers + a Monorepo dual-package layout (`packages/engine` + `packages/cli`). See the [v0.6 IAP Refactor RFC](./.openxenon/pools/sprints/v0.6-iap-refactor/design/v0.6-iap-refactor-rfc.md) and [Changelog](./.changes/0-6-0-iap-refactor.md).
>
> v0.7+ roadmap (see [apps/hall Migration Plan](./docs/architecture/v0.7-hall-migration-plan.md)): standalone Web UI package, independent Engine publishing, and Insight emergence reasoning.

## Contributing

OpenXenon welcomes contributions of all kinds:

- 🐛 **Report issues** — submit bug reports or feature requests via [GitHub Issues](https://github.com/istuen/openxenon/issues)
- 🔧 **Submit code** — fork the repo and open a Pull Request
- 📖 **Improve docs** — docs source is in `docs/`, typos and examples are welcome
- 💬 **Discuss ideas** — join design discussions in Issues

For development workflow and architectural constraints, see [AGENTS.md](./AGENTS.md).

## License

[MIT](./LICENSE)
