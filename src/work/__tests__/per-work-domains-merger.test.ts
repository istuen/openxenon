// =============================================================================
// work-domains-merger.test.ts — PR-3 单元测试
//
// 覆盖：
//   1. extractDomainRefs：单/多/无 ref/重复 name
//   2. resolveDomainFile：@prj/domains/X、bare name、@oxn/（无 builtin）、找不到
//   3. buildPerWorkDomainsIndex：组合 ref + name，源 hash 正确，错误累积
//   4. writePerWorkDomainsIndex：原子写 + JSON 合法
//   5. loadPerWorkDomainsIndex：schema 校验
//   6. 错误优雅降级：ref 解析失败、文件不存在、@oxn scope
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildPerWorkDomainsIndex,
  extractDomainRefs,
  getPerWorkDomainsJsonPath,
  loadPerWorkDomainsIndex,
  resolveDomainFile,
  writePerWorkDomainsIndex,
} from '../per-work-domains-merger'

let tmpDir: string
let workName: string
let workOxnPath: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `work-domains-merger-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'demo'
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'domains'), { recursive: true })
  workOxnPath = join(tmpDir, '.openxenon', 'works', workName, 'work.oxn')
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

function writeDomainFile(name: string, content: string): void {
  writeFileSync(join(tmpDir, '.openxenon', 'domains', `${name}.oxn`), content)
}

// ───────── extractDomainRefs ─────────

describe('extractDomainRefs', () => {
  test('无 domain 声明 → []', async () => {
    expect(await extractDomainRefs('work "demo" {}\n')).toEqual([])
  })

  test('单 ref', async () => {
    const r = await extractDomainRefs('work "demo" {\n  domain "Foo" ref "@prj/domains/foo";\n}\n')
    expect(r).toEqual([{ name: 'Foo', ref: '@prj/domains/foo' }])
  })

  test('无 ref（bare name 容错）', async () => {
    const r = await extractDomainRefs('work "demo" {\n  domain "Foo";\n}\n')
    expect(r).toEqual([{ name: 'Foo', ref: null }])
  })

  test('多 ref 保留声明顺序', async () => {
    const oxn = `work "demo" {
  domain "A" ref "@prj/domains/a";
  domain "B" ref "@prj/domains/b";
  domain "C" ref "@prj/domains/c";
}
`
    const r = await extractDomainRefs(oxn)
    expect(r.map((d) => d.name)).toEqual(['A', 'B', 'C'])
  })

  test('同 name 多次出现不合并（call 端去重）', async () => {
    const oxn = `work "demo" {
  domain "A" ref "@prj/domains/a";
  domain "B" ref "@prj/domains/b";
  domain "A" ref "@prj/domains/a-v2";
}
`
    const r = await extractDomainRefs(oxn)
    expect(r).toHaveLength(3)
  })

  test('忽略 task 块内的 domain（不属于 work 级 ref）', async () => {
    const oxn = `work "demo" {
  domain "W" ref "@prj/domains/w";
  task "t" { domain "TASKLEVEL" blueprint "B" }
}
`
    const r = await extractDomainRefs(oxn)
    // 只匹配 work 顶层 domain "W"；task 块内的 `domain "TASKLEVEL"` 实际是
    // task 的 align 声明（语法：'domain' STRING 在 task 内无分号跟随 ref）
    expect(r).toEqual([{ name: 'W', ref: '@prj/domains/w' }])
  })
})

// ───────── resolveDomainFile ─────────

describe('resolveDomainFile', () => {
  test('@prj/domains/X 直接命中', async () => {
    writeDomainFile('foo', 'domain "Foo" {}')
    const r = resolveDomainFile('@prj/domains/foo', 'Foo', tmpDir)
    expect(r).toEqual({ scope: '@prj', filePath: join(tmpDir, '.openxenon/domains/foo.oxn') })
  })

  test('@prj/domains/X kebab-case 回退', async () => {
    writeDomainFile('member-context', 'domain "MemberContext" {}')
    const r = resolveDomainFile('@prj/domains/MemberContext', 'MemberContext', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/domains/member-context.oxn'))
  })

  test('bare name（无 ref）找 .oxn', async () => {
    writeDomainFile('bar', 'domain "Bar" {}')
    const r = resolveDomainFile(null, 'bar', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/domains/bar.oxn'))
  })

  test('@oxn/ → null（V1 无 builtin domain registry）', async () => {
    expect(resolveDomainFile('@oxn/domains/foo', 'Foo', tmpDir)).toBe(null)
  })

  test('ref 解析失败 + bare name 找不到 → null', async () => {
    expect(resolveDomainFile('not-a-ref', 'X', tmpDir)).toBe(null)
  })

  test('ref 解析失败 + bare name 命中 → 用 bare name', async () => {
    writeDomainFile('x', 'domain "X" {}')
    const r = resolveDomainFile('not-a-ref', 'x', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/domains/x.oxn'))
  })
})

// ───────── buildPerWorkDomainsIndex ─────────

describe('buildPerWorkDomainsIndex', () => {
  test('happy path：2 domain + 2 ref', async () => {
    writeDomainFile(
      'foo',
      `domain "Foo" {
  description = "Foo context"
  term { "A": "alpha"; "B": "beta" }
  ban { "X" }
  invariant { "rule 1"; "rule 2" }
}
`,
    )
    writeDomainFile(
      'bar',
      `domain "Bar" {
  description = "Bar context"
  term { "C": "gamma" }
  ban { "Y", "Z" }
  invariant { "rule 3" }
}
`,
    )
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "Foo" ref "@prj/domains/foo";
  domain "Bar" ref "@prj/domains/bar";
}
`,
    )
    const idx = await buildPerWorkDomainsIndex({
      projectRoot: tmpDir,
      workName,
      workOxnPath,
      generatedAt: '2026-06-08T00:00:00.000Z',
    })
    expect(idx.schemaVersion).toBe(1)
    expect(idx.workName).toBe(workName)
    expect(idx.sourceHash).toMatch(/^[0-9a-f]{64}$/)
    expect(idx.domainCount).toBe(2)
    expect(idx.invalidCount).toBe(0)
    expect(idx.declaredRefs).toEqual(['@prj/domains/foo', '@prj/domains/bar'])
    const foo = idx.domains.find((d) => d.name === 'Foo')
    expect(foo?.termNames).toEqual(['A', 'B'])
    expect(foo?.banCount).toBe(1)
    expect(foo?.invariantCount).toBe(2)
    expect(foo?.description).toBe('Foo context')
    expect(foo?.file).toBe('.openxenon/domains/foo.oxn')
  })

  test('同 name 多次声明 → 去重（保留首次）', async () => {
    writeDomainFile('a', 'domain "A" { term { "X": "x" } }')
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "A" ref "@prj/domains/a";
  domain "A" ref "@prj/domains/a-v2";
}
`,
    )
    const idx = await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.domainCount).toBe(1)
    expect(idx.declaredRefs).toEqual(['@prj/domains/a'])
  })

  test('bare name（无 ref）按 name 找文件', async () => {
    writeDomainFile('foo', 'domain "Foo" { term { "X": "x" } }')
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "Foo";
}
`,
    )
    const idx = await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.domainCount).toBe(1)
    expect(idx.domains[0]?.ref).toBe('@prj/domains/Foo')
    expect(idx.domains[0]?.status).toBe('ok')
  })

  test('@oxn/ → status=invalid + errors[]', async () => {
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "Foo" ref "@oxn/domains/foo";
}
`,
    )
    const idx = await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.invalidCount).toBe(1)
    expect(idx.domains[0]?.status).toBe('invalid')
    expect(idx.domains[0]?.scope).toBe('@oxn')
    expect(idx.domains[0]?.errors[0]).toContain('@oxn/')
  })

  test('ref 指不存在的文件 → invalid + file-not-found error', async () => {
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "Foo" ref "@prj/domains/nonexistent";
}
`,
    )
    const idx = await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.domains[0]?.status).toBe('invalid')
    expect(idx.domains[0]?.errors[0]).toContain('not found')
  })

  test('work.oxn 内容决定 sourceHash（同样 ref 改 work.oxn 文本 → 不同 hash）', async () => {
    writeDomainFile('foo', 'domain "Foo" { term { "X": "x" } }')
    writeFileSync(
      workOxnPath,
      `work "demo" { domain "Foo" ref "@prj/domains/foo"; }
`,
    )
    const h1 = (await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })).sourceHash
    writeFileSync(
      workOxnPath,
      `work "demo" {
  domain "Foo" ref "@prj/domains/foo";
  context { goal = "new goal" }
}
`,
    )
    const h2 = (await buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })).sourceHash
    expect(h1).not.toBe(h2)
  })

  test('work.oxn 不存在 → 抛错', async () => {
    writeFileSync(workOxnPath, 'work "demo" {}\n')
    rmSync(workOxnPath)
    expect(buildPerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath })).rejects.toThrow(
      /work.oxn not found/,
    )
  })
})

