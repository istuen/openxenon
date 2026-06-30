// =============================================================================
// work-blueprints-merger.test.ts — PR-3 单元测试
//
// 覆盖：
//   1. extractBlueprintRefs：单/多/无 ref
//   2. parseBlueprintSlim：version + slots（含 deps/observe）
//   3. resolveBlueprintFile：@prj/blueprints/X、bare、@oxn/、找不到
//   4. buildPerWorkBlueprintsIndex：happy + 错误
//   5. writePerWorkBlueprintsIndex 原子写 + load 还原
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  buildPerWorkBlueprintsIndex,
  extractBlueprintRefs,
  getPerWorkBlueprintsJsonPath,
  loadPerWorkBlueprintsIndex,
  parseBlueprintSlim,
  resolveBlueprintFile,
  writePerWorkBlueprintsIndex,
} from '../per-work-blueprints-merger'

let tmpDir: string
let workName: string
let workOxnPath: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `work-bp-merger-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  workName = 'demo'
  mkdirSync(join(tmpDir, '.openxenon', 'works', workName), { recursive: true })
  mkdirSync(join(tmpDir, '.openxenon', 'blueprints'), { recursive: true })
  workOxnPath = join(tmpDir, '.openxenon', 'works', workName, 'work.oxn')
})

afterEach(() => {
  if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true, force: true })
})

function writeBlueprintFile(name: string, content: string): void {
  writeFileSync(join(tmpDir, '.openxenon', 'blueprints', `${name}.oxn`), content)
}

// ───────── extractBlueprintRefs ─────────

describe('extractBlueprintRefs', () => {
  test('无 blueprint 声明 → []', () => {
    expect(extractBlueprintRefs('work "demo" {}\n')).toEqual([])
  })

  test('单 ref', () => {
    const r = extractBlueprintRefs('work "demo" {\n  blueprint "Foo" ref "@prj/blueprints/foo";\n}\n')
    expect(r).toEqual([{ name: 'Foo', ref: '@prj/blueprints/foo' }])
  })

  test('多 ref 保留顺序', () => {
    const oxn = `work "demo" {
  blueprint "A" ref "@prj/blueprints/a";
  blueprint "B" ref "@prj/blueprints/b";
}
`
    const r = extractBlueprintRefs(oxn)
    expect(r.map((d) => d.name)).toEqual(['A', 'B'])
  })

  test('内联形式 work "x" { blueprint "Y" ref "..."; }', () => {
    const r = extractBlueprintRefs('work "demo" { blueprint "Foo" ref "@prj/blueprints/foo"; }\n')
    expect(r).toEqual([{ name: 'Foo', ref: '@prj/blueprints/foo' }])
  })
})

// ───────── parseBlueprintSlim ─────────

describe('parseBlueprintSlim', () => {
  test('完整 blueprint（version + 多个 slot）', () => {
    const content = `blueprint "Foo" {
  version = 2
  description = "demo"
  slot "alpha" { deps = []; observe = ["fs-match"] }
  slot "beta"  { deps = ["alpha"]; observe = ["lint-check", "type-check"] }
}
`
    const r = parseBlueprintSlim(content)
    expect(r.name).toBe('Foo')
    expect(r.version).toBe(2)
    expect(r.errors).toEqual([])
    expect(r.slots).toHaveLength(2)
    expect(r.slots[0]).toEqual({ name: 'alpha', deps: [], observe: ['fs-match'] })
    expect(r.slots[1]).toEqual({ name: 'beta', deps: ['alpha'], observe: ['lint-check', 'type-check'] })
  })

  test('缺 version → 默认 1', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { slot "a" {} }\n`)
    expect(r.version).toBe(1)
  })

  test('空 slot body → deps=[] observe=[]', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { slot "a" {} }\n`)
    expect(r.slots[0]).toEqual({ name: 'a', deps: [], observe: [] })
  })

  test('无 blueprint 声明 → name=null + error', () => {
    const r = parseBlueprintSlim(`// nothing here\n`)
    expect(r.name).toBe(null)
    expect(r.errors).toContain('no `blueprint "X" { ... }` declaration found')
  })

  test('version 非数字 → 默认 1，无 error（regex 只匹配 \\d+）', () => {
    const r = parseBlueprintSlim(`blueprint "Foo" { version = abc }\n`)
    expect(r.version).toBe(1)
    expect(r.errors).toEqual([])
  })
})

// ───────── resolveBlueprintFile ─────────

