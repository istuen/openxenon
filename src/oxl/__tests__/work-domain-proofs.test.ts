// =============================================================================
// work-domain-proofs.test.ts (T11 v0.2 Sprint 5c)
// =============================================================================
import { describe, expect, test } from 'bun:test'
import { createOxnParser } from '../index'
import { URI } from 'langium'

const parser = createOxnParser()
async function parse(s: string) {
  return parser.parse(s, URI.file('/virtual/wp.oxn'))
}

function work(extra: string) {
  return `work "w" {
  context { goal = "x"; } loop_policy { max_iterations = 3; }

  domain "L0L3Context" ref "@prj/domains/L0L3Context";
  blueprint "dev-workflow" ref "@prj/blueprints/dev-workflow";
  ${extra}
  task "t" {
    domain "L0L3Context"
    blueprint "dev-workflow"
    part "p" { skill_context = "x" }
  }
}`
}

describe('WorkDeclaration proofs (T11)', () => {
  test('无 proofs → 向后兼容', async () => {
    const r = await parse(work(''))
    expect(r.parseErrors).toEqual([])
  })

  test('proofs 单个引用', async () => {
    const r = await parse(work('proofs ["members.password"];'))
    expect(r.parseErrors).toEqual([])
  })

  test('proofs 多个引用', async () => {
    const r = await parse(work('proofs ["members.password", "orders.calc"];'))
    expect(r.parseErrors).toEqual([])
  })

  test('proofs 空数组', async () => {
    const r = await parse(work('proofs [];'))
    expect(r.parseErrors).toEqual([])
  })
})
