import { describe, expect, test } from 'bun:test'
import { existsSync, mkdirSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

// ========================
// Task 2.1: Asset Loader
// ========================
import { createAssetLoader } from '../loader/oxn-loader'

describe('OxnAssetLoader (Task 2.1)', () => {
  test('创建加载器并加载内置探针', () => {
    const loader = createAssetLoader()
    const result = loader.loadAll('probe', ['oxn'])
    expect(result.assets.length).toBeGreaterThanOrEqual(4)
  })

  test('构建索引', () => {
    const loader = createAssetLoader()
    const index = loader.buildIndex()
    expect(index.size).toBeGreaterThan(0)
    expect(index.has('oxn:probe')).toBe(true)
    expect(index.has('oxn:part')).toBe(true)
  })

  test('索引统计', () => {
    const loader = createAssetLoader()
    loader.buildIndex()
    const stats = loader.getIndexStats()
    expect(stats['oxn:probe']).toBeGreaterThanOrEqual(4)
    expect(stats['oxn:part']).toBeGreaterThanOrEqual(3)
  })

  test('getWorkspace 返回工作空间管理器', () => {
    const loader = createAssetLoader()
    const ws = loader.getWorkspace()
    expect(ws.list('oxn', 'probe').length).toBeGreaterThan(0)
  })
})

import type { OxnAssemblyBundle } from '../schemas/oxn-assembly.schema'
// ========================
// Task 2.2: Bundle Flattener
// ========================
import { BundleFlattener, flattenBundle } from '../flattener/bundle-flattener'

describe('BundleFlattener (Task 2.2)', () => {
  function makeBundle(): OxnAssemblyBundle {
    return {
      entities: [
        {
          type: 'blueprint',
          data: {
            name: 'test-bp',
            id: 'test-bp',
            _version: 1,
            props: [],
            stages: [],
          },
        },
      ],
    }
  }

  test('单实体 flatten 不变', () => {
    const bundle = makeBundle()
    const result = flattenBundle(bundle)
    expect(result.bundle.entities).toHaveLength(1)
    expect(result.unresolved).toHaveLength(0)
  })

  test('flattenToString 输出 .oxn 格式', () => {
    const bundle = makeBundle()
    const flattener = new BundleFlattener()
    const output = flattener.flattenToString(bundle)
    expect(output).toContain('OXN Bundle')
    expect(output).toContain('blueprint "test-bp"')
  })

  test('嵌套 blueprint 保留不变', () => {
    const bundle: OxnAssemblyBundle = {
      entities: [
        { type: 'blueprint', data: { name: 'bp1', _version: 1 } },
        { type: 'part', data: { name: 'part1', isAbstract: false, props: [], probes: [], execution: [] } },
      ],
    }
    const result = flattenBundle(bundle)
    expect(result.bundle.entities).toHaveLength(2)
  })
})

// ========================
// Task 2.3: Bundle Compiler
// ========================
import { compileBundle } from '../compiler/bundle-compiler'

describe('BundleCompiler (Task 2.3)', () => {
  const tmpDir = '/tmp/oxn-compile-test'

  test('编译 YAML 产出三件套', () => {
    mkdirSync(tmpDir, { recursive: true })
    const yamlPath = join(tmpDir, 'test-compile.yaml')
    writeFileSync(
      yamlPath,
      `name: test-compile
stages:
  - id: check
    name: 检查
    probes:
      - type: fs_exists
        params:
          pattern: "*.ts"
`,
      'utf-8',
    )

    const result = compileBundle(yamlPath, tmpDir)
    expect(result.entityCount).toBe(1)
    expect(existsSync(result.bundlePath)).toBe(true)
    expect(existsSync(result.assemblyPath)).toBe(true)
    expect(existsSync(result.schemaPath)).toBe(true)

    // verify assembly.json is valid JSON
    const assembly = JSON.parse(readFileSync(result.assemblyPath, 'utf-8'))
    expect(assembly.entities).toBeDefined()

    // cleanup
    unlinkSync(yamlPath)
    unlinkSync(result.bundlePath)
    unlinkSync(result.assemblyPath)
    unlinkSync(result.schemaPath)
  })

  test('不存在的文件抛异常', () => {
    expect(() => compileBundle('/tmp/nonexistent.oxn')).toThrow()
  })
})

// ========================
// Task 2.4: Bundle Unpacker
// ========================
import { BundleUnpacker, unpackBundle } from '../unpacker/bundle-unpacker'

describe('BundleUnpacker (Task 2.4)', () => {
  const tmpDir = '/tmp/oxn-unpack-test'

  test('解包 bundle 到隔离目录', () => {
    mkdirSync(tmpDir, { recursive: true })
    const bundlePath = join(tmpDir, 'test.bundle.oxn')
    writeFileSync(bundlePath, '// test bundle', 'utf-8')

    const result = unpackBundle(bundlePath)
    expect(existsSync(result.targetDir)).toBe(true)
    expect(result.files.length).toBeGreaterThanOrEqual(1)

    // cleanup
    for (const f of result.files) unlinkSync(f)
    unlinkSync(bundlePath)
    rmdirSync(result.targetDir)
  })

  test('不可覆盖已有文件（安全模式）', () => {
    mkdirSync(tmpDir, { recursive: true })
    const bundlePath = join(tmpDir, 'safe.bundle.oxn')
    writeFileSync(bundlePath, '// bundle', 'utf-8')

    // First unpack
    const r1 = unpackBundle(bundlePath)
    expect(r1.skipped).toHaveLength(0)

    // Second unpack - should skip
    const r2 = unpackBundle(bundlePath)
    expect(r2.skipped.length).toBeGreaterThanOrEqual(1)
    expect(r2.files).toHaveLength(0)

    // cleanup
    for (const f of r1.files) unlinkSync(f)
    unlinkSync(bundlePath)
    rmdirSync(r1.targetDir)
  })

  test('force 模式覆盖', () => {
    mkdirSync(tmpDir, { recursive: true })
    const bundlePath = join(tmpDir, 'force.bundle.oxn')
    writeFileSync(bundlePath, '// bundle', 'utf-8')

    unpackBundle(bundlePath)
    const r2 = new BundleUnpacker().unpackForce(bundlePath)
    expect(r2.files.length).toBeGreaterThanOrEqual(1)

    // cleanup
    for (const f of r2.files) unlinkSync(f)
    unlinkSync(bundlePath)
    rmdirSync(r2.targetDir)
  })
})

// ========================
// Task 2.5: Builtin OXN
// ========================

describe('Builtin OXN Assets (Task 2.5)', () => {
  // v1.1: builtin-probes.oxn 已删除——探针现在通过 PROBE_CATALOG（src/kernel/probes/catalog.ts）
  // 单一真相源管理。builtin parts 保留为 .oxn 文件作为 schema 样例。

  test('builtin parts .oxn 文件存在', () => {
    expect(existsSync('src/oxn-dsl/builtin/parts/builtin-parts.oxn')).toBe(true)
  })

  test('builtin parts 包含 3 个零件', () => {
    const content = readFileSync('src/oxn-dsl/builtin/parts/builtin-parts.oxn', 'utf-8')
    const partCount = (content.match(/part "/g) || []).length
    expect(partCount).toBe(3)
    expect(content).toContain('git-commit')
    expect(content).toContain('develop-feature')
  })

  test('builtin parts 使用 @oxn/ 作用域引用探针', () => {
    const content = readFileSync('src/oxn-dsl/builtin/parts/builtin-parts.oxn', 'utf-8')
    expect(content).toContain('@oxn/probes/exec-exit-zero')
  })
})
