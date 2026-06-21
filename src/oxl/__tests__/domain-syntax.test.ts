// Domain 语法边界测试 (v0.1.1)
// 由 ts-retrieve-design-develop-test blueprint 的 develop slot 产出
// 覆盖：合法语法（11 例）+ 非法语法（15 例）= 26 用例
// v0.3 follow-up: 改用 body[] shape（term/ban/invariant 在 body 内任意顺序）

import { beforeAll, describe, expect, test } from 'bun:test'
import { URI } from 'langium'
import {
  createOxnParser,
  isDomainDeclaration,
  type BanBlock,
  type DomainDeclaration,
  type InvariantBlock,
  type TermBlock,
} from '../index'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let parser: ReturnType<typeof createOxnParser>

beforeAll(() => {
  parser = createOxnParser()
})

async function parseDomain(src: string) {
  const r = await parser.parse(src, URI.file('/tmp/domain-syntax-test.oxn'))
  return {
    parseErrors: r.parseErrors,
    lexerErrors: r.lexerErrors,
    domain: r.ast ? (r.ast.entities.find(isDomainDeclaration) as DomainDeclaration | undefined) : undefined,
  }
}

function okParse(d: { parseErrors: string[]; lexerErrors: string[]; domain?: DomainDeclaration }) {
  expect(d.parseErrors).toEqual([])
  expect(d.lexerErrors).toEqual([])
  expect(d.domain).toBeDefined()
}

/** 提取 body 中的 term 块（v0.3 follow-up: body[] 替代直接的 terms）*/
function getTermBlocks(d: DomainDeclaration): TermBlock[] {
  return ((d.body ?? []) as Array<{ $type: string }>).filter((el) => el.$type === 'TermBlock') as TermBlock[]
}

/** 提取 body 中的 ban 块（v0.3 follow-up）*/
function getBanBlock(d: DomainDeclaration): BanBlock | undefined {
  return ((d.body ?? []) as Array<{ $type: string }>).find((el) => el.$type === 'BanBlock') as BanBlock | undefined
}

/** 提取 body 中的 invariant 块（v0.3 follow-up）*/
function getInvariantBlocks(d: DomainDeclaration): InvariantBlock[] {
  return ((d.body ?? []) as Array<{ $type: string }>).filter((el) => el.$type === 'InvariantBlock') as InvariantBlock[]
}

function errParse(d: { parseErrors: string[]; lexerErrors: string[] }, prefix: 'Parser' | 'Lexer' | 'Parser|Lexer') {
  const all = [...d.parseErrors, ...d.lexerErrors]
  expect(all.length).toBeGreaterThan(0)
  if (prefix === 'Parser|Lexer') return
  // 原始 parser 错误信息不带 [Parser]/[Lexer] 前缀；只在 CLI 包装后才加。
  // 这里我们直接看：parseErrors 数组非空即视为 parser 错，lexerErrors 同理。
  const matched = (prefix === 'Parser' && d.parseErrors.length > 0) || (prefix === 'Lexer' && d.lexerErrors.length > 0)
  expect(matched).toBe(true)
}

// ---------------------------------------------------------------------------
// Happy path (11 用例)
// ---------------------------------------------------------------------------

