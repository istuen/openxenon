import { describe, expect, test } from 'bun:test'
import { URI } from 'langium'
import { createOxnParser } from '../langium-driver/oxn-services'

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

  test('合法: deps 在 part 之前（v0.3 follow-up: body[] 任意顺序）', async () => {
    // v0.3 follow-up: TaskDeclaration body 改为 body+=TaskBodyElement*
    // 任意顺序的 domain/blueprint/part/deps 都接受。
    // 旧 grammar 严格要求 deps 必须在 part 之后 — v0.3 取消此约束。
    const r = await parse(
      WRAPPER(`
      task "t" {
        blueprint "fix-issue"
        deps = ["a"]
        part "p" { skill_context = "x" }
      }
    `),
    )
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
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

  test('合法: deps = "a"（v0.2 T3 软缺口 A 修复：单 STRING 形态）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = "a" }`))
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  // ───── T3 软缺口 A 修复新增 case（v0.2 多语法兼容）─────
  test('合法: deps : []（老兼容：冒号赋值）', async () => {
    const r = await parse(WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps : [] }`))
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps = "a", "b"（多元素无括号）', async () => {
    const r = await parse(
      WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps = "a", "b" }`),
    )
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: deps : "a", "b", "c"（老兼容 + 多元素无括号）', async () => {
    const r = await parse(
      WRAPPER(`task "t" { blueprint "fix-issue" part "p" { skill_context = "x" } deps : "a", "b", "c" }`),
    )
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })

  test('合法: 重复 deps 字段（v0.3 follow-up: body[] 接受多个 deps）', async () => {
    // v0.3 follow-up: body+=TaskBodyElement* 允许多个 TaskDepsField
    // parser 不再拒绝；runtime 校验阶段会取最后一个 deps（与 Langium 规则一致）
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
    expect([...r.parseErrors, ...r.lexerErrors]).toEqual([])
  })
})
