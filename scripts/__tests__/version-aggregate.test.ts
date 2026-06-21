/**
 * scripts/__tests__/version-aggregate.test.ts
 *
 * v0.3 stage 4 T13 单元测试
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { aggregateChangelog, formatChangelogMarkdown } from '../version-aggregate.js'

describe('scripts/version-aggregate', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `oxn-aggregate-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(testDir, '.openxenon', 'pools', 'design'), { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('aggregateChangelog — 基本扫描', () => {
    const md = `---
entity: domain
version: 0.3.0
name: TestDomain
status: active
---

# Domain: TestDomain
`
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'test.md'), md)

    const result = aggregateChangelog({ projectRoot: testDir })

    expect(result.total).toBe(1)
    expect(result.byVersion['0.3.0']).toHaveLength(1)
    expect(result.byVersion['0.3.0']?.[0]?.title).toBe('Domain: TestDomain')
    expect(result.byVersion['0.3.0']?.[0]?.entity).toBe('domain')
  })

  test('aggregateChangelog — 多版本分组', () => {
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'v1.md'),
      `---
entity: domain
version: 0.1.0
---
# Domain: V1
`,
    )
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'v2.md'),
      `---
entity: blueprint
version: 0.2.0
---
# Blueprint: V2
`,
    )
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'v3.md'),
      `---
entity: work
version: 0.3.0
---
# Work: V3
`,
    )

    const result = aggregateChangelog({ projectRoot: testDir })

    expect(result.total).toBe(3)
    expect(Object.keys(result.byVersion)).toHaveLength(3)
    expect(result.byVersion['0.1.0']).toHaveLength(1)
    expect(result.byVersion['0.2.0']).toHaveLength(1)
    expect(result.byVersion['0.3.0']).toHaveLength(1)
  })

  test('aggregateChangelog — 跳过无 frontmatter 文件', () => {
    writeFileSync(join(testDir, '.openxenon', 'pools', 'design', 'no-fm.md'), '# No frontmatter\n')
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'with-fm.md'),
      `---
entity: domain
version: 0.3.0
---
# Domain: WithFM
`,
    )

    const result = aggregateChangelog({ projectRoot: testDir })

    expect(result.total).toBe(1)
    expect(result.skipped.length).toBe(1)
    expect(result.skipped[0]?.reason).toBe('no frontmatter')
  })

  test('aggregateChangelog — 排除 forges/', () => {
    mkdirSync(join(testDir, '.openxenon', 'forges'), { recursive: true })
    writeFileSync(
      join(testDir, '.openxenon', 'forges', 'old.md'),
      `---
entity: domain
version: 0.1.0
---
# Old
`,
    )
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'new.md'),
      `---
entity: domain
version: 0.3.0
---
# New
`,
    )

    const result = aggregateChangelog({ projectRoot: testDir })

    expect(result.total).toBe(1)
    expect(result.byVersion['0.3.0']).toBeDefined()
    expect(result.byVersion['0.1.0']).toBeUndefined()
  })

  test('aggregateChangelog — 排除 _archive/', () => {
    mkdirSync(join(testDir, '.openxenon', 'pools', '_archive', '2026-06'), {
      recursive: true,
    })
    writeFileSync(
      join(testDir, '.openxenon', 'pools', '_archive', '2026-06', 'old.md'),
      `---
entity: domain
version: 0.1.0
---
# Archived
`,
    )
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'new.md'),
      `---
entity: domain
version: 0.3.0
---
# New
`,
    )

    const result = aggregateChangelog({ projectRoot: testDir })

    expect(result.total).toBe(1)
  })

  test('formatChangelogMarkdown — 输出 Markdown', () => {
    const changelog = {
      byVersion: {
        '0.3.0': [
          {
            path: '.openxenon/pools/design/test.md',
            entity: 'domain',
            version: '0.3.0',
            status: 'active',
            title: 'Test',
            description: 'Test desc',
          },
        ],
      },
      total: 1,
      skipped: [],
    }
    const md = formatChangelogMarkdown(changelog)
    expect(md).toContain('# OpenXenon CHANGELOG')
    expect(md).toContain('## 0.3.0')
    expect(md).toContain('### domain')
    expect(md).toContain('**Test**')
  })

  test('aggregateChangelog — .openxenon 不存在抛错', () => {
    expect(() => aggregateChangelog({ projectRoot: '/tmp/nonexistent' })).toThrow()
  })

  test('aggregateChangelog — frontmatter 字符串值', () => {
    writeFileSync(
      join(testDir, '.openxenon', 'pools', 'design', 'quoted.md'),
      `---
entity: "domain"
version: "0.3.0"
name: "Test"
---
# Test
`,
    )
    const result = aggregateChangelog({ projectRoot: testDir })
    expect(result.total).toBe(1)
    expect(result.byVersion['0.3.0']?.[0]?.entity).toBe('domain')
  })
})
