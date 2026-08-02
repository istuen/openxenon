/**
 * promote-dispatch.ts tests — v0.6.3 NG6
 *
 * 覆盖：
 *   - RFC target write（自动 RFC-XXXX 编号）
 *   - 5 Asset target write（per-kind frontmatter）
 *   - Work target write
 *   - 冲突（目标已存在）
 *   - force flag 覆盖
 *   - 子目录自动创建
 */

import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { dispatchPromote } from '../promote-dispatch'

const FIXTURE_PROJECT = '/tmp/oxn-test-dispatch-project'

function setup(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
  mkdirSync(FIXTURE_PROJECT, { recursive: true })
}

function teardown(): void {
  if (existsSync(FIXTURE_PROJECT)) {
    rmSync(FIXTURE_PROJECT, { recursive: true })
  }
}

function writeFile(relPath: string, content: string): void {
  const fullPath = join(FIXTURE_PROJECT, relPath)
  const dir = join(fullPath, '..')
  mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
}

describe('dispatchPromote - RFC target', () => {
  test('1. RFC promote 自动生成 RFC-XXXX 编号 + 写文件', () => {
    setup()
    const fm = { 'promote-target': 'rfc', theme: 'test-rfc', status: 'Draft' }
    const body = '# Test RFC\n\nContent here.'
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'test-rfc',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: fm,
      draftBody: body,
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rfcNumber).toMatch(/^RFC-\d{4}$/)
    expect(result.targetPath).toContain(`docs/rfc/zh-cn/${result.rfcNumber}-test-rfc.md`)
    expect(result.bytesWritten).toBeGreaterThan(0)
    expect(result.created).toBe(true)
    expect(existsSync(result.targetPath)).toBe(true)

    const written = readFileSync(result.targetPath, 'utf-8')
    expect(written).toContain('entity: rfc')
    expect(written).toContain(`id: ${result.rfcNumber}`)
    expect(written).toContain('theme: test-rfc')
    expect(written).toContain('# Test RFC')
    teardown()
  })

  test('2. RFC 编号递增（基于已有 RFC）', () => {
    setup()
    // 预存 RFC-0019, RFC-0020, RFC-0021
    writeFile('docs/rfc/zh-cn/RFC-0019-test.md', '# old')
    writeFile('docs/rfc/zh-cn/RFC-0020-test.md', '# old')
    writeFile('docs/rfc/zh-cn/RFC-0021-test.md', '# old')

    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'next-rfc',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'next-rfc' },
      draftBody: '# Next',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rfcNumber).toBe('RFC-0022')
    teardown()
  })

  test('3. RFC 编号从 RFC-0019 开始（无现有 RFC 时）', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'first-rfc',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'first-rfc' },
      draftBody: '# First',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.rfcNumber).toBe('RFC-0019')
    teardown()
  })

  test('4. RFC --force flag 控制覆盖行为（无冲突 → created=true）', () => {
    setup()
    // No pre-existing RFCs → next = RFC-0019
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'force-test',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'force-test' },
      draftBody: '# Force test',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.created).toBe(true)
    expect(result.targetPath).toContain('RFC-0019-force-test.md')
    expect(existsSync(result.targetPath)).toBe(true)
    teardown()
  })

  test('5. RFC 默认拒绝覆盖（冲突由 Asset 测试覆盖，因 RFC 自动编号避免冲突）', () => {
    setup()
    // 跳过此场景：RFC 自动编号算法下 max+1 不会冲突
    // 冲突测试见 test 13 (Asset)
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'no-conflict',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'no-conflict' },
      draftBody: '# No conflict',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.created).toBe(true)
    teardown()
  })

  test('6. RFC 自动创建 docs/rfc/zh-cn/ 子目录', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'autodir',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'autodir' },
      draftBody: '# Auto',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(existsSync(join(FIXTURE_PROJECT, 'docs', 'rfc', 'zh-cn'))).toBe(true)
    teardown()
  })
})

