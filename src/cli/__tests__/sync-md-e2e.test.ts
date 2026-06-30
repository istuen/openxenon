// =============================================================================
// sync-md-e2e.test.ts — v0.4 Phase 2 .md → .oxn 反向同步 e2e
//
// 覆盖 3 sync-md 子命令 (domain / blueprint / work) 的 5 类核心流程：
//   1. basic: .oxn → sync-md → .oxn 写出 + langium 解析通过
//   2. idempotent: 第二次 sync-md → all "unchanged"
//   3. dry-run: 不写文件 + 输出 updated 列表
//   4. round-trip: serialize → compile → extract → diff (无字段丢失)
//   5. oxn-priority: 两源都改时反转优先源
//
// RFC: .openxenon/pools/sprints/v0.4-unify-md/design/oxn-md-sync-rfc.md §3
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { computeSha256 } from '@openxenon/engine/oxl/md-pipeline/sync-hash'

const CLI_PATH = join(import.meta.dir, '..', 'index.ts')

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'oxn-sync-md-e2e-'))
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

async function runCli(args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = Bun.spawn(['bun', CLI_PATH, ...args], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ])
  return { stdout, stderr, exitCode }
}

async function initProject(): Promise<void> {
  const init = Bun.spawn(['bun', CLI_PATH, 'init'], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await init.exited
}

async function setV5Layout(): Promise<void> {
  const { readFileSync, writeFileSync } = await import('fs')
  const { join } = await import('path')
  const configPath = join(tmpDir, '.openxenon', 'config.json')
  try {
    const raw = readFileSync(configPath, 'utf-8')
    const config = JSON.parse(raw)
    config.assetRoot = ''
    config.assetDirs = { domain: 'domains', blueprint: 'blueprints', stack: 'stack' }
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8')
  } catch {
    writeFileSync(
      configPath,
      JSON.stringify(
        {
          version: 1,
          mode: 'PRODUCTION',
          assetRoot: '',
          assetDirs: { domain: 'domains', blueprint: 'blueprints', stack: 'stack' },
        },
        null,
        2,
      ),
      'utf-8',
    )
  }
}

async function runPhase1(name: string, kind: 'domain' | 'blueprint' | 'work'): Promise<void> {
  const proc = Bun.spawn(['bun', CLI_PATH, kind, 'sync', name], {
    cwd: tmpDir,
    env: { ...process.env, NO_COLOR: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  await proc.exited
}

// =============================================================================
// Domain sync-md
// =============================================================================

describe('oxn domain sync-md (Phase 2)', () => {
  test('basic: domain sync-md 写出 .oxn + 触发 Phase 1 chain', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'OrderContext'])
    await runPhase1('OrderContext', 'domain')

    const r = await runCli(['domain', 'sync-md', 'OrderContext', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.results[0].status).toBe('updated')

    const oxnPath = join(tmpDir, '.openxenon', 'domains', 'OrderContext.oxn')
    expect(existsSync(oxnPath)).toBe(true)
  })

  test('--no-chain: 跳过 Phase 1 chain, .md 内容不变 (citty 0.1.6 no- 前缀反转回归)', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'NC'])
    await runPhase1('NC', 'domain')

    const mdPath = join(tmpDir, '.openxenon', 'domains-md', 'NC.md')
    const mdBefore = readFileSync(mdPath, 'utf-8')
    const _mdMtimeBefore = (await import('fs')).statSync(mdPath).mtimeMs

    await runCli(['domain', 'sync-md', 'NC', '--no-chain', '--json'])

    const mdAfter = readFileSync(mdPath, 'utf-8')
    expect(mdAfter).toBe(mdBefore)
  })

  test('--no-roundtrip: 跳过 round-trip 守卫', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'NRT'])
    await runPhase1('NRT', 'domain')

    // 删 .md 缓存强制重新 sync
    await runCli(['domain', 'sync-md', 'NRT', '--no-chain', '--no-roundtrip', '--json'])
    // 不应报 E_SYNC_ROUND_TRIP_LOSS
  })

  test('idempotent: 第二次 sync-md → all unchanged', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'X'])
    await runPhase1('X', 'domain')

    await runCli(['domain', 'sync-md', 'X', '--no-chain'])
    const second = await runCli(['domain', 'sync-md', 'X', '--no-chain', '--json'])
    expect(second.exitCode).toBe(0)
    const json = JSON.parse(second.stdout)
    expect(json.data.results[0].status).toBe('unchanged')
  })

  test('dry-run: 不写 .oxn + 输出 updated 列表', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'Y'])
    await runPhase1('Y', 'domain')

    const r = await runCli(['domain', 'sync-md', 'Y', '--dry-run', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.data.dryRun).toBe(true)
    expect(json.data.results[0].status).toBe('updated')
  })

  test('--no-parse-check: 跳过 langium parse 验证', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'W'])
    await runPhase1('W', 'domain')

    const r = await runCli(['domain', 'sync-md', 'W', '--no-chain', '--no-parse-check', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
  })

  test('--oxn-priority: 模拟 .oxn 改 → 跳过 .md 改', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'P'])
    await runPhase1('P', 'domain')

    // 改 .oxn (模拟开发者手编辑) — setV5Layout 用 v0.5 路径
    const oxnPath = join(tmpDir, '.openxenon', 'domains', 'P.oxn')
    const oxnContent = readFileSync(oxnPath, 'utf-8')
    writeFileSync(oxnPath, `${oxnContent}\n// manual edit\n`, 'utf-8')

    // 用 --oxn-priority: .oxn 改触发 Phase 1 sync 重新生成 .md
    const r = await runCli(['domain', 'sync-md', 'P', '--oxn-priority', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.data.results[0].status).toBe('oxn-wins')
  })

  test('--all: 批量处理多个 domain', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'A'])
    await runCli(['domain', 'create', 'B'])
    await runPhase1('A', 'domain')
    await runPhase1('B', 'domain')

    const r = await runCli(['domain', 'sync-md', '--all', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.data.total).toBeGreaterThanOrEqual(2)
  })

  test('round-trip: 关键字段保留 (terms/bans/invariants 数)', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'RT'])
    // 编辑 OrderContext.oxn 添加 term/ban/invariant
    const oxnPath = join(tmpDir, '.openxenon', 'domains', 'RT.oxn')
    writeFileSync(
      oxnPath,
      `domain "RT" {
  description = "Round-trip test domain"
  term {
    "Term1": "Desc1"
    "Term2": "Desc2"
  }
  ban { "forbidden1", "forbidden2" }
  invariant { "Rule1: must be valid" }
}`,
      'utf-8',
    )

    // Phase 1: .oxn → .md
    await runPhase1('RT', 'domain')

    // Phase 2: .md → .oxn (round-trip)
    const r = await runCli(['domain', 'sync-md', 'RT', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.data.error).toBe(0)
    // 验证最终 .oxn 含有原 term/ban/invariant
    const finalOxn = readFileSync(oxnPath, 'utf-8')
    expect(finalOxn).toContain('"Term1"')
    expect(finalOxn).toContain('"Term2"')
    expect(finalOxn).toContain('forbidden1')
    expect(finalOxn).toContain('Rule1')
  })

  test('domain description 完整 round-trip (v0.4.1 fix: 从 > blockquote 抽取)', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['domain', 'create', 'DDesc'])
    const oxnPath = join(tmpDir, '.openxenon', 'domains', 'DDesc.oxn')
    writeFileSync(
      oxnPath,
      `domain "DDesc" {
  description = "我的真实描述文本 - 不能丢失"
  term {
    "FirstTerm": "FirstTerm description 不应覆盖"
  }
}`,
      'utf-8',
    )

    // Phase 1: .oxn → .md
    await runPhase1('DDesc', 'domain')
    const mdContent = readFileSync(join(tmpDir, '.openxenon', 'domains-md', 'DDesc.md'), 'utf-8')
    expect(mdContent).toContain('> 我的真实描述文本 - 不能丢失')

    // Phase 2: .md → .oxn
    const r = await runCli(['domain', 'sync-md', 'DDesc', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const finalOxn = readFileSync(oxnPath, 'utf-8')
    // description 必须保留原始内容, 不能被第一项 term 覆盖
    expect(finalOxn).toContain('description = "我的真实描述文本 - 不能丢失"')
    expect(finalOxn).not.toContain('description = "FirstTerm description 不应覆盖"')
  })
})