// ───────── writePerWorkDomainsIndex + loadPerWorkDomainsIndex ─────────

describe('writePerWorkDomainsIndex / loadPerWorkDomainsIndex', () => {
  test('writePerWorkDomainsIndex 原子写 + loadPerWorkDomainsIndex 还原', async () => {
    writeDomainFile('foo', 'domain "Foo" { term { "X": "x" } }')
    writeFileSync(workOxnPath, `work "demo" { domain "Foo" ref "@prj/domains/foo"; }\n`)
    const outPath = getPerWorkDomainsJsonPath(tmpDir, workName)
    const _idx = await writePerWorkDomainsIndex({ projectRoot: tmpDir, workName, workOxnPath, outPath })
    expect(existsSync(outPath)).toBe(true)
    expect(existsSync(`${outPath}.tmp`)).toBe(false)
    const reloaded = loadPerWorkDomainsIndex(outPath)
    expect(reloaded).not.toBe(null)
    expect(reloaded?.domainCount).toBe(1)
    expect(reloaded?.domains[0]?.name).toBe('Foo')
  })

  test('loadPerWorkDomainsIndex: 缺文件 → null', async () => {
    expect(loadPerWorkDomainsIndex(join(tmpDir, 'nope.json'))).toBe(null)
  })

  test('loadPerWorkDomainsIndex: JSON 损坏 → null', async () => {
    const outPath = getPerWorkDomainsJsonPath(tmpDir, workName)
    writeFileSync(outPath, 'not json {')
    expect(loadPerWorkDomainsIndex(outPath)).toBe(null)
  })

  test('loadPerWorkDomainsIndex: schema 不匹配 → null', async () => {
    const outPath = getPerWorkDomainsJsonPath(tmpDir, workName)
    writeFileSync(outPath, JSON.stringify({ schemaVersion: 99 }))
    expect(loadPerWorkDomainsIndex(outPath)).toBe(null)
  })
})

