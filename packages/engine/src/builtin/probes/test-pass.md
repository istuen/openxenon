---
entity: probe
version: 0.1.0
name: test-pass
---

# Probe: test-pass

> 跑 bun test 并验证全部通过（exit 0 → PASS）

## Alignment

- align: TestPass

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: false

### pattern
- type: string
- required: false

### timeout
- type: number
- required: false
- default: 240000

## Output

- passed: boolean
- exitCode: number
- summary: string