describe('resolveBlueprintFile', () => {
  test('@prj/blueprints/X 命中', () => {
    writeBlueprintFile('foo', 'blueprint "Foo" {}')
    const r = resolveBlueprintFile('@prj/blueprints/foo', 'Foo', tmpDir)
    expect(r).toEqual({
      scope: '@prj',
      filePath: join(tmpDir, '.openxenon/blueprints/foo.oxn'),
    })
  })

  test('@prj/blueprints/X kebab 回退', () => {
    writeBlueprintFile('fix-issue', 'blueprint "fix-issue" {}')
    const r = resolveBlueprintFile('@prj/blueprints/fix-issue', 'fix-issue', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/blueprints/fix-issue.oxn'))
  })

  test('bare name', () => {
    writeBlueprintFile('foo', 'blueprint "Foo" {}')
    const r = resolveBlueprintFile(null, 'foo', tmpDir)
    expect(r?.filePath).toBe(join(tmpDir, '.openxenon/blueprints/foo.oxn'))
  })

  test('@oxn/ → null', () => {
    expect(resolveBlueprintFile('@oxn/blueprints/foo', 'Foo', tmpDir)).toBe(null)
  })

  test('找不到 → null', () => {
    expect(resolveBlueprintFile(null, 'nonexistent', tmpDir)).toBe(null)
  })
})

// ───────── buildPerWorkBlueprintsIndex ─────────

describe('buildPerWorkBlueprintsIndex', () => {
  test('happy path：1 blueprint + 4 slots', () => {
    writeBlueprintFile(
      'pipeline',
      `blueprint "pipeline" {
  version = 1
  slot "retrieve" { observe = ["fs-match"] }
  slot "design"   { deps = ["retrieve"]; observe = ["fs-exists"] }
  slot "develop"  { deps = ["design"]; observe = ["lint-check", "type-check"] }
  slot "test"     { deps = ["develop"]; observe = ["test-runner"] }
}
`,
    )
    writeFileSync(
      workOxnPath,
      `work "demo" {
  blueprint "pipeline" ref "@prj/blueprints/pipeline";
}
`,
    )
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.schemaVersion).toBe(1)
    expect(idx.blueprintCount).toBe(1)
    expect(idx.invalidCount).toBe(0)
    expect(idx.declaredRefs).toEqual(['@prj/blueprints/pipeline'])
    const bp = idx.blueprints[0]
    expect(bp?.name).toBe('pipeline')
    expect(bp?.version).toBe(1)
    expect(bp?.slots).toHaveLength(4)
    expect(bp?.slots.map((s) => s.name)).toEqual(['retrieve', 'design', 'develop', 'test'])
    expect(bp?.slots[2]?.observe).toEqual(['lint-check', 'type-check'])
  })

  test('同 name 去重', () => {
    writeBlueprintFile('a', 'blueprint "A" { version = 1 slot "x" {} }')
    writeFileSync(
      workOxnPath,
      `work "demo" {
  blueprint "A" ref "@prj/blueprints/a";
  blueprint "A" ref "@prj/blueprints/a";
}
`,
    )
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.blueprintCount).toBe(1)
  })

  test('ref 找不到文件 → invalid + error', () => {
    writeFileSync(workOxnPath, `work "demo" { blueprint "ghost" ref "@prj/blueprints/ghost"; }\n`)
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.blueprints[0]?.status).toBe('invalid')
    expect(idx.blueprints[0]?.errors[0]).toContain('not found')
  })

  test('@oxn/ scope → invalid + error', () => {
    writeFileSync(workOxnPath, `work "demo" { blueprint "Foo" ref "@oxn/blueprints/foo"; }\n`)
    const idx = buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workOxnPath })
    expect(idx.blueprints[0]?.scope).toBe('@oxn')
    expect(idx.blueprints[0]?.status).toBe('invalid')
    expect(idx.blueprints[0]?.errors[0]).toContain('@oxn/')
  })

  test('work.oxn 不存在 → 抛错', () => {
    writeFileSync(workOxnPath, 'work "demo" {}\n')
    rmSync(workOxnPath)
    expect(() => buildPerWorkBlueprintsIndex({ projectRoot: tmpDir, workName, workOxnPath })).toThrow(
      /work.oxn not found/,
    )
  })
})

// ───────── writePerWorkBlueprintsIndex / loadPerWorkBlueprintsIndex ─────────

describe('writePerWorkBlueprintsIndex / loadPerWorkBlueprintsIndex', () => {
  test('原子写 + 读回', () => {
    writeBlueprintFile('p', 'blueprint "P" { slot "x" {} }')
    writeFileSync(workOxnPath, `work "demo" { blueprint "P" ref "@prj/blueprints/p"; }\n`)
    const outPath = getPerWorkBlueprintsJsonPath(tmpDir, workName)
    const _idx = writePerWorkBlueprintsIndex({
      projectRoot: tmpDir,
      workName,
      workOxnPath,
      outPath,
    })
    expect(existsSync(outPath)).toBe(true)
    expect(existsSync(`${outPath}.tmp`)).toBe(false)
    const reloaded = loadPerWorkBlueprintsIndex(outPath)
    expect(reloaded?.blueprintCount).toBe(1)
    expect(reloaded?.blueprints[0]?.slots[0]?.name).toBe('x')
  })

  test('load: 缺文件 → null', () => {
    expect(loadPerWorkBlueprintsIndex(join(tmpDir, 'nope.json'))).toBe(null)
  })

  test('load: schema 不匹配 → null', () => {
    const outPath = getPerWorkBlueprintsJsonPath(tmpDir, workName)
    writeFileSync(outPath, JSON.stringify({ schemaVersion: 99 }))
    expect(loadPerWorkBlueprintsIndex(outPath)).toBe(null)
  })
})
