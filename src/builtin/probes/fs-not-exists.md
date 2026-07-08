---
entity: probe
version: 0.1.0
name: fs-not-exists
---

# Probe: fs-not-exists

> 检查指定 glob 模式的文件不存在

## Alignment

- align: FsNotExists

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true

## Output

- exists: boolean
- matches: list<string>
