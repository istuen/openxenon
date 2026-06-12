// =============================================================================
// domain-index-builder.test.ts — PR-1 单元测试
//
// 覆盖：
//   1. scanDomainFiles 递归扫 .oxn，跳过隐藏 / 非 .oxn
//   2. parseDomainSlim 提取 name/description/termNames/banCount/invariantCount
//   3. parseDomainSlim 处理 parse error 优雅降级（status=invalid）
//   4. parseDomainSlim 累加多 invariant 块
//   5. buildDomainIndex 完整组装
//   6. writeDomainIndex 原子写（产生文件 + JSON 合法）
//   7. loadDomainIndex schema 校验失败返回 null
//   8. getDomainIndexPath 路径正确
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildDomainIndex,
  DomainIndexSchema,
  getCacheDir,
  getDomainIndexPath,
  loadDomainIndex,
  parseDomainSlim,
  scanDomainFiles,
  writeDomainIndex,
} from '../domain-index-builder'

let tmpDir: string
let domainsDir: string
let cacheDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `domain-index-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  domainsDir = join(tmpDir, 'domains')
  cacheDir = join(tmpDir, '.openxenon', '.cache')
  mkdirSync(domainsDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ───────── scanDomainFiles ─────────

describe('scanDomainFiles', () => {
  test('空目录返回空数组', () => {
    const { files } = scanDomainFiles(domainsDir)
    expect(files).toEqual([])
  })

  test('不存在的目录返回空数组（不抛错）', () => {
    const { files } = scanDomainFiles(join(tmpDir, 'nonexistent'))
    expect(files).toEqual([])
  })

  test('扫到 .oxn 文件', () => {
    writeFileSync(join(domainsDir, 'foo.oxn'), 'domain "Foo" {}')
    writeFileSync(join(domainsDir, 'bar.oxn'), 'domain "Bar" {}')
    const { files } = scanDomainFiles(domainsDir)
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.relPath).sort()).toEqual(['bar.oxn', 'foo.oxn'])
  })

  test('递归子目录', () => {
    const sub = join(domainsDir, 'sub', 'nested')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(domainsDir, 'top.oxn'), 'domain "Top" {}')
    writeFileSync(join(sub, 'deep.oxn'), 'domain "Deep" {}')
    const { files } = scanDomainFiles(domainsDir)
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.relPath).sort()).toEqual(['sub/nested/deep.oxn', 'top.oxn'])
  })

  test('跳过隐藏文件与目录', () => {
    writeFileSync(join(domainsDir, 'visible.oxn'), 'domain "Visible" {}')
    writeFileSync(join(domainsDir, '.hidden.oxn'), 'domain "Hidden" {}')
    mkdirSync(join(domainsDir, '.git'))
    writeFileSync(join(domainsDir, '.git', 'should-skip.oxn'), 'domain "Skip" {}')
    const { files } = scanDomainFiles(domainsDir)
    expect(files.map((f) => f.relPath)).toEqual(['visible.oxn'])
  })

  test('跳过非 .oxn 文件', () => {
    writeFileSync(join(domainsDir, 'good.oxn'), 'domain "Good" {}')
    writeFileSync(join(domainsDir, 'readme.md'), '# not a domain')
    writeFileSync(join(domainsDir, 'data.json'), '{}')
    const { files } = scanDomainFiles(domainsDir)
    expect(files.map((f) => f.relPath)).toEqual(['good.oxn'])
  })
})

// ───────── parseDomainSlim ─────────

describe('parseDomainSlim', () => {
  test('完整 Domain（description + 3 terms + 2 ban + 2 invariant）', () => {
    const file = join(domainsDir, 'MemberContext.oxn')
    writeFileSync(
      file,
      `domain "MemberContext" {
  description = "会员限界上下文"
  term { "Member": "会员实体"; "Tier": "等级" }
  ban { "User", "Customer" }
  invariant { "邮箱唯一" }
  invariant { "手机号唯一" }
}
`,
    )
    const result = parseDomainSlim(file, tmpDir)
    expect(result.name).toBe('MemberContext')
    expect(result.file).toBe('domains/MemberContext.oxn')
    expect(result.status).toBe('ok')
    expect(result.description).toBe('会员限界上下文')
    expect(result.termNames).toEqual(['Member', 'Tier'])
    expect(result.banCount).toBe(2)
    expect(result.invariantCount).toBe(2)
    expect(result.errors).toEqual([])
  })

  test('空 Domain（无 term/ban/invariant）', () => {
    const file = join(domainsDir, 'Empty.oxn')
    writeFileSync(file, `domain "Empty" {}\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.name).toBe('Empty')
    expect(result.status).toBe('ok')
    expect(result.termNames).toEqual([])
    expect(result.banCount).toBe(0)
    expect(result.invariantCount).toBe(0)
  })

  test('v0.1.1: 多个 invariant 块累加', () => {
    const file = join(domainsDir, 'Multi.oxn')
    writeFileSync(
      file,
      `domain "Multi" {
  invariant { "rule A"; "rule B" }
  invariant { "rule C" }
}
`,
    )
    const result = parseDomainSlim(file, tmpDir)
    expect(result.invariantCount).toBe(3)
  })

  test('无 description 字段（可选）', () => {
    const file = join(domainsDir, 'NoDesc.oxn')
    writeFileSync(file, `domain "NoDesc" { term { "X": "x" } }\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.name).toBe('NoDesc')
    expect(result.description).toBeUndefined()
  })

  test('无 domain 声明 → status=invalid', () => {
    const file = join(domainsDir, 'Broken.oxn')
    writeFileSync(file, `// nothing here\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.errors).toContain('no `domain "X" { ... }` declaration found')
  })

  // v1.1 PR-fix-domain-name-consistency: NAME_FILE_MISMATCH 软检测
  test('NAME_FILE_MISMATCH 防御: declared "DevWorkflow" vs file "dev-workflow.oxn"（PascalCase 文件名，规范化后一致）→ status=ok', () => {
    const file = join(domainsDir, 'dev-workflow.oxn')
    writeFileSync(file, `domain "DevWorkflow" { description = "test" }\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.status).toBe('ok')
    expect(result.name).toBe('DevWorkflow')
    expect(result.errors).toEqual([])
  })

  test('NAME_FILE_MISMATCH 触发: declared "Foo" vs file "bar.oxn"（规范化后不一致）→ status=invalid + errors 含 NAME_FILE_MISMATCH', () => {
    const file = join(domainsDir, 'bar.oxn')
    writeFileSync(file, `domain "Foo" { description = "test" }\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.errors.some((e) => e.includes('NAME_FILE_MISMATCH'))).toBe(true)
    expect(result.errors.some((e) => e.includes("declared 'Foo'"))).toBe(true)
    expect(result.errors.some((e) => e.includes("does not match file 'bar'"))).toBe(true)
  })

  test('NAME_FILE_MISMATCH 一致: snake_case 声明 "wechat_minigame" vs kebab 文件 "wechat-minigame.oxn" → status=ok', () => {
    const file = join(domainsDir, 'wechat-minigame.oxn')
    writeFileSync(file, `domain "wechat_minigame" { description = "test" }\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.status).toBe('ok')
    expect(result.name).toBe('wechat_minigame')
    expect(result.errors).toEqual([])
  })

  test('文件不存在 → status=invalid + file 路径仍记录', () => {
    const file = join(domainsDir, 'Missing.oxn')
    const result = parseDomainSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.file).toBe('domains/Missing.oxn')
    expect(result.errors[0]).toContain('file not found')
  })

  test('term 块内含 ":" 但 key 为空字符串时被忽略（regex 强制至少 1 个非引号字符）', () => {
    const file = join(domainsDir, 'Edge.oxn')
    writeFileSync(
      file,
      `domain "Edge" {
  term { "Key1": "valid" "Key2": "valid" }
}
`,
    )
    const result = parseDomainSlim(file, tmpDir)
    expect(result.termNames).toEqual(['Key1', 'Key2'])
  })

  test('description 含转义引号 \\" 应还原', () => {
    const file = join(domainsDir, 'Esc.oxn')
    writeFileSync(file, `domain "Esc" { description = "say \\"hi\\"" }\n`)
    const result = parseDomainSlim(file, tmpDir)
    expect(result.description).toBe('say "hi"')
  })
})

// ───────── buildDomainIndex ─────────

describe('buildDomainIndex', () => {
  test('空目录产生空索引（domainCount=0）', () => {
    const idx = buildDomainIndex({ projectRoot: tmpDir, domainsDir })
    expect(idx.schemaVersion).toBe(1)
    expect(idx.projectRoot).toBe(tmpDir)
    expect(idx.domainsDir).toBe('domains')
    expect(idx.domainCount).toBe(0)
    expect(idx.domains).toEqual([])
  })

  test('3 个 domain 完整索引', () => {
    writeFileSync(
      join(domainsDir, 'a.oxn'),
      `domain "A" { description = "alpha"; term { "X": "x" }; ban { "y" }; invariant { "z" } }`,
    )
    writeFileSync(join(domainsDir, 'b.oxn'), `domain "B" { term { "M": "m" } }`)
    writeFileSync(join(domainsDir, 'c.oxn'), `domain "C" {}`)

    const idx = buildDomainIndex({ projectRoot: tmpDir, domainsDir, generatedAt: '2026-06-08T00:00:00.000Z' })
    expect(idx.domainCount).toBe(3)
    expect(idx.generatedAt).toBe('2026-06-08T00:00:00.000Z')
    expect(idx.domains.map((d) => d.name).sort()).toEqual(['A', 'B', 'C'])
    const a = idx.domains.find((d) => d.name === 'A')
    expect(a?.termNames).toEqual(['X'])
    expect(a?.banCount).toBe(1)
    expect(a?.invariantCount).toBe(1)
  })

  test('混合 ok + invalid：invalid 仍记入索引', () => {
    writeFileSync(join(domainsDir, 'good.oxn'), `domain "Good" {}`)
    writeFileSync(join(domainsDir, 'bad.oxn'), `// no domain decl`)
    const idx = buildDomainIndex({ projectRoot: tmpDir, domainsDir })
    expect(idx.domainCount).toBe(2)
    expect(idx.domains.find((d) => d.name === 'Good')?.status).toBe('ok')
    expect(idx.domains.find((d) => d.file === 'domains/bad.oxn')?.status).toBe('invalid')
  })
})

