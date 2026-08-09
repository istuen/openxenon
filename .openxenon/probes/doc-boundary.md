---
entity: probe
version: 0.1.0
name: doc-boundary
---

# Probe: doc-boundary

> 文档三层守门：扫 docs/{product,dev,rfc}/ 与 .openxenon/drafts/ 下的 .md，校验 6 条边界规则（product→openxenon / dev→drafts / dev→assets / rfc→drafts/rfc / drafts→drafts/rfc / drafts/rfc→assets）。无违规 = PASS。

## Alignment

- align: DocBoundary

## Scheme

- scheme: file://

## Props

### root
- type: string
- required: false
- desc: 项目根目录（默认 process.cwd()）

## Output

- passed: boolean
- violationCount: number
- violations: Array<{ file, line, rule, message, link }>
