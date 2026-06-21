// =============================================================================
// invariant-decl.test.ts (T11 v0.2 Sprint 5c)
// 父文档 §T7.3 表 6 case: 老value / script / manual / 互斥 / scope默认 / scope=project
// =============================================================================

import { describe, expect, test } from 'bun:test'
import { createOxnParser, isDomainDeclaration } from '../index'
import { URI } from 'langium'

const parser = createOxnParser()

async function parse(source: string) {
  return parser.parse(source, URI.file('/virtual/invariant-test.oxn'))
}

describe('InvariantDecl (T11 Three-Layer v2)', () => {
  test('老 value=STRING 兼容', async () => {
    const r = await parse(`domain "d" { invariant { "password must be hashed" } }`)
    expect(r.parseErrors).toEqual([])
    const ast = r.ast as {
      entities?: Array<{ body?: Array<{ $type: string; invariants?: Array<{ value?: string }> }> }>
    }
    const d = ast.entities?.find((e) => (e as { $type: string }).$type === 'DomainDeclaration') as {
      body?: Array<{ $type: string; invariants?: Array<{ value?: string }> }>
    }
    const invariantBlock = d?.body?.find((b) => b.$type === 'InvariantBlock')
    expect(invariantBlock?.invariants?.[0]?.value).toBe('password must be hashed')
  })

  test('新 script = STRING', async () => {
    const r = await parse(`domain "d" { invariant { script = "scripts/check.sh" } }`)
    expect(r.parseErrors).toEqual([])
  })

  test('新 manual = STRING', async () => {
    const r = await parse(`domain "d" { invariant { manual = "manually check X" } }`)
    expect(r.parseErrors).toEqual([])
  })

  test('scope = STRING (work/domain/project)', async () => {
    const r = await parse(`domain "d" { invariant { scope = "domain" } }`)
    expect(r.parseErrors).toEqual([])
  })

  test('script + manual + scope 共存 → parse ok (互斥在 runtime PR-2 校验)', async () => {
    const r = await parse(`domain "d" { invariant { script = "a.sh"; manual = "check X"; scope = "project" } }`)
    expect(r.parseErrors).toEqual([])
  })

  test('多个 invariant 值混合 → 全部解析', async () => {
    const r = await parse(`domain "d" {
      invariant {
        "old bare value"
        script = "s.sh"
        manual = "m"
        scope = "work"
      }
    }`)
    expect(r.parseErrors).toEqual([])
  })
})
