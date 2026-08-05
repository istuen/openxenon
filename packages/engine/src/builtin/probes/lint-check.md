---
entity: probe
version: 0.1.0
name: lint-check
---

# Probe: lint-check

> 跑 biome check 验证代码风格（exit 0 → PASS；需项目装 biome）

## Alignment

- align: LintCheck

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: false

### apply
- type: boolean
- required: false

### timeout
- type: number
- required: false
- default: 60000

## Output

- passed: boolean
- exitCode: number
- issueCount: number
