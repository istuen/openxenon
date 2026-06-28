---
title: Architecture
---

# Architecture

> OXN Architecture = **E1-E4 structural entities + L0-L3 engineering layers**.

## 1. E1-E4 Structural Entities

| Entity | Nature | Code Module (L2 Engine) |
|---|---|---|
| E1 Asset | Static hard constraint boundary | `service/Asset/` |
| E2 Work | Dynamic collaboration (IAP + Round) | `service/Intent/` + `service/Align/` |
| E3 Engine | Independent verification sovereignty | All L0-L2 |
| E4 Insight | Emergence layer (1+1>2) | `service/Insight/` |

## 2. L0-L3 Engineering Layers

```
L3 Tools (CLI+Skills+Daemon) → L2 Engine (E1-E4 business logic)
  → L1 OXL+Infra (DSL+OS base) → L0 Kernel (pure logic)
```

**Physical directories** (packages monorepo):
```
packages/cli/src/commands/        ← CLI thin shell
packages/cli/skills/              ← AI skills (static)
packages/engine/src/
  ├──                  ← L2 Engine: Asset/Intent/Align/Proof/Insight/Pool + daemon.ts
  ├── infra/               ← L1: OXL DSL + Infra probes
  └── kernel/                  ← L0: schemas, contracts, verdicts
```

## 3. L2 Engine DDD Modular Structure

```
packages/engine/src/
├── Asset/{index,create,list,validate,compile,sync,...}.ts
├── Intent/{index,create-work,add-task,validate,lock,...}.ts
├── Align/{index,run,submit,status,finalize,...}.ts
├── Proof/{index,create,run,show,verify,...}.ts
├── Insight/{index,...}.ts
└── Pool/{index,...}.ts
```

See [Architecture (ZH-CN)](./architecture.md) for full detail. [Core Concepts](./core-concepts.md).
