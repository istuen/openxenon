/**
 * sync-domain-glossary.test.ts — v0.6.3 Work G 精简后
 *
 * 覆盖 export 的 4 个工具函数：
 *   - toSlug（H3 → kebab-case slug）
 *   - escapeAngleBrackets（<x> → &lt;x&gt;）
 *   - parseFrontmatter（YAML 简化版 references 提取）
 *   - extractTermsFromDomain（从 .md 提取 ### term + desc）
 *
 * 完整 e2e 测试（--write / --strict 行为）推到 v0.7.x — 需脚本 ROOT override
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { toSlug, escapeAngleBrackets, parseFrontmatter, extractTermsFromDomain } from '../sync-domain-glossary'

// === toSlug ===

describe('toSlug', () => {
  test('1. PascalCase → kebab-case (lowercase)', () => {
    expect(toSlug('AssetMap')).toBe('assetmap')
  })

  test('2. 含空格 → kebab-case', () => {
    expect(toSlug('OXN Engine')).toBe('oxn-engine')
  })

  test('3. 含斜杠', () => {
    expect(toSlug('OXN/IAP')).toBe('oxn-iap')
  })

  test('4. trim 首尾空格', () => {
    expect(toSlug('  Foo  ')).toBe('foo')
  })

  test('5. 含数字', () => {
    expect(toSlug('Version 2')).toBe('version-2')
  })

  test('6. 大小写混合', () => {
    expect(toSlug('oxnEngine')).toBe('oxnengine')
  })
})

// === escapeAngleBrackets ===

describe('escapeAngleBrackets', () => {
  test('1. <oxn> → &lt;oxn&gt;', () => {
    expect(escapeAngleBrackets('<oxn>')).toBe('&lt;oxn&gt;')
  })

  test('2. 普通文本不变', () => {
    expect(escapeAngleBrackets('plain text')).toBe('plain text')
  })

  test('3. 多个连续 tag', () => {
    expect(escapeAngleBrackets('<a><b>')).toBe('&lt;a&gt;&lt;b&gt;')
  })

  test('4. 中间含字母+数字+_-', () => {
    expect(escapeAngleBrackets('<oxn-engine-v2>')).toBe('&lt;oxn-engine-v2&gt;')
  })

  test('5. 非 tag 形式不变（如 <3）', () => {
    // regex 要求字母开头，<3 不匹配（数字开头）
    expect(escapeAngleBrackets('<3 hearts>')).toBe('<3 hearts>')
  })
})

// === parseFrontmatter ===

describe('parseFrontmatter', () => {
  test('1. 含 references 内联数组', () => {
    const r = parseFrontmatter('---\nreferences: [a, b, c]\n---\n# Body')
    expect(r.references).toEqual(['a', 'b', 'c'])
  })

  test('2. 含 references 空数组', () => {
    const r = parseFrontmatter('---\nreferences: []\n---\n# Body')
    expect(r.references).toEqual([])
  })

  test('3. 无 frontmatter', () => {
    expect(parseFrontmatter('# Body only').references).toEqual([])
  })

  test('4. malformed frontmatter（无 closing ---）', () => {
    expect(parseFrontmatter('---\nreferences: [').references).toEqual([])
  })

  test('5. frontmatter 无 references 字段', () => {
    const r = parseFrontmatter('---\nentity: domain\n---\n# Body')
    expect(r.references).toEqual([])
  })
})

// === extractTermsFromDomain ===

describe('extractTermsFromDomain', () => {
  let fixtureDir: string
  beforeEach(() => {
    fixtureDir = join(tmpdir(), `extract-terms-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(fixtureDir, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true })
  })

  test('1. 简单 domain 1 term', () => {
    const file = join(fixtureDir, 'test.md')
    writeFileSync(file, '---\nreferences: []\n---\n# Domain: Test\n\n## Terms:\n\n### Foo\n- desc: foo desc\n')
    const terms = extractTermsFromDomain(file, 'test')
    expect(terms).toHaveLength(1)
    expect(terms[0]?.name).toBe('Foo')
    expect(terms[0]?.desc).toBe('foo desc')
    expect(terms[0]?.domainName).toBe('test')
  })

  test('2. 多 term + slug 生成', () => {
    const file = join(fixtureDir, 'multi.md')
    writeFileSync(
      file,
      '---\nreferences: []\n---\n# Domain\n\n## Terms:\n\n### Foo Bar\n- desc: first\n\n### Baz\n- desc: second\n',
    )
    const terms = extractTermsFromDomain(file, 'multi')
    expect(terms).toHaveLength(2)
    expect(terms[0]?.slug).toBe('foo-bar')
    expect(terms[1]?.slug).toBe('baz')
  })

  test('3. 排除 Invariants / Bans 段', () => {
    const file = join(fixtureDir, 'mixed.md')
    writeFileSync(
      file,
      '---\nreferences: []\n---\n# Domain\n\n## Terms:\n\n### Real\n- desc: real term\n\n## Invariants\n\n### Fake\n- value: should not be extracted\n\n## Bans\n\n### BannedItem\n- items: [fake1]\n- desc: banned\n',
    )
    const terms = extractTermsFromDomain(file, 'mixed')
    expect(terms.map((t) => t.name)).toEqual(['Real'])
  })

  test('4. desc 行 trim + join 行为', () => {
    const file = join(fixtureDir, 'simple.md')
    writeFileSync(file, '---\nreferences: []\n---\n# Domain\n\n## Terms:\n\n### Foo\n- desc: simple value\n')
    const terms = extractTermsFromDomain(file, 'simple')
    expect(terms[0]?.desc).toBe('simple value')
  })

  test('5. line 字段 = H3 在文件中的行号（1-indexed）', () => {
    const file = join(fixtureDir, 'line-num.md')
    // 行 1: ---\n 行 2: references: []\n 行 3: ---\n 行 4: # Domain\n 行 5: ## Terms:\n 行 6: ### Foo
    writeFileSync(file, '---\nreferences: []\n---\n# Domain\n## Terms:\n### Foo\n- desc: f\n')
    const terms = extractTermsFromDomain(file, 'line-num')
    expect(terms[0]?.line).toBe(6)
  })
})
