/**
 * src/oxl/md-bridge/__tests__/compilers/task-compiler.test.ts
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { TaskCompiler } from '../../compilers/task-compiler.js'

function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

const SAMPLE_TASK = `---
entity: task
version: 0.3.0
name: build_module
---
# Task: build_module

> 打包并检查产物

## Parts
### compile
- skill_context: 编译 TypeScript + 打包

### check_size
- skill_context: 检查产物大小
- probe: check_artifact_size
  - scheme: fs
  - expect: exists=true

## Probes
### test_pass_rate
- scheme: shell
- expect: pass_rate > 0.9
`

describe('TaskCompiler.parse', () => {
  const compiler = new TaskCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_TASK)
    frontmatter = { entity: 'task', version: '0.3.0', name: 'build_module' }
  })

  test('解析 parts', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      parts: Array<{ name: string; skill_context: string }>
    }
    expect(result.parts).toHaveLength(2)
    expect(result.parts[0]?.name).toBe('compile')
    expect(result.parts[0]?.skill_context).toBe('编译 TypeScript + 打包')
  })

  test('解析 probes', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      probes: Array<{ name: string; scheme: string; expect: string }>
    }
    expect(result.probes).toHaveLength(1)
    expect(result.probes[0]?.name).toBe('test_pass_rate')
    expect(result.probes[0]?.scheme).toBe('shell')
    expect(result.probes[0]?.expect).toBe('pass_rate > 0.9')
  })
})

describe('TaskCompiler.validate', () => {
  const compiler = new TaskCompiler()

  test('合法 MD 无 error', () => {
    const root = parseMd(SAMPLE_TASK)
    const frontmatter = { entity: 'task', name: 'build_module' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })
})

describe('TaskCompiler.compile', () => {
  const compiler = new TaskCompiler()

  test('TaskDeclaration → .md', () => {
    const decl = {
      $type: 'TaskDeclaration',
      name: 'build_module',
      body: [
        { $type: 'TaskPartDecl', name: 'compile', skill_context: '编译' },
        { $type: 'TaskProbeDecl', name: 'check_size', scheme: 'fs', expect: 'exists=true' },
      ],
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('build_module')
    expect(result.md).toContain('# Task: build_module')
    expect(result.md).toContain('## Parts')
    expect(result.md).toContain('## Probes')
  })
})
