/**
 * src/oxl/md-bridge/__tests__/compilers/blueprint-compiler.test.ts
 *
 * Blueprint EntityCompiler 测试
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
version: 0.3.0
name: ci-pipeline
---
# Blueprint: ci-pipeline

> CI 流水线

## Props
### env
- type: enum
- values: [dev, staging, prod]
- required: true
- default: dev

### region
- type: string
- default: us-west

## Slots
### build
- deps: []
- observe:
  - fs-exists
  - ts-compiles

### test
- deps:
  - build
- observe:
  - test-pass
`

describe('BlueprintCompiler.parse', () => {
  const compiler = new BlueprintCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_BLUEPRINT)
    frontmatter = { entity: 'blueprint', version: '0.3.0', name: 'ci-pipeline' }
  })

  test('解析 props（type/values/required/default）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      props: Array<{ name: string; type: string; values: string[]; required: boolean; default: string | null }>
    }
    expect(result.props).toHaveLength(2)
    expect(result.props[0]?.name).toBe('env')
    expect(result.props[0]?.type).toBe('enum')
    expect(result.props[0]?.values).toEqual(['dev', 'staging', 'prod'])
    expect(result.props[0]?.required).toBe(true)
    expect(result.props[0]?.default).toBe('dev')
  })

  test('解析 slots（deps/observe）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      slots: Array<{ name: string; deps: string[]; observe: string[] }>
    }
    expect(result.slots).toHaveLength(2)
    expect(result.slots[0]?.name).toBe('build')
    expect(result.slots[0]?.deps).toEqual([])
    expect(result.slots[0]?.observe).toEqual(['fs-exists', 'ts-compiles'])
    expect(result.slots[1]?.name).toBe('test')
    expect(result.slots[1]?.deps).toEqual(['build'])
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
    const root = parseMd('# Blueprint: Wrong\n\n## Slots\n')
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
      props: [
        {
          name: 'env',
          type: { $type: 'EnumType', values: ['dev', 'staging'] },
          required: { value: true },
          default: { value: 'dev' },
        },
      ],
      partSlots: [
        { name: 'build', deps: [], observe: [{ observes: ['fs-exists'] }] },
        { name: 'test', deps: ['build'], observe: [] },
      ],
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('ci-pipeline')
    expect(result.md).toContain('# Blueprint: ci-pipeline')
    expect(result.md).toContain('## Props')
    expect(result.md).toContain('### env')
    expect(result.md).toContain('## Slots')
    expect(result.md).toContain('### build')
  })
})
