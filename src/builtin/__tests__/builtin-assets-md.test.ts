/**
 * builtin-assets-md.test.ts — v0.6.1 PR-4 builtin assets .md 加载测试
 *
 * D-α c 锁定：builtin assets (15 probes + 3 blueprints) 都有 .md canonical 副本。
 * 测试 .md 文件能通过 mdast 路径解析（与 md-bridge Work/Task/Domain 同一管线）。
 *
 * 不变量：
 *   - 18 个 .md 文件 frontmatter 含 entity + name 字段
 *   - H1 = `# Probe: <name>` 或 `# Blueprint: <name>`
 *   - 各 section (Alignment, Scheme, Props, Output for probe / Version, Slots for blueprint) 存在
 *
 * 与现有 builtin-*.test.ts 的关系：
 *   - 现有 .oxn test 持续 run via Langium（v0.6.x 兼容）
 *   - 新 .md test 跑 mdast 路径（v0.7.0 cutover 准备）
 */

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { parseMarkdown } from '@openxenon/engine/oxl/md-pipeline/utils'

const BUILTIN_PROBES_DIR = 'src/builtin/probes'
const BUILTIN_BLUEPRINTS_DIR = 'src/builtin/blueprints'

function listMd(dir: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => `${dir}/${f}`)
}

describe('v0.6.1 PR-4: builtin assets .md 加载测试（mdast 路径）', () => {
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

  describe('数量守卫', () => {
    test('15 builtin probes .md 文件存在', () => {
      expect(listMd(BUILTIN_PROBES_DIR).length).toBe(15)
    })

    test('3 builtin blueprints .md 文件存在', () => {
      expect(listMd(BUILTIN_BLUEPRINTS_DIR).length).toBe(3)
    })
  })
})
