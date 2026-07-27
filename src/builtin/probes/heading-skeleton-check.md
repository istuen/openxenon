---
entity: probe
version: 0.1.0
name: heading-skeleton-check
---

# Probe: heading-skeleton-check

> 校验 .openxenon/pools/<pool>/ 下 .md 文件的 heading 骨架（H1 模式）。pool 类型决定 spec（research / design / issue / audit / journal）。

## Alignment

- align: HeadingSkeletonCheck

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true
- desc: 要校验的文件或目录路径（递归收集 .md）

### pool
- type: string
- required: true
- desc: pool 类型，决定 spec；值域：research / design / issue / audit / journal

## Output

- passed: boolean
- checked: number
- passedCount: number
- failedFiles: string[]
- errors: Array<{ file, missing, unexpected, headings }>
