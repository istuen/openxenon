---
entity: probe
version: 0.1.0
name: fs-content-match
---

# Probe: fs-content-match

> 检查文件内容是否匹配 regex 模式

## Alignment

- align: FsContentMatch

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true

### contains
- type: string
- required: true

## Output

- matched: boolean
- content: string
