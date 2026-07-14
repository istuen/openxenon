/**
 * src/oxl/md-bridge/__tests__/compilers/blueprint-compiler.test.ts
 *
 * Blueprint EntityCompiler 测试（v0.7 重构后）
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { BlueprintCompiler } from '../../compilers/blueprint-compiler.js'

function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

const SAMPLE_BLUEPRINT = `---
entity: blueprint
version: 0.1.0
name: ci-pipeline
---
# Blueprint: ci-pipeline

> CI 流水线

## Use

### payment-domain
- domain: @md/domains/PaymentContext

### fix-issue-workflow
- workflow: @md/workflows/fix-issue

### node-stack
- stack: @md/stacks/node-ts

## Boundaries

### build
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - fs-exists
  - ts-compiles
- deps: []

### test
- refs:
  - domain: payment-domain
  - workflow: fix-issue-workflow
  - stack: node-stack
- observe:
  - test-pass
- deps:
  - build
`

describe('BlueprintCompiler.parse', () => {
  const compiler = new BlueprintCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_BLUEPRINT)
    frontmatter = { entity: 'blueprint', version: '0.1.0', name: 'ci-pipeline' }
  })

  test('解析 use（domain/workflow/stack 引用）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      use: { domain: unknown[]; workflow: unknown[]; stack: unknown[] }
    }
    expect(result.use.domain).toHaveLength(1)
    expect(result.use.workflow).toHaveLength(1)
    expect(result.use.stack).toHaveLength(1)
    expect((result.use.domain[0] as { name: string }).name).toBe('payment-domain')
    expect((result.use.workflow[0] as { name: string }).name).toBe('fix-issue-workflow')
    expect((result.use.stack[0] as { name: string }).name).toBe('node-stack')
  })

  test('解析 boundaries（refs/observe/deps）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      boundaries: Array<{
        name: string
        refs: Array<{ kind: string; ref: string }>
        observe: string[]
        deps: string[]
      }>
    }
    expect(result.boundaries).toHaveLength(2)
    expect(result.boundaries[0]?.name).toBe('build')
    expect(result.boundaries[0]?.observe).toEqual(['fs-exists', 'ts-compiles'])
    expect(result.boundaries[0]?.deps).toEqual([])
    expect(result.boundaries[1]?.name).toBe('test')
    expect(result.boundaries[1]?.deps).toEqual(['build'])
  })

  test('返 entity = blueprint', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as { entity: string }
    expect(result.entity).toBe('blueprint')
  })
})

describe('BlueprintCompiler.validate', () => {
  const compiler = new BlueprintCompiler()

  test('合法 MD 无 error', () => {
    const root = parseMd(SAMPLE_BLUEPRINT)
    const frontmatter = { entity: 'blueprint', name: 'ci-pipeline' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })

  test('未知 H2 报 E_MD_CATEGORY_UNKNOWN', () => {
    const root = parseMd('# Blueprint: T\n\n## Unknown\n\n### A\n')
    const frontmatter = { entity: 'blueprint', name: 'T' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const unknown = errors.find((e) => e.code === 'E_MD_CATEGORY_UNKNOWN')
    expect(unknown).toBeDefined()
  })

  test('H1 不匹配 frontmatter.name 报 E_MD_H1_MISMATCH', () => {
    const root = parseMd('# Blueprint: Wrong\n\n## Boundaries\n')
    const frontmatter = { entity: 'blueprint', name: 'Right' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const mismatch = errors.find((e) => e.code === 'E_MD_H1_MISMATCH')
    expect(mismatch).toBeDefined()
  })
})

describe('BlueprintCompiler.compile', () => {
  const compiler = new BlueprintCompiler()

  test('BlueprintDeclaration → .md', () => {
    const decl = {
      $type: 'BlueprintDeclaration',
      name: 'ci-pipeline',
      descriptions: [{ value: 'CI 流水线' }],
      use: {
        domain: [{ name: 'payment-domain', ref: '@md/domains/PaymentContext' }],
        workflow: [{ name: 'fix-issue-workflow', ref: '@md/workflows/fix-issue' }],
        stack: [{ name: 'node-stack', ref: '@md/stacks/node-ts' }],
      },
      boundaries: [
        {
          name: 'build',
          refs: [{ kind: 'domain' as const, ref: 'payment-domain' }],
          observe: ['ts-compiles'],
          deps: [],
        },
        {
          name: 'test',
          refs: [{ kind: 'domain' as const, ref: 'payment-domain' }],
          observe: ['test-pass'],
          deps: ['build'],
        },
      ],
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('ci-pipeline')
    expect(result.md).toContain('# Blueprint: ci-pipeline')
    expect(result.md).toContain('## Use')
    expect(result.md).toContain('## Boundaries')
    expect(result.md).toContain('### build')
    expect(result.md).toContain('- observe:')
    expect(result.md).toContain('- deps:')
  })
})
