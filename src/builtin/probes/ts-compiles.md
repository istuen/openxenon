---
entity: probe
version: 0.1.0
name: ts-compiles
---

# Probe: ts-compiles

> 跑 tsc --noEmit 验证类型检查通过（exit 0 → PASS）

## Alignment

- align: TsCompiles

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: false

### tsconfig
- type: string
- required: false

### timeout
- type: number
- required: false
- default: 120000

## Output

- passed: boolean
- exitCode: number
- errorCount: number
