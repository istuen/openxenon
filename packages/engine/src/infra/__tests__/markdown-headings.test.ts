// =============================================================================
// markdown-headings.test.ts (T8 v0.2 Sprint 4)
//
// 3 case:
//   1. 完整骨架 (# What # Why # How) → ok=true
//   2. 缺 # How → missing[] 含 # How
//   3. order=strict 顺序错 → ok=false
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { extractHeadings, validateHeadingSkeleton } from '../markdown-headings'

const SPEC = {
  required: ['# What', '# Why', '# How'],
  optional: ['# Reference'],
  order: 'flexible' as const,
}

describe('markdown-headings (T8)', () => {
  test('case 1: 完整骨架 (# What # Why # How) → ok=true', () => {
    const md = '# What\nx\n# Why\ny\n# How\nz\n'
    const v = validateHeadingSkeleton(md, SPEC)
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.headings).toEqual(['# What', '# Why', '# How'])
    }
  })

  test('case 2: 缺 # How → missing[] 含 # How', () => {
    const md = '# What\nx\n# Why\ny\n'
    const v = validateHeadingSkeleton(md, SPEC)
    expect(v.ok).toBe(false)
    if (!v.ok) {
      expect(v.missing).toContain('# How')
    }
  })

  test('case 3: order=strict 顺序错 → ok=false', () => {
    const md = '# What\n# How\n# Why\n'
    const v = validateHeadingSkeleton(md, {
      required: ['# What', '# Why', '# How'],
      order: 'strict',
    })
    expect(v.ok).toBe(false)
  })

  test('extractHeadings: 排除 ```代码块``` 内的 # 误识别', () => {
    const md = '# What\n```bash\n# this is not a heading\n```\n# How\n'
    const h = extractHeadings(md)
    expect(h).toEqual(['# What', '# How'])
  })
})
