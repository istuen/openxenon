/**
 * Roadmap/suggest.test.ts
 */

import { describe, expect, test } from 'bun:test'
import { suggestAssets, tokenize, jaccard } from '../suggest.js'
import type { Roadmap } from '../types.js'

const roadmap: Roadmap = {
  name: 'test',
  version: 1,
  abstract: 'test',
  scenes: [
    {
      name: 'dev',
      description: 'Dev scenario',
      links: [
        { kind: 'blueprint', name: 'add-cli-subcommand', description: 'Add new oxn CLI subcommand' },
        { kind: 'domain', name: 'WorkOrchestrationContext', description: '8 stages + 6 workType' },
        { kind: 'blueprint', name: 'dev-workflow', description: 'Generic development' },
        { kind: 'domain', name: 'intent-domain', description: 'Intent axis' },
      ],
    },
    {
      name: 'doc',
      description: 'Doc scenario',
      links: [{ kind: 'domain', name: 'DocEngineeringContext', description: 'Three-layer doc rules' }],
    },
  ],
}

describe('tokenize', () => {
  test('lowercases ASCII words', () => {
    expect(tokenize('Add CLI Subcommand')).toEqual(['add', 'cli', 'subcommand'])
  })

  test('splits CJK characters individually', () => {
    expect(tokenize('添加 CLI 子命令')).toContain('cli')
    const cjk = tokenize('添加').filter((t) => t.length === 1)
    expect(cjk.length).toBeGreaterThanOrEqual(2)
  })

  test('drops 1-char ASCII noise', () => {
    expect(tokenize('a b c word')).not.toContain('a')
    expect(tokenize('a b c word')).not.toContain('b')
    expect(tokenize('a b c word')).not.toContain('c')
  })

  test('handles empty input', () => {
    expect(tokenize('')).toEqual([])
  })
})

describe('jaccard', () => {
  test('identical sets → 1', () => {
    expect(jaccard(['a', 'b'], ['a', 'b'])).toBe(1)
  })
  test('disjoint → 0', () => {
    expect(jaccard(['a'], ['b'])).toBe(0)
  })
  test('partial overlap', () => {
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5)
  })
  test('both empty → 0', () => {
    expect(jaccard([], [])).toBe(0)
  })
})

describe('suggestAssets', () => {
  test('requires --scene (throws on empty)', () => {
    expect(() => suggestAssets({ goal: 'test', roadmap, scene: '' })).toThrow(/--scene is required/)
  })

  test('requires --goal (throws on empty)', () => {
    expect(() => suggestAssets({ goal: '', roadmap, scene: 'dev' })).toThrow(/--goal is required/)
  })

  test('throws on unknown scene', () => {
    expect(() => suggestAssets({ goal: 'test', roadmap, scene: 'unknown' })).toThrow(/Scene 'unknown' not found/)
  })

  test('top result matches highest jaccard', () => {
    const { matches } = suggestAssets({
      goal: 'Add CLI subcommand',
      roadmap,
      scene: 'dev',
    })
    expect(matches[0]?.name).toBe('add-cli-subcommand')
    expect(matches[0]?.score).toBeGreaterThan(0)
  })

  test('scene isolation: doc scene does not return dev assets', () => {
    const { matches } = suggestAssets({
      goal: 'CLI subcommand',
      roadmap,
      scene: 'doc',
    })
    expect(matches).toHaveLength(1)
    expect(matches[0]?.name).toBe('DocEngineeringContext')
  })

  test('topK limits results', () => {
    const { matches } = suggestAssets({
      goal: 'development',
      roadmap,
      scene: 'dev',
      topK: 2,
    })
    expect(matches).toHaveLength(2)
  })

  test('rationale includes matched tokens', () => {
    const { matches } = suggestAssets({
      goal: 'CLI subcommand',
      roadmap,
      scene: 'dev',
    })
    const top = matches[0]!
    expect(top.rationale.length).toBeGreaterThan(0)
  })

  test('CJK goals still score via name+description', () => {
    const { matches } = suggestAssets({
      goal: 'CLI 子命令',
      roadmap,
      scene: 'dev',
    })
    expect(matches[0]?.name).toBe('add-cli-subcommand')
  })
})