describe('Domain syntax — happy path', () => {
  test('H1: minimal (term 1 个)', async () => {
    const d = await parseDomain(`domain "x" { term { "A": "a" } }`)
    okParse(d)
    expect(d.domain!.name).toBe('x')
    expect(getTermBlocks(d.domain!).flatMap((tb) => tb.terms)).toHaveLength(1)
  })

  test('H2: term + ban (1 元素)', async () => {
    const d = await parseDomain(`domain "x" { term { "A": "a" } ban { "B" } }`)
    okParse(d)
    expect(getBanBlock(d.domain!)?.bans).toEqual(['B'])
  })

  test('H3: term + ban + 1 invariant', async () => {
    const d = await parseDomain(`domain "x" { term { "A": "a" } ban { "B" } invariant { "r1" } }`)
    okParse(d)
    expect(getInvariantBlocks(d.domain!)[0]?.invariants).toHaveLength(1)
  })

  test('H4: term + ban + 3 invariant 块（多段）', async () => {
    const d = await parseDomain(`
      domain "x" {
        term { "A": "a" }
        ban { "B" }
        invariant { "r1" }
        invariant { "r2" }
        invariant { "r3" }
      }`)
    okParse(d)
    const blocks = getInvariantBlocks(d.domain!)
    const total = blocks.reduce((s, b) => s + b.invariants.length, 0)
    expect(total).toBe(3)
    // 顺序保持
    const values = blocks.flatMap((b) => b.invariants.map((i) => i.value))
    expect(values).toEqual(['r1', 'r2', 'r3'])
  })

  test('H5: description + term + ban + 2 invariant', async () => {
    const d = await parseDomain(`
      domain "x" {
        description = "desc-text"
        term { "A": "a" }
        ban { "B", "C" }
        invariant { "r1" }
        invariant { "r2" }
      }`)
    okParse(d)
    expect(d.domain!.descriptions[0]?.value).toBe('desc-text')
    expect(getInvariantBlocks(d.domain!).flatMap((b) => b.invariants)).toHaveLength(2)
  })

  test('H6: 完整 4 件套 + term 内 5 词', async () => {
    const d = await parseDomain(`
      domain "X" {
        description = "full"
        term {
          "A": "1"
          "B": "2"
          "C": "3"
          "D": "4"
          "E": "5"
        }
        ban { "X", "Y", "Z" }
        invariant { "i1" }
        invariant { "i2" }
        invariant { "i3" }
      }`)
    okParse(d)
    expect(getTermBlocks(d.domain!).flatMap((tb) => tb.terms)).toHaveLength(5)
    expect(getBanBlock(d.domain!)?.bans).toEqual(['X', 'Y', 'Z'])
    expect(getInvariantBlocks(d.domain!).flatMap((b) => b.invariants)).toHaveLength(3)
  })

  test('H7: term 行内 ; 终止', async () => {
    const d = await parseDomain(`domain "x" { term { "A": "a"; } }`)
    okParse(d)
  })

  test('H8: invariant 行内 ; 终止', async () => {
    const d = await parseDomain(`domain "x" { invariant { "r1"; } }`)
    okParse(d)
  })

  test('H9: 空 term block', async () => {
    const d = await parseDomain(`domain "x" { term {} }`)
    okParse(d)
    expect(getTermBlocks(d.domain!).flatMap((tb) => tb.terms)).toHaveLength(0)
  })

  test('H10: 空 ban block', async () => {
    const d = await parseDomain(`domain "x" { ban {} }`)
    okParse(d)
    expect(getBanBlock(d.domain!)?.bans ?? []).toHaveLength(0)
  })

  test('H11: 中文 invariant 值', async () => {
    const d = await parseDomain(`domain "x" { invariant { "密码必须 hash 存储" } }`)
    okParse(d)
    const blocks = getInvariantBlocks(d.domain!)
    expect(blocks[0]!.invariants[0]!.value).toBe('密码必须 hash 存储')
  })
})

// ---------------------------------------------------------------------------
// Error path (15 用例)
// ---------------------------------------------------------------------------

describe('Domain syntax — error path', () => {
  test('E1: 缺 domain 关键字', async () => {
    const d = await parseDomain(`"x" { term { "A": "a" } }`)
    errParse(d, 'Parser')
  })

  test('E2: 缺 domain name STRING', async () => {
    const d = await parseDomain(`domain { term { "A": "a" } }`)
    errParse(d, 'Parser')
  })

  test('E3: 缺 {', async () => {
    const d = await parseDomain(`domain "x" term { "A": "a" }`)
    errParse(d, 'Parser')
  })

  test('E4: 缺 } 闭合', async () => {
    const d = await parseDomain(`domain "x" { term { "A": "a" }`)
    errParse(d, 'Parser')
  })

  test('E5: term 缺 :', async () => {
    const d = await parseDomain(`domain "x" { term { "A" "a" } }`)
    errParse(d, 'Parser')
  })

  test('E6: term 缺 value STRING', async () => {
    const d = await parseDomain(`domain "x" { term { "A": } }`)
    errParse(d, 'Parser')
  })

  test('E7: ban 缺 STRING', async () => {
    const d = await parseDomain(`domain "x" { ban { , } }`)
    errParse(d, 'Parser')
  })

  test('E9: 双 domain 声明', async () => {
    // 注意：top-level 是 entities+=*，所以多 domain 应该 OK；这里只校验后面不是预期 token
    // 实际：parser 会接受两个 DomainDeclaration，所以这个用例改为文件末尾残留 token
    const d = await parseDomain(`domain "a" {} domain "b" {} extra-junk`)
    errParse(d, 'Parser')
  })

  test('E10: work 里塞 domain 关键字混用', async () => {
    // 把 work 当 domain 解析，自然失败
    const d = await parseDomain(`work "x" { context { goal = "g" } }`)
    errParse(d, 'Parser')
  })

  test('E11: 未知顶层 entity', async () => {
    const d = await parseDomain(`foo "x" {}`)
    errParse(d, 'Parser')
  })

  test('E12: term name 含未闭合 STRING', async () => {
    const d = await parseDomain(`domain "x" { term { "A: "y" } }`)
    errParse(d, 'Parser|Lexer')
  })

  test('E13: 文件末尾残留 token', async () => {
    const d = await parseDomain(`domain "x" {} junk`)
    errParse(d, 'Parser')
  })

  test('E14: 未配对 {', async () => {
    const d = await parseDomain(`domain "x" { term { }`)
    errParse(d, 'Parser')
  })

  test('E15: 顶层裸 bracket', async () => {
    const d = await parseDomain(`{}`)
    errParse(d, 'Parser')
  })

  test('E16: 跨轴硬约束 — 用 v0.0 旧语法 domain_rules', async () => {
    // 旧语法 domain_rules 在 v0.1.1 grammar 里不存在，应报错
    const d = await parseDomain(`
      domain "x" {
        noun { "A" }
        domain_rules { "r1" }
      }`)
    errParse(d, 'Parser')
  })
})
