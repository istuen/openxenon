/**
 * src/oxl/md-bridge/__tests__/compilers/proof-compiler.test.ts
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { ProofCompiler } from '../../compilers/proof-compiler.js'

function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

const SAMPLE_PROOF = `---
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
- value: 1 warning found, manual review needed

## Runtime
### snapshot
- observed_at: 2026-06-23T12:34:56Z
- probes_run: 3
- probes_passed: 2
- probes_inconclusive: 1
`

describe('ProofCompiler.parse', () => {
  const compiler = new ProofCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_PROOF)
    frontmatter = { entity: 'proof', version: '0.3.0', name: 'step1-verdict' }
  })

  test('解析 verdicts（含三态 type）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      verdicts: Array<{ name: string; type: string; value: string }>
    }
    expect(result.verdicts).toHaveLength(3)
    expect(result.verdicts[0]?.name).toBe('artifact-size-check')
    expect(result.verdicts[0]?.type).toBe('pass')
    expect(result.verdicts[2]?.type).toBe('inconclusive')
  })

  test('解析 runtime', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      runtime: { observed_at: string; probes_run: number; probes_passed: number; probes_inconclusive: number }
    }
    expect(result.runtime).not.toBeNull()
    expect(result.runtime.observed_at).toBe('2026-06-23T12:34:56Z')
    expect(result.runtime.probes_run).toBe(3)
    expect(result.runtime.probes_passed).toBe(2)
    expect(result.runtime.probes_inconclusive).toBe(1)
  })
})

describe('ProofCompiler.validate', () => {
  const compiler = new ProofCompiler()

  test('合法 MD 无 error', () => {
    const root = parseMd(SAMPLE_PROOF)
    const frontmatter = { entity: 'proof', name: 'step1-verdict' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })
})

describe('ProofCompiler.compile', () => {
  const compiler = new ProofCompiler()

  test('ProofDeclaration → .md', () => {
    const decl = {
      $type: 'ProofDeclaration',
      name: 'step1-verdict',
      verdicts: [
        { name: 'check1', type: 'pass' as const, value: 'ok' },
        { name: 'check2', type: 'inconclusive' as const, value: 'manual' },
      ],
      runtime: { observedAt: '2026-06-23', probesRun: 2, probesPassed: 1, probesInconclusive: 1 },
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('step1-verdict')
    expect(result.md).toContain('# Proof: step1-verdict')
    expect(result.md).toContain('## Verdicts')
    expect(result.md).toContain('- type: pass')
    expect(result.md).toContain('## Runtime')
  })
})

describe('ProofCompiler.validate v0.3.0 canonical 守卫', () => {
  const compiler = new ProofCompiler()

  function validateMd(md: string): Array<{ code: string; severity?: string }> {
    const root = parseMd(md)
    const frontmatter = { entity: 'proof', name: 't' }
    return compiler.validate({ mdast: root, frontmatter }) as Array<{
      code: string
      severity?: string
    }>
  }

  test('Q2: Runtime 显式 probes_failed 抛 E_MD_REDUNDANT_FIELD', () => {
    const md = `---
entity: proof
version: 0.3.0
name: t
---

# Proof: t

## Verdicts
### v1
- type: pass
- value: ok

## Runtime
### snapshot
- probes_run: 4
- probes_passed: 2
- probes_failed: 1
- probes_inconclusive: 1
`
    const errors = validateMd(md)
    expect(errors.some((e) => e.code === 'E_MD_REDUNDANT_FIELD')).toBe(true)
  })

  test('Q3: Runtime 多 H3 抛 E_MD_INVALID_RUNTIME_BLOCK', () => {
    const md = `---
entity: proof
version: 0.3.0
name: t
---

# Proof: t

## Verdicts
### v1
- type: pass
- value: ok

## Runtime
### initial
- observed_at: 2026-06-23T10:00:00Z
### final
- observed_at: 2026-06-23T12:00:00Z
`
    const errors = validateMd(md)
    expect(errors.some((e) => e.code === 'E_MD_INVALID_RUNTIME_BLOCK')).toBe(true)
  })

  test('Q3: Runtime 0 H3 抛 E_MD_INVALID_RUNTIME_BLOCK', () => {
    const md = `---
entity: proof
version: 0.3.0
name: t
---

# Proof: t

## Verdicts
### v1
- type: pass
- value: ok

## Runtime
- observed_at: 2026-06-23T12:00:00Z
`
    const errors = validateMd(md)
    expect(errors.some((e) => e.code === 'E_MD_INVALID_RUNTIME_BLOCK')).toBe(true)
  })

  test('Q3: Runtime H3 名不是 snapshot 抛 E_MD_INVALID_RUNTIME_BLOCK', () => {
    const md = `---
entity: proof
version: 0.3.0
name: t
---

# Proof: t

## Verdicts
### v1
- type: pass
- value: ok

## Runtime
### wrong-name
- observed_at: 2026-06-23T12:00:00Z
`
    const errors = validateMd(md)
    expect(errors.some((e) => e.code === 'E_MD_INVALID_RUNTIME_BLOCK')).toBe(true)
  })
})
