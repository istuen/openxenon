// =============================================================================
// work-blueprints-merger.test.ts — PR-3 单元测试
//
// 覆盖：
//   1. extractBlueprintRefs：单/多/无 ref
//   2. parseBlueprintSlim：version + slots（含 deps/observe）
//   3. resolveBlueprintFile：@prj/blueprints/X、bare、@oxn/、找不到
//   4. buildPerWorkBlueprintsIndex：happy + 错误
//   5. writePerWorkBlueprintsIndex 原子写 + load 还原
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildPerWorkBlueprintsIndex,
  extractBlueprintRefs,
  getPerWorkBlueprintsJsonPath,
  loadPerWorkBlueprintsIndex,
  parseBlueprintSlim,
  resolveBlueprintFile,
  writePerWorkBlueprintsIndex,
} from '../per-work-blueprints-merger'

let tmpDir: string
let workName: string
let workMdPath: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `work-bp-merger-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'demo'
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  workMdPath = join(tmpDir, '.openxenon', 'works', workName, 'work.md')
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

function writeBlueprintFile(name: string, content: string): void {
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', `${name}.md`), content)
}

// ───────── extractBlueprintRefs ─────────

describe('extractBlueprintRefs', () => {
  test('无 blueprint 声明 → []', () => {
    expect(extractBlueprintRefs('work "demo" {}\n')).toEqual([])
  })

  test('单 ref', () => {
    const r = extractBlueprintRefs('work "demo" {\n  blueprint "Foo" ref "@prj/blueprints/foo";\n}\n')
    expect(r).toEqual([{ name: 'Foo', ref: '@prj/blueprints/foo' }])
  })

  test('多 ref 保留顺序', () => {
    const oxn = `work "demo" {
  blueprint "A" ref "@prj/blueprints/a";
  blueprint "B" ref "@prj/blueprints/b";
}
`
    const r = extractBlueprintRefs(oxn)
    expect(r.map((d) => d.name)).toEqual(['A', 'B'])
  })

  test('内联形式 work "x" { blueprint "Y" ref "..."; }', () => {
    const r = extractBlueprintRefs('work "demo" { blueprint "Foo" ref "@prj/blueprints/foo"; }\n')
    expect(r).toEqual([{ name: 'Foo', ref: '@prj/blueprints/foo' }])
  })

  // 🆕 v0.7: .md 格式（## Use 段）支持
  test('.md ## Use 段提取单 ref', () => {
    const md = `## Use\n### foo\n- kind: blueprint\n- ref: @prj/blueprints/foo\n`
    expect(extractBlueprintRefs(md)).toEqual([{ name: 'foo', ref: '@prj/blueprints/foo' }])
  })

  test('.md ## Use 段提取多 ref（保留顺序）', () => {
    const md = `## Use\n### a\n- kind: blueprint\n- ref: @prj/blueprints/a\n\n### b\n- kind: blueprint\n- ref: @prj/blueprints/b\n`
    expect(extractBlueprintRefs(md).map((r) => r.name)).toEqual(['a', 'b'])
  })

  test('.md ## Use 段只 kind=blueprint 的 ref 被提取（其他 kind 跳过）', () => {
    const md = `## Use\n### bp1\n- kind: blueprint\n- ref: @prj/blueprints/bp1\n\n### d1\n- kind: domain\n- ref: @prj/domains/d1\n\n### bp2\n- kind: blueprint\n- ref: @prj/blueprints/bp2\n`
    expect(extractBlueprintRefs(md).map((r) => r.name)).toEqual(['bp1', 'bp2'])
  })

  test('.md ## Use 段无 ref 字段 → ref=null', () => {
    // 包含 - ref: 行但 value 为空（显式 ref 缺失）
    const md = `## Use\n### foo\n- kind: blueprint\n- ref:\n`
    expect(extractBlueprintRefs(md)).toEqual([{ name: 'foo', ref: null }])
  })

  test('.md 无 ## Use 段 → 空数组', () => {
    expect(extractBlueprintRefs(`# Work: demo\n## Context\n- goal: g\n`)).toEqual([])
  })

  test('向后兼容：同时有 .oxn + .md 时优先 .oxn（v0.7 起 .oxn 移除 → T19 移除本测试）', () => {
    // 同时有 .oxn 和 .md 时，优先用 .oxn。该行为是 v0.6.x 的 .oxn→.md 迁移兼容 shim，
    // 待 v0.7.0 触发 E_MD_DEPRECATED_SYNTAX 后删除（见 ssumary-extractors / roadmap RFC）。
    const mixed = `work "demo" {\n  blueprint "Foo" ref "@prj/blueprints/foo";\n}\n## Use\n### bar\n- kind: blueprint\n- ref: @prj/blueprints/bar\n`
    expect(extractBlueprintRefs(mixed).map((r) => r.name)).toEqual(['Foo'])
  })
})