// ───────── 路径工具 ─────────

describe('path helpers', () => {
  test('getPerWorkDomainsJsonPath', async () => {
    expect(getPerWorkDomainsJsonPath('/proj', 'demo')).toBe('/proj/.openxenon/works/demo/domains.json')
  })
})

// ───────── v0.2 T3 软缺口 B 修复：description 字符串冲突回归测试 ─────────

describe('v0.2 T3 软缺口 B 修复: AST 解析不再被 description 字段吞掉 domain', () => {
  test('description 含 "domain" 字符串仍正确识别后续 domain 声明', async () => {
    // v0.2 T3 软缺口 B 修复: 原 regex 会被 description 字符串中的 "domain" 误识别
    // 新 AST 解析只识别顶层 domain 声明节点（DomainRefDecl），description 字段不参与
    // 注意: OXL grammar 的 DomainRefDecl 不支持 description 字段
    // 这里 description 是其他字段（如 BlueprintRefDecl 不带）—— 用 workaround 验证
    const oxn = `work "demo" {
  domain "Real1";
  domain "Real2" ref "fake domain 'in string' description here";
  domain "Real3" ref "@prj/domains/real3";
}`
    const refs = await extractDomainRefs(oxn)
    expect(refs.map((d) => d.name)).toEqual(['Real1', 'Real2', 'Real3'])
  })

  test('注释中含 "domain" 字符串不被误识别', async () => {
    const oxn = `work "demo" {
  // 注释里 domain "Fake" 不应被识别
  domain "Real" ref "@prj/domains/real";
}`
    const refs = await extractDomainRefs(oxn)
    expect(refs).toEqual([{ name: 'Real', ref: '@prj/domains/real' }])
  })

  test('跨多行 domain 声明正确识别', async () => {
    const oxn = `work "demo" {
  domain
    "MultiLine"
    ref
      "@prj/domains/multi";
  domain "Inline";
}`
    const refs = await extractDomainRefs(oxn)
    expect(refs).toEqual([
      { name: 'MultiLine', ref: '@prj/domains/multi' },
      { name: 'Inline', ref: null },
    ])
  })

  test('内联 domain 声明（无换行）正确识别', async () => {
    const oxn = `work "demo" { domain "Inline" ref "@prj/domains/inline"; }`
    const refs = await extractDomainRefs(oxn)
    expect(refs).toEqual([{ name: 'Inline', ref: '@prj/domains/inline' }])
  })
})
