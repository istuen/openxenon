---
entity: probe
version: 0.1.0
name: deps-resolved
---

# Probe: deps-resolved

> 验证 package.json 声明的所有依赖都被 lockfile 解析（missing.length === 0 → PASS）

## Alignment

- align: DepsResolved

## Scheme

- scheme: file://

## Props

### packageJson
- type: string
- required: false

### lockfile
- type: string
- required: false

## Output

- missing: list<string>
- declaredCount: number
- resolvedCount: number
- lockfilePath: string
