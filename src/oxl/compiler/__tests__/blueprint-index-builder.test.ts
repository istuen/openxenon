// =============================================================================
// blueprint-index-builder.test.ts — PR-X 单元测试
//
// 覆盖：
//   1. scanBlueprintFiles 递归扫 .oxn，跳过隐藏 / 非 .oxn
//   2. parseBlueprintSlim 提取 name/description/version/slotNames/propCount
//   3. parseBlueprintSlim 处理 parse error 优雅降级（status=invalid）
//   4. parseBlueprintSlim NAME_FILE_MISMATCH 防御（declared vs file stem）
//   5. parseBlueprintSlim description 多行报错
//   6. buildBlueprintIndex 完整组装
//   7. writeBlueprintIndex 原子写（产生文件 + .tmp 已清理）
//   8. loadBlueprintIndex schema 校验失败返回 null
//   9. getBlueprintIndexPath 路径正确
//  10. toKebab 规范化
// =============================================================================

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import {
  BlueprintIndexSchema,
  buildBlueprintIndex,
  getBlueprintIndexPath,
  loadBlueprintIndex,
  parseBlueprintSlim,
  resolveBlueprintIndexPath,
  scanBlueprintFiles,
  toKebab,
  writeBlueprintIndex,
} from '../blueprint-index-builder'

let tmpDir: string
let blueprintsDir: string
let cacheDir: string

