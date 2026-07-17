// =============================================================================
// summary-extractors.test.ts — readDomainFile External 注入解析覆盖
//
// 覆盖本会话新增的 External 注入能力（Work 消化 / Task 自包含）：
//   1. readDomainFile 解析 ## Externals（H3 条目 + path/url/kind/ttl/auth/summary）
//   2. quote-stripping、url/path 互斥、kind 缺省
//   3. External 与 Terms/Bans/Invariants 共存
//   4. 无 ## Externals → externals 字段省略
//   5. .md 域名/描述解析 + .oxn 向后兼容 fallback（无 externals）
//   6. 边界：文件不存在 → null；无域名 → null
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { readDomainFile } from '../summary-extractors'

let tmpDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `sumext-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  mkdirSync(tmpDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

function writeDomain(content: string): string {
  const p = join(tmpDir, 'domain.md')
  writeFileSync(p, content)
  return p
}

// ───────── readDomainFile: 基础 .md 解析 ─────────

describe('readDomainFile — .md 基础', () => {
  test('解析域名 + 描述（H1 + blockquote）', () => {
    const p = writeDomain(`# Domain: TrustChain\n> 信任链核心模型域\n`)
    const d = readDomainFile(p)
    expect(d?.name).toBe('TrustChain')
    expect(d?.description).toBe('信任链核心模型域')
  })

  test('解析 Terms / Bans / Invariants', () => {
    const p = writeDomain(
      `# Domain: CoreDomain\n> 核心域\n\n` +
        `## Terms\n### verdict\n- desc: 判定结果\n### probe\n- desc: 探针\n\n` +
        `## Bans\n### no-mock\n- desc: 禁止 mock\n\n` +
        `## Invariants\n### idempotent\n- value: 操作必须幂等\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.terms).toEqual([
      { name: 'verdict', desc: '判定结果' },
      { name: 'probe', desc: '探针' },
    ])
    expect(d?.language?.ban).toEqual(['禁止 mock'])
    expect(d?.language?.invariant).toEqual(['操作必须幂等'])
  })

  test('文件不存在 → null', () => {
    expect(readDomainFile(join(tmpDir, 'nope.md'))).toBe(null)
  })

  test('无域名声明 → null', () => {
    const p = writeDomain(`# Not A Domain\n> whatever\n`)
    expect(readDomainFile(p)).toBe(null)
  })

  test('无 language 段落 → language 字段省略', () => {
    const p = writeDomain(`# Domain: Bare\n> 空域\n`)
    const d = readDomainFile(p)
    expect(d?.language).toBeUndefined()
  })
})

// ───────── readDomainFile: ## Externals 注入解析（核心） ─────────