// ───────── parseBlueprintSlim ─────────

describe('parseBlueprintSlim', () => {
  test('完整 blueprint（version + 多个 slot + 3 boundary refs）', () => {
    const content = `blueprint "Foo" {
  version = 2
  description = "demo"
  domain "SomeDomain";
  workflow "SomeWorkflow";
  stack "SomeStack";
  slot "alpha" { deps = []; observe = ["fs-match"] }
  slot "beta"  { deps = ["alpha"]; observe = ["lint-check", "type-check"] }
}
`
    const r = parseBlueprintSlim(content)
    expect(r.name).toBe('Foo')
    expect(r.version).toBe(2)
    expect(r.errors).toEqual([])
    expect(r.domainRefs).toHaveLength(1)
    expect(r.workflowRefs).toHaveLength(1)
    expect(r.stackRefs).toHaveLength(1)
    expect(r.slots).toHaveLength(2)
    expect(r.slots[0]).toEqual({ name: 'alpha', deps: [], observe: ['fs-match'], operate: [] })
    expect(r.slots[1]).toEqual({ name: 'beta', deps: ['alpha'], observe: ['lint-check', 'type-check'], operate: [] })
  })

  test('缺 version → 默认 1', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { domain "D"; workflow "W"; slot "a" {} }\n`)
    expect(r.version).toBe(1)
  })

  test('空 slot body → deps=[] observe=[]', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { domain "D"; workflow "W"; slot "a" {} }\n`)
    expect(r.slots[0]).toEqual({ name: 'a', deps: [], observe: [], operate: [] })
  })

  test('无 blueprint 声明 → name=null + error', () => {
    const r = parseBlueprintSlim(`// nothing here\n`)
    expect(r.name).toBe(null)
    expect(r.errors).toContain('no `blueprint "X" { ... }` declaration found')
  })

  test('version 非数字 → 默认 1，无 error（regex 只匹配 \\d+）', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { domain "D"; workflow "W"; stack "S"; version = abc }\n`)
    expect(r.version).toBe(1)
    // 🆕 Phase B: stack "S" 无 ref 触发 missing-stack-ref warning（不是 regex 错误）
    expect(r.errors.some((e) => e.includes('regex'))).toBe(false)
  })

  // 🆕 v0.7: .md 格式（## Use + ## Boundaries）支持
  test('.md 格式：完整 Blueprint（frontmatter + Use + Boundaries）', () => {
    const md = `---
entity: blueprint
version: 2
name: ci-pipeline
---

# Blueprint: ci-pipeline

## Use
### payment-domain
- kind: domain
- ref: @md/domains/PaymentContext
### fix-issue-workflow
- kind: workflow
- ref: @md/workflows/fix-issue
### node-stack
- kind: stack
- ref: @md/stacks/node-ts

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
    const r = parseBlueprintSlim(md)
    expect(r.name).toBe('ci-pipeline')
    expect(r.version).toBe(2)
    expect(r.errors).toEqual([])
    // Use 段
    expect(r.domainRefs.map((d) => d.name)).toEqual(['payment-domain'])
    expect(r.workflowRefs.map((w) => w.name)).toEqual(['fix-issue-workflow'])
    expect(r.stackRefs.map((s) => s.name)).toEqual(['node-stack'])
    // Boundaries 段 → slots
    expect(r.slots).toHaveLength(2)
    expect(r.slots[0]?.name).toBe('build')
    expect(r.slots[0]?.deps).toEqual([])
    expect(r.slots[0]?.observe).toEqual(['fs-exists', 'ts-compiles'])
    expect(r.slots[1]?.name).toBe('test')
    expect(r.slots[1]?.deps).toEqual(['build'])
    expect(r.slots[1]?.observe).toEqual(['test-pass'])
  })

  // 🆕 v0.7: .md 新格式（H3 name + 单字段 - domain/- workflow/- stack/- blueprint）
  // 对齐 .openxenon/assets/blueprints/*.md 当前形态（脱胎于 skill SSOT 模板）
  test('.md 新格式（H3 + 单字段）：完整 Blueprint（- domain/- workflow/- stack）', () => {
    const md = `---
entity: blueprint
version: 2
name: ci-pipeline
---

# Blueprint: ci-pipeline

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
    const r = parseBlueprintSlim(md)
    expect(r.name).toBe('ci-pipeline')
    expect(r.errors).toEqual([])
    expect(r.domainRefs.map((d) => d.name)).toEqual(['payment-domain'])
    expect(r.workflowRefs.map((w) => w.name)).toEqual(['fix-issue-workflow'])
    expect(r.stackRefs.map((s) => s.name)).toEqual(['node-stack'])
    expect(r.slots).toHaveLength(2)
    expect(r.slots[0]?.name).toBe('build')
    expect(r.slots[0]?.observe).toEqual(['fs-exists', 'ts-compiles'])
    expect(r.slots[1]?.name).toBe('test')
    expect(r.slots[1]?.deps).toEqual(['build'])
  })

  test('.md 新格式（H3 + 单字段）：含嵌套 blueprint ref', () => {
    const md = `---
entity: blueprint
version: 1
name: parent-bp
---

# Blueprint: parent-bp

## Use
### child-bp
- blueprint: @md/blueprints/child-bp
### main-domain
- domain: @md/domains/MainContext
### main-workflow
- workflow: @md/workflows/main-workflow
### main-stack
- stack: @md/stacks/main-stack

## Boundaries

### build
- refs:
  - domain: main-domain
  - workflow: main-workflow
  - stack: main-stack
  - blueprint: child-bp
- observe:
  - fs-exists
- deps: []
`
    const r = parseBlueprintSlim(md)
    expect(r.name).toBe('parent-bp')
    expect(r.errors).toEqual([])
    expect(r.domainRefs.map((d) => d.name)).toEqual(['main-domain'])
    expect(r.workflowRefs.map((w) => w.name)).toEqual(['main-workflow'])
    expect(r.stackRefs.map((s) => s.name)).toEqual(['main-stack'])
    expect(r.nestedBlueprintRefs.map((b) => b.name)).toEqual(['child-bp'])
    expect(r.nestedBlueprintRefs[0]?.ref).toBe('@md/blueprints/child-bp')
  })

  test('.md 格式：缺 Use 段 → 触发 3 boundary 缺失错误', () => {
    const md = `---
entity: blueprint
version: 1
name: empty
---

# Blueprint: empty

## Boundaries

### b1
- observe: []
- deps: []
`
    const r = parseBlueprintSlim(md)
    expect(r.name).toBe('empty')
    expect(r.errors).toContain('E_MD_BLUEPRINT_MISSING_DOMAIN: Blueprint must reference at least 1 Domain')
    expect(r.errors).toContain('E_MD_BLUEPRINT_MISSING_WORKFLOW: Blueprint must reference at least 1 Workflow')
    expect(r.errors).toContain('E_MD_BLUEPRINT_MISSING_STACK: Blueprint must reference at least 1 Stack')
  })

  test('.md 格式：嵌套 Blueprint ref（排除自引用）', () => {
    const md = `---
entity: blueprint
version: 1
name: outer
---

# Blueprint: outer

## Use
### outer
- kind: blueprint
- ref: @prj/blueprints/outer
### inner
- kind: blueprint
- ref: @prj/blueprints/inner
### d
- kind: domain
- ref: @prj/domains/D

## Boundaries
### b1
- observe: []
- deps: []
`
    const r = parseBlueprintSlim(md)
    expect(r.nestedBlueprintRefs.map((b) => b.name)).toEqual(['inner'])
    // domain 也必须有（1 个）
    expect(r.domainRefs.map((d) => d.name)).toEqual(['d'])
  })

  test('.md 格式：缺 frontmatter.name → error', () => {
    const md = `# Blueprint: no-name

## Use
### d
- kind: domain
- ref: @prj/domains/D
### w
- kind: workflow
- ref: @prj/workflows/W
### s
- kind: stack
- ref: @prj/stacks/S

## Boundaries
### b1
- observe: []
- deps: []
`
    const r = parseBlueprintSlim(md)
    expect(r.errors).toContain('no `entity: blueprint` declaration with name found in frontmatter')
  })
})

// ───────── resolveBlueprintFile ─────────

describe('resolveBlueprintFile', () => {
  test('@prj/blueprints/X 命中', () => {
    writeBlueprintFile('foo', 'blueprint "Foo" {}')
    const r = resolveBlueprintFile('@prj/blueprints/foo', 'Foo', tmpDir)
    expect(r).toEqual({
      scope: '@prj',
      filePath: join(tmpDir, '.openxenon/blueprints/foo.md'),
    })
  })

  test('@prj/blueprints/X kebab 回退', () => {
    writeBlueprintFile('fix-issue', 'blueprint "fix-issue" {}')
    const r = resolveBlueprintFile('@prj/blueprints/fix-issue', 'fix-issue', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/blueprints/fix-issue.md'))
  })

  test('bare name', () => {
    writeBlueprintFile('foo', 'blueprint "Foo" {}')
    const r = resolveBlueprintFile(null, 'foo', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/blueprints/foo.md'))
  })

  test('@oxn/ → null', () => {
    expect(resolveBlueprintFile('@oxn/blueprints/foo', 'Foo', tmpDir)).toBe(null)
  })

  test('找不到 → null', () => {
    expect(resolveBlueprintFile(null, 'nonexistent', tmpDir)).toBe(null)
  })
})

// ───────── buildPerWorkBlueprintsIndex ─────────

describe('buildPerWorkBlueprintsIndex', () => {
  test('happy path：1 blueprint + 4 slots + 3 boundary refs', () => {
    writeBlueprintFile(
      'pipeline',
      `blueprint "pipeline" {
  version = 1
  domain "SomeDomain";
  workflow "SomeWorkflow";
  stack "SomeStack";
  slot "retrieve" { "observe" = ["fs-match"] }
  slot "design"   { deps = ["retrieve"]; observe = ["fs-exists"] }
  slot "develop"  { deps = ["design"]; observe = ["lint-check", "type-check"] }
  slot "test"     { deps = ["develop"]; observe = ["test-runner"] }
}
`,
    )
    writeFileSync(
      workMdPath,
      `work "demo" {
  blueprint "pipeline" ref "@prj/blueprints/pipeline";
}
`,
    )
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })
    expect(idx.schemaVersion).toBe(1)
    expect(idx.blueprintCount).toBe(1)
    expect(idx.invalidCount).toBe(0)
    expect(idx.declaredRefs).toEqual(['@prj/blueprints/pipeline'])
    const bp = idx.blueprints[0]
    expect(bp?.name).toBe('pipeline')
    expect(bp?.version).toBe(1)
    expect(bp?.slots).toHaveLength(4)
    expect(bp?.slots.map((s) => s.name)).toEqual(['retrieve', 'design', 'develop', 'test'])
    expect(bp?.slots[2]?.observe).toEqual(['lint-check', 'type-check'])
  })

  test('同 name 去重', () => {
    writeBlueprintFile('a', 'blueprint "X" { assetVersion = 1 slot "x" {} }')
    writeFileSync(
      workMdPath,
      `work "demo" {
  blueprint "A" ref "@prj/blueprints/a";
  blueprint "A" ref "@prj/blueprints/a";
}
`,
    )
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })
    expect(idx.blueprintCount).toBe(1)
  })

  test('ref 找不到文件 → invalid + error', () => {
    writeFileSync(workMdPath, `work "demo" { blueprint "ghost" ref "@prj/blueprints/ghost"; }\n`)
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })
    expect(idx.blueprints[0]?.status).toBe('invalid')
    expect(idx.blueprints[0]?.errors[0]).toContain('not found')
  })

  test('@oxn/ scope → invalid + error', () => {
    writeFileSync(workMdPath, `work "demo" { blueprint "Foo" ref "@oxn/blueprints/foo"; }\n`)
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })
    expect(idx.blueprints[0]?.scope).toBe('@oxn')
    expect(idx.blueprints[0]?.status).toBe('invalid')
    expect(idx.blueprints[0]?.errors[0]).toContain('@oxn/')
  })

  test('work.md 不存在 → 抛错', () => {
    writeFileSync(workMdPath, 'work "demo" {}\n')
    rmSync(workMdPath)
    expect(() => buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })).toThrow(
      /work.md not found/,
    )
  })

  // 🆕 v0.7: .md 格式 work.md 端到端
  test('.md work.md：## Use 段提取 blueprint ref', () => {
    writeBlueprintFile(
      'pipeline',
      `---
entity: blueprint
version: 1
name: pipeline
---

# Blueprint: pipeline

## Use
### d1
- kind: domain
- ref: @prj/domains/D
### w1
- kind: workflow
- ref: @prj/workflows/W
### s1
- kind: stack
- ref: @prj/stacks/S

## Boundaries
### b1
- observe: []
- deps: []
`,
    )
    writeFileSync(
      workMdPath,
      `---
entity: work
name: demo
---

# Work: demo

## Use

### pipeline
- kind: blueprint
- ref: "@prj/blueprints/pipeline"

## Tasks
### t1
- blueprint: pipeline
- part: implement
`,
    )
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workMdPath })
    expect(idx.blueprintCount).toBe(1)
    expect(idx.invalidCount).toBe(0)
    expect(idx.declaredRefs).toEqual(['@prj/blueprints/pipeline'])
    const bp = idx.blueprints[0]
    expect(bp?.name).toBe('pipeline')
    expect(bp?.domainRefs.map((d) => d.name)).toEqual(['d1'])
    expect(bp?.workflowRefs.map((w) => w.name)).toEqual(['w1'])
    expect(bp?.stackRefs.map((s) => s.name)).toEqual(['s1'])
    expect(bp?.slots).toHaveLength(1)
    expect(bp?.slots[0]?.name).toBe('b1')
  })
})

// ───────── writePerWorkBlueprintsIndex / loadPerWorkBlueprintsIndex ─────────

describe('writePerWorkBlueprintsIndex / loadPerWorkBlueprintsIndex', () => {
  test('原子写 + 读回', () => {
    writeBlueprintFile('p', 'blueprint "P" { slot "x" {} }')
    writeFileSync(workMdPath, `work "demo" { blueprint "P" ref "@prj/blueprints/p"; }\n`)
    const outPath = getPerWorkBlueprintsJsonPath(tmpDir, workName)
    writePerWorkBlueprintsIndex({
      projectRoot: tmpDir,
      workName,
      workMdPath,
      outPath,
    })
    expect(existsSync(outPath)).toBe(true)
    expect(existsSync(`${outPath}.tmp`)).toBe(false)
    const reloaded = loadPerWorkBlueprintsIndex(outPath)
    expect(reloaded?.blueprintCount).toBe(1)
    expect(reloaded?.blueprints[0]?.slots[0]?.name).toBe('x')
  })

  test('load: 缺文件 → null', () => {
    expect(loadPerWorkBlueprintsIndex(join(tmpDir, 'nope.json'))).toBe(null)
  })

  test('load: schema 不匹配 → null', () => {
    const outPath = getPerWorkBlueprintsJsonPath(tmpDir, workName)
    writeFileSync(outPath, JSON.stringify({ schemaVersion: 99 }))
    expect(loadPerWorkBlueprintsIndex(outPath)).toBe(null)
  })
})
