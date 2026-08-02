/**
 * src/oxl/md-pipeline/transformers/__tests__/all.test.ts
 *
 * v0.4 PR-C2 5 unified transformer plugins 测试
 * 覆盖: domain / blueprint / work / task / proof 抽取
 */

import { describe, test, expect } from 'bun:test'
import { parseMarkdown } from '../../utils'
import {
  extractDomainIR,
  extractBlueprintIR,
  extractWorkIR,
  extractTaskIR,
  extractProofIR,
  remarkDomainExtractor,
  remarkWorkExtractor,
} from '../index'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import type { Root } from 'mdast'

// =============================================================================
// Domain
// =============================================================================

const SAMPLE_DOMAIN = `---
entity: domain
version: 0.3.0
name: TestDomain
---

# Domain: TestDomain

## Terms
### Intent
- desc: declaration

### Domain
- desc: business

## Bans
### forbidden
- items:
  - Foo
  - Bar
- desc: forbidden constructs

## Invariants
### inv-1
- value: All errors must be uppercase

## Stack
### runtime
- language: typescript
- runtime: bun
`

describe('v0.4 PR-C2: extractDomainIR', () => {
  test('提取 Terms / Bans / Invariants / Stack', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_DOMAIN)
    const ir = extractDomainIR(root, frontmatter)

    expect(ir.entity).toBe('domain')
    expect(ir.name).toBe('TestDomain')
    expect(ir.terms).toHaveLength(2)
    expect(ir.terms[0]?.name).toBe('Intent')
    expect(ir.bans).toHaveLength(1)
    expect(ir.bans[0]?.items).toEqual(['Foo', 'Bar'])
    expect(ir.invariants).toHaveLength(1)
    expect(ir.invariants[0]?.value).toBe('All errors must be uppercase')
    expect(ir.stack).toHaveLength(1)
    expect(ir.stack[0]?.name).toBe('runtime')
    expect(ir.stack[0]?.fields.find((f) => f.key === 'language')?.value).toBe('typescript')
  })

  test('空 domain 返回空数组', () => {
    const { tree: root, frontmatter } = parseMarkdown('---\nentity: domain\nname: Empty\n---\n\n# Domain: Empty\n\n')
    const ir = extractDomainIR(root, frontmatter)
    expect(ir.terms).toEqual([])
    expect(ir.bans).toEqual([])
    expect(ir.invariants).toEqual([])
    expect(ir.stack).toEqual([])
  })

  test('remarkDomainExtractor unified plugin 形式', () => {
    const processor = unified().use(remarkParse).use(remarkFrontmatter)
    const tree = processor.parse(SAMPLE_DOMAIN) as Root
    processor.runSync(tree)
    remarkDomainExtractor()(tree)
    const ir = (tree.data as Record<string, unknown>).domain as ReturnType<typeof extractDomainIR>
    expect(ir.terms).toHaveLength(2)
  })
})

// =============================================================================
// Blueprint
// =============================================================================

const SAMPLE_BLUEPRINT = `---
entity: blueprint
version: 0.1.0
name: dev-workflow
---

# Blueprint: dev-workflow

> TS 项目通用开发流程

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

### verify
- observe:
  - tests-pass
- deps:
  - build
`

describe('v0.7: extractBlueprintIR', () => {
  test('提取 Use + Boundaries', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_BLUEPRINT)
    const ir = extractBlueprintIR(root, frontmatter)
    expect(ir.entity).toBe('blueprint')
    expect(ir.use.domain).toHaveLength(1)
    expect(ir.use.workflow).toHaveLength(1)
    expect(ir.use.stack).toHaveLength(1)
    expect(ir.boundaries).toHaveLength(2)
    expect(ir.boundaries[1]?.deps).toEqual(['build'])
  })

  test('description 来自 H1 (去除 "Blueprint: name" 前缀)', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_BLUEPRINT)
    const ir = extractBlueprintIR(root, frontmatter)
    expect(ir.description).toContain('TS 项目通用开发流程')
  })
})

// =============================================================================
// Work
// =============================================================================

