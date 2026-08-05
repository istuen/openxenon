---
entity: probe
version: 0.1.0
name: test-coverage
---

# Probe: test-coverage

> 验证测试覆盖率（lines / branches / functions）≥ 阈值

## Alignment

- align: TestCoverage

## Scheme

- scheme: file://

## Props

### minLinesPct
- type: number
- required: true

### minBranchesPct
- type: number
- required: false

### minFunctionsPct
- type: number
- required: false

### runner
- type: string
- required: false
- default: bun

## Output

- passed: boolean
- lines: object { actual, threshold, passed }
- branches: object | null
- functions: object | null
- exitCode: number
- summaryPath: string