/**
 * skeleton.ts tests — v0.6.2-alpha.3
 *
 * 覆盖：
 *   - 7 个 skeleton 模板派生（rfc · asset-{5 kind} · work）
 *   - frontmatter 注入（promote-target / promote-kind / created-from / synced-at）
 *   - 校验失败（target invalid / kind required / kind invalid / skeleton not found）
 *   - preserveContent（retarget 场景）
 */

import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { forkDraftSkeleton, DRAFT_TARGETS, ASSET_KINDS } from '../skeleton'

const FIXTURE_PROJECT = '/tmp/oxn-test-skeleton-project'

function setupSkeletonDir(): void {
  const dir = join(FIXTURE_PROJECT, '.openxenon/draft-skeletons')
  if (existsSync(dir)) rmSync(dir, { recursive: true })
  mkdirSync(dir, { recursive: true })

  // 7 个 skeleton 模板
  const templates: Record<string, string> = {
    'rfc.md': '---\nentity: rfc\n---\n# RFC\n',
    'asset-domain.md': '---\nentity: domain\n---\n# Domain\n',
    'asset-workflow.md': '---\nentity: workflow\n---\n# Workflow\n',
    'asset-stack.md': '---\nentity: stack\n---\n# Stack\n',
    'asset-blueprint.md': '---\nentity: blueprint\n---\n# Blueprint\n',
    'asset-assetmap.md': '---\nentity: assetmap\n---\n# AssetMap\n', // 🆕 v0.6.4
    'work.md': '---\nworkId: TODO\n---\n# Work\n',
  }
  for (const [name, content] of Object.entries(templates)) {
    writeFileSync(join(dir, name), content, 'utf-8')
  }
}

function teardownSkeletonDir(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
}

describe('forkDraftSkeleton', () => {
  test('1. rfc target 派生 skeleton 注入 promote-target', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'test-rfc' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('promote-target: rfc')
    expect(result.content).not.toContain('promote-kind:')
    expect(result.content).toContain('created-from: asset-create@3.0.0-mode-skeleton')
    expect(result.content).toContain('# RFC')
    expect(result.injectedFrontmatter['promote-target']).toBe('rfc')
    expect(result.injectedFrontmatter['promote-kind']).toBe(null)
    teardownSkeletonDir()
  })

  test('2. asset+domain 派生 skeleton 注入 promote-target + promote-kind', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton(
      { projectRoot: FIXTURE_PROJECT, target: 'asset', kind: 'domain', name: 'test-domain' },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('promote-target: asset')
    expect(result.content).toContain('promote-kind: domain')
    expect(result.injectedFrontmatter['promote-kind']).toBe('domain')
    teardownSkeletonDir()
  })

  test('3. asset+workflow 派生 skeleton', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton(
      { projectRoot: FIXTURE_PROJECT, target: 'asset', kind: 'workflow', name: 'wf' },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('promote-kind: workflow')
    teardownSkeletonDir()
  })

  test('4. work target 派生 skeleton（无 promote-kind）', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'work', name: 'test-work' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('promote-target: work')
    expect(result.content).not.toContain('promote-kind:')
    teardownSkeletonDir()
  })

  test('5. target invalid 报错', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'invalid' as never, name: 'x' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_TARGET_INVALID')
    expect(result.suggestion).toContain('rfc')
    teardownSkeletonDir()
  })

  test('6. asset target 缺 kind 报错', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'asset', name: 'x' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_KIND_REQUIRED')
    expect(result.suggestion).toContain('domain')
    teardownSkeletonDir()
  })

  test('7. kind invalid 报错', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton(
      { projectRoot: FIXTURE_PROJECT, target: 'asset', kind: 'invalid' as never, name: 'x' },
      null,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_KIND_INVALID')
    teardownSkeletonDir()
  })

  test('8. skeleton 模板不存在报错 OX경_DRAFT_SKELETON_NOT_FOUND', () => {
    teardownSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_SKELETON_NOT_FOUND')
    expect(result.message).toContain('not found')
  })

  test('9. preserveContent 追加工程师已填内容', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton(
      {
        projectRoot: FIXTURE_PROJECT,
        target: 'rfc',
        name: 'test',
        preserveContent: '## 工程师内容\n- TODO 已填',
      },
      null,
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toContain('engineer-preserved-content')
    expect(result.content).toContain('工程师内容')
    teardownSkeletonDir()
  })

  test('10. synced-at 字段为 YYYY-MM-DD 格式', () => {
    setupSkeletonDir()
    const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.content).toMatch(/synced-at: \d{4}-\d{2}-\d{2}/)
    teardownSkeletonDir()
  })

  test('11. 5 AssetKind 全部派生', () => {
    setupSkeletonDir()
    for (const kind of ASSET_KINDS) {
      const result = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'asset', kind, name: `x-${kind}` }, null)
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.content).toContain(`promote-kind: ${kind}`)
    }
    teardownSkeletonDir()
  })

  test('12. 4 target 枚举完整（v0.5.0 D2 goal 新增）', () => {
    expect(DRAFT_TARGETS).toEqual(['rfc', 'asset', 'work', 'goal'])
    expect(ASSET_KINDS).toEqual(['domain', 'workflow', 'stack', 'blueprint', 'assetmap']) // 🆕 v0.6.4
  })
})

describe('OXN_DRAFT_SKELETON_NOT_FOUND Q3 推荐性 hint (v0.6.3+)', () => {
  test('13. message 含 "recommended, not required"', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.code).toBe('OXN_DRAFT_SKELETON_NOT_FOUND')
    expect(r.message).toContain('recommended, not required')
    expect(r.message).toContain('v0.6.3 Q3')
  })

  test('14. suggestion 含 "create the skeleton manually"', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toMatch(/create the skeleton manually/i)
  })

  test('15. suggestion 含 "skip skeleton fork"（明示可手写 Draft）', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toContain('skip skeleton fork')
  })

  test('16. suggestion 提及 `oxn init` 安装路径', () => {
    teardownSkeletonDir()
    const r = forkDraftSkeleton({ projectRoot: FIXTURE_PROJECT, target: 'rfc', name: 'x' }, null)
    if (r.ok) throw new Error('expected failure')
    expect(r.suggestion).toContain('`oxn init`')
  })
})
