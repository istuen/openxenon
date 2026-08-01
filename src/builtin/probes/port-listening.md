---
entity: probe
version: 0.1.0
name: port-listening
---

# Probe: port-listening

> 验证 TCP 端口正在监听（Node net.connect 跨平台）

## Alignment

- align: PortListening

## Scheme

- scheme: tcp://

## Props

### host
- type: string
- required: true

### port
- type: number
- required: true

### timeout
- type: number
- required: false
- default: 3000

## Output

- passed: boolean
- host: string
- port: number
- durationMs: number