/**
 * promote.ts tests — v0.6.2-alpha.3
 *
 * 覆盖：
 *   - 4 阶段生命周期（gather → select-target → validate → dispatch）
 *   - 7 sub-target dispatch
 *   - 错误码（target missing / unknown / kind mismatch / validate failed / frontmatter invalid）
 *   - target=auto / target=override 两种模式
 */

import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { promoteDraft } from '../promote'

const FIXTURE_PROJECT = '/tmp/oxn-test-promote-project'

function setup(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
  const dir = join(FIXTURE_PROJECT, '.openxenon/drafts')
  mkdirSync(dir, { recursive: true })
}

function writeDraft(name: string, content: string): void {
  const dir = join(FIXTURE_PROJECT, '.openxenon/drafts')
  writeFileSync(join(dir, `${name}.md`), content, 'utf-8')
}

function teardown(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
}

describe('promoteDraft', () => {
  test('1. rfc target 派生 promote-rfc subTarget', () => {
    setup()
    writeDraft(
      'rfc-foo',
      '---\nentity: rfc\nid: RFC-0001\npromote-target: rfc\n---\n# RFC\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'rfc-foo' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.target).toBe('rfc')
    expect(result.kind).toBe(null)
    expect(result.subTarget).toBe('promote-rfc')
    expect(result.targetPath).toContain('docs/rfc/zh-cn/RFC-XXXX-rfc-foo.md')
    teardown()
  })

  test('2. asset+domain 派生 promote-asset-domain', () => {
    setup()
    writeDraft(
      'd-foo',
      '---\nentity: domain\npromote-target: asset\npromote-kind: domain\n---\n# Domain\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'd-foo' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.target).toBe('asset')
    expect(result.kind).toBe('domain')
    expect(result.subTarget).toBe('promote-asset-domain')
    expect(result.targetPath).toContain('.openxenon/assets/domains/d-foo.md')
    teardown()
  })

  test('3. asset+roadmap 派生到 assetmaps 目录', () => {
    setup()
    writeDraft(
      'rm-foo',
      '---\nentity: roadmap\npromote-target: asset\npromote-kind: roadmap\n---\n# Roadmap\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'rm-foo' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subTarget).toBe('promote-asset-roadmap')
    expect(result.targetPath).toContain('.openxenon/assets/assetmaps/rm-foo.md')
    teardown()
  })

  test('4. work target 派生 promote-work', () => {
    setup()
    writeDraft(
      'w-foo',
      '---\nworkId: w-foo\npromote-target: work\n---\n# Work\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'w-foo' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.subTarget).toBe('promote-work')
    expect(result.targetPath).toContain('.openxenon/works/w-foo/work.md')
    teardown()
  })

  test('5. 7 sub-target 全部唯一', () => {
    setup()
    const subTargets = new Set<string>()
    const cases: Array<{ name: string; fm: string; expectedSub: string }> = [
      { name: 'rfc', fm: 'promote-target: rfc', expectedSub: 'promote-rfc' },
      { name: 'd', fm: 'promote-target: asset\npromote-kind: domain', expectedSub: 'promote-asset-domain' },
      { name: 'w', fm: 'promote-target: asset\npromote-kind: workflow', expectedSub: 'promote-asset-workflow' },
      { name: 's', fm: 'promote-target: asset\npromote-kind: stack', expectedSub: 'promote-asset-stack' },
      { name: 'b', fm: 'promote-target: asset\npromote-kind: blueprint', expectedSub: 'promote-asset-blueprint' },
      { name: 'r', fm: 'promote-target: asset\npromote-kind: roadmap', expectedSub: 'promote-asset-roadmap' },
      { name: 'wk', fm: 'promote-target: work', expectedSub: 'promote-work' },
    ]
    for (const c of cases) {
      writeDraft(c.name, `---\n${c.fm}\n---\n# Draft\n`)
      const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: c.name }, null)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.subTarget).toBe(c.expectedSub as typeof result.subTarget)
      subTargets.add(result.subTarget)
    }
    expect(subTargets.size).toBe(7)
    teardown()
  })

  test('6. promote-target 缺失报错 OXN_DRAFT_PROMOTE_TARGET_MISSING', () => {
    setup()
    writeDraft('no-target', '---\nfoo: bar\n---\n# No target\n')
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'no-target' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_MISSING')
    teardown()
  })

  test('7. promote-target 未知值报错 OXN_DRAFT_PROMOTE_TARGET_UNKNOWN', () => {
    setup()
    writeDraft('bad-target', '---\npromote-target: invalid-target\n---\n# Bad\n')
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'bad-target' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_UNKNOWN')
    expect(result.detail).toBeDefined()
    teardown()
  })

  test('8. asset target 缺 kind 报错 OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH', () => {
    setup()
    writeDraft('asset-no-kind', '---\npromote-target: asset\n---\n# Asset\n')
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'asset-no-kind' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH')
    teardown()
  })

  test('9. asset target kind 未知报错 OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH', () => {
    setup()
    writeDraft(
      'asset-bad-kind',
      '---\npromote-target: asset\npromote-kind: invalid-kind\n---\n# Asset\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'asset-bad-kind' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH')
    teardown()
  })

  test('10. rfc target 不应有 promote-kind', () => {
    setup()
    writeDraft(
      'rfc-with-kind',
      '---\npromote-target: rfc\npromote-kind: domain\n---\n# RFC\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'rfc-with-kind' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_KIND_MISMATCH')
    teardown()
  })

  test('11. Draft 不存在报错 OXN_DRAFT_NOT_FOUND', () => {
    setup()
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'nonexistent' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_NOT_FOUND')
    teardown()
  })

  test('12. frontmatter 缺失报错 OXN_DRAFT_FRONTMATTER_INVALID', () => {
    setup()
    writeDraft('no-frontmatter', '# no frontmatter\n')
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'no-frontmatter' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_FRONTMATTER_INVALID')
    teardown()
  })

  test('13. --target override 覆盖 frontmatter', () => {
    setup()
    writeDraft(
      'override-test',
      '---\npromote-target: rfc\n---\n# RFC\n',
    )
    const result = promoteDraft(
      { projectRoot: FIXTURE_PROJECT, name: 'override-test', targetOverride: 'work' },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.target).toBe('work')
    expect(result.subTarget).toBe('promote-work')
    teardown()
  })

  test('14. 4 阶段 phases 详情完整', () => {
    setup()
    writeDraft(
      'phase-test',
      '---\nentity: domain\npromote-target: asset\npromote-kind: workflow\n---\n# Workflow\n\n## Slots\n',
    )
    const result = promoteDraft({ projectRoot: FIXTURE_PROJECT, name: 'phase-test' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.phases.gather.frontmatter['promote-target']).toBe('asset')
    expect(result.phases.gather.frontmatter['promote-kind']).toBe('workflow')
    expect(result.phases.gather.bodyChars).toBeGreaterThan(0)
    expect(result.phases.validate.valid).toBe(true)
    expect(result.phases.validate.missingFields).toEqual([])
    expect(result.phases.fork.forked).toBe(false)
    expect(result.phases.dispatch.subTarget).toBe('promote-asset-workflow')
    expect(result.phases.dispatch.workCreated).toBe(false)
    teardown()
  })
})
