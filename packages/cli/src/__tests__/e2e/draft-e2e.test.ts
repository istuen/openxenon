/**
 * `oxn draft` CLI E2E 测试 (v0.6.2 → v0.6.3 patch)
 *
 * 黑盒：跑 `bun <cliPath> draft <subcommand> ...`，断言 exit code + JSON 输出。
 * 覆盖：
 *   - v0.6.2: create / list / archive / discard
 *   - v0.6.2-alpha.3: create --target / promote / retarget
 *   - v0.6.3 NG6: promote --commit (实际写文件)
 *   - v0.6.3 patch: Fix #1 (init skeleton) / Fix #2 (--target-dir / .oxnrc draftPromote)
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { setupCliEnv, type CliEnv } from '../helpers/run-cli'

const CLI_PATH = join(import.meta.dir, '..', '..', 'index.ts')

let env: CliEnv

beforeEach(() => {
  env = setupCliEnv(CLI_PATH)
})

afterEach(() => {
  env.cleanup()
})

// ───────── create (v0.6.2) ─────────

describe('oxn draft create', () => {
  test('空白 name → 写空白文件 + exit 0', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'my-design', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.name).toBe('my-design')
    expect(body.data.prefix).toBe(null)
    expect(body.data.filename).toBe('my-design.md')
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'my-design.md')
    expect(existsSync(fp)).toBe(true)
  })

  test('--prefix design → 文件名 design-<name>.md', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'grilling', '--prefix', 'design', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.prefix).toBe('design')
    expect(body.data.filename).toBe('design-grilling.md')
  })

  test('--prefix 非法值 → exit 1 + OXN_DRAFT_INVALID_PREFIX', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo', '--prefix', 'invalid', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_INVALID_PREFIX')
  })

  test('name 含斜杠 → exit 1 + OXN_DRAFT_INVALID_NAME', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo/bar', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_INVALID_NAME')
  })

  test('已存在同名 → exit 1 + OXN_DRAFT_ALREADY_EXISTS', async () => {
    await env.initProject()
    const r1 = await env.runCli(['draft', 'create', 'dup', '--json'])
    expect(r1.exitCode).toBe(0)
    const r2 = await env.runCli(['draft', 'create', 'dup', '--json'])
    expect(r2.exitCode).toBe(1)
    const body = JSON.parse(r2.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_ALREADY_EXISTS')
  })

  // ── v0.6.2-alpha.3 skeleton mode ──

  test('--target rfc → 派生 skeleton + frontmatter (Fix #1)', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'rfc-x', '--target', 'rfc', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.filename).toBe('rfc-x.md')
    const content = readFileSync(join(env.tmpDir, '.openxenon', 'drafts', 'rfc-x.md'), 'utf-8')
    expect(content).toContain('entity: rfc')
    expect(content).toContain('id: RFC-XXXX')
    expect(content).toContain('promote-target: rfc')
    expect(content).toContain('created-from: asset-create@3.0.0-mode-skeleton')
    expect(content).toContain('## 决策要点')
  })

  test('--target asset --kind domain → Domain skeleton', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'my-domain', '--target', 'asset', '--kind', 'domain', '--json'])
    expect(r.exitCode).toBe(0)
    const content = readFileSync(join(env.tmpDir, '.openxenon', 'drafts', 'my-domain.md'), 'utf-8')
    expect(content).toContain('entity: domain')
    expect(content).toContain('promote-target: asset')
    expect(content).toContain('promote-kind: domain')
    expect(content).toContain('## Terms')
  })

  test('--target asset 缺 --kind → exit 1 + OXN_DRAFT_KIND_REQUIRED', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo', '--target', 'asset', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_KIND_REQUIRED')
  })

  test('--target 非法值 → exit 1 + OXN_DRAFT_TARGET_INVALID', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo', '--target', 'invalid', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_TARGET_INVALID')
  })

  test('--kind 非法值 → exit 1 + OXN_DRAFT_KIND_INVALID', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'foo', '--target', 'asset', '--kind', 'invalid-kind', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_KIND_INVALID')
  })

  test('--target work → Work skeleton (entity=work)', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'create', 'my-work', '--target', 'work', '--json'])
    expect(r.exitCode).toBe(0)
    const content = readFileSync(join(env.tmpDir, '.openxenon', 'drafts', 'my-work.md'), 'utf-8')
    expect(content).toContain('workId:')
    expect(content).toContain('promote-target: work')
  })
})

// ───────── list (v0.6.2) ─────────

describe('oxn draft list', () => {
  test('空 drafts 目录 → 0 个', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'list', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.ok).toBe(true)
    expect(body.data.count).toBe(0)
  })

  test('创建 3 个后 list → 3 个，按 mtime 降序', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'a', '--json'])
    await new Promise((r) => setTimeout(r, 5))
    await env.runCli(['draft', 'create', 'b', '--prefix', 'report', '--json'])
    await new Promise((r) => setTimeout(r, 5))
    await env.runCli(['draft', 'create', 'c', '--prefix', 'design', '--json'])

    const r = await env.runCli(['draft', 'list', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.count).toBe(3)
    expect(body.data.drafts[0].name).toBe('design-c')
    expect(body.data.drafts[1].name).toBe('report-b')
    expect(body.data.drafts[2].name).toBe('a')
  })

  test('--include-archived 同时显示归档', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'active', '--json'])
    await env.runCli(['draft', 'create', 'to-archive', '--json'])
    await env.runCli(['draft', 'archive', 'to-archive', '--json'])

    const r1 = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r1.stdout).data.count).toBe(1)

    const r2 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    const body = JSON.parse(r2.stdout)
    expect(body.data.count).toBe(2)
    const archived = body.data.drafts.find((d: { archived: boolean }) => d.archived)
    expect(archived.name).toBe('to-archive')
  })
})

// ───────── archive (v0.6.2) ─────────

describe('oxn draft archive', () => {
  test('存在文件 → 移到 .archived/ + exit 0', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'archive-me', '--json'])
    const r = await env.runCli(['draft', 'archive', 'archive-me', '--json'])
    expect(r.exitCode).toBe(0)
    const archivedPath = join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'archive-me.md')
    expect(existsSync(archivedPath)).toBe(true)
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'archive-me.md'))).toBe(false)
  })

  test('不存在 → exit 1 + OXN_DRAFT_NOT_FOUND', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'archive', 'ghost', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_NOT_FOUND')
  })
})

// ───────── discard (v0.6.2) ─────────

describe('oxn draft discard', () => {
  test('无 --force → exit 1 + OXN_DRAFT_DISCARD_FORCE_REQUIRED', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'safe', '--json'])
    const r = await env.runCli(['draft', 'discard', 'safe', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_DISCARD_FORCE_REQUIRED')
    // 文件仍在
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'safe.md'))).toBe(true)
  })

  test('--force + 存在 → 删除 + exit 0', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'trash', '--json'])
    const r = await env.runCli(['draft', 'discard', 'trash', '--force', '--json'])
    expect(r.exitCode).toBe(0)
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'trash.md'))).toBe(false)
  })

  test('--force + 不存在 → exit 1 + OXN_DRAFT_NOT_FOUND', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'discard', 'ghost', '--force', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_NOT_FOUND')
  })

  test('--force + archived 文件也能删', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'inactive', '--json'])
    await env.runCli(['draft', 'archive', 'inactive', '--json'])
    const r = await env.runCli(['draft', 'discard', 'inactive', '--force', '--json'])
    expect(r.exitCode).toBe(0)
    const archivedPath = join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'inactive.md')
    expect(existsSync(archivedPath)).toBe(false)
  })
})

// ───────── promote (v0.6.2-alpha.3, dispatch-info 默认) ─────────

describe('oxn draft promote (dispatch-info)', () => {
  test('默认无 --commit → 返回 dispatch info，不写文件', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'p-rfc', '--target', 'rfc', '--json'])
    // 不编辑 body，直接 promote
    const r = await env.runCli(['draft', 'promote', 'p-rfc', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.target).toBe('rfc')
    expect(body.data.subTarget).toBe('promote-rfc')
    expect(body.data.phases.commit).toBeUndefined() // 默认不写
    expect(existsSync(join(env.tmpDir, 'docs', 'rfc', 'zh-cn'))).toBe(false)
  })

  test('空白 draft (无 frontmatter) → exit 1 + OXN_DRAFT_FRONTMATTER_INVALID', async () => {
    await env.initProject()
    // 空白 draft → 无 frontmatter
    await env.runCli(['draft', 'create', 'no-target', '--json'])
    const r = await env.runCli(['draft', 'promote', 'no-target', '--json'])
    expect(r.exitCode).toBe(1)
    const err = JSON.parse(r.stdout)
    expect(err.error.code).toBe('OXN_DRAFT_FRONTMATTER_INVALID')
  })

  test('有 frontmatter 但缺 promote-target → exit 1 + OXN_DRAFT_PROMOTE_TARGET_MISSING', async () => {
    await env.initProject()
    // 空白 draft + 手动加 frontmatter 但不写 promote-target
    await env.runCli(['draft', 'create', 'no-promo', '--json'])
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'no-promo.md')
    writeFileSync(fp, '---\nfoo: bar\n---\n# Body\n', 'utf-8')
    const r = await env.runCli(['draft', 'promote', 'no-promo', '--json'])
    expect(r.exitCode).toBe(1)
    const err = JSON.parse(r.stdout)
    expect(err.error.code).toBe('OXN_DRAFT_PROMOTE_TARGET_MISSING')
  })

  test('Draft 不存在 → exit 1 + OXN_DRAFT_NOT_FOUND', async () => {
    await env.initProject()
    const r = await env.runCli(['draft', 'promote', 'ghost', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_NOT_FOUND')
  })
})

// ───────── promote --commit (v0.6.3 NG6 实际写文件) ─────────

describe('oxn draft promote --commit (NG6)', () => {
  test('RFC --commit → 实际写 docs/rfc/zh-cn/RFC-XXXX-*.md', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'commit-rfc', '--target', 'rfc', '--json'])
    const r = await env.runCli(['draft', 'promote', 'commit-rfc', '--commit', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit).toBeDefined()
    expect(body.data.phases.commit.created).toBe(true)
    expect(body.data.rfcNumber).toMatch(/^RFC-\d{4}$/)
    expect(body.data.phases.commit.filePath).toContain('docs/rfc/zh-cn/')
    expect(existsSync(body.data.phases.commit.filePath)).toBe(true)
  })

  test('Asset+domain --commit → 写 .openxenon/assets/domains/<PascalCase>.md', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'commit-domain', '--target', 'asset', '--kind', 'domain', '--json'])
    const r = await env.runCli(['draft', 'promote', 'commit-domain', '--commit', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.filePath).toContain('.openxenon/assets/domains/CommitDomain.md')
    expect(body.data.phases.commit.created).toBe(true)
    expect(existsSync(body.data.phases.commit.filePath)).toBe(true)
  })

  test('Asset+assetmap --commit → 写 .openxenon/assets/assetmaps/<kebab>.md', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'commit-assetmap', '--target', 'asset', '--kind', 'assetmap', '--json']) // 🆕 v0.6.4: 'roadmap' → 'assetmap'
    const r = await env.runCli(['draft', 'promote', 'commit-assetmap', '--commit', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.filePath).toContain('.openxenon/assets/assetmaps/commit-assetmap.md')
    expect(existsSync(body.data.phases.commit.filePath)).toBe(true)
  })

  test('Work --commit → 写 .openxenon/works/<id>/work.md + 自动创建子目录', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'commit-work', '--target', 'work', '--json'])
    const r = await env.runCli(['draft', 'promote', 'commit-work', '--commit', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.filePath).toContain('.openxenon/works/commit-work/work.md')
    expect(existsSync(join(env.tmpDir, '.openxenon', 'works', 'commit-work'))).toBe(true)
    expect(existsSync(body.data.phases.commit.filePath)).toBe(true)
  })

  test('--commit + 目标已存在 → exit 1 + OXN_DRAFT_PROMOTE_TARGET_EXISTS (Asset 路径确定场景)', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'conflict-test', '--target', 'asset', '--kind', 'domain', '--json'])
    // 第一次写文件
    const r1 = await env.runCli(['draft', 'promote', 'conflict-test', '--commit', '--json'])
    expect(r1.exitCode).toBe(0)
    // 重新创建同名 draft (绕过冲突检测的唯一方式: 复用同一文件)
    // 实际测试：第二次 commit 同名 → 冲突
    const r2 = await env.runCli(['draft', 'promote', 'conflict-test', '--commit', '--json'])
    expect(r2.exitCode).toBe(1)
    const body = JSON.parse(r2.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_PROMOTE_TARGET_EXISTS')
  })

  test('--commit + --force → 覆盖现有目标文件 (created=false)', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'force-test', '--target', 'asset', '--kind', 'domain', '--json'])
    // 第一次
    await env.runCli(['draft', 'promote', 'force-test', '--commit', '--json'])
    // 第二次带 --force
    const r = await env.runCli(['draft', 'promote', 'force-test', '--commit', '--force', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.created).toBe(false) // overwritten
  })

  test('--commit + --target-dir → 写到自定义目录 (Fix #2)', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'custom-rfc', '--target', 'rfc', '--json'])
    const r = await env.runCli(['draft', 'promote', 'custom-rfc', '--commit', '--target-dir', 'custom/rfcs', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.filePath).toContain('custom/rfcs/')
    expect(body.data.phases.commit.filePath).not.toContain('docs/rfc/zh-cn/')
    expect(existsSync(body.data.phases.commit.filePath)).toBe(true)
  })

  test('.oxnrc draftPromote.rfcDir → 无 --target-dir 时走 .oxnrc 配置 (Fix #2)', async () => {
    await env.initProject()
    // 写入 .oxnrc
    writeFileSync(
      join(env.tmpDir, '.oxnrc'),
      JSON.stringify(
        {
          version: 1,
          draftPromote: { rfcDir: 'from-oxnrc-rfcs' },
        },
        null,
        2,
      ),
      'utf-8',
    )
    await env.runCli(['draft', 'create', 'oxnrc-rfc', '--target', 'rfc', '--json'])
    const r = await env.runCli(['draft', 'promote', 'oxnrc-rfc', '--commit', '--json'])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.phases.commit.filePath).toContain('from-oxnrc-rfcs/')
    expect(body.data.phases.commit.filePath).not.toContain('docs/rfc/zh-cn/')
  })
})

// ───────── retarget (v0.6.2-alpha.3) ─────────

describe('oxn draft retarget', () => {
  test('改 target → frontmatter 中 promote-target 变化', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 're-target', '--target', 'rfc', '--json'])
    const r = await env.runCli([
      'draft',
      'retarget',
      're-target',
      '--new-target',
      'asset',
      '--new-kind',
      'domain',
      '--json',
    ])
    expect(r.exitCode).toBe(0)
    const body = JSON.parse(r.stdout)
    expect(body.data.oldTarget).toBe('rfc')
    expect(body.data.newTarget).toBe('asset')
    expect(body.data.newKind).toBe('domain')
    // 验证 frontmatter 已改
    const content = readFileSync(join(env.tmpDir, '.openxenon', 'drafts', 're-target.md'), 'utf-8')
    expect(content).toContain('promote-target: asset')
    expect(content).toContain('promote-kind: domain')
    expect(content).not.toContain('promote-target: rfc\ncreated-from')
  })

  test('缺 --new-target → exit 1', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'rt', '--target', 'rfc', '--json'])
    const r = await env.runCli(['draft', 'retarget', 'rt', '--json'])
    expect(r.exitCode).toBe(1)
  })

  test('asset target 缺 --new-kind → exit 1 + OXN_DRAFT_KIND_REQUIRED', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'rt2', '--target', 'rfc', '--json'])
    const r = await env.runCli(['draft', 'retarget', 'rt2', '--new-target', 'asset', '--json'])
    expect(r.exitCode).toBe(1)
    const body = JSON.parse(r.stdout)
    expect(body.error.code).toBe('OXN_DRAFT_KIND_REQUIRED')
  })

  test('保留工程师 frontmatter (Fix #3 验证)', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'preserve-test', '--target', 'rfc', '--json'])
    // 编辑 frontmatter: 添加自定义字段
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'preserve-test.md')
    let content = readFileSync(fp, 'utf-8')
    content = content.replace('theme: TODO_<theme>', 'theme: my-theme\ndescription: 这是测试描述')
    writeFileSync(fp, content, 'utf-8')
    // retarget → asset+domain
    await env.runCli(['draft', 'retarget', 'preserve-test', '--new-target', 'asset', '--new-kind', 'domain', '--json'])
    // 验证保留字段
    const after = readFileSync(fp, 'utf-8')
    expect(after).toContain('theme: my-theme')
    expect(after).toContain('description: 这是测试描述')
  })
})

// ───────── 完整生命周期（含 promote + retarget）────────

describe('oxn draft 完整生命周期', () => {
  test('v0.6.2: create → list → archive → discard', async () => {
    await env.initProject()
    await env.runCli(['draft', 'create', 'lifecycle', '--json'])
    await env.runCli(['draft', 'create', 'aux', '--prefix', 'report', '--json'])

    const r1 = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r1.stdout).data.count).toBe(2)

    await env.runCli(['draft', 'archive', 'lifecycle', '--json'])
    const r2 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    expect(JSON.parse(r2.stdout).data.count).toBe(2)
    const r2NoArch = await env.runCli(['draft', 'list', '--json'])
    expect(JSON.parse(r2NoArch.stdout).data.count).toBe(1)

    await env.runCli(['draft', 'discard', 'lifecycle', '--force', '--json'])
    await env.runCli(['draft', 'discard', 'aux', '--force', '--json'])
    const r3 = await env.runCli(['draft', 'list', '--include-archived', '--json'])
    expect(JSON.parse(r3.stdout).data.count).toBe(0)
  })

  test('v0.6.3: create --target → promote --commit → archive → discard', async () => {
    await env.initProject()
    // 1. 创建 RFC skeleton
    await env.runCli(['draft', 'create', 'full-flow', '--target', 'rfc', '--json'])
    // 2. 编辑 body (promote 校验只检查 frontmatter，不要求完整 body)
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'full-flow.md')
    let content = readFileSync(fp, 'utf-8')
    content = content.replace('theme: TODO_<theme>', 'theme: full-flow-test')
    writeFileSync(fp, content, 'utf-8')
    // 3. Promote --commit (实际写文件)
    const promoteRes = await env.runCli(['draft', 'promote', 'full-flow', '--commit', '--json'])
    expect(promoteRes.exitCode).toBe(0)
    const promotedPath = JSON.parse(promoteRes.stdout).data.phases.commit.filePath
    expect(existsSync(promotedPath)).toBe(true)
    // 4. 验证 source Draft 不变
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'full-flow.md'))).toBe(true)
    // 5. Archive
    await env.runCli(['draft', 'archive', 'full-flow', '--json'])
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', 'full-flow.md'))).toBe(false)
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'full-flow.md'))).toBe(true)
    // 6. Discard
    await env.runCli(['draft', 'discard', 'full-flow', '--force', '--json'])
    expect(existsSync(join(env.tmpDir, '.openxenon', 'drafts', '.archived', 'full-flow.md'))).toBe(false)
  })

  test('v0.6.3 patch: create --target → retarget → promote --commit 到新 target', async () => {
    await env.initProject()
    // 1. 创建 RFC draft
    await env.runCli(['draft', 'create', 'cross-target', '--target', 'rfc', '--json'])
    // 2. 编辑 body
    const fp = join(env.tmpDir, '.openxenon', 'drafts', 'cross-target.md')
    let content = readFileSync(fp, 'utf-8')
    content = content.replace('theme: TODO_<theme>', 'theme: cross-test')
    writeFileSync(fp, content, 'utf-8')
    // 3. retarget rfc → asset+domain
    const retargetRes = await env.runCli([
      'draft',
      'retarget',
      'cross-target',
      '--new-target',
      'asset',
      '--new-kind',
      'domain',
      '--json',
    ])
    expect(retargetRes.exitCode).toBe(0)
    // 4. promote --commit → 落盘到 .openxenon/assets/domains/
    const promoteRes = await env.runCli(['draft', 'promote', 'cross-target', '--commit', '--json'])
    expect(promoteRes.exitCode).toBe(0)
    const promotedPath = JSON.parse(promoteRes.stdout).data.phases.commit.filePath
    expect(promotedPath).toContain('.openxenon/assets/domains/')
    expect(existsSync(promotedPath)).toBe(true)
  })
})
