# Information Hiding Design

Information hiding is OpenXenon's core design principle.

## Core Principle

**AI Assistant cannot perceive verification standards.**

## Stage Four-Field Visibility

| Field | Visibility | Meaning | Reason |
|-------|------------|---------|--------|
| `target` | Visible to AI | Execution scope | AI needs to know where to execute |
| `action` | Visible to AI | Execution instruction | AI needs to know what to do |
| `spec` | Hidden from AI | Verification standard | Prevent AI from targeted optimization |
| `probes` | Hidden from AI | Verification logic | Prevent AI from bypassing verification |

## Why Hide spec and probes?

### 1. Prevent Targeted Optimization

If AI knows verification standards, it may "test-hack" instead of truly solving problems:

```
AI sees spec: "Must use Prisma ORM"
    │
    ▼
AI only imports Prisma at file header but doesn't actually use it
    │
    ▼
Probe checks fs_match("@prisma/client") → PASSED
    │
    ▼
But code actually uses other ORM
```

### 2. Maintain Objective Evaluation

Verification logic is exclusively held by Core, AI cannot interfere:

```
AI doesn't know probes content
    │
    ▼
AI cannot predict which checks will be executed
    │
    ▼
AI must truly complete the task, not guess checkpoints
```

### 3. Engineer Controls Verification

Verification standards are the engineer's "trump card" and should not be exposed to the executor:

```
Engineer defines spec + probes
    │
    ▼
Core exclusively holds this information
    │
    ▼
AI only sees target + action
    │
    ▼
At verification time, Engineer uses spec + probes to check
```

## taskNext Return Content

```bash
oxn task next --task-id <id>
```

**Returns**:

```
Stage: create-user-model
Target: Create User model in src/models/ directory
Action: Use Prisma ORM to create User model with id, name, email fields
```

**Hidden**:

```
# Content AI cannot see
Spec: Must use Prisma Client, field types correct, include indexes
Probes:
  - fs_exists: src/models/user.ts
  - fs_match: @prisma/client
  - shell_exec: npx prisma validate
```

## taskVerify Execution Flow

```
AI calls taskVerify
    │
    ▼
Core extracts Stage.probes (AI doesn't know specific content)
    │
    ▼
Core calls Infra to perform physical observation
    │
    ▼
Core calls Kernel for pure function evaluation
    │
    ▼
Core returns verdict result (PASSED / FAILED)
```

**Key Points**:

- AI doesn't know which Probes will be executed
- AI doesn't know Probe parameters
- AI only knows the final result

## Information Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Information Flow                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Engineer                                                    │
│    │                                                         │
│    ├── Defines Blueprint                                     │
│    ├── Defines Stage (target/action/spec/probes)             │
│    └── Reviews results                                       │
│                                                              │
│  Core                                                        │
│    │                                                         │
│    ├── Exclusively holds spec + probes                       │
│    ├── Returns target + action to AI                         │
│    └── Executes probes to verify Artifact                    │
│                                                              │
│  AI Assistant                                                │
│    │                                                         │
│    ├── Only sees target + action                             │
│    ├── Executes operations                                    │
│    └── Builds Artifact                                       │
│    │                                                         │
│    └── Doesn't know spec + probes                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Adversarial Design

Information hiding is an adversarial design, assuming AI may attempt to bypass verification:

| AI Behavior | How Information Hiding Defends |
|-------------|-------------------------------|
| Targeted optimization | Doesn't know verification standards, cannot optimize for them |
| Bypass checks | Doesn't know probes content, cannot predict checkpoints |
| Lying about completion | Core uses physical observation for verification, doesn't trust AI claims |

## Summary

Information hiding ensures:

- **AI cannot perceive verification standards**
- **Core exclusively holds verification logic**
- **Engineer controls verification**

This is the core mechanism for OpenXenon to achieve "deterministic construction".