describe('readDomainFile — ## Externals 解析', () => {
  test('单个 external：全字段（path/kind/ttl/auth/summary）', () => {
    const p = writeDomain(
      `# Domain: TrustChain\n> 信任链\n\n` +
        `## Externals\n### trust-chain-model\n` +
        `- path: .openxenon/docs/adrs/0057-trust-chain-core-model.md\n` +
        `- kind: adr\n` +
        `- ttl: 30d\n` +
        `- auth: none\n` +
        `- summary: 信任链核心模型\n`,
    )
    const d = readDomainFile(p)
    expect(d?.externals).toHaveLength(1)
    expect(d?.externals?.[0]).toEqual({
      name: 'trust-chain-model',
      url: null,
      path: '.openxenon/docs/adrs/0057-trust-chain-core-model.md',
      kind: 'adr',
      ttl: '30d',
      auth: 'none',
      summary: '信任链核心模型',
    })
  })

  test('多个 externals（path-only + url-only 混合）', () => {
    const p = writeDomain(
      `# Domain: ProofAxis\n> 证明轴\n\n` +
        `## Externals\n` +
        `### adr-0057\n- path: .openxenon/docs/adrs/0057.md\n- kind: adr\n` +
        `### axios-docs\n- url: https://axios-http.com/docs\n- kind: library\n`,
    )
    const d = readDomainFile(p)
    expect(d?.externals).toHaveLength(2)
    const [a, b] = d!.externals!
    expect(a).toMatchObject({ name: 'adr-0057', path: '.openxenon/docs/adrs/0057.md', url: null, kind: 'adr' })
    expect(b).toMatchObject({ name: 'axios-docs', url: 'https://axios-http.com/docs', path: null, kind: 'library' })
  })

  test('quote-stripping：带引号的字段值去引号', () => {
    const p = writeDomain(
      `# Domain: D\n> d\n\n` +
        `## Externals\n### x\n- path: "quoted/path.md"\n- kind: "adr"\n- summary: "带引号的概述"\n`,
    )
    const ext = readDomainFile(p)?.externals?.[0]
    expect(ext?.path).toBe('quoted/path.md')
    expect(ext?.kind).toBe('adr')
    expect(ext?.summary).toBe('带引号的概述')
  })

  test('kind 缺省 → 空字符串；可选字段缺省 → null', () => {
    const p = writeDomain(`# Domain: D\n> d\n\n## Externals\n### only-url\n- url: https://e.com\n`)
    const ext = readDomainFile(p)?.externals?.[0]
    expect(ext?.kind).toBe('')
    expect(ext?.ttl).toBe(null)
    expect(ext?.auth).toBe(null)
    expect(ext?.summary).toBe(null)
    expect(ext?.path).toBe(null)
  })

  test('无 ## Externals 段 → externals 字段省略', () => {
    const p = writeDomain(`# Domain: NoExt\n> 无外部引用\n\n## Terms\n### t\n- desc: term\n`)
    const d = readDomainFile(p)
    expect(d?.externals).toBeUndefined()
  })

  test('Externals 与 Terms/Bans/Invariants 共存，互不干扰', () => {
    const p = writeDomain(
      `# Domain: Full\n> 完整域\n\n` +
        `## Terms\n### verdict\n- desc: 判定\n\n` +
        `## Bans\n### no-any\n- desc: 禁止 any\n\n` +
        `## Invariants\n### pure\n- value: 纯函数\n\n` +
        `## Externals\n### adr-1\n- path: a.md\n- kind: adr\n### adr-2\n- path: b.md\n- kind: adr\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.terms).toHaveLength(1)
    expect(d?.language?.ban).toEqual(['禁止 any'])
    expect(d?.language?.invariant).toEqual(['纯函数'])
    expect(d?.externals?.map((e) => e.name)).toEqual(['adr-1', 'adr-2'])
  })

  test('Externals 为末尾段（无尾随 section）也能解析', () => {
    const p = writeDomain(`# Domain: Tail\n> t\n\n## Externals\n### last\n- path: x.md\n- kind: adr`)
    expect(readDomainFile(p)?.externals?.[0]?.name).toBe('last')
  })
})

// ───────── readDomainFile: .oxn 向后兼容 ─────────

describe('readDomainFile — .oxn fallback', () => {
  test('解析旧 .oxn 语法（domain/term/ban/invariant），无 externals', () => {
    const p = writeDomain(
      `domain "LegacyDomain" {\n` +
        `  description = "旧域"\n` +
        `  term { "verdict": "判定" }\n` +
        `  ban { "no-mock" }\n` +
        `  invariant { "idempotent" }\n` +
        `}\n`,
    )
    const d = readDomainFile(p)
    expect(d?.name).toBe('LegacyDomain')
    expect(d?.description).toBe('旧域')
    expect(d?.language?.terms).toEqual([{ name: 'verdict', desc: '判定' }])
    expect(d?.language?.ban).toEqual(['no-mock'])
    expect(d?.language?.invariant).toEqual(['idempotent'])
    expect(d?.externals).toBeUndefined()
  })
})

// ───────── 🆕 v0.7.3 P2: ## Terms: 后缀 + multiline - desc: | + - items: 列表 修复 ─────────

describe('readDomainFile — v0.7.3 P2: ## Terms: 后缀 + multiline + items 修复', () => {
  test('## Terms: <Group> 后缀 → 全部 terms 被捕获（不只 Terms 组）', () => {
    const p = writeDomain(
      `# Domain: OxnWorkDomain\n> OXN Work 业务领域\n\n` +
        `## Terms: Work\n\n### Work\n- desc: Work 是 E2 人机协作的工作空间。\n### Task\n- desc: Align 执行单元。\n\n` +
        `## Terms: Other\n\n### OtherTerm\n- desc: 其他组 term。\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.terms.map((t) => t.name)).toEqual(['Work', 'Task', 'OtherTerm'])
    expect(d?.language?.terms).toContainEqual({ name: 'Work', desc: 'Work 是 E2 人机协作的工作空间。' })
    expect(d?.language?.terms).toContainEqual({ name: 'OtherTerm', desc: '其他组 term。' })
  })

  test('multiline - desc: | (YAML block scalar) → 多行文本被合并为单 desc', () => {
    const p = writeDomain(
      `# Domain: OxnEngineDomain\n> 引擎域\n\n` +
        `## Bans\n\n### forbidden-constructs\n` +
        `- items:\n  - TypeScriptGrammar\n  - HandWrittenParser\n` +
        `- desc: |\n  禁用旧术语（L2Domain/Tier/Stratum/ArsenalPromote 等历史版本残留）。\n  Monorepo 禁用 monolithic-{cli,engine}。\n  Daemon 禁用 CrashLoop/ForkDaemon。\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.ban).toContain('TypeScriptGrammar')
    expect(d?.language?.ban).toContain('HandWrittenParser')
    // multiline desc 应被合并为单个 ban 条目（包含全部 3 行）
    const multiLineBan = d?.language?.ban.find((b) => b.includes('禁用旧术语'))
    expect(multiLineBan).toBeDefined()
    expect(multiLineBan).toContain('Monorepo 禁用')
    expect(multiLineBan).toContain('Daemon 禁用')
  })

  test('- items: 列表 → 全部 ban items 被展开为 ban 数组元素', () => {
    const p = writeDomain(
      `# Domain: OxnWorkDomain\n> OXN Work 业务领域\n\n` +
        `## Bans\n\n### forbidden-constructs\n` +
        `- items:\n  - WorkV0Layout\n  - V0Bypass\n  - BypassLock\n  - BypassValidate\n  - BypassMigrate\n` +
        `- desc: 禁止的 Work 模式\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.ban).toEqual(
      expect.arrayContaining(['WorkV0Layout', 'V0Bypass', 'BypassLock', 'BypassValidate', 'BypassMigrate']),
    )
    expect(d?.language?.ban.length).toBeGreaterThanOrEqual(5)
  })

  test('集成：## Terms: 后缀 + multiline - desc: | + - items: 在同一文件', () => {
    const p = writeDomain(
      `# Domain: Mixed\n> 综合域\n\n` +
        `## Terms: GroupA\n\n### a1\n- desc: a1 desc。\n### a2\n- desc: |\n  a2 第一行。\n  a2 第二行。\n\n` +
        `## Terms: GroupB\n\n### b1\n- desc: b1 desc。\n\n` +
        `## Bans\n\n### bans1\n- items:\n  - X1\n  - X2\n- desc: |\n  ban 第一行。\n  ban 第二行。\n\n` +
        `## Invariants\n\n### inv-1\n- value: 集成验证\n`,
    )
    const d = readDomainFile(p)
    expect(d?.language?.terms.map((t) => t.name)).toEqual(['a1', 'a2', 'b1'])
    expect(d?.language?.terms.find((t) => t.name === 'a2')?.desc).toContain('a2 第二行')
    expect(d?.language?.ban).toContain('X1')
    expect(d?.language?.ban).toContain('X2')
    expect(d?.language?.ban.find((b) => b.includes('ban 第一行'))).toBeDefined()
    expect(d?.language?.invariant).toEqual(['集成验证'])
  })

  test('regression: 7 active domains readDomainFile 后 terms/bans/invariants 关键字段不空', () => {
    const realDomains = [
      'oxn-domain',
      'oxn-engine-domain',
      'oxn-cli-domain',
      'oxn-work-domain',
      'oxn-asset-domain',
      'oxn-proof-domain',
      'oxn-insight-domain',
    ]
    // Test file path: packages/engine/src/oxl/__tests__/summary-extractors.test.ts
    // → ../../../.. → repo root → .openxenon/assets/domains/
    const domainsDir = join(import.meta.dir, '../../../../../.openxenon/assets/domains')
    for (const name of realDomains) {
      const path = join(domainsDir, `${name}.md`)
      const d = readDomainFile(path)
      expect(d).not.toBeNull()
      expect(d?.name).toBeTruthy()
      // 7 active domains 都应有 terms（root oxn-domain 16+ term, 其他 9-16）
      expect(d?.language?.terms.length).toBeGreaterThan(0)
      // 大部分 domains 应有 bans（oxn-domain 暂无 Bans 段，但 6/7 都非空）
      // invariants 也都非空（4-30 不等）
      expect(d?.language?.invariant.length).toBeGreaterThan(0)
    }
    // 6/7 domains 应有 bans（oxn-domain 是 root，无 Bans 段）
    let domainsWithBans = 0
    for (const name of realDomains) {
      const path = join(domainsDir, `${name}.md`)
      const d = readDomainFile(path)
      if ((d?.language?.ban.length ?? 0) > 0) domainsWithBans++
    }
    expect(domainsWithBans).toBeGreaterThanOrEqual(6)
  })
})
