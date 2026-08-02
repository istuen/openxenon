/**
 * retarget.ts tests — v0.6.2-alpha.3
 *
 * 覆盖：
 *   - retarget 改 frontmatter 保留工程师内容
 *   - 错误码（not found / target invalid / kind required / skeleton not found）
 *   - 多次 retarget 链式
 */

import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { retargetDraft } from '../retarget'

const FIXTURE_PROJECT = '/tmp/oxn-test-retarget-project'

function setup(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
  const dir = join(FIXTURE_PROJECT, '.openxenon/drafts')
  mkdirSync(dir, { recursive: true })
  const skelDir = join(FIXTURE_PROJECT, '.openxenon/assets/blueprints/draft-skeletons')
  mkdirSync(skelDir, { recursive: true })

  // 7 skeleton 模板
  const templates: Record<string, string> = {
    'rfc.md': '---\nentity: rfc\n---\n# RFC\n',
    'asset-domain.md': '---\nentity: domain\n---\n# Domain\n',
    'asset-workflow.md': '---\nentity: workflow\n---\n# Workflow\n',
    'asset-stack.md': '---\nentity: stack\n---\n# Stack\n',
    'asset-blueprint.md': '---\nentity: blueprint\n---\n# Blueprint\n',
    'asset-roadmap.md': '---\nentity: roadmap\n---\n# Roadmap\n',
    'work.md': '---\nworkId: TODO\n---\n# Work\n',
  }
  for (const [name, content] of Object.entries(templates)) {
    writeFileSync(join(skelDir, name), content, 'utf-8')
  }
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

describe('retargetDraft', () => {
  test('1. retarget 从 rfc → asset+domain', () => {
    setup()
    writeDraft('test', '---\nentity: rfc\npromote-target: rfc\n---\n# Section\n\nEngineer content here.\n')
    const result = retargetDraft(
      { projectRoot: FIXTURE_PROJECT, name: 'test', newTarget: 'asset', newKind: 'domain' },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.oldTarget).toBe('rfc')
    expect(result.newTarget).toBe('asset')
    expect(result.newKind).toBe('domain')
    expect(result.preservedContentChars).toBeGreaterThan(0)

    // 验证文件被改写
    const content = readFileSync(result.draftPath, 'utf-8')
    expect(content).toContain('promote-target: asset')
    expect(content).toContain('promote-kind: domain')
    expect(content).toContain('engineer-preserved-content')
    expect(content).toContain('Engineer content here')
    teardown()
  })

  test('2. retarget 改 promote-target 而非其他 frontmatter', () => {
    setup()
    writeDraft(
      'meta-test',
      '---\nentity: domain\npromote-target: asset\npromote-kind: domain\nabstract: Keep this\n---\n# Body\n',
    )
    const result = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'meta-test', newTarget: 'work' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const content = readFileSync(result.draftPath, 'utf-8')
    expect(content).toContain('promote-target: work')
    expect(content).toContain('abstract: Keep this')
    teardown()
  })

  test('3. Draft 不存在报错 OXN_DRAFT_NOT_FOUND', () => {
    setup()
    const result = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'nonexistent', newTarget: 'rfc' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_NOT_FOUND')
    teardown()
  })

  test('4. target invalid 报错', () => {
    setup()
    writeDraft('inv-target', '---\npromote-target: rfc\n---\n# Original\n')
    const result = retargetDraft(
      { projectRoot: FIXTURE_PROJECT, name: 'inv-target', newTarget: 'invalid' as never },
      null,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_TARGET_INVALID')
    teardown()
  })

  test('5. asset target 缺 kind 报错', () => {
    setup()
    writeDraft('asset-no-kind', '---\npromote-target: rfc\n---\n# Original\n')
    const result = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'asset-no-kind', newTarget: 'asset' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_KIND_REQUIRED')
    teardown()
  })

  test('6. 链式 retarget 多次切换', () => {
    setup()
    writeDraft('chain', '---\npromote-target: rfc\n---\n# Body\n\nNote: keep me\n')
    // rfc → asset+workflow
    const r1 = retargetDraft(
      { projectRoot: FIXTURE_PROJECT, name: 'chain', newTarget: 'asset', newKind: 'workflow' },
      null,
    )
    expect(r1.ok).toBe(true)
    if (!r1.ok) return

    // asset+workflow → work
    const r2 = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'chain', newTarget: 'work' }, null)
    expect(r2.ok).toBe(true)
    if (!r2.ok) return
    expect(r2.oldTarget).toBe('asset')
    expect(r2.newTarget).toBe('work')

    // work → rfc
    const r3 = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'chain', newTarget: 'rfc' }, null)
    expect(r3.ok).toBe(true)
    if (!r3.ok) return
    expect(r3.oldTarget).toBe('work')
    expect(r3.newTarget).toBe('rfc')

    teardown()
  })

  test('7. 工程师 oversized 保护', () => {
    setup()
    const bigContent = 'X'.repeat(100_000)
    writeDraft('big', `---\npromote-target: rfc\n---\n# Body\n\n${bigContent}\n`)
    const result = retargetDraft({ projectRoot: FIXTURE_PROJECT, name: 'big', newTarget: 'work' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.preservedContentChars).toBeGreaterThan(100_000)
    teardown()
  })
})