const SAMPLE_WORK = `---
entity: work
version: 0.3.0
name: refactor-auth
proofs: ["build-validity", "lint-check"]
---

# Work: refactor-auth

## Context
### primary
- goal: 重构 auth 模块
- max_iterations: 3
- constraints:
  - 不修改 src/cli 目录
  - 必须保留旧测试

## Tasks
### step1
- blueprint: ci-pipeline
- part: build
  - skill_context: 打包
- part: test
  - skill_context: 跑测试

### step2
- blueprint: ci-pipeline
- part: verify
  - skill_context: 验证
`

describe('v0.4 PR-C2: extractWorkIR', () => {
  test('提取 Context + Tasks', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_WORK)
    const ir = extractWorkIR(root, frontmatter)
    expect(ir.context.goal).toBe('重构 auth 模块')
    expect(ir.context.maxIterations).toBe(3)
    expect(ir.context.constraints).toEqual(['不修改 src/cli 目录', '必须保留旧测试'])
    expect(ir.tasks).toHaveLength(2)
    expect(ir.tasks[0]?.blueprint).toBe('ci-pipeline')
    expect(ir.tasks[0]?.parts).toHaveLength(2)
  })

  test('v0.3 T11: proofs [...] 列表被提取', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_WORK)
    const ir = extractWorkIR(root, frontmatter)
    expect(ir.proofs).toEqual(['build-validity', 'lint-check'])
  })
})

// =============================================================================
// Task
// =============================================================================

const SAMPLE_TASK = `---
entity: task
version: 0.3.0
name: register-member
---

# Task: register-member

## Domain
### d1
- value: MemberContext

## Blueprint
### b1
- value: dev-workflow

## Parts
### develop
- skill_context: 实现注册

### verify
- skill_context: 端到端验证
`

describe('v0.4 PR-C2: extractTaskIR', () => {
  test('提取 Domain / Blueprint / Parts', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_TASK)
    const ir = extractTaskIR(root, frontmatter)
    expect(ir.domain).toBe('MemberContext')
    expect(ir.blueprint).toBe('dev-workflow')
    expect(ir.parts).toHaveLength(2)
    expect(ir.parts[0]?.skillContext).toBe('实现注册')
  })
})

// =============================================================================
// Proof
// =============================================================================

const SAMPLE_PROOF = `---
entity: proof
version: 0.1.0
name: build-validity
proofs-target-work: ../../works/feat-x/work.oxn
---

# Proof: build-validity

> 验证 v0.3.0 build 产物

## Probes
### artifact-exists
- ref: "@oxn/probes/fs-exists"
- params:
  - path: "./dist/cli.js"

### typecheck
- ref: "@oxn/probes/ts-compiles"
- params: {}
`

describe('v0.4 PR-C2: extractProofIR', () => {
  test('提取 probes + proofs-target-work (Q4-A)', () => {
    const { tree: root, frontmatter } = parseMarkdown(SAMPLE_PROOF)
    const ir = extractProofIR(root, frontmatter)
    expect(ir.probes).toHaveLength(2)
    expect(ir.probes[0]?.probeName).toBe('artifact-exists')
    expect(ir.probes[0]?.ref).toBe('@oxn/probes/fs-exists')
    expect(ir.proofsTargetWork).toBe('../../works/feat-x/work.oxn')
  })
})

// =============================================================================
// unified plugin composition (5 plugins 同时用)
// =============================================================================

describe('v0.4 PR-C2: 5 plugins composition', () => {
  test('all 5 extractors 可独立 use (unified plugin 形式)', () => {
    const tree: Root = unified().use(remarkParse).use(remarkFrontmatter).parse(SAMPLE_WORK) as Root
    remarkWorkExtractor()(tree)
    const ir = (tree.data as Record<string, unknown>).work as ReturnType<typeof extractWorkIR>
    expect(ir.context.goal).toBe('重构 auth 模块')
  })

  test('空 markdown → 5 个 extractors 全部返回空 IR', () => {
    const { tree: root, frontmatter } = parseMarkdown('---\nname: Empty\n---\n\n')
    const d = extractDomainIR(root, frontmatter)
    const b = extractBlueprintIR(root, frontmatter)
    const w = extractWorkIR(root, frontmatter)
    const t = extractTaskIR(root, frontmatter)
    const p = extractProofIR(root, frontmatter)
    expect(d.terms).toEqual([])
    expect(b.boundaries).toEqual([])
    expect(w.tasks).toEqual([])
    expect(t.parts).toEqual([])
    expect(p.probes).toEqual([])
  })
})