beforeEach(() => {
  tmpDir = join(tmpdir(), `blueprint-index-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  blueprintsDir = join(tmpDir, '.openxenon', 'blueprints')
  cacheDir = join(tmpDir, '.openxenon', '.cache')
  mkdirSync(blueprintsDir, { recursive: true })
})

afterEach(() => {
  if (existsSync(tmpDir)) {
    rmSync(tmpDir, { recursive: true, force: true })
  }
})

// ───────── scanBlueprintFiles ─────────

describe('scanBlueprintFiles', () => {
  test('空目录返回空数组', () => {
    const { files } = scanBlueprintFiles(blueprintsDir)
    expect(files).toEqual([])
  })

  test('不存在的目录返回空数组（不抛错）', () => {
    const { files } = scanBlueprintFiles(join(tmpDir, 'nonexistent'))
    expect(files).toEqual([])
  })

  test('扫到 .oxn 文件', () => {
    writeFileSync(join(blueprintsDir, 'foo.oxn'), 'blueprint "foo" {}')
    writeFileSync(join(blueprintsDir, 'bar.oxn'), 'blueprint "bar" {}')
    const { files } = scanBlueprintFiles(blueprintsDir)
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.relPath).sort()).toEqual(['bar.oxn', 'foo.oxn'])
  })

  test('递归子目录', () => {
    const sub = join(blueprintsDir, 'sub', 'nested')
    mkdirSync(sub, { recursive: true })
    writeFileSync(join(blueprintsDir, 'top.oxn'), 'blueprint "top" {}')
    writeFileSync(join(sub, 'deep.oxn'), 'blueprint "deep" {}')
    const { files } = scanBlueprintFiles(blueprintsDir)
    expect(files).toHaveLength(2)
    expect(files.map((f) => f.relPath).sort()).toEqual(['sub/nested/deep.oxn', 'top.oxn'])
  })

  test('跳过隐藏文件与目录', () => {
    writeFileSync(join(blueprintsDir, 'visible.oxn'), 'blueprint "visible" {}')
    writeFileSync(join(blueprintsDir, '.hidden.oxn'), 'blueprint "hidden" {}')
    mkdirSync(join(blueprintsDir, '.git'))
    writeFileSync(join(blueprintsDir, '.git', 'should-skip.oxn'), 'blueprint "skip" {}')
    const { files } = scanBlueprintFiles(blueprintsDir)
    expect(files.map((f) => f.relPath)).toEqual(['visible.oxn'])
  })

  test('跳过非 .oxn 文件', () => {
    writeFileSync(join(blueprintsDir, 'good.oxn'), 'blueprint "good" {}')
    writeFileSync(join(blueprintsDir, 'readme.md'), '# not a blueprint')
    writeFileSync(join(blueprintsDir, 'data.json'), '{}')
    const { files } = scanBlueprintFiles(blueprintsDir)
    expect(files.map((f) => f.relPath)).toEqual(['good.oxn'])
  })
})

// ───────── parseBlueprintSlim ─────────

describe('parseBlueprintSlim', () => {
  test('完整 Blueprint（description + version + 2 slots + 2 props）', () => {
    const file = join(blueprintsDir, 'dev-workflow.oxn')
    writeFileSync(
      file,
      `blueprint "dev-workflow" {
  version = 1
  description = "通用开发流水线"
  prop "timeout" { type = number; default = 60000 }
  prop "strict" { type = boolean; default = true }
  slot "build" { deps = []; observe = ["deps-resolved"] }
  slot "develop" { deps = ["build"] }
}
`,
    )
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.name).toBe('dev-workflow')
    expect(result.file).toBe('.openxenon/blueprints/dev-workflow.oxn')
    expect(result.status).toBe('ok')
    expect(result.description).toBe('通用开发流水线')
    expect(result.version).toBe(1)
    expect(result.slotNames).toEqual(['build', 'develop'])
    expect(result.propCount).toBe(2)
    expect(result.errors).toEqual([])
  })

  test('空 Blueprint（无 description/version/slot/prop）', () => {
    const file = join(blueprintsDir, 'empty.oxn')
    writeFileSync(file, `blueprint "empty" {}\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.name).toBe('empty')
    expect(result.status).toBe('ok')
    expect(result.description).toBeUndefined()
    expect(result.version).toBe(1)
    expect(result.slotNames).toEqual([])
    expect(result.propCount).toBe(0)
  })

  test('version 缺省时默认 1', () => {
    const file = join(blueprintsDir, 'nover.oxn')
    writeFileSync(file, `blueprint "nover" { description = "no version" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.version).toBe(1)
  })

  test('version 非数字 → errors 标注但仍记入 version=1', () => {
    const file = join(blueprintsDir, 'badver.oxn')
    writeFileSync(file, `blueprint "badver" { version = "abc" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.errors).toContain('invalid version: abc')
    expect(result.version).toBe(1)
  })

  test('version 合法 > 1（如 v=2）', () => {
    const file = join(blueprintsDir, 'v2.oxn')
    writeFileSync(file, `blueprint "v2" { version = 2; description = "v2 blueprint" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.version).toBe(2)
  })

  test('NAME_FILE_MISMATCH 防御：declared "DevWorkflow" vs file "dev-workflow.oxn"（PascalCase 文件名）', () => {
    const file = join(blueprintsDir, 'dev-workflow.oxn')
    writeFileSync(file, `blueprint "DevWorkflow" { version = 1; description = "x" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.name).toBe('DevWorkflow')
    expect(result.status).toBe('ok')
    expect(result.errors).toEqual([]) // declared 'DevWorkflow'.toKebab() === file 'dev-workflow'.toKebab() → 一致
  })

  test('NAME_FILE_MISMATCH 触发：declared "Foo" vs file "bar.oxn"', () => {
    const file = join(blueprintsDir, 'bar.oxn')
    writeFileSync(file, `blueprint "Foo" { version = 1 }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.errors[0]).toContain('NAME_FILE_MISMATCH')
    expect(result.errors[0]).toContain("declared 'Foo'")
  })

  test('无 blueprint 声明 → status=invalid', () => {
    const file = join(blueprintsDir, 'broken.oxn')
    writeFileSync(file, `// nothing here\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.errors).toContain('no `blueprint "X" { ... }` declaration found')
  })

  test('文件不存在 → status=invalid + file 路径仍记录', () => {
    const file = join(blueprintsDir, 'missing.oxn')
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.file).toBe('.openxenon/blueprints/missing.oxn')
    expect(result.errors[0]).toContain('file not found')
  })

  test('description 含换行 → errors 标注', () => {
    const file = join(blueprintsDir, 'multiline.oxn')
    writeFileSync(file, `blueprint "multiline" { description = "line1\nline2" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.status).toBe('invalid')
    expect(result.errors).toContain('description spans multiple lines (likely parse issue)')
  })

  test('description 含转义引号 \\" 应还原', () => {
    const file = join(blueprintsDir, 'esc.oxn')
    writeFileSync(file, `blueprint "esc" { description = "say \\"hi\\"" }\n`)
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.description).toBe('say "hi"')
  })

  test('slot 名列表按文本顺序', () => {
    const file = join(blueprintsDir, 'order.oxn')
    writeFileSync(
      file,
      `blueprint "order" {
  slot "zeta" { deps = [] }
  slot "alpha" { deps = ["zeta"] }
  slot "beta" { deps = ["zeta"] }
}
`,
    )
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.slotNames).toEqual(['zeta', 'alpha', 'beta'])
  })

  test('prop 多行展开为 propCount', () => {
    const file = join(blueprintsDir, 'props.oxn')
    writeFileSync(
      file,
      `blueprint "props" {
  prop "a" { type = string }
  prop "b" { type = number; default = 1 }
  prop "c" { type = list<string> }
  slot "s" { deps = [] }
}
`,
    )
    const result = parseBlueprintSlim(file, tmpDir)
    expect(result.propCount).toBe(3)
  })
})

// ───────── buildBlueprintIndex ─────────

describe('buildBlueprintIndex', () => {
  test('空目录产生空索引（blueprintCount=0）', () => {
    const idx = buildBlueprintIndex({ projectRoot: tmpDir, blueprintsDir })
    expect(idx.schemaVersion).toBe(1)
    expect(idx.projectRoot).toBe(tmpDir)
    expect(idx.blueprintsDir).toBe('.openxenon/blueprints')
    expect(idx.blueprintCount).toBe(0)
    expect(idx.blueprints).toEqual([])
  })

  test('3 个 blueprint 完整索引', () => {
    writeFileSync(
      join(blueprintsDir, 'a.oxn'),
      `blueprint "a" { description = "alpha"; version = 1; slot "s1" { deps = [] } }`,
    )
    writeFileSync(
      join(blueprintsDir, 'b.oxn'),
      `blueprint "b" { version = 2; prop "p" { type = string }; slot "s" { deps = [] } }`,
    )
    writeFileSync(join(blueprintsDir, 'c.oxn'), `blueprint "c" {}`)

    const idx = buildBlueprintIndex({ projectRoot: tmpDir, blueprintsDir, generatedAt: '2026-06-08T00:00:00.000Z' })
    expect(idx.blueprintCount).toBe(3)
    expect(idx.generatedAt).toBe('2026-06-08T00:00:00.000Z')
    expect(idx.blueprints.map((b) => b.name).sort()).toEqual(['a', 'b', 'c'])
    const a = idx.blueprints.find((b) => b.name === 'a')
    expect(a?.slotNames).toEqual(['s1'])
    expect(a?.propCount).toBe(0)
    expect(a?.version).toBe(1)
    const b = idx.blueprints.find((x) => x.name === 'b')
    expect(b?.propCount).toBe(1)
    expect(b?.version).toBe(2)
  })

  test('混合 ok + invalid：invalid 仍记入索引', () => {
    writeFileSync(join(blueprintsDir, 'good.oxn'), `blueprint "good" {}`)
    writeFileSync(join(blueprintsDir, 'bad.oxn'), `// no blueprint decl`)
    const idx = buildBlueprintIndex({ projectRoot: tmpDir, blueprintsDir })
    expect(idx.blueprintCount).toBe(2)
    expect(idx.blueprints.find((b) => b.name === 'good')?.status).toBe('ok')
    expect(idx.blueprints.find((b) => b.file === '.openxenon/blueprints/bad.oxn')?.status).toBe('invalid')
  })
})

// ───────── writeBlueprintIndex + loadBlueprintIndex ─────────

describe('writeBlueprintIndex / loadBlueprintIndex', () => {
  test('writeBlueprintIndex 原子写：产生 .json 文件 + .tmp 已清理', () => {
    writeFileSync(join(blueprintsDir, 'x.oxn'), `blueprint "x" {}`)
    const outPath = join(cacheDir, 'blueprints.json')
    const idx = writeBlueprintIndex({ projectRoot: tmpDir, blueprintsDir, outPath })
    expect(existsSync(outPath)).toBe(true)
    expect(existsSync(`${outPath}.tmp`)).toBe(false)
    expect(idx.blueprintCount).toBe(1)

    // 落盘内容是合法 JSON
    const reloaded = loadBlueprintIndex(outPath)
    expect(reloaded).not.toBeNull()
    expect(reloaded?.blueprintCount).toBe(1)
    expect(reloaded?.blueprints[0]?.name).toBe('x')
  })

  test('loadBlueprintIndex: 文件不存在 → null', () => {
    const reloaded = loadBlueprintIndex(join(cacheDir, 'nope.json'))
    expect(reloaded).toBeNull()
  })

  test('loadBlueprintIndex: schema 不合法 → null（不抛）', () => {
    const outPath = join(cacheDir, 'blueprints.json')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(outPath, JSON.stringify({ schemaVersion: 99, totally: 'wrong' }))
    expect(loadBlueprintIndex(outPath)).toBeNull()
  })

  test('loadBlueprintIndex: JSON 解析失败 → null', () => {
    const outPath = join(cacheDir, 'blueprints.json')
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(outPath, 'not json {')
    expect(loadBlueprintIndex(outPath)).toBeNull()
  })

  test('Zod schema round-trip: build → write → load → re-validate', () => {
    writeFileSync(join(blueprintsDir, 'a.oxn'), `blueprint "a" { version = 1; description = "x" }`)
    const idx = writeBlueprintIndex({ projectRoot: tmpDir, blueprintsDir, outPath: join(cacheDir, 'b.json') })
    const reloaded = loadBlueprintIndex(join(cacheDir, 'b.json'))
    expect(reloaded).toEqual(idx)
    const result = BlueprintIndexSchema.safeParse(reloaded)
    expect(result.success).toBe(true)
  })
})

// ───────── 路径工具 ─────────

describe('path helpers', () => {
  test('getBlueprintIndexPath', () => {
    expect(getBlueprintIndexPath('/proj')).toBe('/proj/.openxenon/.cache/blueprints.json')
  })

  test('resolveBlueprintIndexPath: 不传 emit → 默认路径', () => {
    expect(resolveBlueprintIndexPath('/proj')).toBe('/proj/.openxenon/.cache/blueprints.json')
  })

  test('resolveBlueprintIndexPath: 相对路径 → 拼到 projectRoot', () => {
    expect(resolveBlueprintIndexPath('/proj', 'foo/bar.json')).toBe('/proj/foo/bar.json')
  })

  test('resolveBlueprintIndexPath: 绝对路径 → 原样使用', () => {
    expect(resolveBlueprintIndexPath('/proj', '/tmp/other.json')).toBe('/tmp/other.json')
  })
})

// ───────── toKebab ─────────

describe('toKebab', () => {
  test('PascalCase 转 kebab-case', () => {
    expect(toKebab('DevWorkflow')).toBe('dev-workflow')
    expect(toKebab('MemberContext')).toBe('member-context')
  })
  test('snake_case 转 kebab-case', () => {
    expect(toKebab('fix_issue')).toBe('fix-issue')
  })
  test('已经是 kebab-case → 原样', () => {
    expect(toKebab('dev-workflow')).toBe('dev-workflow')
  })
  test('多驼峰连续大写处理（"URLPath" → "url-path"）', () => {
    expect(toKebab('URLPath')).toBe('url-path')
  })
})
