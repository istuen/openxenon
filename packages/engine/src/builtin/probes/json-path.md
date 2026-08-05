---
entity: probe
version: 0.1.0
name: json-path
---

# Probe: json-path

> 验证 JSONPath 值匹配预期（简化子集：$.a / $.a.b / $.a[0] / $.a[*]）

## Alignment

- align: JsonPath

## Scheme

- scheme: file://

## Props

### file
- type: string
- required: true

### path
- type: string
- required: true

### expected
- type: unknown
- required: true

## Output

- passed: boolean
- actual: object { resolved, expected, path }