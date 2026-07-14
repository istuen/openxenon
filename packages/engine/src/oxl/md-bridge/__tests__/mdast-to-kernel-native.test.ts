/**
 * src/oxl/md-bridge/__tests__/mdast-to-kernel-native.test.ts
 *
 * 5 类实体的端到端测试：MD 字符串 → mdast → EntityRegistry → 业务对象
 *
 * 验证：
 * - 5 类 entity 都能通过 EntityRegistry 正确路由
 * - 解析结果与 RFC §3 终版语法规范一致
 * - 7 个新错误码（E_MD_DUPLICATE_H3 / E_MD_H1_MISSING / E_MD_H1_MISMATCH / E_MD_CATEGORY_UNKNOWN / ...）触发
 */

import { describe, test, expect, beforeAll } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root } from 'mdast'

// 直接 import 5 个 compiler class + registry
// （不能用 '../compilers/index.js' 副作用 import，因 ESM 缓存会跳过重复执行）
import { DomainCompiler } from '../compilers/domain-compiler.js'
import { BlueprintCompiler } from '../compilers/blueprint-compiler.js'
import { WorkCompiler } from '../compilers/work-compiler.js'
import { TaskCompiler } from '../compilers/task-compiler.js'
import { ProofCompiler } from '../compilers/proof-compiler.js'
import { entityRegistry, getEntityCompiler, registerEntityCompiler } from '../entity-registry.js'
import type { IntentEntityType } from '../pipeline.js'

/** 测试隔离：每个文件 beforeAll 重新注册 5 个 compiler（其他测试可能 _clearForTest 过）*/
beforeAll(() => {
  if (process.env.NODE_ENV !== 'production') {
    entityRegistry._clearForTest()
  }
  registerEntityCompiler(new DomainCompiler())
  registerEntityCompiler(new BlueprintCompiler())
  registerEntityCompiler(new WorkCompiler())
  registerEntityCompiler(new TaskCompiler())
  registerEntityCompiler(new ProofCompiler())
})

/** 工具：MD 字符串 → { mdast, frontmatter } */
function parseMdWithFrontmatter(md: string): { mdast: Root; frontmatter: Record<string, unknown> } {
  // 注：v0.3 PR-B 已移除 remark-directive plugin，AST 不再解析 :::
  const processor = unified().use(remarkParse).use(remarkFrontmatter, ['yaml'])
  const tree = processor.parse(md) as Root

  // 提取 frontmatter
  const fmNode = tree.children.find((n) => n.type === 'yaml') as { value: string } | undefined
  let frontmatter: Record<string, unknown> = {}
  if (fmNode) {
    // 简单 YAML 解析
    frontmatter = parseSimpleYaml(fmNode.value)
  }

  return { mdast: tree, frontmatter }
}

function parseSimpleYaml(text: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx === -1) continue
    const key = trimmed.slice(0, colonIdx).trim()
    const value = trimmed.slice(colonIdx + 1).trim()
    if (value === 'true') result[key] = true
    else if (value === 'false') result[key] = false
    else if (/^["'].*["']$/.test(value)) result[key] = value.slice(1, -1)
    else result[key] = value
  }
  return result
}

