---
entity: probe
version: 0.1.0
name: http-responds
---

# Probe: http-responds

> HTTP 请求检查 status code（status === expectedStatus → PASS；默认 timeout 5s）

## Alignment

- align: HttpResponds

## Scheme

- scheme: http://

## Props

### url
- type: string
- required: true

### method
- type: string
- required: false
- default: GET

### expectedStatus
- type: number
- required: false
- default: 200

### timeout
- type: number
- required: false
- default: 5000

### body
- type: string
- required: false

### headers
- type: string
- required: false

## Output

- passed: boolean
- status: number
- ok: boolean
- durationMs: number
