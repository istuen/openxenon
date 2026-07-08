---
entity: probe
version: 0.1.0
name: git-merge-feasible
---

# Probe: git-merge-feasible

> 判定 work 分支能否干净 merge 进 target_branch（用 git merge-tree 算法模拟，不实际 merge）

## Alignment

- align: GitMergeFeasible

## Scheme

- scheme: git://

## Props

### workBranch
- type: string
- required: true

### targetBranch
- type: string
- required: false
- default: current

### cwd
- type: string
- required: false
- default: .

## Output

- status: string
- conflictFiles: list<string>
- targetCommit: string
- workCommit: string
