# OpenXenon

> **A lightweight human-AI collaboration engine for AI Agents.**
>
> Plugs into AI Agent workbenches (OpenCode, Claude Code, Codex, Cursor) to prove AI-generated results with tamper-proof `frozen.json`.
>
> [中文版](./README.md) · [Full Documentation](./docs/en/index.md) · [AI Collaborator Entry](./docs/en/llm-prompt.md)

[![npm version](https://img.shields.io/npm/v/@istuen/openxenon)](https://www.npmjs.com/package/@istuen/openxenon)
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
npm install -g @istuen/openxenon   # or pnpm / bun
oxn --version
```

The repository source is the dev base for `dist/cli.js`, **not** the user install path. Regular users should use `npm install -g` above.

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
/oxn-proof verify that dist/index.js exists and exports the handler
```

The AI Agent calls `oxn` via Skill, result flows back to `frozen.json`.

## The IAP Paradigm

```
        Intent axis                Align axis
   Domain(.oxn)  ──┐         ┌── Work(.oxn)
   Blueprint(.oxn)─┼─ I → A ─┼── Task → Artifact
                   │         │
                   └── A → P ┘
                          │
                          ▼
                      Proof axis
                  Proof(Verdict) → frozen.json
                          │
                          └─── P → I feedback ───▶ Intent evolution
```

| Axis | Owner | Output | Locked by |
|---|---|---|---|
| **Intent** | Engineer | Domain / Blueprint | `term` / `ban` / `invariant` |
| **Align**  | AI | Work / Task / Part | Blueprint `slot` |
| **Proof**  | OXN | Proof (`frozen.json`) | Daemon blocks fake completion, **no `--force` bypass** |

> **IAP First Law**: ownership does not cross; proof cannot be bypassed.

## Architecture

OXN Engine = **DSL** + **Runtime** + **CLI**

| Layer | Role |
|---|---|
| **DSL (OXL)** | Langium-implemented domain-specific language for Domain / Blueprint / Work |
| **Runtime** | Kernel (pure logic) + Infra (IO) + Daemon (supervisor + escape mechanism) |
| **CLI** | The single operation entry for engineers and AI (`oxn init / proof / domain / blueprint / work`) |

> **Purity constraint**: Kernel must not do IO; Infra must not judge PASS/FAIL; Daemon must not change rules. See [Architecture](./docs/en/architecture.md).

## AI Agent Integrations

`oxn init --ai <agent>` generates the corresponding Skill in one step, then the AI Agent can call the `oxn` CLI.

| AI Agent | Init command | Status |
|---|---|---|
| **OpenCode**    | `oxn init --ai opencode` | ✓ supported |
| **Claude Code** | `oxn init --ai claude`   | ✓ supported |
| **Codex**       | `oxn init --ai codex`    | ✓ supported |
| **Cursor**      | `oxn init --ai cursor`   | ✓ supported |

**Integration flow:**

```
[Engineer] ──> [AI Agent: OpenCode / Claude Code / Codex / Cursor]
                          │         │
                          │  Skill  ▼  /oxn-proof
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

| Phase | Goal | Status |
|---|---|---|
| **P0** | Proof axis standalone (`oxn proof` loop) | ✓ done (v0.1.0) |
| **P1** | Intent axis technicalization (Program Domain + Blueprint) | ✓ done (v0.1.x) |
| **P2** | Intent axis business-ization (Business Domain + DDD + sandbox Probe) | 🔜 in progress (v0.2) |
| **P3** | Intent axis asset-ization (Intent Pool + Hall) | 📋 planned |

See [Roadmap](./docs/en/roadmap.md).

## Contributing

OpenXenon welcomes contributions of all kinds:

- 🐛 **Report issues** — submit bug reports or feature requests via [GitHub Issues](https://github.com/istuen/openxenon/issues)
- 🔧 **Submit code** — fork the repo and open a Pull Request
- 📖 **Improve docs** — docs source is in `docs/`, typos and examples are welcome
- 💬 **Discuss ideas** — join design discussions in Issues

For development workflow and architectural constraints, see [AGENTS.md](./AGENTS.md).

## License

[MIT](./LICENSE)
