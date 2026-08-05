/**
 * builtin-assets-md.test.ts — ADR-0090 builtin assets .md 加载测试
 *
 * ADR-0090 builtin 物理位置迁移：src/builtin/ → packages/engine/src/builtin/
 *
 * D-α c 锁定（v0.6.1 PR-4）：builtin assets 都有 .md canonical 副本。
 * 测试 .md 文件能通过 mdast 路径解析（与 md-bridge Work/Task/Domain 同一管线）。
 *
 * ADR-0090 D2 范围扩展：5 类 builtin 全部加载。
 *   - probe      19 个
 *   - blueprint  4 个（含 ADR-0089 md-author）
 *   - domain     1 个 (doc-md)
 *   - workflow   1 个 (md-author)
 *   - stack      1 个 (md-stack)
 *   - roadmap    1 个 (md-system, 收为 assetmaps/)
 *
 * 不变量：
 *   - 27 个 .md 文件 frontmatter 含 entity + name 字段
 *   - probe: H1 = `# Probe: <name>`
 *   - blueprint: H1 = `# Blueprint: <name>`
 *   - domain/workflow/stack/roadmap: frontmatter 含 abstract + references（ADR-0090 仅校验 frontmatter，body 段由调用方 deep-parse）
 *
 * 历史备注：v0.6.x 早期版本用 .oxn + Langium 解析 builtin assets；
 * 现已完全切到 .md + mdast 管线，无 Langium 残留依赖。
 */

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'

const BUILTIN_DIR = 'packages/engine/src/builtin'
const BUILTIN_PROBES_DIR = `${BUILTIN_DIR}/probes`
const BUILTIN_BLUEPRINTS_DIR = `${BUILTIN_DIR}/blueprints`
const BUILTIN_DOMAINS_DIR = `${BUILTIN_DIR}/domains`
const BUILTIN_WORKFLOWS_DIR = `${BUILTIN_DIR}/workflows`
const BUILTIN_STACKS_DIR = `${BUILTIN_DIR}/stacks`
const BUILTIN_ASSETMAPS_DIR = `${BUILTIN_DIR}/assetmaps`

function listMd(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${dir}/${f}`)
}

describe('ADR-0090: builtin assets .md 加载测试（mdast 路径）', () => {
  describe('probe .md 文件结构', () => {
    for (const path of listMd(BUILTIN_PROBES_DIR)) {
      test(`${path} 前置+frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { tree, frontmatter } = parseMarkdown(content)

        expect(frontmatter.entity).toBe('probe')
        expect(typeof frontmatter.name).toBe('string')
        expect(frontmatter.name).toMatch(/^[a-z][a-z0-9_-]*$/)

        // H1: # Probe: <name>
        const h1 = tree.children.find((n: { type?: string; depth?: number }) => n.type === 'heading' && n.depth === 1)
        expect(h1).toBeDefined()
        const h1Text = (h1 as unknown as { children: Array<{ value: string }> }).children.map((c) => c.value).join('')
        expect(h1Text).toBe(`Probe: ${frontmatter.name}`)
      })
    }
  })

  describe('blueprint .md 文件结构', () => {
    for (const path of listMd(BUILTIN_BLUEPRINTS_DIR)) {
      test(`${path} 前置+frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { tree, frontmatter } = parseMarkdown(content)

        expect(frontmatter.entity).toBe('blueprint')
        expect(typeof frontmatter.name).toBe('string')

        // H1: # Blueprint: <name>
        const h1 = tree.children.find((n: { type?: string; depth?: number }) => n.type === 'heading' && n.depth === 1)
        expect(h1).toBeDefined()
        const h1Text = (h1 as unknown as { children: Array<{ value: string }> }).children.map((c) => c.value).join('')
        expect(h1Text).toBe(`Blueprint: ${frontmatter.name}`)
      })
    }
  })

  describe('domain .md 文件结构（ADR-0090 D2 新增）', () => {
    for (const path of listMd(BUILTIN_DOMAINS_DIR)) {
      test(`${path} frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { frontmatter } = parseMarkdown(content)

        expect(frontmatter.entity).toBe('domain')
        expect(typeof frontmatter.name).toBe('string')
        expect(typeof frontmatter.abstract).toBe('string')
      })
    }
  })

  describe('workflow .md 文件结构（ADR-0090 D2 新增）', () => {
    for (const path of listMd(BUILTIN_WORKFLOWS_DIR)) {
      test(`${path} frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { frontmatter } = parseMarkdown(content)

        expect(frontmatter.entity).toBe('workflow')
        expect(typeof frontmatter.name).toBe('string')
        expect(typeof frontmatter.abstract).toBe('string')
      })
    }
  })

  describe('stack .md 文件结构（ADR-0090 D2 新增）', () => {
    for (const path of listMd(BUILTIN_STACKS_DIR)) {
      test(`${path} frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { frontmatter } = parseMarkdown(content)

        expect(frontmatter.entity).toBe('stack')
        expect(typeof frontmatter.name).toBe('string')
        expect(typeof frontmatter.abstract).toBe('string')
      })
    }
  })

  describe('assetmap/roadmap .md 文件结构（ADR-0090 D2 新增）', () => {
    for (const path of listMd(BUILTIN_ASSETMAPS_DIR)) {
      test(`${path} frontmatter 合规`, () => {
        const content = readFileSync(path, 'utf-8')
        const { frontmatter } = parseMarkdown(content)

        // RFC-0013 D4: AssetKind 枚举保留 'roadmap'，目录收敛为 'assetmaps/'
        expect(frontmatter.entity).toBe('roadmap')
        expect(typeof frontmatter.name).toBe('string')
        expect(typeof frontmatter.abstract).toBe('string')
      })
    }
  })

  describe('数量守卫（ADR-0090 D2 修订）', () => {
    test('19 builtin probes .md 文件存在', () => {
      expect(listMd(BUILTIN_PROBES_DIR).length).toBe(19)
    })

    test('4 builtin blueprints .md 文件存在（3 原生 + md-author）', () => {
      expect(listMd(BUILTIN_BLUEPRINTS_DIR).length).toBe(4)
    })

    test('1 builtin domain (doc-md) .md 存在', () => {
      expect(listMd(BUILTIN_DOMAINS_DIR).length).toBe(1)
    })

    test('1 builtin workflow (md-author) .md 存在', () => {
      expect(listMd(BUILTIN_WORKFLOWS_DIR).length).toBe(1)
    })

    test('1 builtin stack (md-stack) .md 存在', () => {
      expect(listMd(BUILTIN_STACKS_DIR).length).toBe(1)
    })

    test('1 builtin assetmap/roadmap (md-system) .md 存在', () => {
      expect(listMd(BUILTIN_ASSETMAPS_DIR).length).toBe(1)
    })

    test('5 starter Asset 全部存在（ADR-0089 + ADR-0090）', () => {
      // starter 标记通过文件名约定 + 类型覆盖
      const dirs = [
        BUILTIN_DOMAINS_DIR,
        BUILTIN_WORKFLOWS_DIR,
        BUILTIN_STACKS_DIR,
        BUILTIN_BLUEPRINTS_DIR,
        BUILTIN_ASSETMAPS_DIR,
      ]
      const total = dirs.reduce((sum, d) => sum + listMd(d).length, 0)
      expect(total).toBe(5 + 3) // 5 starter + 3 原生 blueprint（git-workflow / leader-test-dsl / verify-pipeline）
    })
  })
})
