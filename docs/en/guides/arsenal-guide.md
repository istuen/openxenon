# 4. Arsenal Asset Generation Process

## Overview

OpenXenon manages standard assets through a two-state DRAFT/CANONICAL lifecycle. Standard assets can be Probe, Proof, or Stage.

## Process Overview

```
Engineer Intent (Natural Language)
         │
         ▼
    /oxn-forge
         │
         ▼
    AI generates YAML according to constraints
         │
         ▼
    Kernel Schema validation
         │
         ▼
    Save to Arsenal directory
         │
         ▼
    [Blocking] Wait for engineer review
         │
         ▼
    oxn arsenal inspect
         │
         ▼
    oxn arsenal promote
         │
         ▼
    Asset promoted to CANONICAL
```

## /oxn-forge Command

`/oxn-forge` is an AI Skill command for generating standard assets through natural language. Enter `/oxn-forge <description>` in AI assistant to trigger.

### Usage

```
/oxn-forge <natural language description>
```

### Examples

#### Generate Probe

```
/oxn-forge Help me write a Probe that checks if a file exists
```

AI will generate YAML similar to:

```yaml
type: fs_exists
description: "Check if file exists"
parameters:
  - name: path
    type: string
    required: true
    description: "File path to check"
```

#### Generate Proof

```
/oxn-forge Write a Proof that verifies Laravel installation is successful
```

AI will generate YAML similar to:

```yaml
name: laravel_install_proof
target:
  description: "Verify Laravel installation is successful"
spec:
  description: "Laravel framework is successfully installed"
probes:
  - ref: check_composer_json
    description: "Check composer.json exists"
  - ref: check_vendor_exists
    description: "Check vendor directory exists"
```

#### Generate Stage

```
/oxn-forge Create a Stage for installing Laravel
```

AI will generate YAML similar to:

```yaml
id: install-laravel
name: install_laravel
description: "Install Laravel project skeleton"
proof: laravel_install_proof
deps: []
```

## Asset Generation Constraints

AI must follow these constraints when generating assets:

1. **Only generate DRAFT state**: All AI-generated assets enter DRAFT directory
2. **No logic execution**: Draft phase does no physical verification
3. **Must conform to Zod Schema**: Generated YAML must conform to type definitions
4. **Atomic Probe**: Each Probe only performs single check

## Review and Promotion

After AI generates Draft asset, it outputs the following prompt:

```
Draft Proof generated: laravel_install_proof
Path: .openxenon/arsenal/proofs/DRAFT/laravel_install_proof.yaml
Use 'oxn arsenal inspect' to view content, then use 'oxn arsenal promote' to promote after confirmation.
```

### View Asset

```bash
oxn arsenal inspect arsenal/proofs/DRAFT/laravel_install_proof.yaml
```

### Promote Asset

```bash
oxn arsenal promote proofs/laravel_install_proof
```

## Probe Design Principles

### Single Responsibility

Each Probe only performs single type of check:

| Probe Type | Check Content |
|------------|---------------|
| `fs_exists` | Whether file exists |
| `fs_match` | Whether file content matches regex |
| `shell_exec` | Whether command exit code is 0 |

### Composition

Multiple Probes can be combined into one Proof:

```yaml
name: laravel_install_proof
target:
  description: "Verify Laravel installation is successful"
spec:
  description: "Laravel framework is successfully installed"
probes:
  - ref: check_composer_json
    description: "Check composer.json exists"
  - ref: check_laravel_dependency
    description: "Check contains laravel dependency"
  - ref: check_vendor_exists
    description: "Check vendor directory exists"
```

## Directory Structure

Standard assets are organized flat under `.openxenon/arsenals/` by type:

```
.openxenon/
└── arsenals/
    ├── probes/
    │   ├── fs_exists/
    │   │   └── probe.yaml
    │   ├── fs_match/
    │   │   └── probe.yaml
    │   └── shell_exec/
    │       └── probe.yaml
    ├── proofs/
    │   └── <proof-name>/
    │       └── proof.yaml
    └── stages/
        └── <stage-name>/
            └── stage.yaml
```

## Best Practices

1. **Probes first, then Proof**: Create atomic Probes first, then combine into Proof
2. **Proof first, then Stage**: Stage references existing Proof
3. **Stage first, then Blueprint**: Blueprint selects needed Stages
4. **Review before promote**: Don't skip `oxn arsenal inspect` step

## Migrating Existing Assets

If you have Probe/Proof/Stage from other sources, bring them under management:

1. Manually create YAML file under DRAFT directory
2. Use `oxn arsenal inspect` to validate content
3. Use `oxn arsenal promote` to promote

## Next Chapter

The next chapter introduces [Troubleshooting](./troubleshooting.md).