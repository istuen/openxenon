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
  test('catalog 列出 5 条 builtin probes', () => {
    const builtin = PROBE_CATALOG.filter((p) => p.builtin === 'oxn')
    const names = builtin.map((p) => p.semanticName).sort()
    expect(names).toEqual(['fs-content-match', 'fs-exists', 'fs-not-exists', 'fs-parseable', 'shell-exec'])
  })

  test('listProbesSummary 至少 5 个', () => {
    const summary = listProbesSummary()
    expect(summary.length).toBeGreaterThanOrEqual(5)
    const names = summary.map((s) => s.name)
    expect(names).toContain('fs-exists')
    expect(names).toContain('fs-not-exists')
    expect(names).toContain('fs-content-match')
    expect(names).toContain('fs-parseable')
    expect(names).toContain('shell-exec')
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
