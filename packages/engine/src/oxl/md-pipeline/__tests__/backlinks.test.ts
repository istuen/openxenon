/**
 * md-pipeline/__tests__/backlinks.test.ts — v0.7 ADR-0059 + ADR-0060 backlinks 引擎测试
 *
 * 双向扫描（2026-07-17 修订）：
 *   - sub → root 反向：references frontmatter
 *   - root → sub 反向：desc MD link
 */

import { describe, expect, test } from 'bun:test'
import { parseMarkdown } from '../utils'
import {
  extractMdLinksFromDomain,
  extractReferencesBacklinks,
  buildBacklinkIndex,
  normalizeLinkTarget,
} from '../backlinks'

const sampleDomain1 = `---
entity: domain
version: 0.3.0
name: OxnWorkDomain
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-asset-domain
---

# Domain: OxnWorkDomain

## Terms: Work

### Work
- desc: 人机协作的工作空间。

### Task
- desc: Align 执行单元。无外部链接。

### Slot
- desc: Blueprint 内拓扑节点。
`

const sampleDomain2 = `---
entity: domain
version: 0.3.0
name: OxnProofDomain
references:
  - oxn-domain
  - oxn-engine-domain
  - oxn-work-domain
---

# Domain: OxnProofDomain

## Terms

### Probe
- desc: 物理观测单元。
`

const sampleDomain3_root = `---
entity: domain
version: 0.4.1
name: OxnDomain
references: []
---

# Domain: OxnDomain

## Terms

### OXN CLI
- desc: OpenXenon 交互入口之一。具体领域见 [\`oxn-cli-domain\`](./oxn-cli-domain.md)。

### OXN Engine
- desc: OpenXenon 核心引擎。具体领域见 [\`oxn-engine-domain\`](./oxn-engine-domain.md)。
`

const sampleDomain4_engine = `---
entity: domain
version: 0.4.1
name: OxnEngineDomain
references:
  - oxn-domain
---

# Domain: OxnEngineDomain

## Terms: OXN Engine

### OXN Engine
- desc: OpenXenon 核心引擎。
`

describe('md-pipeline/backlinks', () => {
  describe('normalizeLinkTarget', () => {
    test('removes #anchor', () => {
      expect(normalizeLinkTarget('./foo.md#bar')).toBe('foo.md')
    })
    test('removes ./ prefix', () => {
      expect(normalizeLinkTarget('./foo.md')).toBe('foo.md')
    })
    test('keeps plain file', () => {
      expect(normalizeLinkTarget('foo.md')).toBe('foo.md')
    })
  })

  describe('extractMdLinksFromDomain', () => {
    test('extracts links from term.desc (root Domain sample)', () => {
      const links = extractMdLinksFromDomain(sampleDomain3_root, parseMarkdown)
      expect(links.length).toBe(2)
      const urls = links.map((l) => l.linkUrl)
      expect(urls).toContain('./oxn-cli-domain.md')
      expect(urls).toContain('./oxn-engine-domain.md')
      for (const link of links) {
        expect(link.source).toBe('md-link')
        expect(link.sourceDomain).toBe('OxnDomain')
      }
    })

    test('sub Domain sample has no MD links (per ADR-0059 §D2 D2 约束)', () => {
      const links = extractMdLinksFromDomain(sampleDomain1, parseMarkdown)
      expect(links.length).toBe(0)
    })
  })

  describe('extractReferencesBacklinks', () => {
    test('extracts references list from sub Domain', () => {
      const backlinks = extractReferencesBacklinks(sampleDomain1, parseMarkdown)
      expect(backlinks.length).toBe(3)
      const refs = backlinks.flatMap((b) => b.references ?? [])
      expect(refs).toContain('oxn-domain')
      expect(refs).toContain('oxn-engine-domain')
      expect(refs).toContain('oxn-asset-domain')
      for (const bl of backlinks) {
        expect(bl.source).toBe('references-frontmatter')
        expect(bl.sourceDomain).toBe('OxnWorkDomain')
      }
    })

    test('root Domain has empty references', () => {
      const backlinks = extractReferencesBacklinks(sampleDomain3_root, parseMarkdown)
      expect(backlinks.length).toBe(0)
    })
  })

  describe('buildBacklinkIndex (双向 union)', () => {
    test('sub → root 反向：扫描 references', () => {
      const index = buildBacklinkIndex(
        [
          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },
          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },
          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },
          { filePath: 'oxn-domain.md', content: sampleDomain3_root },
        ],
        parseMarkdown,
      )

      // oxn-domain.md 应被 oxn-work-domain + oxn-proof-domain 引用
      const oxnDomainBacklinks = index.get('oxn-domain.md') ?? []
      const sourceDomains = new Set(oxnDomainBacklinks.map((b) => b.sourceDomain))
      expect(sourceDomains.has('OxnWorkDomain')).toBe(true)
      expect(sourceDomains.has('OxnProofDomain')).toBe(true)
      for (const bl of oxnDomainBacklinks) {
        expect(bl.source).toBe('references-frontmatter')
      }
    })

    test('root → sub 反向：扫描 desc MD link', () => {
      const index = buildBacklinkIndex(
        [
          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },
          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },
          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },
          { filePath: 'oxn-domain.md', content: sampleDomain3_root },
        ],
        parseMarkdown,
      )

      // oxn-cli-domain.md 应被 oxn-domain 通过 MD link 引用
      const cliBacklinks = index.get('oxn-cli-domain.md') ?? []
      expect(cliBacklinks.length).toBe(1)
      expect(cliBacklinks[0]?.sourceDomain).toBe('OxnDomain')
      expect(cliBacklinks[0]?.sourceTerm).toBe('OXN CLI')
      expect(cliBacklinks[0]?.source).toBe('md-link')
    })

    test('双向 union：references 引用 + MD link 引用合并到同一索引', () => {
      const index = buildBacklinkIndex(
        [
          { filePath: 'oxn-work-domain.md', content: sampleDomain1 },
          { filePath: 'oxn-proof-domain.md', content: sampleDomain2 },
          { filePath: 'oxn-engine-domain.md', content: sampleDomain4_engine },
          { filePath: 'oxn-domain.md', content: sampleDomain3_root },
        ],
        parseMarkdown,
      )

      // oxn-engine-domain.md 应同时被 3 个 Domain 引用：
      //   - oxn-work-domain.references（含 oxn-engine-domain）
      //   - oxn-proof-domain.references（含 oxn-engine-domain）
      //   - oxn-domain.md desc MD link（指向 oxn-engine-domain.md）
      const engineBacklinks = index.get('oxn-engine-domain.md') ?? []
      const sources = new Set(engineBacklinks.map((b) => b.sourceDomain))
      expect(sources.has('OxnWorkDomain')).toBe(true)
      expect(sources.has('OxnProofDomain')).toBe(true)
      expect(sources.has('OxnDomain')).toBe(true)

      // 其中 1 条来自 MD link（OxnDomain），其余来自 references
      const mdLinkCount = engineBacklinks.filter((b) => b.source === 'md-link').length
      const refsCount = engineBacklinks.filter((b) => b.source === 'references-frontmatter').length
      expect(mdLinkCount).toBe(1)
      expect(refsCount).toBe(2)
    })

    test('returns empty index for files with no inbound links', () => {
      const content = `---
name: EmptyDomain
references: []
---

## Terms

### Foo
- desc: No links here.
`
      const index = buildBacklinkIndex([{ filePath: 'empty.md', content }], parseMarkdown)
      expect(index.size).toBe(0)
    })
  })
})