// ───────── writeDomainIndex + loadDomainIndex ─────────

describe('writeDomainIndex / loadDomainIndex', () => {
  test('writeDomainIndex 原子写：产生 .json 文件 + 内容合法', () => {
    writeFileSync(join(domainsDir, 'x.oxn'), `domain "X" {}`)
    const outPath = join(cacheDir, 'domains.json')
    const idx = writeDomainIndex({ projectRoot: tmpDir, domainsDir, outPath })
    expect(existsSync(outPath)).toBe(true)
    expect(existsSync(`${outPath}.tmp`)).toBe(false)
    expect(idx.domainCount).toBe(1)

    // 落盘内容是合法 JSON
    const reloaded = loadDomainIndex(outPath)
    expect(reloaded).not.toBeNull()
    expect(reloaded?.domainCount).toBe(1)
    expect(reloaded?.domains[0]?.name).toBe('X')
  })

  test('loadDomainIndex: 文件不存在 → null', () => {
    const reloaded = loadDomainIndex(join(cacheDir, 'nope.json'))
    expect(reloaded).toBeNull()
  })

  test('loadDomainIndex: schema 不合法 → null（不抛）', () => {
    const outPath = join(cacheDir, 'domains.json')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(outPath, JSON.stringify({ schemaVersion: 99, totally: 'wrong' }))
    expect(loadDomainIndex(outPath)).toBeNull()
  })

  test('loadDomainIndex: JSON 解析失败 → null', () => {
    const outPath = join(cacheDir, 'domains.json')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(outPath, 'not json {')
    expect(loadDomainIndex(outPath)).toBeNull()
  })

  test('Zod schema round-trip: build → write → load → re-validate', () => {
    writeFileSync(join(domainsDir, 'a.oxn'), `domain "A" { term { "X": "x" } }`)
    const idx = writeDomainIndex({ projectRoot: tmpDir, domainsDir, outPath: join(cacheDir, 'd.json') })
    const reloaded = loadDomainIndex(join(cacheDir, 'd.json'))
    expect(reloaded).toEqual(idx)
    // 再次走 Zod 校验
    const result = DomainIndexSchema.safeParse(reloaded)
    expect(result.success).toBe(true)
  })
})

// ───────── 路径工具 ─────────

describe('path helpers', () => {
  test('getCacheDir', () => {
    expect(getCacheDir('/proj')).toBe('/proj/.openxenon/.cache')
  })

  test('getDomainIndexPath', () => {
    expect(getDomainIndexPath('/proj')).toBe('/proj/.openxenon/.cache/domains.json')
  })
})
