/**
 * src/oxl/md-bridge/__tests__/compilers/work-compiler.test.ts
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { WorkCompiler } from '../../compilers/work-compiler.js'

function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

const SAMPLE_WORK = `---
entity: work
version: 0.3.0
name: refactor-auth
---
# Work: refactor-auth

## Context
### main
- goal: 重构 auth 模块
- max_iterations: 3
- constraints:
  - 不修改 src/cli 目录
  - 必须保留 1 个旧测试

## Tasks
### step1
- blueprint: ci-pipeline
- domain: CoreDomain
- part: build_module
  - skill_context: 打包并检查
  - probe: check_artifact_size
    - scheme: fs
    - expect: exists=true
- part: run_tests
  - skill_context: 运行单元测试
  - probe: test_pass_rate
    - scheme: shell
    - expect: pass_rate > 0.9
`

describe('WorkCompiler.parse', () => {
  const compiler = new WorkCompiler()
  let root: Root
  let frontmatter: Record<string, unknown>

  beforeAll(() => {
    root = parseMd(SAMPLE_WORK)
    frontmatter = { entity: 'work', version: '0.3.0', name: 'refactor-auth' }
  })

  test('解析 context（goal/max_iterations/constraints）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      context: { goal: string; max_iterations: number; constraints: string[] }
    }
    expect(result.context.goal).toBe('重构 auth 模块')
    expect(result.context.max_iterations).toBe(3)
    expect(result.context.constraints).toEqual(['不修改 src/cli 目录', '必须保留 1 个旧测试'])
  })

  test('解析 tasks（blueprint/domain/parts/probes）', () => {
    const result = compiler.parse({ mdast: root, frontmatter }) as {
      tasks: Array<{
        name: string
        blueprint: string
        domain: string
        parts: Array<{
          name: string
          skill_context: string
          probes: Array<{ name: string; scheme: string; expect: string }>
        }>
      }>
    }
    expect(result.tasks).toHaveLength(1)
    expect(result.tasks[0]?.name).toBe('step1')
    expect(result.tasks[0]?.blueprint).toBe('ci-pipeline')
    expect(result.tasks[0]?.domain).toBe('CoreDomain')
    expect(result.tasks[0]?.parts).toHaveLength(2)
    expect(result.tasks[0]?.parts[0]?.name).toBe('build_module')
    expect(result.tasks[0]?.parts[0]?.skill_context).toBe('打包并检查')
    expect(result.tasks[0]?.parts[0]?.probes[0]?.name).toBe('check_artifact_size')
    expect(result.tasks[0]?.parts[0]?.probes[0]?.scheme).toBe('fs')
    expect(result.tasks[0]?.parts[0]?.probes[0]?.expect).toBe('exists=true')
  })
})

describe('WorkCompiler.validate', () => {
  const compiler = new WorkCompiler()

  test('合法 MD 无 error', () => {
    const root = parseMd(SAMPLE_WORK)
    const frontmatter = { entity: 'work', name: 'refactor-auth' }
    const errors = compiler.validate({ mdast: root, frontmatter })
    const fatal = errors.filter((e) => e.severity === 'error')
    expect(fatal).toEqual([])
  })
})

describe('WorkCompiler.compile', () => {
  const compiler = new WorkCompiler()

  test('WorkDeclaration → .md', () => {
    const decl = {
      $type: 'WorkDeclaration',
      name: 'refactor-auth',
      context: { goal: 'refactor auth', loopPolicy: { maxIterations: 3 }, constraints: ['do not break API'] },
      tasks: [
        {
          name: 'step1',
          body: [
            { $type: 'TaskBlueprintField', blueprint: 'ci-pipeline' },
            { $type: 'TaskDomainField', domain: 'CoreDomain' },
            {
              $type: 'TaskPartDecl',
              name: 'build',
              skill_context: 'compile',
              probes: [{ name: 'check_artifact', scheme: 'fs', expect: 'exists=true' }],
            },
          ],
        },
      ],
    }
    const result = compiler.compile({ decl })
    expect(result.name).toBe('refactor-auth')
    expect(result.md).toContain('# Work: refactor-auth')
    expect(result.md).toContain('## Context')
    expect(result.md).toContain('## Tasks')
    expect(result.md).toContain('### step1')
    expect(result.md).toContain('- blueprint: ci-pipeline')
  })
})
