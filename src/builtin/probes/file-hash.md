---
entity: probe
version: 0.1.0
name: file-hash
---

# Probe: file-hash

> 验证文件 SHA-256（或其他算法）匹配预期 hash

## Alignment

- align: FileHash

## Scheme

- scheme: file://

## Props

### file
- type: string
- required: true

### expectedHash
- type: string
- required: true

### algorithm
- type: string
- required: false
- default: sha256

## Output

- passed: boolean
- actual: object { hash, algorithm, file }