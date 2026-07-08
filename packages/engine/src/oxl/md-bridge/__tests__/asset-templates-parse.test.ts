/**
 * asset-templates-parse.test.ts — v0.6.1-alpha.1 Batch 2
 *
 * 验证 5 个 Asset 模板（domain/blueprint/stack/library/external）可被对应 compiler 解析
 * 锁定 5 种 AssetKind 模板的 .md 语法合规性
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkFrontmatter from 'remark-frontmatter'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DomainCompiler } from '../compilers/domain-compiler.js'
import { BlueprintCompiler } from '../compilers/blueprint-compiler.js'
import { StackCompiler } from '../compilers/stack-compiler.js'
import { LibraryCompiler } from '../compilers/library-compiler.js'
import { ExternalCompiler } from '../compilers/external-compiler.js'

const ASSETS_DIR = join(
  import.meta.dir,
  '..',
  '..',
  '..',
  '..',
  '..',
  'cli',
  'src',
  'skills',
  'locales',
  'zh-CN',
  'oxn-asset',
  'assets',
)

function parseMdWithFrontmatter(content: string): { mdast: any; frontmatter: Record<string, unknown> } {
  const tree = unified().use(remarkParse).use(remarkFrontmatter, ['yaml']).parse(content)
  const fm: Record<string, unknown> = {}
  const yamlNode = tree.children.find((c: { type: string }) => c.type === 'yaml')
  if (yamlNode && 'value' in yamlNode) {
    for (const line of (yamlNode as { value: string }).value.split('\n')) {
      const m = line.match(/^(\w+):\s*(.*)$/)
      if (m?.[1] && m[2] !== undefined) fm[m[1]] = m[2]
    }
  }
  return { mdast: tree, frontmatter: fm }
}

describe('domain 模板（AssetKind 1/5）', () => {
  test('1. domain.md 可被 DomainCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'domain.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new DomainCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      name: string
      terms: Array<{ name: string; desc: string }>
      bans: Array<{ items: string[]; desc: string }>
      invariants: Array<{ value: string }>
    }
    expect(result.entity).toBe('domain')
    expect(result.terms.length).toBeGreaterThanOrEqual(3)
    expect(result.bans.length).toBeGreaterThanOrEqual(1)
    expect(result.invariants.length).toBeGreaterThanOrEqual(1)
  })
})

describe('blueprint 模板（AssetKind 2/5）', () => {
  test('2. blueprint.md 可被 BlueprintCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'blueprint.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new BlueprintCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      props: Array<{ name: string; type: string }>
      slots: Array<{ name: string; deps: string[]; observe: string[] }>
    }
    expect(result.entity).toBe('blueprint')
    expect(result.props.length).toBeGreaterThanOrEqual(1)
    expect(result.slots.length).toBeGreaterThanOrEqual(1)
  })
})

describe('stack 模板（AssetKind 3/5）', () => {
  test('3. stack.md 可被 StackCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'stack.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new StackCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      runtimes: Array<{ name: string; props: Record<string, string> }>
      linters: Array<{ name: string; props: Record<string, string> }>
      testers: Array<{ name: string; props: Record<string, string> }>
    }
    expect(result.entity).toBe('stack')
    expect(result.runtimes.length).toBeGreaterThanOrEqual(1)
    expect(result.linters.length).toBeGreaterThanOrEqual(1)
    expect(result.testers.length).toBeGreaterThanOrEqual(1)
  })
})

describe('library 模板（AssetKind 4/5）', () => {
  test('4. library.md 可被 LibraryCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'library.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new LibraryCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      sources: Array<{ name: string; url: string; version: string; fetched: string; summary: string }>
    }
    expect(result.entity).toBe('library')
    expect(result.sources.length).toBeGreaterThanOrEqual(1)
    expect(result.sources[0]?.url).toBeTruthy()
  })
})

describe('external 模板（AssetKind 5/5）', () => {
  test('5. external.md 可被 ExternalCompiler.parse() 直接解析', () => {
    const path = join(ASSETS_DIR, 'external.md')
    const content = readFileSync(path, 'utf-8')
    const { mdast, frontmatter } = parseMdWithFrontmatter(content)
    const compiler = new ExternalCompiler()
    const result = compiler.parse({ mdast, frontmatter, options: {} }) as {
      entity: string
      links: Array<{ name: string; url: string; kind: string; ttl: string }>
    }
    expect(result.entity).toBe('external')
    expect(result.links.length).toBeGreaterThanOrEqual(1)
    expect(result.links[0]?.url).toBeTruthy()
    expect(result.links[0]?.kind).toBeTruthy()
  })
})