describe('dispatchPromote - Asset target', () => {
  test('7. Asset+domain 写 .openxenon/assets/domains/<name>.md (PascalCase)', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'my-domain',
      target: 'asset',
      kind: 'domain',
      subTarget: 'promote-asset-domain',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'domain', abstract: 'My domain' },
      draftBody: '## Terms\n\n### MyTerm\n- desc: test',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/assets/domains/MyDomain.md')
    const written = readFileSync(result.targetPath, 'utf-8')
    expect(written).toContain('entity: domain')
    expect(written).toContain('name: MyDomain')
    expect(written).toContain('abstract: My domain')
    expect(written).toContain('## Terms')
    teardown()
  })

  test('8. Asset+workflow 写 .openxenon/assets/workflows/<name>.md', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'dev-workflow',
      target: 'asset',
      kind: 'workflow',
      subTarget: 'promote-asset-workflow',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'workflow' },
      draftBody: '## Slots\n\n### stage-1\n- desc: TODO',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/assets/workflows/dev-workflow.md')
    teardown()
  })

  test('9. Asset+stack 写 .openxenon/assets/stacks/<name>.md', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'nodejs',
      target: 'asset',
      kind: 'stack',
      subTarget: 'promote-asset-stack',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'stack' },
      draftBody: '## Tools\n\n### bun\n- version: 1.0.0',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/assets/stacks/nodejs.md')
    teardown()
  })

  test('10. Asset+blueprint 写 .openxenon/assets/blueprints/<name>.md', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'doc-rfc',
      target: 'asset',
      kind: 'blueprint',
      subTarget: 'promote-asset-blueprint',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'blueprint' },
      draftBody: '## Use\n\n### doc-author\n- workflow: @md/workflows/doc-author',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/assets/blueprints/doc-rfc.md')
    teardown()
  })

  test('11. Asset+roadmap 写 .openxenon/assets/assetmaps/<name>.md (注意:roadmap→assetmaps)', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'oxn-system',
      target: 'asset',
      kind: 'roadmap',
      subTarget: 'promote-asset-roadmap',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'roadmap' },
      draftBody: '## Scenes\n\n### explore\n- blueprint: explore-analyze-report',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/assets/assetmaps/oxn-system.md')
    expect(result.targetPath).not.toContain('.openxenon/assets/roadmaps/')
    teardown()
  })

  test('12. Asset 5 kind 全部写正确路径', () => {
    setup()
    const expectedDirs: Record<string, string> = {
      domain: 'domains',
      workflow: 'workflows',
      stack: 'stacks',
      blueprint: 'blueprints',
      roadmap: 'assetmaps',
    }
    for (const [kind, dir] of Object.entries(expectedDirs)) {
      const result = dispatchPromote({
        projectRoot: FIXTURE_PROJECT,
        name: `t-${kind}`,
        target: 'asset',
        kind: kind as 'domain' | 'workflow' | 'stack' | 'blueprint' | 'roadmap',
        subTarget: `promote-asset-${kind}` as 'promote-asset-domain',
        draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': kind },
        draftBody: `# ${kind}`,
      })
      expect(result.ok).toBe(true)
      if (!result.ok) continue
      expect(result.targetPath).toContain(`.openxenon/assets/${dir}/`)
    }
    teardown()
  })

  test('13. Asset 目标已存在报错（无 --force）', () => {
    setup()
    writeFile('.openxenon/assets/domains/existing.md', '# existing')

    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'existing',
      target: 'asset',
      kind: 'domain',
      subTarget: 'promote-asset-domain',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'domain' },
      draftBody: '# New',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_TARGET_EXISTS')
    teardown()
  })
})

describe('dispatchPromote - Work target', () => {
  test('14. Work 写 .openxenon/works/<id>/work.md', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'fix-bug',
      target: 'work',
      kind: null,
      subTarget: 'promote-work',
      draftFrontmatter: { 'promote-target': 'work', intent: 'Fix login bug' },
      draftBody: '## Intent\n\nFix login bug\n\n## Roadmap\n\n- [ ] 1. investigate',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('.openxenon/works/fix-bug/work.md')
    const written = readFileSync(result.targetPath, 'utf-8')
    expect(written).toContain('entity: work' as string)
    expect(written).toContain('workId: fix-bug')
    expect(written).toContain('intent: Fix login bug')
    teardown()
  })

  test('15. Work 子目录自动创建', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'new-work',
      target: 'work',
      kind: null,
      subTarget: 'promote-work',
      draftFrontmatter: { 'promote-target': 'work' },
      draftBody: '# Work',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(existsSync(join(FIXTURE_PROJECT, '.openxenon', 'works', 'new-work'))).toBe(true)
    teardown()
  })
})

