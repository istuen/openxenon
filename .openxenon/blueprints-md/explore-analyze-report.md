---
entity: blueprint
version: 1
name: explore-analyze-report
oxn-source-sha: 97786444f96aa063916abb26017f2648b42c0c1e1b0ac80a611296e91835e85d
synced-at: 2026-06-26T01:19:20.320Z
---

# Blueprint: explore-analyze-report

> 代码库探索 → 问题/机会分析 → 落盘报告：三阶段强制每阶段都产出可审查的 Artifact（不允许脑内话）

## Props

### report_format
- type: string
- default: markdown

### max_report_size_kb
- type: number
- default: 256

## Slots

### explore
- deps: []
- observe:
  - fs-match

### analyze
- deps:
  - explore
- observe:
  - fs-content-match

### report
- deps:
  - analyze
- observe:
  - fs-exists
  - file-exports
