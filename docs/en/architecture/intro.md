# 1. System Introduction

## What is OpenXenon

OpenXenon is an experimental framework that explores how engineers and AI can collaborate more effectively.

AI models are efficient and good at exploration, but they can also make mistakes and hallucinate.
Engineers understand business and technology, can design solutions, and accumulate experience.
OpenXenon solves this: **how to transform engineer experience into AI-executable instructions while reducing Token costs.**

## System Architecture

```
Engineer
    │
    ▼
AI Model (interacts with system via /oxn-forge, /oxn-task)
    │
    ▼
oxn CLI (command entry)
    │
    ├──► Kernel (pure function evaluation)
    │
    ├──► Infra (filesystem and process operations)
    │
    └──► Arsenal (built-in assets)
```

## Core Values

| Value | Description |
|-------|-------------|
| **Experience as Assets** | Engineer judgments become AI-executable constraints |
| **Verifiable Results** | AI execution results confirmed through observation |
| **Accumulating Assets** | Good constraints can be reused and accumulated |

## Use Cases

- Teams using AI-assisted programming that need verifiable execution results
- Projects wanting to transform engineer experience into reusable assets
- Experimental development exploring more effective human-AI collaboration

## Next Chapter

The next chapter details OpenXenon's [Core Concepts](./concepts.md).