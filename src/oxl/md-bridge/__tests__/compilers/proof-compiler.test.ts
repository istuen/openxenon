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
### observed
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
