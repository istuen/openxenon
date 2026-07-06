// Asset Paper 4 字段 + Stack/Roadmap 声明测试 (v0.6.1-alpha.1)
//
// 覆盖：
// - Domain 4 字段（abstract / references / citations / version）
// - Blueprint 4 字段
// - Stack 声明（runtime / linter / test 三类块）
// - Roadmap 声明（references 留空，body 含 Asset 链接）
// - AssetKind = 'roadmap' 扩展
// = 5 组合 × 3-4 用例 = 18 用例

import { beforeAll, describe, expect, test } from 'bun:test'
import { URI } from 'langium'
import {
  createOxnParser,
  isDomainDeclaration,
  isBlueprintDeclaration,
  isStackDeclaration,
  isRoadmapDeclaration,
  getDomainVersion,
  getBlueprintVersion,
  getStackVersion,
  getRoadmapVersion,
  type DomainDeclaration,
  type BlueprintDeclaration,
  type StackDeclaration,
  type RoadmapDeclaration,
} from '../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: ReturnType<typeof createOxnParser>

beforeAll(() => {
  parser = createOxnParser()
})

interface ParseResult<T> {
  parseErrors: string[]
  lexerErrors: string[]
  entity: T | undefined
}

async function parseFirst<T>(src: string, guard: (e: unknown) => e is T): Promise<ParseResult<T>> {
  const r = await parser.parse(src, URI.file('/tmp/asset-paper-test.oxn'))
  return {
    parseErrors: r.parseErrors,
    lexerErrors: r.lexerErrors,
    entity: r.ast?.entities.find(guard) as T | undefined,
  }
}

function okParse<T>(r: ParseResult<T>) {
  expect(r.parseErrors).toEqual([])
  expect(r.lexerErrors).toEqual([])
  expect(r.entity).toBeDefined()
}

// ---------------------------------------------------------------------------
// Section 1: Domain 4 字段（v0.6.1-alpha.1 引入）
// ---------------------------------------------------------------------------

