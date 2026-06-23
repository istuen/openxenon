---
entity: proof
version: 0.3.0
name: step1-verdict
---

# Proof: step1-verdict

## Verdicts

### artifact-size-check
- type: pass
- value: artifact size = 2.3MB < 5MB

### test-pass-rate
- type: pass
- value: pass_rate = 0.96 > 0.9

### lint-check
- type: inconclusive
- value: 1 warning found

## Runtime

### observed
- observed_at: 2026-06-23T12:34:56Z
- probes_run: 3
- probes_passed: 2
- probes_inconclusive: 1
