/**
 * src/oxl/md-bridge/__tests__/extract-headings.test.ts
 *
 * H1/H2/H3 上下文栈提取器测试
 *
 * 覆盖：
 * - 单 H1
 * - H1 + H2 + H3 完整树
 * - H3 后 list 关联
 * - H4+ 不创建新 context
 * - 多个 H3 同 ## 分类
 * - H2 切换重置 h3
 * - findH1 解析 "Entity: Name"
 * - extractH2Categories
 */

import { describe, test, expect } from 'bun:test'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import type { Root } from 'mdast'
import { extractHeadingContexts, findH1, extractH2Categories } from '../extract-headings.js'

/** 工具：MD 字符串 → mdast Root */
function parseMd(md: string): Root {
  return unified().use(remarkParse).parse(md) as Root
}

describe('extractHeadingContexts — 基础', () => {
  test('单 H1 无 H2/H3 返回空', () => {
    const root = parseMd('# Hello\n\nbody text')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(0)
  })

  test('单 H1 + 单 H2 无 H3 返回空', () => {
    const root = parseMd('# Hello\n\n## Terms\n\nbody')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(0)
  })

  test('H1 + H2 + H3 完整树', () => {
    const root = parseMd('# Domain: Test\n\n## Terms\n\n### Intent\n\n- name: Intent\n- desc: declaration\n')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.h1).toBe('Domain: Test')
    expect(contexts[0]?.h2).toBe('Terms')
    expect(contexts[0]?.h3).toBe('Intent')
    expect(contexts[0]?.h3List).not.toBeNull()
  })

  test('多 H3 同 ## 分类', () => {
    const root = parseMd('# D\n\n## Terms\n\n### A\n\n- x: 1\n\n### B\n\n- y: 2\n')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(2)
    expect(contexts[0]?.h3).toBe('A')
    expect(contexts[1]?.h3).toBe('B')
    expect(contexts[0]?.h2).toBe('Terms')
    expect(contexts[1]?.h2).toBe('Terms')
  })
})

describe('extractHeadingContexts — 边界', () => {
  test('H2 切换重置 h3', () => {
    const root = parseMd('# D\n\n## Terms\n\n### A\n\n- x: 1\n\n## Bans\n\n### B\n\n- y: 2\n')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(2)
    expect(contexts[0]?.h2).toBe('Terms')
    expect(contexts[0]?.h3).toBe('A')
    expect(contexts[1]?.h2).toBe('Bans')
    expect(contexts[1]?.h3).toBe('B')
  })

  test('H4+ 不创建新 context（视为 H3 子结构）', () => {
    const root = parseMd('# D\n\n## Tasks\n\n### step1\n\n- part: p1\n  - skill: x\n  - probe: pr\n    - scheme: fs\n')
    const contexts = extractHeadingContexts(root)
    // 仅有 1 个 H3
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.h3).toBe('step1')
  })

  test('H3 后无 list 仍创建 context（h3List 为 null）', () => {
    const root = parseMd('# D\n\n## Terms\n\n### A\n\nno list follows\n')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.h3).toBe('A')
    expect(contexts[0]?.h3List).toBeNull()
  })

  test('H3 后多 list 仅第一个关联', () => {
    const root = parseMd('# D\n\n## Terms\n\n### A\n\n- x: 1\n\n- y: 2\n')
    const contexts = extractHeadingContexts(root)
    expect(contexts).toHaveLength(1)
    expect(contexts[0]?.h3List).not.toBeNull()
  })
})

describe('findH1', () => {
  test('解析 "Domain: IntentAlignContext"', () => {
    const root = parseMd('# Domain: IntentAlignContext\n\nbody')
    const h1 = findH1(root)
    expect(h1).not.toBeNull()
    expect(h1?.entity).toBe('Domain')
    expect(h1?.name).toBe('IntentAlignContext')
    expect(h1?.text).toBe('Domain: IntentAlignContext')
  })

  test('解析 "Blueprint: ci-pipeline"', () => {
    const root = parseMd('# Blueprint: ci-pipeline\n\nbody')
    const h1 = findH1(root)
    expect(h1?.entity).toBe('Blueprint')
    expect(h1?.name).toBe('ci-pipeline')
  })

  test('无 H1 返回 null', () => {
    const root = parseMd('## Terms\n\nbody')
    const h1 = findH1(root)
    expect(h1).toBeNull()
  })

  test('H1 含 position', () => {
    const root = parseMd('# Domain: Test\n\nbody')
    const h1 = findH1(root)
    expect(h1?.position).not.toBeNull()
    expect(h1?.position?.line).toBe(1)
  })
})

describe('extractH2Categories', () => {
  test('提取多个 H2 保持顺序', () => {
    const root = parseMd('# D\n\n## Terms\n\n## Bans\n\n## Invariants\n')
    const cats = extractH2Categories(root)
    expect(cats).toEqual(['Terms', 'Bans', 'Invariants'])
  })

  test('无 H2 返回空数组', () => {
    const root = parseMd('# D\n\nbody')
    const cats = extractH2Categories(root)
    expect(cats).toEqual([])
  })

  test('H1 不计入', () => {
    const root = parseMd('# D\n\n## T\n')
    const cats = extractH2Categories(root)
    expect(cats).toEqual(['T'])
  })
})
