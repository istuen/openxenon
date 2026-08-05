---
entity: probe
version: 0.1.0
name: fs-parseable
---

# Probe: fs-parseable

> 检查文件可被 JSON 解析

## Alignment

- align: FsParseable

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true

## Output

- parsed: boolean
- format: string
- topLevelKeys: list<string>
