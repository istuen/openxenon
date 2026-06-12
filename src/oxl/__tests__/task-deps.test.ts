import { describe, expect, test } from 'bun:test'
import { URI } from 'langium'
import { createOxnParser } from '../langium/oxn-services'

const parser = createOxnParser()

async function parse(content: string): Promise<{ parseErrors: string[]; lexerErrors: string[] }> {
  const r = await parser.parse(content, URI.file(`/tmp/test-${Date.now()}-${Math.random()}.oxn`))
  return {
    parseErrors: r.parseErrors,
    lexerErrors: r.lexerErrors,
  }
}

const WRAPPER = (inner: string) => `work "x" {
  context { goal = "x"; loop_policy { max_iterations = 1; } }
  domain "AlignDomain" ref "@prj/domains/align-domain";
  blueprint "fix-issue" ref "@prj/blueprints/fix-issue";
  ${inner}
}`

describe('TaskDeclaration.deps 语法契约（v0.0.28+）', () => {
  // ───── 合法形态（5 种）────
  test('合法: deps = []（空数组）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = [] }`))
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a"]（单元素）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = ["a"] }`))
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = ["a", "b", "c"]（多元素）', async () => {
    const r = await parse(
      WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = ["a", "b", "c"] }`),
    )
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = [] 后接 part（不合法但 grammar 宽容）', async () => {
    // 实际 grammar: (parts+=TaskPartDecl)* ('deps' '=' deps=TaskDeps)?
    // 严格说 deps 必须在所有 part 之后。但 parser 实际允许 deps 在前 / part 在后
    // （错误信息显示 part 后期待 } 但找到 deps 字段，验证不通过）。
    // 此测预期报错（grammar 顺序强制）。
    const r = await parse(
      WRAPPER(`
      task "t" {
        blueprint "fix-issue"
        deps = ["a"]
        part "p" { skill_context = "x" }
      }
    `),
    )
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })

  test('合法: 不写 deps 字段（可选）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } }`))
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  // ───── 非法形态（5 种）────
  test('非法: 裸数组 ["a"]（无 deps 关键字）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } ["a"] }`))
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })

  test('非法: 缺 "=" 号（deps [...]）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps ["a"] }`))
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })

  test('非法: deps = [...] 但数组元素无引号', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = [a, b] }`))
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })

  test('非法: deps 缺方括号（deps = "a"）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = "a" }`))
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })

  test('非法: 重复 deps 字段', async () => {
    const r = await parse(
      WRAPPER(`
      task "t" {
        blueprint "fix-issue"
        part "p" { skill_context = "x" }
        deps = ["a"]
        deps = ["b"]
      }
    `),
    )
    // 重复 deps 后 parser 报"Expecting '}'"
    expect(r.parseErrors.length).toBeGreaterThan(0)
  })
})