describe('Domain · Asset Paper 4 fields', () => {
  test('1.1 4 字段全填（assetVersion 新代码）', async () => {
    const r = await parseFirst<DomainDeclaration>(
      `domain "payment-core" {
        assetVersion = 1
        abstract = "支付核心领域定义"
        references = ["stack-nodejs", "api-rest-standard"]
        citations = 3
        term { "Payment": "支付实体" }
      }`,
      isDomainDeclaration,
    )
    okParse(r)
    const d = r.entity as DomainDeclaration
    expect(getDomainVersion(d)).toBe(1)
    expect(d.abstract).toBe('支付核心领域定义')
    expect(d.references).toEqual(['stack-nodejs', 'api-rest-standard'])
    expect(d.citations).toBe(3)
  })

  test('1.2 仅 abstract（其他字段省略）', async () => {
    const r = await parseFirst<DomainDeclaration>(
      `domain "x" {
        abstract = "Only abstract"
        term { "A": "a" }
      }`,
      isDomainDeclaration,
    )
    okParse(r)
    expect((r.entity as DomainDeclaration).abstract).toBe('Only abstract')
    expect((r.entity as DomainDeclaration).references).toEqual([])
  })

  test('1.3 references 数组为空', async () => {
    const r = await parseFirst<DomainDeclaration>(
      `domain "x" {
        references = []
        term { "A": "a" }
      }`,
      isDomainDeclaration,
    )
    okParse(r)
    expect((r.entity as DomainDeclaration).references).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Section 2: Blueprint 4 字段
// ---------------------------------------------------------------------------

describe('Blueprint · Asset Paper 4 fields', () => {
  test('2.1 4 字段全填（assetVersion 新代码）', async () => {
    const r = await parseFirst<BlueprintDeclaration>(
      `blueprint "dev-workflow" {
        assetVersion = 1
        abstract = "标准开发流程"
        references = ["domain-core", "stack-nodejs"]
        citations = 5
        slot "build" { deps = [] }
      }`,
      isBlueprintDeclaration,
    )
    okParse(r)
    const b = r.entity as BlueprintDeclaration
    expect(getBlueprintVersion(b)).toBe(1)
    expect(b.abstract).toBe('标准开发流程')
    expect(b.references).toEqual(['domain-core', 'stack-nodejs'])
    expect(b.citations).toBe(5)
  })

  test('2.2 citations 省略（Engine 自动计算）', async () => {
    const r = await parseFirst<BlueprintDeclaration>(
      `blueprint "x" {
        abstract = "Test"
        slot "a" { deps = [] }
      }`,
      isBlueprintDeclaration,
    )
    okParse(r)
    expect((r.entity as BlueprintDeclaration).citations).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Section 3: Stack 声明（v0.6.1-alpha.1 新增）
// ---------------------------------------------------------------------------

describe('Stack · 新增声明', () => {
  test('3.1 Stack 含 runtime + linter + test（assetVersion）', async () => {
    const r = await parseFirst<StackDeclaration>(
      `stack "ts-bun" {
        assetVersion = 1
        abstract = "TypeScript + Bun 运行时"
        references = []
        runtime "typescript" { "version" = ">=5.0.0" }
        linter "biome" { "config" = "biome.json" }
        test "bun-test" { "command" = "bun test" }
      }`,
      isStackDeclaration,
    )
    okParse(r)
    const s = r.entity as StackDeclaration
    expect(getStackVersion(s)).toBe(1)
    expect(s.runtimes).toHaveLength(1)
    expect(s.linters).toHaveLength(1)
    expect(s.testers).toHaveLength(1)
  })

  test('3.2 Stack 仅 abstract（无 runtime/linter/test 块）', async () => {
    const r = await parseFirst<StackDeclaration>(
      `stack "x" {
        abstract = "Empty stack"
      }`,
      isStackDeclaration,
    )
    okParse(r)
    expect((r.entity as StackDeclaration).runtimes).toEqual([])
  })

  test('3.3 Stack 多 runtime 块', async () => {
    const r = await parseFirst<StackDeclaration>(
      `stack "polyglot" {
        runtime "typescript" { "version" = ">=5.0.0" }
        runtime "python" { "version" = ">=3.11" }
      }`,
      isStackDeclaration,
    )
    okParse(r)
    expect((r.entity as StackDeclaration).runtimes).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Section 4: Roadmap 声明（v0.6.1-alpha.1 新增，特殊设计）
// ---------------------------------------------------------------------------

describe('Roadmap · 新增声明（references 留空）', () => {
  test('4.1 Roadmap 完整声明（assetVersion）', async () => {
    const r = await parseFirst<RoadmapDeclaration>(
      `roadmap "project-map" {
        assetVersion = 1
        abstract = "项目知识地图"
        citations = 0
        "domain/core.oxn"
        "stack/nodejs.oxn"
      }`,
      isRoadmapDeclaration,
    )
    okParse(r)
    const rm = r.entity as RoadmapDeclaration
    expect(getRoadmapVersion(rm)).toBe(1)
    expect(rm.abstract).toBe('项目知识地图')
    expect(rm.citations).toBe(0)
    expect(rm.links).toHaveLength(2)
    expect(rm.links[0]?.target).toBe('domain/core.oxn')
  })

  test('4.2 Roadmap 无 body links（仅 abstract）', async () => {
    const r = await parseFirst<RoadmapDeclaration>(
      `roadmap "empty" {
        abstract = "Empty roadmap"
      }`,
      isRoadmapDeclaration,
    )
    okParse(r)
    expect((r.entity as RoadmapDeclaration).links).toEqual([])
  })

  test('4.3 Roadmap 不允许 references（语法级禁止）', async () => {
    const r = await parseFirst<RoadmapDeclaration>(
      `roadmap "x" {
        abstract = "test"
        references = ["y"]   // 故意放错位置
        "domain/core.oxn"
      }`,
      isRoadmapDeclaration,
    )
    // 期望 parseErrors > 0（references 不是 Roadmap 的合法字段）
    expect(r.parseErrors.length + r.lexerErrors.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Section 6: v0.6.1-alpha.1 字段重命名 'version' → 'assetVersion'
// 旧 'version = N' 语法已废弃（避免与 PropKV 'version' 关键字冲突）
// 新代码统一用 'assetVersion = N'
// ---------------------------------------------------------------------------

describe('v0.6.1-alpha.1 · assetVersion 字段重命名', () => {
  test('6.1 Blueprint `assetVersion = 1` 是新代码推荐', async () => {
    const r = await parseFirst<BlueprintDeclaration>(
      `blueprint "x" {
        assetVersion = 1
        slot "a" { deps = [] }
      }`,
      isBlueprintDeclaration,
    )
    okParse(r)
    const b = r.entity as BlueprintDeclaration
    expect(b.version).toBe(1)
  })

  test('6.1b Blueprint `version = 1` 仍可解析（向后兼容）', async () => {
    const r = await parseFirst<BlueprintDeclaration>(
      `blueprint "x" {
        version = 1
        slot "a" { deps = [] }
      }`,
      isBlueprintDeclaration,
    )
    okParse(r)
    const b = r.entity as BlueprintDeclaration
    expect(b.version).toBe(1)
  })

  test('6.2 Blueprint 旧 `version = 1` 仍可解析（向后兼容）', async () => {
    // v0.6.1-alpha.1 保留 'version = 1' 语法作为向后兼容
    // 新代码推荐 'assetVersion = 1'（与 PropKV 'version' 区分）
    const r = await parseFirst<BlueprintDeclaration>(
      `blueprint "x" {
        version = 1
        slot "a" { deps = [] }
      }`,
      isBlueprintDeclaration,
    )
    okParse(r)
    const b = r.entity as BlueprintDeclaration
    expect(b.version).toBe(1)
  })

  test('6.3 Domain `assetVersion` 字段', async () => {
    const r2 = await parseFirst<DomainDeclaration>(
      `domain "x" { assetVersion = 1 term { "A": "a" } }`,
      isDomainDeclaration,
    )
    okParse(r2)
    expect(getDomainVersion(r2.entity as DomainDeclaration)).toBe(1)
  })

  test('6.4 Stack 内 runtime 块用 `version` 作 key 不冲突', async () => {
    // 这是核心回归测试：runtime 块的 PropKV 中 key="version" 与外层
    // StackDeclaration 的 'assetVersion' 字段不冲突。已通过重命名解决。
    const r = await parseFirst<StackDeclaration>(
      `stack "s" {
        runtime "node" { "version" = "20" }
      }`,
      isStackDeclaration,
    )
    okParse(r)
    const s = r.entity as StackDeclaration
    expect(s.runtimes[0]?.props[0]?.name).toBe('version')
    expect(s.runtimes[0]?.props[0]?.value).toBe('20')
  })

  test('6.5 getBlueprintVersion 返回 version', () => {
    const b = { version: 5 } as BlueprintDeclaration
    expect(getBlueprintVersion(b)).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Section 5: AssetKind 扩展验证（间接）
// ---------------------------------------------------------------------------

describe('AssetKind 扩展（v0.6.1-alpha.1）', () => {
  test('5.1 所有 4 个 AssetKind 都能被 parser 识别', async () => {
    const r = await parser.parse(
      `domain "d" { term { "A": "a" } }
blueprint "b" { slot "x" { deps = [] } }
stack "s" { runtime "node" { "version" = "20" } }
roadmap "r" { abstract = "map" }`,
      URI.file('/tmp/assetkind-test.oxn'),
    )
    expect(r.parseErrors).toEqual([])
    expect(r.lexerErrors).toEqual([])
    const entities = r.ast?.entities ?? []
    expect(entities).toHaveLength(4)
    expect(entities.filter(isDomainDeclaration)).toHaveLength(1)
    expect(entities.filter(isBlueprintDeclaration)).toHaveLength(1)
    expect(entities.filter(isStackDeclaration)).toHaveLength(1)
    expect(entities.filter(isRoadmapDeclaration)).toHaveLength(1)
  })
})
