/**
 * builtin-skeleton-templates.test.ts — v0.6.3 Fix #1 + Q1
 *
 * 覆盖：
 *   - 7 模板（rfc / asset-{domain,workflow,stack,blueprint,roadmap} / work）逐字校验
 *   - Q1: entity: skeleton 独立 entity 标识
 *   - Q1: target-entity 字段
 *   - 关键约束：不含注入字段（promote-target / promote-kind / created-from / synced-at）
 *   - v0.6.3 Fix #1: SKELETON_OUTPUT_DIR = .openxenon/draft-skeletons (boundary 顶层)
 */

import { describe, expect, test } from 'bun:test'
import { BUILTIN_SKELETON_TEMPLATES, SKELETON_OUTPUT_DIR } from '../builtin-skeleton-templates'

/**
 * 提取 frontmatter 顶层 keys（Q6=B 实现方案）
 * 不解析嵌套结构（如 references: 下的 - item）
 */
function frontmatterKeys(content: string): Set<string> {
  const m = content.match(/^---\n([\s\S]*?)\n---/)
  if (!m) return new Set()
  const keys = new Set<string>()
  for (const line of m[1]!.split('\n')) {
    // 顶层 key（不以空格开头；key 必须以字母开头，可含 -）
    const km = line.match(/^([a-z][a-z0-9-]*)\s*:/)
    if (km) keys.add(km[1]!)
  }
  return keys
}

describe('BUILTIN_SKELETON_TEMPLATES - 常量结构', () => {
  test('1. 长度 = 7', () => {
    expect(BUILTIN_SKELETON_TEMPLATES).toHaveLength(7)
  })

  test('2. 顺序 = [rfc, asset-{5 kind}, work]', () => {
    expect(BUILTIN_SKELETON_TEMPLATES.map((t) => t.filename)).toEqual([
      'rfc.md',
      'asset-domain.md',
      'asset-workflow.md',
      'asset-stack.md',
      'asset-blueprint.md',
      'asset-assetmap.md', // 🆕 v0.6.4
      'work.md',
    ])
  })

  test('3. SKELETON_OUTPUT_DIR = .openxenon/draft-skeletons (v0.6.3 Fix #1)', () => {
    expect(SKELETON_OUTPUT_DIR).toBe('.openxenon/draft-skeletons')
  })
})

describe.each([...BUILTIN_SKELETON_TEMPLATES])('template $filename', (tpl) => {
  test('frontmatter 含 entity: skeleton (Q1 独立 entity)', () => {
    expect(tpl.content).toMatch(/^---\nentity: skeleton\n/)
  })

  test('frontmatter 含 target-entity 字段 (Q1 新增)', () => {
    const m = tpl.content.match(/target-entity: (\w+)/)
    expect(m).not.toBeNull()
    // 7 模板的 target-entity 值集合:
    //   rfc → 'rfc'
    //   asset-{kind} → 具体 kind (domain/workflow/stack/blueprint/roadmap)
    //   work → 'work'
    const targetEntity = m?.[1] ?? ''
    expect(['rfc', 'domain', 'workflow', 'stack', 'blueprint', 'assetmap', 'work']).toContain(targetEntity) // 🆕 v0.6.4
  })

  test('frontmatter 不含注入字段 (skeleton fork 时注入)', () => {
    const keys = frontmatterKeys(tpl.content)
    expect(keys.has('promote-target')).toBe(false)
    expect(keys.has('promote-kind')).toBe(false)
    expect(keys.has('created-from')).toBe(false)
    expect(keys.has('synced-at')).toBe(false)
  })

  test('含 TODO 占位（提示工程师填）', () => {
    expect(tpl.content).toContain('TODO')
  })

  test('BuiltinSkeletonTemplate interface 字段完整', () => {
    expect(tpl.filename).toMatch(/\.md$/)
    expect(tpl.content.length).toBeGreaterThan(100)
  })
})
