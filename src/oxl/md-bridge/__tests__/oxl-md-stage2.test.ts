/**
 * md-bridge/oxl-md-stage2.test.ts — 阶段 2 集成测试（25 cases）
 *
 * v0.3 阶段 2 T12 任务
 *
 * 覆盖：
 * - source-hash：read/write/detect/list
 * - compiler：5 类实体编译
 * - adapter：.md 优先 + .oxn 降级 + hash mismatch
 * - compileMdFile：便捷函数
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'

// 阶段 2 导入
import {
  readMapping,
  writeMapping,
  deleteMapping,
  listMappings,
  detectHashMismatch,
  computeContentHash,
  createMapping,
  type SourceHashMapping,
} from '../oxl-md-source-hash.js'

import { compileMdToOxn, type CompileOptions } from '../oxl-md-compiler.js'

import { adaptOxlMd, OxlMdAdapterError, compileMdFile } from '../oxl-md-adapter.js'

// 复用 stage 1 的 parse 结果
import { parseDomainMd, parseBlueprintMd, parseWorkMd } from '../remark-to-mdast.js'

// ========================
// 测试 fixtures
// ========================

const validDomainMd = `---
entity: domain
version: 0.3.0
name: OrderContext
---

# Domain: OrderContext

:::intent{#order-term type="term" scope="domain"}
Order 业务实体
:::
`
const validBlueprintMd = `---
entity: blueprint
version: 0.3.0
name: dev-workflow
---

# Blueprint: dev-workflow

:::intent{#slot-1 type="slot" id="develop"}
- skill: develop
:::
`
const validWorkMd = `---
entity: work
version: 0.3.0
name: feature-x
---

# Work: feature-x

:::intent{#ctx-1 type="context" goal="实现 X" max_iterations="3"}
- 实现 X 功能
:::

:::intent{#t1 type="task" id="step1" deps="[]"}
- name: step1
:::
`

// ========================
// T9: source-hash 测试（7 cases）
// ========================

describe('T9: oxl-md-source-hash', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `oxn-md-hash-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(join(testDir, '.openxenon'), { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('computeContentHash 一致性 + 唯一性', () => {
    const h1 = computeContentHash('hello')
    const h2 = computeContentHash('hello')
    const h3 = computeContentHash('world')
    expect(h1).toBe(h2)
    expect(h1).not.toBe(h3)
    expect(h1).toMatch(/^[a-f0-9]{64}$/)
  })

  test('createMapping 初始 md/oxn hash 一致', () => {
    const mapping = createMapping('/path/to/test.md', '/path/to/test.oxn', 'test content', testDir)
    expect(mapping.mdContentHash).toBe(mapping.oxnSourceHash)
    expect(mapping.syncCount).toBe(1)
  })

  test('readMapping / writeMapping / deleteMapping', () => {
    const mapping = createMapping('/path/a.md', '/path/a.oxn', 'content', testDir)
    writeMapping(mapping, testDir)
    expect(readMapping('/path/a.md', testDir)).not.toBeNull()

    const deleted = deleteMapping('/path/a.md', testDir)
    expect(deleted).toBe(true)
    expect(readMapping('/path/a.md', testDir)).toBeNull()
  })

  test('listMappings 列出所有', () => {
    writeMapping(createMapping('/a.md', '/a.oxn', 'a', testDir), testDir)
    writeMapping(createMapping('/b.md', '/b.oxn', 'b', testDir), testDir)
    const all = listMappings(testDir)
    expect(all).toHaveLength(2)
  })

  test('detectHashMismatch — md 改了', () => {
    const mapping = createMapping('/test.md', '/test.oxn', 'old', testDir)
    const newHash = computeContentHash('new')
    const result = detectHashMismatch(mapping, newHash)
    expect(result.mismatch).toBe(true)
    expect(result.reason).toBe('md_content_changed')
  })

  test('detectHashMismatch — oxn 漂移', () => {
    const mapping = createMapping('/test.md', '/test.oxn', 'content', testDir)
    const drifted = { ...mapping, oxnSourceHash: 'different-hash' }
    const result = detectHashMismatch(drifted, mapping.mdContentHash)
    expect(result.mismatch).toBe(true)
    expect(result.reason).toBe('oxn_drifted')
  })

  test('detectHashMismatch — 无 mismatch', () => {
    const mapping = createMapping('/test.md', '/test.oxn', 'content', testDir)
    const result = detectHashMismatch(mapping, mapping.mdContentHash)
    expect(result.mismatch).toBe(false)
  })
})

// ========================
// T10: compiler 测试（10 cases）
// ========================

describe('T10: oxl-md-compiler', () => {
  const baseOptions: CompileOptions = {
    entity: 'domain',
    mdContentHash: 'test-hash-1234',
  }

  test('compileDomain — 基础 term 编译', () => {
    const result = parseDomainMd(validDomainMd)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'domain' })
    expect(compiled.oxn).toContain('// source_hash: test-hash-1234')
    expect(compiled.oxn).toContain('domain "OrderContext"')
    expect(compiled.oxn).toContain('term {')
    expect(compiled.oxn).toContain('Order 业务实体')
  })

  test('compileDomain — 含 ban + invariant', () => {
    const md = `---
entity: domain
version: 0.3.0
name: Mixed
---

# Domain: Mixed

:::intent{#t1 type="term"}
Term 1
:::

:::intent{#b1 type="ban"}
- ban 1
:::

:::intent{#i1 type="invariant"}
- inv 1
:::
`
    const result = parseDomainMd(md)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'domain' })
    expect(compiled.oxn).toContain('term {')
    expect(compiled.oxn).toContain('ban {')
    expect(compiled.oxn).toContain('invariant {')
  })

  test('compileBlueprint — slot 编译', () => {
    const result = parseBlueprintMd(validBlueprintMd)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'blueprint' })
    expect(compiled.oxn).toContain('blueprint "dev-workflow"')
    expect(compiled.oxn).toContain('slot "develop"')
  })

  test('compileBlueprint — 含 probe', () => {
    const md = `---
entity: blueprint
version: 0.3.0
name: with-probe
---

# Blueprint: with-probe

:::intent{#slot-1 type="slot" id="build"}
- build
:::

:::intent{#probe-1 type="probe" slot="build"}
- type: shell-exec
- command: bun test
:::
`
    const result = parseBlueprintMd(md)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'blueprint' })
    expect(compiled.oxn).toContain('probe "probe-1"')
    expect(compiled.oxn).toContain('scheme "shell-exec"')
  })

  test('compileWork — context + task', () => {
    const result = parseWorkMd(validWorkMd)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'work' })
    expect(compiled.oxn).toContain('work "feature-x"')
    expect(compiled.oxn).toContain('context {')
    expect(compiled.oxn).toContain('goal = "实现 X"')
    expect(compiled.oxn).toContain('task "step1"')
  })

  test('compileWork — context 含 max_iterations', () => {
    const result = parseWorkMd(validWorkMd)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'work' })
    expect(compiled.oxn).toContain('loop_policy {')
    expect(compiled.oxn).toContain('max_iterations = 3')
  })

  test('compileTask — 最小骨架', () => {
    const compiled = compileMdToOxn(
      { name: 'step1', content: '', contentHash: 'h' },
      { ...baseOptions, entity: 'task' },
    )
    expect(compiled.oxn).toContain('task "step1"')
    // source_hash 来自 baseOptions.mdContentHash
    expect(compiled.oxn).toContain('// source_hash: test-hash-1234')
  })

  test('compileProof — 最小骨架', () => {
    const compiled = compileMdToOxn(
      { name: 'feature-x', content: '', contentHash: 'h' },
      { ...baseOptions, entity: 'proof' },
    )
    expect(compiled.oxn).toContain('proof "feature-x"')
  })

  test('compiled 包含 source hash 防漂移', () => {
    const result = parseDomainMd(validDomainMd)
    const customHash = 'unique-hash-abc-123'
    const compiled = compileMdToOxn(result, {
      ...baseOptions,
      entity: 'domain',
      mdContentHash: customHash,
    })
    expect(compiled.oxn).toContain(`// source_hash: ${customHash}`)
  })

  test('compiledAt 时间戳存在', () => {
    const result = parseDomainMd(validDomainMd)
    const compiled = compileMdToOxn(result, { ...baseOptions, entity: 'domain' })
    expect(compiled.compiledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

// ========================
// T11: adapter 测试（8 cases）
// ========================

describe('T11: oxl-md-adapter', () => {
  test('adaptOxlMd — .md 优先（preferred=".md"）', () => {
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/domain.md',
      mdContent: validDomainMd,
      mdContentHash: computeContentHash(validDomainMd),
    })
    expect(result.preferred).toBe('.md')
    expect(result.kernel).toBeDefined()
    expect(result.kernel.name).toBe('OrderContext')
  })

  test('adaptOxlMd — .md 优先时生成 compiledOxn', () => {
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/domain.md',
      mdContent: validDomainMd,
      mdContentHash: computeContentHash(validDomainMd),
    })
    expect(result.compiledOxn).toBeDefined()
    expect(result.compiledOxn).toContain('domain "OrderContext"')
  })

  test('adaptOxlMd — .oxn 降级（preferred=".oxn"）', () => {
    const oxnContent = `domain "FallbackDomain" { term { foo } }`
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/domain.oxn',
      oxnContent,
      oxnContentHash: computeContentHash(oxnContent),
    })
    expect(result.preferred).toBe('.oxn')
    expect(result.kernel).toBeDefined()
  })

  test('adaptOxlMd — 既无 .md 也无 .oxn 抛错', () => {
    expect(() =>
      adaptOxlMd({
        entity: 'domain',
        filePath: '/test/missing',
      }),
    ).toThrow(OxlMdAdapterError)
  })

  test('adaptOxlMd — .md + .oxn 都有，优先 .md', () => {
    const oxnContent = `domain "OxnOnly" { ... }`
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/dual.md',
      mdContent: validDomainMd,
      mdContentHash: computeContentHash(validDomainMd),
      oxnContent,
      oxnContentHash: computeContentHash(oxnContent),
    })
    expect(result.preferred).toBe('.md')
    expect(result.kernel.name).toBe('OrderContext') // 来自 .md
  })

  test('adaptOxlMd — hash mismatch 检测', () => {
    const staleMapping = createMapping('/test/domain.md', '/test/domain.oxn', 'old-content')
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/domain.md',
      mdContent: validDomainMd,
      mdContentHash: computeContentHash(validDomainMd),
      mapping: staleMapping,
    })
    expect(result.hashMismatch).toBe(true)
  })

  test('adaptOxlMd — hash 一致（无 mismatch）', () => {
    const freshMapping = createMapping('/test/domain.md', '/test/domain.oxn', validDomainMd)
    const result = adaptOxlMd({
      entity: 'domain',
      filePath: '/test/domain.md',
      mdContent: validDomainMd,
      mdContentHash: computeContentHash(validDomainMd),
      mapping: freshMapping,
    })
    expect(result.hashMismatch).toBe(false)
  })

  test('OxlMdAdapterError 包含 entity 信息', () => {
    try {
      adaptOxlMd({
        entity: 'work',
        filePath: '/test/missing',
      })
    } catch (err) {
      if (err instanceof OxlMdAdapterError) {
        expect(err.entity).toBe('work')
        expect(err.message).toContain('work')
      }
    }
  })
})

// ========================
// T12: compileMdFile 便捷函数测试（5 cases）
// ========================

describe('T12: compileMdFile 便捷函数', () => {
  let testDir: string

  beforeEach(() => {
    testDir = join(tmpdir(), `oxn-md-compile-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  test('compileMdFile — 基础 Domain', () => {
    const mdPath = join(testDir, 'domain.md')
    const oxnPath = join(testDir, 'domain.oxn')
    writeFileSync(mdPath, validDomainMd)

    const result = compileMdFile(mdPath, oxnPath, validDomainMd, 'domain', testDir)
    expect(result.oxnContent).toContain('domain "OrderContext"')
    expect(result.mdHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.oxnHash).toMatch(/^[a-f0-9]{64}$/)
    expect(result.mapping.mdPath).toBe(mdPath)
  })

  test('compileMdFile — Blueprint', () => {
    const mdPath = join(testDir, 'bp.md')
    const oxnPath = join(testDir, 'bp.oxn')
    writeFileSync(mdPath, validBlueprintMd)

    const result = compileMdFile(mdPath, oxnPath, validBlueprintMd, 'blueprint', testDir)
    expect(result.oxnContent).toContain('blueprint "dev-workflow"')
    expect(result.oxnContent).toContain('slot "develop"')
  })

  test('compileMdFile — Work 含 task', () => {
    const mdPath = join(testDir, 'work.md')
    const oxnPath = join(testDir, 'work.oxn')
    writeFileSync(mdPath, validWorkMd)

    const result = compileMdFile(mdPath, oxnPath, validWorkMd, 'work', testDir)
    expect(result.oxnContent).toContain('work "feature-x"')
    expect(result.oxnContent).toContain('task "step1"')
  })

  test('compileMdFile — 无效 entity 抛错', () => {
    // 模拟 parseDomainMd 失败场景：错误的 entity type
    expect(() =>
      compileMdFile(
        '/nonexistent.md',
        '/nonexistent.oxn',
        '# Domain: Test',
        // @ts-expect-error - 测试运行时错误
        'invalid-entity-type',
        testDir,
      ),
    ).toThrow()
  })

  test('compileMdFile — mapping 包含 syncCount = 1', () => {
    const mdPath = join(testDir, 'd.md')
    const oxnPath = join(testDir, 'd.oxn')
    writeFileSync(mdPath, validDomainMd)

    const result = compileMdFile(mdPath, oxnPath, validDomainMd, 'domain', testDir)
    expect(result.mapping.syncCount).toBe(1)
  })
})
