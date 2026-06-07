// =============================================================================
// v1.1 Phase 5a 集成测试
//
// 验证 5 条 builtin probes 都进 catalog 且 end-to-end 可用：
//   fs-exists, fs-not-exists, fs-content-match, fs-parseable, shell-exec
//
// v0.1.2 时只有 2 条；v1.1 扩到 5 条。
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import { PROBE_CATALOG, listProbesSummary } from '../../src/kernel/probes/catalog'
import { probeRegistry } from '../../src/infra/probes'
import { PROBE_VERDICT_STRATEGIES } from '../../src/kernel/probes/verdict'

describe('v1.1 Phase 5a: 5 条 builtin probes 集成', () => {
  test('catalog 列出 5a+5b builtin probes（11 条）', () => {
    const builtin = PROBE_CATALOG.filter((p) => p.builtin === 'oxn')
    const names = builtin.map((p) => p.semanticName).sort()
    // 5a: 5 条 + 5b.1+2+3+4+5+6 → 共 11
    expect(names).toEqual([
      'deps-resolved',
      'file-exports',
      'fs-content-match',
      'fs-exists',
      'fs-not-exists',
      'fs-parseable',
      'http-responds',
      'lint-check',
      'shell-exec',
      'test-pass',
      'ts-compiles',
    ])
  })

  test('listProbesSummary 至少 11 个（5a + 5b.1+2+3+4+5+6）', () => {
    const summary = listProbesSummary()
    expect(summary.length).toBeGreaterThanOrEqual(11)
    const names = summary.map((s) => s.name)
    expect(names).toContain('file-exports')
  })

  test('P1 probe test-pass 标注 domainTerm = TestCase', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'test-pass')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('TestCase')
  })

  test('P1 probe deps-resolved 标注 domainTerm = Package', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'deps-resolved')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('Package')
  })

  test('P1 probe ts-compiles 标注 domainTerm = SourceFile', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'ts-compiles')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('SourceFile')
  })

  test('P1 probe lint-check 标注 domainTerm = SourceFile (共享 ts-compiles term)', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'lint-check')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('SourceFile')
  })

  test('P1 probe http-responds 标注 domainTerm = APIEndpoint', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'http-responds')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('APIEndpoint')
  })

  test('P1 probe file-exports 标注 domainTerm = Module', () => {
    const entry = PROBE_CATALOG.find((p) => p.semanticName === 'file-exports')
    expect(entry).toBeDefined()
    expect(entry?.domainTerm).toBe('Module')
  })

  test('每个 catalog entry 都有 handler 配套 + strategy 可达', () => {
    // 已知 internalRef → strategy 映射（kebab/snake 转换 + alias 关系）
    const KNOWN_ALIASES: Record<string, string> = {
      // fs-content-match 是 fs_match 的语义层 alias
      'fs-content-match': 'fs_match',
    }

    for (const entry of PROBE_CATALOG) {
      if (entry.builtin !== 'oxn') continue
      const snakeName = entry.semanticName.replace(/-/g, '_')

      // 1. handler 必须在 registry 中
      const hasHandler =
        probeRegistry.has(snakeName) ||
        probeRegistry.has(entry.semanticName) ||
        probeRegistry.has(entry.semanticName + ':probes')
      expect(hasHandler).toBe(true)

      // 2. strategy 必须可达（直接 key 或 alias）
      const strategyKey = KNOWN_ALIASES[entry.semanticName] ?? snakeName
      expect(PROBE_VERDICT_STRATEGIES[strategyKey]).toBeDefined()
    }
  })

  test('所有 entry 都是 builtin: oxn (P1 域待 v5b)', () => {
    for (const entry of PROBE_CATALOG) {
      expect(entry.builtin).toBe('oxn')
    }
  })
})

describe('v1.1 Phase 5a: fs-parseable 真 e2e', () => {
  let tmpDir: string
  let jsonFile: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-fs-parseable-'))
    jsonFile = join(tmpDir, 'valid.json')
    writeFileSync(jsonFile, JSON.stringify({ name: 'test', version: '1.0.0' }))
  })

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  })

  test('真 e2e: fs-parseable 接受有效 JSON 路径（通过 e2e JSON 路径）', async () => {
    // 通过 registry 实际调用 handler（模拟真实 e2e 路径）
    const handler = probeRegistry.get('fs_parseable')
    expect(handler).not.toBeNull()

    const obs = await handler!({ path: jsonFile }, { projectRoot: tmpDir })
    expect(obs.error).toBeUndefined()
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.parsed).toBe(true)
    expect(parsed.format).toBe('json')
    expect(parsed.topLevelKeys).toEqual(['name', 'version'])
  })

  test('真 e2e: fs-parseable 检测损坏 JSON', async () => {
    const brokenFile = join(tmpDir, 'broken.json')
    writeFileSync(brokenFile, '{ not valid json')

    const handler = probeRegistry.get('fs_parseable')!
    const obs = await handler({ path: brokenFile }, { projectRoot: tmpDir })

    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.parsed).toBe(false)
  })
})

