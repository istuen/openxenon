# 4. Arsenal Asset Generation Process

## Overview

OpenXenon manages standard assets through a two-state DRAFT/CANONICAL lifecycle. Standard assets can be Probe or Stage.

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

#### Generate Stage

```
/oxn-forge Create a Stage for installing Laravel
```

AI will generate YAML similar to:

```yaml
id: install-laravel
name: install_laravel
description: "Install Laravel project skeleton"
target:
  description: "Install Laravel in project"
action:
  description: "Run composer install"
probes:
  - ref: fs_exists
    parameters:
      pattern: "vendor/laravel"
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
Draft Stage generated: install-laravel
Path: .openxenon/arsenals/stages/DRAFT/install-laravel.yaml
Use 'oxn arsenal inspect' to view content, then use 'oxn arsenal promote' to promote after confirmation.
```

### View Asset

```bash
oxn arsenal inspect stages/install-laravel
```

### Promote Asset

```bash
oxn arsenal promote stages/install-laravel
```

## Probe Design Principles

### Single Responsibility

Each Probe only performs single type of check:

| Probe Type | Check Content |
|------------|---------------|
| `fs_exists` | Whether file exists |
| `fs_match` | Whether file content matches regex |
| `shell_exec` | Whether command exit code is 0 |

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
    └── stages/
        └── <stage-name>/
            └── stage.yaml
```

## Best Practices

1. **Probes first**: Create atomic Probes first
2. **Stage uses Probes**: Stage references existing Probes via probes array
3. **Blueprint uses Stages**: Blueprint selects needed Stages
4. **Review before promote**: Don't skip `oxn arsenal inspect` step

## Migrating Existing Assets

If you have Probe or Stage from other sources, bring them under management:

1. Manually create YAML file under DRAFT directory
2. Use `oxn arsenal inspect` to validate content
3. Use `oxn arsenal promote` to promote

## Next Chapter

The next chapter introduces [Troubleshooting](./troubleshooting.md).