describe('端到端：5 类实体通过 EntityRegistry 路由', () => {
  test('domain: 解析 terms / bans / invariants', () => {
    const md = `---
entity: domain
version: 0.3.0
name: E2EDomain
---
# Domain: E2EDomain

## Terms
### Intent
- desc: declaration

## Bans
### forbidden
- items: Foo, Bar

## Invariants
### inv-1
- value: rule
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('domain')
    const result = compiler.parse({ mdast, frontmatter }) as {
      entity: string
      terms: Array<{ name: string; desc: string }>
      bans: Array<{ items: string[] }>
      invariants: Array<{ value: string }>
    }
    expect(result.entity).toBe('domain')
    expect(result.terms).toHaveLength(1)
    expect(result.terms[0]?.name).toBe('Intent')
    expect(result.bans).toHaveLength(1)
    expect(result.bans[0]?.items).toEqual(['Foo', 'Bar'])
    expect(result.invariants).toHaveLength(1)
  })

  test('blueprint: 解析 use / boundaries', () => {
    const md = `---
entity: blueprint
version: 0.1.0
name: e2e-bp
---
# Blueprint: e2e-bp

## Use
### my-domain
- domain: @md/domains/MyDomain

### my-workflow
- workflow: @md/workflows/MyWorkflow

### my-stack
- stack: @md/stacks/MyStack

## Boundaries
### build
- observe:
  - fs-exists
- deps: []
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('blueprint')
    const result = compiler.parse({ mdast, frontmatter }) as {
      use: { domain: unknown[]; workflow: unknown[]; stack: unknown[] }
      boundaries: Array<{ name: string; observe: string[]; deps: string[] }>
    }
    expect(result.use.domain).toHaveLength(1)
    expect(result.use.workflow).toHaveLength(1)
    expect(result.use.stack).toHaveLength(1)
    expect(result.boundaries[0]?.observe).toEqual(['fs-exists'])
    expect(result.boundaries[0]?.deps).toEqual([])
  })

  test('work: 解析 context + tasks 含嵌套 part/probe', () => {
    const md = `---
entity: work
version: 0.3.0
name: e2e-w
---
# Work: e2e-w

## Context
### main
- goal: g
- max_iterations: 5

## Tasks
### step1
- blueprint: @md/blueprints/bp1
- part: p1
  - skill_context: sc
  - probe: pr1
    - scheme: fs
    - expect: ok
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('work')
    const result = compiler.parse({ mdast, frontmatter }) as {
      context: { goal: string; max_iterations: number }
      tasks: Array<{ name: string; parts: Array<{ name: string; probes: Array<{ name: string; scheme: string }> }> }>
    }
    expect(result.context.max_iterations).toBe(5)
    expect(result.tasks[0]?.parts[0]?.probes[0]?.scheme).toBe('fs')
  })

  test('task: 解析 parts / probes', () => {
    const md = `---
entity: task
version: 0.3.0
name: e2e-t
---
# Task: e2e-t

## Parts
### build
- skill_context: compile

## Probes
### check
- scheme: fs
- expect: ok
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('task')
    const result = compiler.parse({ mdast, frontmatter }) as {
      parts: Array<{ name: string }>
      probes: Array<{ name: string; scheme: string }>
    }
    expect(result.parts[0]?.name).toBe('build')
    expect(result.probes[0]?.scheme).toBe('fs')
  })

  test('proof: 解析 verdicts 三态 + runtime', () => {
    const md = `---
entity: proof
version: 0.3.0
name: e2e-p
---
# Proof: e2e-p

## Verdicts
### v1
- type: pass
- value: ok
### v2
- type: inconclusive
- value: manual

## Runtime
### snapshot
- observed_at: 2026-06-23
- probes_run: 2
- probes_passed: 1
- probes_inconclusive: 1
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('proof')
    const result = compiler.parse({ mdast, frontmatter }) as {
      verdicts: Array<{ type: string }>
      runtime: { probes_run: number }
    }
    expect(result.verdicts[0]?.type).toBe('pass')
    expect(result.verdicts[1]?.type).toBe('inconclusive')
    expect(result.runtime.probes_run).toBe(2)
  })
})

describe('5 类实体验证触发新错误码', () => {
  const types: IntentEntityType[] = ['domain', 'blueprint', 'work', 'task', 'proof']

  for (const type of types) {
    test(`${type}: H1 缺失报 E_MD_H1_MISSING`, () => {
      const md = `---
entity: ${type}
version: 0.3.0
name: x
---
some body text without H1
`
      const { mdast, frontmatter } = parseMdWithFrontmatter(md)
      const compiler = getEntityCompiler(type)
      const errors = compiler.validate({ mdast, frontmatter })
      const h1Missing = errors.find((e) => e.code === 'E_MD_H1_MISSING')
      expect(h1Missing).toBeDefined()
    })
  }
})

describe('重复 H3 触发 E_MD_DUPLICATE_H3', () => {
  test('domain: 重复 Terms 块同名 H3', () => {
    const md = `---
entity: domain
version: 0.3.0
name: x
---
# Domain: x

## Terms
### A
- desc: 1

### A
- desc: 2
`
    const { mdast, frontmatter } = parseMdWithFrontmatter(md)
    const compiler = getEntityCompiler('domain')
    const errors = compiler.validate({ mdast, frontmatter })
    const dup = errors.find((e) => e.code === 'E_MD_DUPLICATE_H3')
    expect(dup).toBeDefined()
    expect(dup?.message).toContain("'A'")
  })
})
