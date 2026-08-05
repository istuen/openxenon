---
entity: probe
version: 0.1.0
name: file-exports
---

# Probe: file-exports

> 进程隔离 runtime import 提取模块的 exports 列表（exports.length > 0 → PASS）

## Alignment

- align: FileExports

## Scheme

- scheme: file://

## Props

### path
- type: string
- required: true

## Output

- exports: list<string>
- exportCount: number
- isolated: boolean
- durationMs: number
