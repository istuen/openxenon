---
entity: probe
version: 0.1.0
name: git-clean
---

# Probe: git-clean

> 检查当前 working tree 是否干净（无未提交改动）

## Alignment

- align: GitClean

## Scheme

- scheme: git://

## Props

### path
- type: string
- required: false
- default: .

### includeUntracked
- type: boolean
- required: false

## Output

- clean: boolean
- dirtyFiles: list<string>
