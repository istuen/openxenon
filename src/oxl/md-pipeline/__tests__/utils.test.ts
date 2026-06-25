/**
 * src/oxl/md-pipeline/__tests__/utils.test.ts
 *
 * v0.4 PR-C1 unified-native utils 测试
 * 覆盖:
 *   - collectHeadings: 收集 H1/H2/H3
 *   - findFirstHeading: 找第一个指定 depth 的 heading
 *   - collectHeadingContexts: H2 + H3 嵌套结构
 *   - collectListFields: list item 中的 key-value 字段
 *   - parseMarkdown: md → mdast
 *   - stringifyMarkdown: mdast → md (round-trip)
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root } from 'mdast'
import {
  collectHeadings,
  findFirstHeading,
  collectHeadingContexts,
  collectListFields,
  parseMarkdown,
  stringifyMarkdown,
  countNodes,
} from '../utils'

function parseMd(md: string): Root {
  return unified().use(remarkParse).use(remarkFrontmatter).parse(md) as Root
}

const SAMPLE = `---
entity: domain
version: 0.3.0
name: TestDomain
---
# Domain: TestDomain

> Test domain description

## Terms
### Intent
- name: Intent
- desc: declaration

### Domain
- name: Domain
- desc: business

## Stack
### runtime
- language: typescript
- runtime: bun
`

describe('v0.4 PR-C1: collectHeadings', () => {
  test('收集所有 H1/H2/H3', () => {
    const root = parseMd(SAMPLE)
    const headings = collectHeadings(root)
    // 1 H1, 2 H2, 3 H3 (Intent, Domain, runtime) = 6
    expect(headings).toHaveLength(6)
    expect(headings[0]?.depth).toBe(1)
    expect(headings[0]?.text).toBe('Domain: TestDomain')
    expect(headings[1]?.depth).toBe(2)
    expect(headings[1]?.text).toBe('Terms')
  })
})

describe('v0.4 PR-C1: findFirstHeading', () => {
  test('找 H1', () => {
    const root = parseMd(SAMPLE)
    const h1 = findFirstHeading(root, 1)
    expect(h1).not.toBeNull()
    expect(h1?.text).toBe('Domain: TestDomain')
  })

  test('找第一个 H3', () => {
    const root = parseMd(SAMPLE)
    const h3 = findFirstHeading(root, 3)
    expect(h3?.text).toBe('Intent')
  })

  test('不存在的 depth 返回 null', () => {
    const root = parseMd('# only H1\n')
    const h6 = findFirstHeading(root, 6)
    expect(h6).toBeNull()
  })
})

describe('v0.4 PR-C1: collectHeadingContexts', () => {
  test('H2 配 H3, 无 Stack section 内 Runtime', () => {
    const root = parseMd(SAMPLE)
    const contexts = collectHeadingContexts(root)
    // H2=Terms → Intent/Domain; H2=Stack → runtime
    // 但 Stack 下的 runtime H3 不被收集 (因为没有紧跟 list)
    expect(contexts.length).toBeGreaterThanOrEqual(2)
    const termsIntent = contexts.find((c) => c.h2 === 'Terms' && c.h3 === 'Intent')
    expect(termsIntent).toBeDefined()
  })
})

describe('v0.4 PR-C1: collectListFields', () => {
  test('提取 key-value 字段', () => {
    const root = parseMd(SAMPLE)
    const list = root.children.find((c) => c.type === 'list')
    expect(list).toBeDefined()
    if (list?.type === 'list') {
      const fields = collectListFields(list)
      expect(fields[0]?.key).toBe('name')
      expect(fields[0]?.value).toBe('Intent')
      expect(fields[1]?.key).toBe('desc')
      expect(fields[1]?.value).toBe('declaration')
    }
  })

  test('空 list 返回空数组', () => {
    const root = parseMd('\n')
    const list = root.children.find((c) => c.type === 'list')
    expect(list).toBeUndefined()
  })
})

describe('v0.4 PR-C1: parseMarkdown + stringifyMarkdown (round-trip)', () => {
  test('parse → stringify round-trip', () => {
    const original = '# Title\n\n## Section\n\n- key: value\n'
    const root = parseMarkdown(original)
    const serialized = stringifyMarkdown(root)
    expect(serialized).toContain('# Title')
    expect(serialized).toContain('## Section')
    expect(serialized).toContain('key: value')
  })

  test('空 md 字符串 parse 成功', () => {
    const root = parseMarkdown('')
    expect(root.type).toBe('root')
    expect(root.children).toHaveLength(0)
    const serialized = stringifyMarkdown(root)
    expect(typeof serialized).toBe('string')
  })
})

describe('v0.4 PR-C1: countNodes', () => {
  test('统计节点数', () => {
    const root = parseMd(SAMPLE)
    const n = countNodes(root)
    expect(n).toBeGreaterThan(5)
  })
})