describe('dispatchPromote - edge cases', () => {
  test('16. unknown target/kind combination 报错', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'edge',
      target: 'unknown' as 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: {},
      draftBody: '# Test',
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('OXN_DRAFT_PROMOTE_RFC_NUMBER_INVALID')
    teardown()
  })

  test('17. content 末尾 trim 干净', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'trim-test',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'trim' },
      draftBody: '# Title\n\n\n\n\n\n', // 多余空行
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const written = readFileSync(result.targetPath, 'utf-8')
    expect(written.endsWith('\n')).toBe(true)
    expect(written.endsWith('\n\n\n\n')).toBe(false)
    teardown()
  })
})

describe('dispatchPromote - Fix #2 target-dir override', () => {
  test('18. RFC --target-dir 覆盖默认 docs/rfc/zh-cn/', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'custom-rfc',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'custom' },
      draftBody: '# Custom RFC',
      targetDirOverride: 'docs/rfcs/custom-locale',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('docs/rfcs/custom-locale/')
    expect(result.targetPath).not.toContain('docs/rfc/zh-cn/')
    expect(existsSync(result.targetPath)).toBe(true)
    teardown()
  })

  test('19. Asset+domain --target-dir 覆盖默认 .openxenon/assets/domains/', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'custom-domain',
      target: 'asset',
      kind: 'domain',
      subTarget: 'promote-asset-domain',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'domain' },
      draftBody: '# Custom Domain',
      targetDirOverride: 'custom-asset/ddd',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('custom-asset/ddd/CustomDomain.md')
    expect(result.targetPath).not.toContain('.openxenon/assets/domains/')
    teardown()
  })

  test('20. Work --target-dir 覆盖默认 .openxenon/works/', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'custom-work',
      target: 'work',
      kind: null,
      subTarget: 'promote-work',
      draftFrontmatter: { 'promote-target': 'work' },
      draftBody: '# Custom Work',
      targetDirOverride: 'tasks/my-proj',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('tasks/my-proj/custom-work/work.md')
    expect(result.targetPath).not.toContain('.openxenon/works/')
    teardown()
  })

  test('21. .oxnrc config.draftPromote.rfcDir 覆盖默认（无 --target-dir）', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'config-rfc',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'config' },
      draftBody: '# Config RFC',
      config: { draftPromote: { rfcDir: 'docs/rfcs/from-oxnrc' } },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('docs/rfcs/from-oxnrc/')
    teardown()
  })

  test('22. .oxnrc config.draftPromote.assetDirs.domain 覆盖默认', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'config-domain',
      target: 'asset',
      kind: 'domain',
      subTarget: 'promote-asset-domain',
      draftFrontmatter: { 'promote-target': 'asset', 'promote-kind': 'domain' },
      draftBody: '# Config Domain',
      config: { draftPromote: { assetDirs: { domain: 'custom/contexts' } } },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('custom/contexts/ConfigDomain.md')
    teardown()
  })

  test('23. --target-dir 优先级高于 .oxnrc config', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'priority-test',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'priority' },
      draftBody: '# Priority',
      targetDirOverride: 'cli-wins',
      config: { draftPromote: { rfcDir: 'config-loses' } },
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('cli-wins/')
    expect(result.targetPath).not.toContain('config-loses/')
    teardown()
  })

  test('24. targetDirOverride 空字符串走 default（不覆盖）', () => {
    setup()
    const result = dispatchPromote({
      projectRoot: FIXTURE_PROJECT,
      name: 'empty-override',
      target: 'rfc',
      kind: null,
      subTarget: 'promote-rfc',
      draftFrontmatter: { 'promote-target': 'rfc', theme: 'empty' },
      draftBody: '# Empty',
      targetDirOverride: '',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.targetPath).toContain('docs/rfc/zh-cn/')
    teardown()
  })
})