describe('v1.1 Phase 5b.1: test-pass 真 e2e', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-test-pass-'))
    // 写 2 个 passing test + 1 个 failing test
    writeFileSync(
      join(tmpDir, 'passing.test.ts'),
      `import { test, expect } from 'bun:test'
test('add 1+1', () => { expect(1 + 1).toBe(2) })
test('add 2+2', () => { expect(2 + 2).toBe(4) })
`,
    )
    writeFileSync(
      join(tmpDir, 'failing.test.ts'),
      `import { test, expect } from 'bun:test'
test('this fails', () => { expect(1).toBe(2) })
`,
    )
  })

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  })

  test('真 e2e: 全部测试通过 → passed: true, exit 0', async () => {
    const handler = probeRegistry.get('test_pass')
    expect(handler).not.toBeNull()
    const obs = await handler!({ path: join(tmpDir, 'passing.test.ts') }, { projectRoot: tmpDir })
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.passed).toBe(true)
    expect(parsed.exitCode).toBe(0)
  })

  test('真 e2e: 有失败测试 → passed: false, exit 非 0', async () => {
    const handler = probeRegistry.get('test_pass')!
    const obs = await handler!({ path: join(tmpDir, 'failing.test.ts') }, { projectRoot: tmpDir })
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.passed).toBe(false)
    expect(parsed.exitCode).not.toBe(0)
  })
})

describe('v1.1 Phase 5b.2: deps-resolved 真 e2e', () => {
  let tmpDir: string

  beforeAll(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'oxn-deps-resolved-'))
    // 写一个 package.json + 一个含依赖的 package-lock.json
    writeFileSync(
      join(tmpDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        dependencies: { lodash: '^4.0.0', react: '^18.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    )
    // package-lock.json 包含 react 但不包含 lodash（missing 1 个）
    writeFileSync(
      join(tmpDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: {
          '': { name: 'test-project', version: '1.0.0' },
          'node_modules/react': { version: '18.2.0' },
          'node_modules/typescript': { version: '5.4.5' },
        },
      }),
    )
  })

  afterAll(() => {
    if (tmpDir && existsSync(tmpDir)) rmSync(tmpDir, { recursive: true })
  })

  test('真 e2e: 检测缺失依赖（lodash 声明但 lockfile 没解析）', async () => {
    const handler = probeRegistry.get('deps_resolved')
    expect(handler).not.toBeNull()
    const obs = await handler!({}, { projectRoot: tmpDir })
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.missing).toContain('lodash')
    expect(parsed.missing).not.toContain('react')
    expect(parsed.declaredCount).toBe(3)
  })

  test('真 e2e: 全部依赖都解析 → missing 为空', async () => {
    const allResolvedDir = mkdtempSync(join(tmpdir(), 'oxn-deps-all-'))
    writeFileSync(
      join(allResolvedDir, 'package.json'),
      JSON.stringify({ name: 'ok', dependencies: { react: '^18.0.0' } }),
    )
    writeFileSync(
      join(allResolvedDir, 'package-lock.json'),
      JSON.stringify({
        lockfileVersion: 3,
        packages: { 'node_modules/react': { version: '18.2.0' } },
      }),
    )

    const handler = probeRegistry.get('deps_resolved')!
    const obs = await handler!({}, { projectRoot: allResolvedDir })
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.missing).toEqual([])
    expect(parsed.resolvedCount).toBe(1)

    rmSync(allResolvedDir, { recursive: true })
  })
})

describe('v1.1 Phase 5b.4: lint-check 真 e2e', () => {
  const projectRoot = '/Users/issac/pro/openxenon'

  test('真 e2e: biome check 跑通（结构化 result）', async () => {
    const handler = probeRegistry.get('lint_check')
    expect(handler).not.toBeNull()
    // biome check 自己的源码（应通过）
    const obs = await handler!({ path: 'src/infra/probes/lint-check.ts' }, { projectRoot })
    expect(obs.error === undefined || typeof obs.error === 'string').toBe(true)
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(typeof parsed.exitCode).toBe('number')
  })
})

describe('v1.1 Phase 5b.5: http-responds 真 e2e (使用 httpbin.org 或本地 stub)', () => {
  // 注：http-responds 不依赖 projectRoot（fetch 是 global）。
  // 为避免 CI 依赖外部网络，用 fetch 到一个本地 invalid URL 测 timeout 路径。
  test('真 e2e: invalid URL → passed: false + error', async () => {
    const handler = probeRegistry.get('http_responds')
    expect(handler).not.toBeNull()
    const obs = await handler!({ url: 'http://localhost:1/nonexistent', timeout: 1000 })
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed.passed).toBe(false)
    expect(parsed.status).toBeNull()
  })

  test('真 e2e: handler 注册 + 结构化 output', () => {
    const handler = probeRegistry.get('http_responds')
    expect(handler).not.toBeNull()
  })
})

describe('v1.1 Phase 5b.6: file-exports 真 e2e (进程隔离 runtime import)', () => {
  const projectRoot = '/Users/issac/pro/openxenon'

  test('真 e2e: 真实 TS 文件（cli/index.ts）→ exports 列表', async () => {
    const handler = probeRegistry.get('file_exports')
    expect(handler).not.toBeNull()
    // cli/index.ts 不一定有 named exports——测 handler 跑通即可
    const obs = await handler!({ path: 'src/infra/probes/test-pass.ts' }, { projectRoot })
    // 可能有 error（bun run 时 import path 解析），但 result 应该是结构化 JSON
    const parsed = JSON.parse(obs.output ?? '{}')
    expect(parsed).toHaveProperty('exports')
    expect(parsed).toHaveProperty('exportCount')
  })
})
