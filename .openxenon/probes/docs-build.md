---
entity: probe
version: 0.1.0
name: docs-build
---

# Probe: docs-build

> 跑 `bun run docs:build`（vitepress build docs）验证文档站点构建通过（exit 0 → PASS）

## Alignment

- align: DocsBuild

## Scheme

- scheme: file://

## Props

### timeout
- type: number
- required: false
- default: 180000

## Output

- passed: boolean
- exitCode: number
- summary: string