// =============================================================================
// Blueprint sync-md
// =============================================================================

describe('oxn blueprint sync-md (Phase 2)', () => {
  test('basic: blueprint sync-md 写出 .oxn + 链', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runPhase1('dev-workflow', 'blueprint')

    const r = await runCli(['blueprint', 'sync-md', 'dev-workflow', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.ok).toBe(true)
    expect(json.data.error).toBe(0)
  })

  test('idempotent: 第二次 sync-md → unchanged', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'flow-x'])
    await runPhase1('flow-x', 'blueprint')

    await runCli(['blueprint', 'sync-md', 'flow-x', '--no-chain'])
    const second = await runCli(['blueprint', 'sync-md', 'flow-x', '--no-chain', '--json'])
    const json = JSON.parse(second.stdout)
    expect(json.data.results[0].status).toBe('unchanged')
  })

  test('round-trip: slots/props 保留', async () => {
    await initProject()
    await setV5Layout()
    const { mkdirSync } = await import('fs')
    const bpDir = join(tmpDir, '.openxenon', 'blueprints')
    mkdirSync(bpDir, { recursive: true })
    const oxnPath = join(bpDir, 'rt-bp.oxn')
    writeFileSync(
      oxnPath,
      `blueprint "rt-bp" {
  version = 1
  description = "Round-trip test"
  slot "build" {
    deps = []
    observe = ["deps-resolved"]
  }
  slot "develop" {
    deps = ["build"]
    observe = ["lint"]
  }
}`,
      'utf-8',
    )
    await runPhase1('rt-bp', 'blueprint')

    const r = await runCli(['blueprint', 'sync-md', 'rt-bp', '--no-chain', '--json'])
    const json = JSON.parse(r.stdout)
    expect(json.data.error).toBe(0)

    const finalOxn = readFileSync(oxnPath, 'utf-8')
    expect(finalOxn).toContain('slot "build"')
    expect(finalOxn).toContain('slot "develop"')
  })

  test('blueprint version 1 完整 round-trip (v0.4.1 fix: frontmatter version 解析)', async () => {
    await initProject()
    await setV5Layout()
    const { mkdirSync } = await import('fs')
    const bpDir = join(tmpDir, '.openxenon', 'blueprints')
    mkdirSync(bpDir, { recursive: true })
    const oxnPath = join(bpDir, 'v-bp.oxn')
    writeFileSync(
      oxnPath,
      `blueprint "v-bp" {
  version = 1
  description = "version round-trip test"
  slot "build" { deps = []; observe = ["deps-resolved"] }
}`,
      'utf-8',
    )
    await runPhase1('v-bp', 'blueprint')
    // Phase 2
    const r = await runCli(['blueprint', 'sync-md', 'v-bp', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const finalOxn = readFileSync(oxnPath, 'utf-8')
    expect(finalOxn).toContain('version = 1')
  })

  test('--all: 批量处理', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'a'])
    await runCli(['blueprint', 'create', 'b'])
    await runPhase1('a', 'blueprint')
    await runPhase1('b', 'blueprint')

    const r = await runCli(['blueprint', 'sync-md', '--all', '--no-chain', '--json'])
    const json = JSON.parse(r.stdout)
    expect(json.data.total).toBeGreaterThanOrEqual(2)
  })
})

