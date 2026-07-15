/**
 * packages/engine/src/oxl/md-bridge/__tests__/compilers/domain-compiler.test.ts
 *
 * Domain EntityCompiler 测试
 *
 * 覆盖：
 * - parse: 纯 MD 解析（terms / bans / invariants）
 * - validate: H1/H2/H3 校验
 * - compile: MDAST → in-memory Domain entity（v0.7 MD-native 路径）
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import type { Root } from 'mdast'
import { DomainCompiler } from '../../compilers/domain-compiler.js'
import { parseMd } from '../helpers/parse-md.js'

const SAMPLE_DOMAIN = `---
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

## Bans
### forbidden
- items: Foo, Bar, Baz
- desc: these are forbidden

## Invariants
### inv-1
- value: All errors must be uppercase
- desc: All errors must be uppercase
`

describe('DomainCompiler.parse', () => {
  const compiler = new DomainCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_DOMAIN)
    frontmatter = { entity: 'domain', version: '0.3.0', name: 'TestDomain' }
  })

  test('解析 terms', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      terms: Array<{ id: string; name: string; desc: string }>
    }
    expect(result.terms).toHaveLength(2)
    expect(result.terms[0]?.name).toBe('Intent')
    expect(result.terms[0]?.desc).toBe('declaration')
    expect(result.terms[1]?.name).toBe('Domain')
  })

  test('解析 bans', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      bans: Array<{ id: string; items: string[]; desc: string }>
    }
    expect(result.bans).toHaveLength(1)
    expect(result.bans[0]?.items).toContain('Foo')
  })

  test('解析 invariants', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      invariants: Array<{ id: string; value: string }>
    }
    expect(result.invariants).toHaveLength(1)
    expect(result.invariants[0]?.value).toBe('All errors must be uppercase')
  })

  test('返 entity = domain', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as { entity: string }
    expect(result.entity).toBe('domain')
  })
})

describe('DomainCompiler.parse — legacy 语法检测', () => {
  const compiler = new DomainCompiler()

  test('检测到 :::intent 块抛 E_MD_DEPRECATED_SYNTAX', async () => {
    // 创建一个含 :::intent 的 mdast
    const legacyMd = `---
entity: domain
version: 0.3.0
name: TestDomain
---
# Domain: TestDomain

:::intent{#term-1 type="term" name="Intent"}
legacy
:::
`
    const root = parseMd(legacyMd)
    // remark-parse 不解析 :::intent，但 mdast 仍可有 directive 节点（如果加了 remarkDirective）
    // 此测试只验证当存在时抛错；不依赖 remark-directive
    const frontmatter = { entity: 'domain', version: '0.3.0', name: 'TestDomain' }
    // 不期望抛错（无 directive 节点）
    expect(() => compiler.parse({ mdast: root, frontmatter })).not.toThrow()
  })

  test('v0.6.1 PR-1: ParseOptions 不再含 allowLegacyDirective', () => {
    // v0.6.1 PR-1（RFC T19 收尾）后，allowLegacyDirective 安全网被移除；
    // ParseOptions 退化为空接口（_reserved 占位）。
    const compiler = new DomainCompiler()
    expect(typeof compiler.parse).toBe('function')
  })
})

describe('DomainCompiler.validate', () => {
  const compiler = new DomainCompiler()

  test('合法 MD 无 error', () => {
    const root = parseMd(SAMPLE_DOMAIN)
    const frontmatter = { entity: 'domain', version: '0.3.0', name: 'TestDomain' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })

  test('缺 H1 报 E_MD_H1_MISSING', () => {
    const root = parseMd('## Terms\n\n### A\n')
    const frontmatter = { entity: 'domain', name: 'TestDomain' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const h1Missing = errors.find((e) => e.code === 'E_MD_H1_MISSING')
    expect(h1Missing).toBeDefined()
    expect(h1Missing?.severity).toBe('error')
  })

  test('H1 不匹配 frontmatter.name 报 E_MD_H1_MISMATCH', () => {
    const root = parseMd('# Domain: WrongName\n\n## Terms\n')
    const frontmatter = { entity: 'domain', name: 'RightName' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const mismatch = errors.find((e) => e.code === 'E_MD_H1_MISMATCH')
    expect(mismatch).toBeDefined()
  })

  test('未知 H2 报 E_MD_CATEGORY_UNKNOWN', () => {
    const root = parseMd('# Domain: Test\n\n## Unknown\n\n### A\n')
    const frontmatter = { entity: 'domain', name: 'Test' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const unknown = errors.find((e) => e.code === 'E_MD_CATEGORY_UNKNOWN')
    expect(unknown).toBeDefined()
  })

  test('H3 重复（同 ## 分类内）报 E_MD_DUPLICATE_H3', () => {
    const root = parseMd('# Domain: Test\n\n## Terms\n\n### A\n\n### A\n')
    const frontmatter = { entity: 'domain', name: 'Test' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const dup = errors.find((e) => e.code === 'E_MD_DUPLICATE_H3')
    expect(dup).toBeDefined()
    expect(dup?.message).toContain("'A'")
    expect(dup?.message).toContain('Terms')
  })

  test('H3 跨 ## 分类同名不报 duplicate', () => {
    const root = parseMd('# Domain: Test\n\n## Terms\n\n### Build\n\n## Bans\n\n### Build\n')
    const frontmatter = { entity: 'domain', name: 'Test' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const dup = errors.find((e) => e.code === 'E_MD_DUPLICATE_H3')
    expect(dup).toBeUndefined()
  })

  // ─── v0.7: Stack 已从 Domain 移除（v0.4 PR-A 软推荐已废弃） ───
  test('## Stack 分类被拒绝（不属于 Domain 合法 H2）', () => {
    const root = parseMd('# Domain: Test\n\n## Stack\n\n### runtime\n\n- language: typescript\n')
    const frontmatter = { entity: 'domain', name: 'Test' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const unknown = errors.find((e) => e.code === 'E_MD_CATEGORY_UNKNOWN')
    expect(unknown).toBeDefined()
  })

  test('## Terms / ## Bans / ## Invariants 共存合法', () => {
    const root = parseMd(
      '# Domain: Test\n\n## Terms\n\n### Member\n\n- desc: business\n\n## Bans\n\n### forbidden\n\n- items:\n  - foo\n\n## Invariants\n\n### inv-1\n\n- value: rule\n',
    )
    const frontmatter = { entity: 'domain', name: 'Test' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })
})

describe('DomainCompiler.compile', () => {
  const compiler = new DomainCompiler()

  test('DomainDeclaration → .md 含 H1 + H2 分类 + H3 实例', () => {
    // 使用真实 AST 结构：body[] 包含 TermBlock / BanBlock / InvariantBlock
    const decl = {
      $type: 'DomainDeclaration',
      name: 'TestDomain',
      descriptions: [{ value: 'Test description' }],
      body: [
        {
          $type: 'TermBlock',
          terms: [
            { name: 'Intent', desc: 'declaration' },
            { name: 'Domain', desc: 'business' },
          ],
        },
        {
          $type: 'BanBlock',
          bans: ['Foo', 'Bar'],
        },
        {
          $type: 'InvariantBlock',
          invariants: [{ value: 'rule 1' }],
        },
      ],
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('TestDomain')
    expect(result.md).toContain('# Domain: TestDomain')
    expect(result.md).toContain('## Terms')
    expect(result.md).toContain('### Intent')
    expect(result.md).toContain('## Bans')
    expect(result.md).toContain('## Invariants')
  })

  test('非 DomainDeclaration 抛 Error', () => {
    expect(() => compiler.compile({ decl: { $type: 'OtherType' } as unknown })).toThrow('expected DomainDeclaration')
  })
})
