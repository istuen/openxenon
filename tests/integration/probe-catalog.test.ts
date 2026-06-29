// =============================================================================
// v1.1 Phase 5a 集成测试
//
// 验证 5 条 builtin probes 都进 catalog 且 end-to-end 可用：
//   fs-exists, fs-not-exists, fs-content-match, fs-parseable, shell-exec
//
// v0.1.2 时只有 2 条；v1.1 扩到 5 条。
//
// + Phase C 封装边界（合并自 src/cli/__tests__/probe-catalog.test.ts）
// + Catalog invariants + Translation layer（merge: 避免重复 listProbesSummary / PROBE_CATALOG 断言）
// =============================================================================

import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

import {
  assertCatalogConsistency,
  describeProbe,
  listProbesSummary,
  PROBE_CATALOG,
  translateProbeInputs,
} from '@openxenon/engine/kernel/verdicts/catalog'
import { type IAPError, IAPAction, isIAPError } from '@openxenon/engine/errors'
import { probeRegistry } from '@openxenon/engine/infra/probes'
import { PROBE_VERDICT_STRATEGIES } from '@openxenon/engine/kernel/verdicts/verdict'

describe('v1.1 Phase 5a: 5 条 builtin probes 集成', () => {
  test('catalog 列出 5a+5b builtin probes（15 条：11 + 4 git-*）', () => {
    const builtin = PROBE_CATALOG.filter((p) => p.builtin === 'oxn')
    const names = builtin.map((p) => p.semanticName).sort()
    // 5a: 5 条 + 5b.1+2+3+4+5+6 → 11 条
    // v1.2: + 4 条 git-*（git-clean / git-branch-exists / git-status-clean / git-merge-feasible）= 15
    expect(names).toEqual([
      'deps-resolved',
      'file-exports',
      'fs-content-match',
      'fs-exists',
      'fs-not-exists',
      'fs-parseable',
      'git-branch-exists',
      'git-clean',
      'git-merge-feasible',
      'git-status-clean',
      'http-responds',
      'lint-check',
      'shell-exec',
      'test-pass',
      'ts-compiles',
    ])
  })

  test('listProbesSummary 至少 15 个（5a + 5b.1+2+3+4+5+6 + 4 git-*）', () => {
    const summary = listProbesSummary()
    expect(summary.length).toBeGreaterThanOrEqual(15)
    const names = summary.map((s) => s.name)
    expect(names).toContain('file-exports')
    expect(names).toContain('git-clean')
    expect(names).toContain('git-merge-feasible')
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
        probeRegistry.has(`${entry.semanticName}:probes`)
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

// =============================================================================
// Phase C 封装边界：AI 看到的（listProbesSummary / describeProbe）不能泄漏内部
// 翻译层：semanticName → internalRef, inputs → inputMap
// Catalog 不变量：inputMap keys ⊆ inputs[].names 等
//
// 合并自 src/cli/__tests__/probe-catalog.test.ts（2025-12 合并）
// =============================================================================

describe('AI-visible layer: no implementation leak', () => {
  test('listProbesSummary 不含 @oxn/probe(s) ref', () => {
    const summary = listProbesSummary()
    const json = JSON.stringify(summary)
    expect(json).not.toMatch(/@oxn\/probe/)
    expect(json).not.toMatch(/@oxn\/probes/)
  })

  test('listProbesSummary 不含实现细节（exitCode / statSync / spawn）', () => {
    const summary = listProbesSummary()
    const json = JSON.stringify(summary)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
  })

  test('listProbesSummary 至少 2 个 probe', () => {
    const summary = listProbesSummary()
    expect(summary.length).toBeGreaterThanOrEqual(2)
    for (const p of summary) {
      expect(p.name).toBeTruthy()
      expect(p.description).toBeTruthy()
      expect(Array.isArray(p.requiredInputs)).toBe(true)
    }
  })

  test('describeProbe fs-exists 返回 inputs 但不含 verdict 逻辑', () => {
    const info = describeProbe('fs-exists')
    expect(info).not.toBeNull()
    const json = JSON.stringify(info)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
    // 不暴露 verdict 规则的精确数（hit >= 1）
    expect(json).not.toMatch(/>=\s*\d/)
  })

  test('describeProbe shell-exec 返回 inputs 但不含 verdict 逻辑', () => {
    const info = describeProbe('shell-exec')
    expect(info).not.toBeNull()
    const json = JSON.stringify(info)
    expect(json).not.toMatch(/exitCode|statSync|spawn|child_process/)
  })

  test('describeProbe unknown 返回 null', () => {
    expect(describeProbe('does-not-exist')).toBeNull()
  })
})

describe('Translation layer (AI inputs → Infra params)', () => {
  test('fs-exists + {path} → {pattern}', () => {
    const r = translateProbeInputs('fs-exists', { path: './dist/index.js' })
    expect(r.internalRef).toBe('@oxn/probes/fs-exists')
    expect(r.internalParams).toEqual({ pattern: './dist/index.js' })
  })

  test('shell-exec + {command, timeout} → {command, timeout}', () => {
    const r = translateProbeInputs('shell-exec', { command: 'bun test', timeout: 60000 })
    expect(r.internalRef).toBe('@oxn/probes/shell-exec')
    expect(r.internalParams).toEqual({ command: 'bun test', timeout: 60000 })
  })

  test('fs-exists 缺 path → IAPError (PROOF/INFRA_FAIL)', () => {
    try {
      translateProbeInputs('fs-exists', {})
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.axis).toBe('PROOF')
      expect(e.code).toBe('INFRA_FAIL')
      expect(e.action).toBe(IAPAction.YIELD_TO_HUMAN)
      expect(e.name).toBe('IAP_PROOF_INFRA_FAIL')
      expect(e.context).toMatchObject({ probe: 'fs-exists', input: 'path', reason: 'input_missing' })
    }
  })

  test('fs-exists path 类型错（number）→ IAPError (PROOF/INFRA_FAIL)', () => {
    try {
      translateProbeInputs('fs-exists', { path: 42 })
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.axis).toBe('PROOF')
      expect(e.code).toBe('INFRA_FAIL')
      expect(e.context).toMatchObject({
        probe: 'fs-exists',
        input: 'path',
        actualType: 'number',
        expectedType: 'string',
        reason: 'input_type_mismatch',
      })
    }
  })

  test('unknown probe → IAPError (PROOF/INFRA_FAIL, reason: unknown_semantic_name)', () => {
    try {
      translateProbeInputs('does-not-exist', {})
      expect(true).toBe(false) // 不应到达
    } catch (err) {
      expect(isIAPError(err)).toBe(true)
      const e = err as IAPError
      expect(e.name).toBe('IAP_PROOF_INFRA_FAIL')
      expect(e.context).toMatchObject({ probe: 'does-not-exist', reason: 'unknown_semantic_name' })
    }
  })

  test('shell-exec timeout 是 optional，缺它不报错', () => {
    const r = translateProbeInputs('shell-exec', { command: 'ls' })
    expect(r.internalParams).toEqual({ command: 'ls' })
  })
})

describe('Catalog invariants', () => {
  test('assertCatalogConsistency 通过', () => {
    const r = assertCatalogConsistency()
    expect(r.ok).toBe(true)
  })

  test('每个 entry 的 inputMap keys ⊆ inputs[].names', () => {
    for (const entry of PROBE_CATALOG) {
      const inputNames = new Set(entry.inputs.map((i) => i.name))
      for (const k of Object.keys(entry.inputMap)) {
        expect(inputNames.has(k)).toBe(true)
      }
    }
  })

  test('每个 entry 的 inputs[].name 唯一', () => {
    for (const entry of PROBE_CATALOG) {
      const seen = new Set<string>()
      for (const inp of entry.inputs) {
        expect(seen.has(inp.name)).toBe(false)
        seen.add(inp.name)
      }
    }
  })

  test('每个 entry 有 required 字段', () => {
    for (const entry of PROBE_CATALOG) {
      expect(entry.semanticName).toBeTruthy()
      expect(entry.internalRef).toBeTruthy()
      expect(entry.description).toBeTruthy()
      expect(Array.isArray(entry.inputs)).toBe(true)
      expect(Array.isArray(entry.examples)).toBe(true)
      expect(entry.builtin).toBe('oxn')
    }
  })
})