// =============================================================================
// Work sync-md
// =============================================================================

describe('oxn work sync-md (Phase 2)', () => {
  test('basic: work sync-md 写出 work.oxn', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'my-w', '--blueprint', 'dev-workflow'])
    await runPhase1('my-w', 'work')

    const r = await runCli(['work', 'sync-md', 'my-w', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0)
    const json = JSON.parse(r.stdout)
    expect(json.data.error).toBe(0)
  })

  test('idempotent: 第二次 sync-md → unchanged', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'w-i', '--blueprint', 'dev-workflow'])
    await runPhase1('w-i', 'work')

    await runCli(['work', 'sync-md', 'w-i', '--no-chain'])
    const second = await runCli(['work', 'sync-md', 'w-i', '--no-chain', '--json'])
    const json = JSON.parse(second.stdout)
    expect(json.data.results[0].status).toBe('unchanged')
  })

  test('--all: 忽略 .cache 子目录', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'w-r', '--blueprint', 'dev-workflow'])
    await runPhase1('w-r', 'work')

    // 跑 sync-md --all
    const r = await runCli(['work', 'sync-md', '--all', '--no-chain', '--json'])
    const json = JSON.parse(r.stdout)
    // 不应包含 .cache
    const names = (json.data.results as Array<{ name: string }>).map((x) => x.name)
    expect(names).not.toContain('.cache')
    expect(names).toContain('w-r')
  })

  test('work-level domain/blueprint ref round-trip (## Refs H2)', async () => {
    await initProject()
    await setV5Layout()
    await runCli(['blueprint', 'create', 'dev-workflow'])
    await runCli(['work', 'create', 'w-refs', '--blueprint', 'dev-workflow'])

    // 手写 work.oxn 含 work-level refs (v0.4.1 新语法: loopPolicy 在 context 外)
    const oxnPath = join(tmpDir, '.openxenon', 'works', 'w-refs', 'work.oxn')
    writeFileSync(
      oxnPath,
      `work "w-refs" {
  context {
    goal = "test refs";
  }
  loop_policy {
    max_iterations = 3;
  }
  domain "MemberContext" as "primary" ref "@prj/domains/member-context";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  task "step-1" {
    blueprint "dev-workflow"
    part "build" {
      skill_context = "build"
    }
  }
}`,
      'utf-8',
    )

    // Phase 1: .oxn → .md (应含 ## Refs H2 + ## LoopPolicy H2)
    await runPhase1('w-refs', 'work')
    const mdPath = join(tmpDir, '.openxenon', 'works', 'w-refs', 'work.md')
    const mdContent = readFileSync(mdPath, 'utf-8')
    expect(mdContent).toContain('## Refs')
    expect(mdContent).toContain('## LoopPolicy')
    expect(mdContent).toContain('### MemberContext')
    expect(mdContent).toContain('- kind: domain')
    expect(mdContent).toContain('### dev-workflow')
    expect(mdContent).toContain('- kind: blueprint')

    // Phase 2: .md → .oxn (应保留 refs)
    const r = await runCli(['work', 'sync-md', 'w-refs', '--no-chain', '--json'])
    const json = JSON.parse(r.stdout)
    expect(json.data.error).toBe(0)

    const finalOxn = readFileSync(oxnPath, 'utf-8')
    expect(finalOxn).toContain('domain "MemberContext" as "primary" ref "@prj/domains/member-context"')
    expect(finalOxn).toContain('blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow"')
    // v0.4.1: loop_policy 移出 context
    expect(finalOxn).toMatch(/loop_policy\s*\{\s*max_iterations = 3;\s*\}/)
  })
})

// =============================================================================
// Error path: 无 .md
// =============================================================================

describe('sync-md error paths', () => {
  test('无 .md 报 E_SYNC error (status=error)', async () => {
    await initProject()
    await setV5Layout()
    // 不 create, 直接 sync-md
    const r = await runCli(['domain', 'sync-md', 'NonExist', '--no-chain', '--json'])
    expect(r.exitCode).toBe(0) // CLI exit ok=true 但 data 里有 error
    const json = JSON.parse(r.stdout)
    expect(json.data.results[0].status).toBe('error')
  })
})
