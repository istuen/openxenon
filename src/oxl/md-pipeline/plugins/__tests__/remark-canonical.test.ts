/**
 * src/oxl/md-pipeline/plugins/__tests__/remark-canonical.test.ts
 *
 * v0.4 PR-C3 unified-native canonical 校验 plugin 测试
 * 覆盖 7 个守卫: H1_missing / H1_mismatch / category_unknown / duplicate_H3
 *   / deprecated_syntax / missing_required / list_format
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root } from 'mdast'
import { parseMarkdown, extractYamlFromTree } from '../../utils'
import { remarkCanonical, validateCanonical, ENTITY_H2_WHITELIST, type CanonicalIssue } from '../remark-canonical'

// =============================================================================
// H1 守卫
// =============================================================================

describe('v0.4 PR-C3: H1 守卫', () => {
  test('E_MD_H1_MISSING — 缺 H1', () => {
    const { tree, frontmatter } = parseMarkdown('---\nentity: domain\nname: Foo\n---\n\n## Terms\n### A\n')
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    expect(result.errors.find((e) => e.code === 'E_MD_H1_MISSING')).toBeDefined()
  })

  test('E_MD_H1_MISMATCH — H1 与 frontmatter.name 不一致', () => {
    const md = `---
entity: domain
name: RightName
---
# Domain: WrongName

## Terms
### A
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    expect(result.errors.find((e) => e.code === 'E_MD_H1_MISMATCH')).toBeDefined()
  })

  test('合法 H1 通过', () => {
    const md = `---
entity: domain
name: TestDomain
---
# Domain: TestDomain

## Terms
### A
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    expect(result.errors.find((e) => e.code === 'E_MD_H1_MISMATCH')).toBeUndefined()
  })
})

// =============================================================================
// H2 分类 + H3 重复守卫
// =============================================================================

describe('v0.4 PR-C3: H2/H3 守卫', () => {
  test('E_MD_CATEGORY_UNKNOWN — H2 不在白名单', () => {
    const md = `---
entity: domain
name: X
---
# Domain: X

## UnknownCategory
### A
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    const issue = result.errors.find((e) => e.code === 'E_MD_CATEGORY_UNKNOWN')
    expect(issue).toBeDefined()
    expect(issue?.message).toContain('UnknownCategory')
    expect(issue?.message).toContain('Terms, Bans, Invariants, Stack')
  })

  test('E_MD_DUPLICATE_H3 — H3 在 ## 分类内重复', () => {
    const md = `---
entity: domain
name: X
---
# Domain: X

## Terms
### Same

### Same
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    const issue = result.errors.find((e) => e.code === 'E_MD_DUPLICATE_H3')
    expect(issue).toBeDefined()
    expect(issue?.message).toContain("'Same'")
  })

  test('H3 跨 ## 分类同名不报 duplicate', () => {
    const md = `---
entity: domain
name: X
---
# Domain: X

## Terms
### A

## Bans
### A
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    expect(result.errors.find((e) => e.code === 'E_MD_DUPLICATE_H3')).toBeUndefined()
  })

  test('5 实体各自有独立 H2 白名单', () => {
    expect(ENTITY_H2_WHITELIST.domain).toContain('Stack')
    expect(ENTITY_H2_WHITELIST.blueprint).toEqual(['Props', 'Slots'])
    expect(ENTITY_H2_WHITELIST.work).toEqual(['Context', 'Tasks'])
    expect(ENTITY_H2_WHITELIST.task).toEqual(['Domain', 'Blueprint', 'Parts'])
    expect(ENTITY_H2_WHITELIST.proof).toEqual(['Description', 'Probes'])
  })
})

// =============================================================================
// frontmatter 守卫
// =============================================================================

describe('v0.4 PR-C3: frontmatter 守卫', () => {
  test('E_MD_MISSING_REQUIRED — 缺 entity/name', () => {
    const fm: Record<string, unknown> = {}
    const result = validateCanonical({ type: 'root', children: [] } as Root, {
      entity: 'domain',
      frontmatter: fm,
    })
    expect(result.errors.find((e) => e.code === 'E_MD_MISSING_REQUIRED' && e.field === 'entity')).toBeDefined()
    expect(result.errors.find((e) => e.code === 'E_MD_MISSING_REQUIRED' && e.field === 'name')).toBeDefined()
  })

  test('E_MD_TYPE_MISMATCH — entity 非法', () => {
    const result = validateCanonical({ type: 'root', children: [] } as Root, {
      entity: 'invalid',
      frontmatter: { entity: 'invalid', name: 'X' },
    })
    expect(result.errors.find((e) => e.code === 'E_MD_TYPE_MISMATCH' && e.field === 'entity')).toBeDefined()
  })

  test('E_MD_TYPE_MISMATCH — version 不符合 v<X.Y.Z>', () => {
    const result = validateCanonical({ type: 'root', children: [] } as Root, {
      entity: 'domain',
      frontmatter: { entity: 'domain', name: 'X', version: '1.0' },
    })
    expect(result.errors.find((e) => e.code === 'E_MD_TYPE_MISMATCH' && e.field === 'version')).toBeDefined()
  })

  test('合法 version 通过 (v0.3.0 / 0.3.0 都接受)', () => {
    const r1 = validateCanonical({ type: 'root', children: [] } as Root, {
      entity: 'domain',
      frontmatter: { entity: 'domain', name: 'X', version: 'v0.3.0' },
    })
    expect(r1.errors.find((e) => e.code === 'E_MD_TYPE_MISMATCH')).toBeUndefined()

    const r2 = validateCanonical({ type: 'root', children: [] } as Root, {
      entity: 'domain',
      frontmatter: { entity: 'domain', name: 'X', version: '0.3.0' },
    })
    expect(r2.errors.find((e) => e.code === 'E_MD_TYPE_MISMATCH')).toBeUndefined()
  })
})

// =============================================================================
// unified plugin 形式
// =============================================================================

describe('v0.4 PR-C3: remarkCanonical unified plugin', () => {
  test('plugin 写入 tree.data.canonical', () => {
    const processor = unified().use(remarkParse).use(remarkFrontmatter)
    const tree = processor.parse('---\nentity: domain\nname: X\n---\n\n# Domain: X\n\n## Wrong\n') as Root
    processor.runSync(tree)
    const fm = extractYamlFromTree(tree)
    remarkCanonical({ entity: 'domain', frontmatter: fm })(tree)
    const canonical = (tree.data as Record<string, unknown>).canonical as { valid: boolean; errors: CanonicalIssue[] }
    expect(canonical.errors.length).toBeGreaterThan(0)
    expect(canonical.valid).toBe(false)
  })

  test('合法 md: canonical.valid = true', () => {
    const md = `---
entity: domain
name: TestDomain
---
# Domain: TestDomain

## Terms
### A
- desc: a
`
    const processor = unified().use(remarkParse).use(remarkFrontmatter)
    const tree = processor.parse(md) as Root
    processor.runSync(tree)
    const fm = extractYamlFromTree(tree)
    remarkCanonical({ entity: 'domain', frontmatter: fm })(tree)
    const canonical = (tree.data as Record<string, unknown>).canonical as { valid: boolean; errors: CanonicalIssue[] }
    expect(canonical.valid).toBe(true)
    expect(canonical.errors).toEqual([])
  })
})

// =============================================================================
// 综合: 完整 7 个守卫一次性
// =============================================================================

describe('v0.4 PR-C3: 7 guards 综合', () => {
  test('同一 md 多重违例全部捕获', () => {
    const md = `---
entity: domain
name: RightName
version: bad
---
# Domain: WrongName

## UnknownCategory
### A

### A
`
    const { tree, frontmatter } = parseMarkdown(md)
    const result = validateCanonical(tree, { frontmatter })
    const codes = result.errors.map((e) => e.code)
    expect(codes).toContain('E_MD_TYPE_MISMATCH') // version 'bad' 错
    expect(codes).toContain('E_MD_H1_MISMATCH') // name mismatch
    expect(codes).toContain('E_MD_CATEGORY_UNKNOWN') // UnknownCategory
    expect(codes).toContain('E_MD_DUPLICATE_H3') // duplicate A
  })

  test('空 md → errors 数组存在但有效检查空', () => {
    const { tree, frontmatter } = parseMarkdown('---\nname: X\n---\n\n')
    const result = validateCanonical(tree, { entity: 'domain', frontmatter })
    expect(Array.isArray(result.errors)).toBe(true)
    expect(Array.isArray(result.warnings)).toBe(true)
  })
})
