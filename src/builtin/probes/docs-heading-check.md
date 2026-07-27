---
entity: probe
version: 0.1.0
name: docs-heading-check
---

# Probe: docs-heading-check

> 校验 docs/{product,dev,rfc}/{zh-cn,en}/*.md 的章节骨架（H2 模式）。章内统一模板：What → Why → How → 参考。仅校验含 `## What` 的文档（章内模板触发器）。

## Alignment

- align: DocsHeadingCheck

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true
- desc: 要校验的文件或目录路径（递归收集 .md）

## Output

- passed: boolean
- checked: number
- passedCount: number
- failedFiles: string[]
- errors: Array<{ file, missing, unexpected, headings }>
