---
entity: probe
version: 0.1.0
name: git-status-clean
---

# Probe: git-status-clean

> 检查 git status --porcelain 输出（等价于 git-clean 的别名，更显式）

## Alignment

- align: GitStatusClean

## Scheme

- scheme: git://

## Props

### path
- type: string
- required: false
- default: .

## Output

- clean: boolean
- dirtyFiles: list<string>
